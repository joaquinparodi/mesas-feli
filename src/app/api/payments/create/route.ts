import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { paymentLimiter } from '@/lib/rate-limit';
import { createReservationPreference } from '@/lib/mercadopago';
import Reservation from '@/models/Reservation';
import Payment from '@/models/Payment';
import Event from '@/models/Event';
import Table from '@/models/Table';
import User from '@/models/User';

const createPaymentSchema = z.object({
  reservationId: z.string().min(1, 'Reservation ID is required'),
});

/**
 * POST /api/payments/create
 * Initiate MercadoPago payment for a reservation.
 * Creates a preference and returns the init_point URL.
 * Rate limited with paymentLimiter.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = paymentLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const session = await requireAuth();
    await dbConnect();

    const body = await request.json();
    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { reservationId } = validation.data;

    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return errorResponse('Invalid reservation ID', 400);
    }

    // Find reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return errorResponse('Reservation not found', 404);
    }

    // Verify ownership
    if (reservation.userId.toString() !== session.user.id) {
      return errorResponse('Forbidden: this is not your reservation', 403);
    }

    // Verify reservation is pending
    if (reservation.status !== 'pending') {
      return errorResponse(`Cannot create payment for reservation with status: ${reservation.status}`, 400);
    }

    // Check if a pending payment already exists
    const existingPayment = await Payment.findOne({
      reservationId,
      status: 'pending',
      provider: 'mercadopago',
    }).lean();

    if (existingPayment && existingPayment.metadata?.initPoint) {
      // Return existing preference URL
      return successResponse({
        paymentUrl: existingPayment.metadata.initPoint,
        preferenceId: existingPayment.externalId,
        existingPayment: true,
      });
    }

    // Get event and table info for the preference
    const event = await Event.findById(reservation.eventId)
      .populate('venue', 'name')
      .lean();

    if (!event) {
      return errorResponse('Associated event not found', 404);
    }

    const table = await Table.findById(reservation.tableId)
      .populate('categoryId', 'name')
      .lean();

    if (!table) {
      return errorResponse('Associated table not found', 404);
    }

    const user = await User.findById(session.user.id).lean();

    // Create MercadoPago preference
    const { preferenceId, initPoint } = await createReservationPreference({
      reservationId: reservation._id.toString(),
      title: `Mesa ${table.label} - ${event.title}`,
      description: `Reserva mesa ${table.label}, ${(table as any).categoryId?.name || 'Standard'} - ${event.title}`,
      amount: reservation.amount,
      buyerEmail: user?.email || session.user.email,
      buyerName: user?.name || session.user.name,
      externalReference: reservation._id.toString(),
    });

    // Create or update payment record
    const payment = await Payment.create({
      reservationId: reservation._id,
      provider: 'mercadopago',
      externalId: preferenceId,
      status: 'pending',
      amount: reservation.amount,
      currency: 'ARS',
      metadata: { preferenceId, initPoint },
    });

    // Update reservation with payment ID
    reservation.paymentId = payment._id;
    await reservation.save();

    return successResponse({
      paymentUrl: initPoint,
      preferenceId,
      paymentId: payment._id.toString(),
    });
  } catch (error: any) {
    console.error('POST /api/payments/create error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to create payment', 500);
  }
}
