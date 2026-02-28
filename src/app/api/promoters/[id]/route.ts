import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Promoter from '@/models/Promoter';
import Reservation from '@/models/Reservation';

const updatePromoterSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  assignedTables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/promoters/[id]
 * Get promoter details with stats.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid promoter ID', 400);
    }

    const promoter = await Promoter.findById(id)
      .populate('userId', 'name email phone avatar')
      .populate('eventId', 'title date status coverImage')
      .lean();

    if (!promoter) {
      return errorResponse('Promoter not found', 404);
    }

    // Authorization: promoter themselves, their organizer, or admin
    const isPromoterUser = (promoter as any).userId?._id?.toString() === session.user.id;
    const isOrganizer = (promoter as any).organizerId?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isPromoterUser && !isOrganizer && !isAdmin) {
      return errorResponse('Forbidden', 403);
    }

    // Get reservation stats
    const reservationStats = await Reservation.aggregate([
      {
        $match: {
          promoterId: new mongoose.Types.ObjectId((promoter as any).userId?._id || (promoter as any).userId),
          eventId: new mongoose.Types.ObjectId((promoter as any).eventId?._id || (promoter as any).eventId),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const stats: Record<string, { count: number; totalAmount: number }> = {};
    for (const stat of reservationStats) {
      stats[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
    }

    return successResponse({
      ...promoter,
      stats,
    });
  } catch (error: any) {
    console.error('GET /api/promoters/[id] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to fetch promoter', 500);
  }
}

/**
 * PUT /api/promoters/[id]
 * Update promoter (commission rate, assigned tables, active status).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid promoter ID', 400);
    }

    const promoter = await Promoter.findById(id);
    if (!promoter) {
      return errorResponse('Promoter not found', 404);
    }

    // Only the organizer or admin can update
    const isOrganizer = promoter.organizerId.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return errorResponse('Forbidden: only the organizer can update promoters', 403);
    }

    const body = await request.json();
    const validation = updatePromoterSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const updatedPromoter = await Promoter.findByIdAndUpdate(id, validation.data, {
      new: true,
      runValidators: true,
    })
      .populate('userId', 'name email phone avatar')
      .populate('eventId', 'title date status')
      .lean();

    return successResponse(updatedPromoter);
  } catch (error: any) {
    console.error('PUT /api/promoters/[id] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to update promoter', 500);
  }
}
