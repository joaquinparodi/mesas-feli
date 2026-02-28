import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Reservation from '@/models/Reservation';
import Event from '@/models/Event';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reservations/[id]
 * Get a single reservation with populated event, table, and user info.
 * Only the reservation owner, event organizer, or admin can view.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid reservation ID', 400);
    }

    const reservation = await Reservation.findById(id)
      .populate({
        path: 'eventId',
        select: 'title description date endDate status coverImage venue organizerId',
        populate: {
          path: 'venue',
          select: 'name address images',
        },
      })
      .populate({
        path: 'tableId',
        select: 'number label sectorLabel status position3D categoryId',
        populate: {
          path: 'categoryId',
          select: 'name price capacity color benefits icon',
        },
      })
      .populate('userId', 'name email phone avatar')
      .populate('promoterId', 'name email')
      .lean();

    if (!reservation) {
      return errorResponse('Reservation not found', 404);
    }

    // Authorization check: owner, organizer, or admin
    const isOwner = (reservation as any).userId?._id?.toString() === session.user.id ||
                    (reservation as any).userId?.toString() === session.user.id;
    const isOrganizer = (reservation as any).eventId?.organizerId?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isOwner && !isOrganizer && !isAdmin) {
      return errorResponse('Forbidden: you do not have access to this reservation', 403);
    }

    return successResponse(reservation);
  } catch (error: any) {
    console.error('GET /api/reservations/[id] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to fetch reservation', 500);
  }
}
