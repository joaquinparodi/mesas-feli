import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { paymentLimiter } from '@/lib/rate-limit';
import { createReservationPreference } from '@/lib/mercadopago';
import { createReservationQR } from '@/lib/qr';
import { triggerEvent, channels, pusherEvents } from '@/lib/pusher';
import Event from '@/models/Event';
import Table from '@/models/Table';
import TableCategory from '@/models/TableCategory';
import Reservation from '@/models/Reservation';
import Payment from '@/models/Payment';
import Promoter from '@/models/Promoter';
import User from '@/models/User';
import Notification from '@/models/Notification';

const createReservationSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  tableId: z.string().min(1, 'Table ID is required'),
  guestCount: z.number().int().min(1).max(50),
  guestNames: z.array(z.string()).max(50).optional().default([]),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(['mercadopago', 'cash']),
  promoterToken: z.string().optional(),
});

/**
 * POST /api/reservations
 * Create a reservation. Validate table availability, lock table, create reservation.
 * For mercadopago: create MP preference, return payment URL.
 * For cash: create as confirmed, generate QR.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = paymentLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const session = await requireAuth();
    await dbConnect();

    const body = await request.json();
    const validation = createReservationSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { eventId, tableId, guestCount, guestNames, notes, paymentMethod, promoterToken } =
      validation.data;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(tableId)) {
      return errorResponse('Invalid event or table ID', 400);
    }

    // Verify event exists and is active
    const event = await Event.findById(eventId).populate('venue', 'name').lean();
    if (!event) {
      return errorResponse('Event not found', 404);
    }
    if (event.status !== 'active') {
      return errorResponse('Event is not currently accepting reservations', 400);
    }

    // Verify table exists and belongs to event
    const table = await Table.findOne({ _id: tableId, eventId });
    if (!table) {
      return errorResponse('Table not found for this event', 404);
    }

    // Check table availability (also check for expired holds)
    if (table.status === 'reserved' && table.reservedUntil && new Date(table.reservedUntil) < new Date()) {
      // Expired hold, release it
      table.status = 'available';
      table.reservedUntil = undefined;
      table.reservedBy = undefined;
      await table.save();
    }

    if (table.status !== 'available') {
      return errorResponse('Table is not available', 409);
    }

    // Get category for pricing
    const category = await TableCategory.findById(table.categoryId).lean();
    if (!category) {
      return errorResponse('Table category not found', 404);
    }

    // Validate guest count against category capacity
    if (guestCount > category.capacity) {
      return errorResponse(
        `Guest count exceeds table capacity of ${category.capacity}`,
        400
      );
    }

    // Resolve promoter if token provided
    let promoterId: string | null = null;
    if (promoterToken) {
      const promoter = await Promoter.findOne({
        referralToken: promoterToken,
        eventId,
        isActive: true,
      }).lean();
      if (promoter) {
        promoterId = promoter._id.toString();
      }
    }

    // Lock table with 15-minute hold
    table.status = 'reserved';
    table.reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
    table.reservedBy = new mongoose.Types.ObjectId(session.user.id);
    await table.save();

    // Generate initial QR token (will be replaced on confirmation for MP payments)
    const { token: qrToken } = await createReservationQR({
      reservationId: 'pending', // Placeholder, will be updated
      eventId,
      userId: session.user.id,
      tableId,
    });

    // Create reservation
    const reservation = await Reservation.create({
      userId: session.user.id,
      eventId,
      tableId,
      promoterId: promoterId || undefined,
      status: paymentMethod === 'cash' ? 'confirmed' : 'pending',
      paymentMethod,
      amount: category.price,
      qrCode: qrToken,
      qrUsed: false,
      benefits: category.benefits || [],
      guestCount,
      guestNames,
      notes,
    });

    // Now regenerate QR with actual reservation ID
    const { token: finalQrToken, dataUrl: qrDataUrl } = await createReservationQR({
      reservationId: reservation._id.toString(),
      eventId,
      userId: session.user.id,
      tableId,
    });
    reservation.qrCode = finalQrToken;
    await reservation.save();

    let paymentUrl: string | null = null;

    if (paymentMethod === 'mercadopago') {
      // Create MercadoPago preference
      const user = await User.findById(session.user.id).lean();
      const { preferenceId, initPoint } = await createReservationPreference({
        reservationId: reservation._id.toString(),
        title: `Mesa ${table.label} - ${event.title}`,
        description: `Reserva mesa ${table.label}, ${category.name} - ${event.title}`,
        amount: category.price,
        buyerEmail: user?.email || session.user.email,
        buyerName: user?.name || session.user.name,
        externalReference: reservation._id.toString(),
      });

      // Create payment record
      await Payment.create({
        reservationId: reservation._id,
        provider: 'mercadopago',
        externalId: preferenceId,
        status: 'pending',
        amount: category.price,
        currency: 'ARS',
        metadata: { preferenceId, initPoint },
      });

      paymentUrl = initPoint;
    } else {
      // Cash payment: mark table as sold, create payment record as approved
      table.status = 'sold';
      table.reservedUntil = undefined;
      await table.save();

      await Payment.create({
        reservationId: reservation._id,
        provider: 'cash',
        status: 'approved',
        amount: category.price,
        currency: 'ARS',
        paidAt: new Date(),
      });

      // Create notification for user
      await Notification.create({
        userId: session.user.id,
        type: 'reservation_confirmed',
        title: 'Reserva confirmada',
        message: `Tu reserva para ${event.title} - Mesa ${table.label} ha sido confirmada.`,
        link: `/reservations/${reservation._id}`,
      });

      // Update promoter stats if applicable
      if (promoterId) {
        await Promoter.findByIdAndUpdate(promoterId, {
          $inc: { totalSales: 1, totalEarnings: category.price },
        });
      }
    }

    // Trigger Pusher events
    try {
      await triggerEvent(
        channels.eventTables(eventId),
        pusherEvents.TABLE_STATUS_CHANGED,
        {
          tableId,
          status: table.status,
          number: table.number,
          label: table.label,
        }
      );

      await triggerEvent(
        channels.eventReservations(eventId),
        pusherEvents.RESERVATION_CREATED,
        {
          reservationId: reservation._id.toString(),
          tableId,
          status: reservation.status,
          amount: category.price,
        }
      );
    } catch (pusherError) {
      console.error('Pusher event failed:', pusherError);
    }

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('eventId', 'title date venue')
      .populate('tableId', 'number label sectorLabel categoryId')
      .lean();

    return successResponse(
      {
        reservation: populatedReservation,
        paymentUrl,
        qrDataUrl: paymentMethod === 'cash' ? qrDataUrl : null,
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/reservations error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to create reservation', 500);
  }
}

/**
 * GET /api/reservations
 * List authenticated user's reservations with filters.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventId = searchParams.get('eventId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const filter: Record<string, any> = { userId: session.user.id };

    if (status) {
      filter.status = status;
    }
    if (eventId) {
      filter.eventId = eventId;
    }

    const skip = (page - 1) * limit;

    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .populate({
          path: 'eventId',
          select: 'title date endDate status coverImage venue',
          populate: { path: 'venue', select: 'name address' },
        })
        .populate({
          path: 'tableId',
          select: 'number label sectorLabel categoryId',
          populate: { path: 'categoryId', select: 'name price color' },
        })
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reservation.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      items: reservations,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (error: any) {
    console.error('GET /api/reservations error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to fetch reservations', 500);
  }
}
