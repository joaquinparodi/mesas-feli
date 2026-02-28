import { NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateQRToken } from '@/lib/qr';
import Reservation from '@/models/Reservation';
import Event from '@/models/Event';
import Table from '@/models/Table';
import User from '@/models/User';
import TableCategory from '@/models/TableCategory';

const validateQRSchema = z.object({
  token: z.string().min(1, 'QR token is required'),
});

/**
 * POST /api/qr/validate
 * Validate a QR code at the door.
 * - Decode and validate JWT token
 * - Find reservation, check it is confirmed and not already used
 * - Mark qrUsed = true, reservation status = used
 * - Return reservation details with event and table info
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const body = await request.json();
    const validation = validateQRSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { token } = validation.data;

    // Validate and decode QR token
    const payload = validateQRToken(token);
    if (!payload) {
      return errorResponse('Invalid or expired QR code', 400);
    }

    // Find reservation
    const reservation = await Reservation.findById(payload.reservationId);
    if (!reservation) {
      return errorResponse('Reservation not found', 404);
    }

    // Verify QR token matches the reservation
    if (reservation.qrCode !== token) {
      return errorResponse('QR code does not match this reservation', 400);
    }

    // Check reservation status
    if (reservation.status === 'cancelled') {
      return errorResponse('This reservation has been cancelled', 400);
    }

    if (reservation.status === 'pending') {
      return errorResponse('This reservation has not been confirmed yet (payment pending)', 400);
    }

    if (reservation.qrUsed) {
      return errorResponse('This QR code has already been used', 400);
    }

    if (reservation.status === 'used') {
      return errorResponse('This reservation has already been used', 400);
    }

    // Verify the scanner has permission (organizer or admin)
    const event = await Event.findById(reservation.eventId)
      .populate('venue', 'name address')
      .lean();

    if (!event) {
      return errorResponse('Associated event not found', 404);
    }

    const isOrganizer = event.organizerId.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return errorResponse('Forbidden: only organizers or admins can validate QR codes', 403);
    }

    // Mark as used
    reservation.qrUsed = true;
    reservation.status = 'used';
    await reservation.save();

    // Get full details for the response
    const table = await Table.findById(reservation.tableId).lean();
    const category = table
      ? await TableCategory.findById(table.categoryId).lean()
      : null;
    const user = await User.findById(reservation.userId)
      .select('name email phone avatar')
      .lean();

    return successResponse({
      valid: true,
      reservation: {
        _id: reservation._id,
        status: reservation.status,
        amount: reservation.amount,
        guestCount: reservation.guestCount,
        guestNames: reservation.guestNames,
        benefits: reservation.benefits,
        notes: reservation.notes,
        createdAt: reservation.createdAt,
      },
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        venue: event.venue,
      },
      table: {
        _id: table?._id,
        number: table?.number,
        label: table?.label,
        sectorLabel: table?.sectorLabel,
        category: category
          ? {
              name: category.name,
              color: category.color,
              capacity: category.capacity,
            }
          : null,
      },
      user,
    });
  } catch (error: any) {
    console.error('POST /api/qr/validate error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to validate QR code', 500);
  }
}
