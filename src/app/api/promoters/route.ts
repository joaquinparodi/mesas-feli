import { NextRequest } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Promoter from '@/models/Promoter';
import User from '@/models/User';
import Reservation from '@/models/Reservation';

const createPromoterSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  commissionRate: z.number().min(0).max(100),
  assignedTables: z.array(z.string()).optional().default([]),
});

/**
 * GET /api/promoters
 * List promoters for the organizer. Include stats.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['organizer', 'admin']);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isActive = searchParams.get('isActive');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const filter: Record<string, any> = {};

    // Organizers see only their own promoters; admins see all
    if (session.user.role === 'organizer') {
      filter.organizerId = session.user.id;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    if (isActive !== null && isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const [promoters, total] = await Promise.all([
      Promoter.find(filter)
        .populate('userId', 'name email phone avatar')
        .populate('eventId', 'title date status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Promoter.countDocuments(filter),
    ]);

    // Enrich with reservation counts
    const enrichedPromoters = await Promise.all(
      promoters.map(async (promoter: any) => {
        const reservationCount = await Reservation.countDocuments({
          promoterId: promoter.userId?._id || promoter.userId,
          eventId: promoter.eventId?._id || promoter.eventId,
          status: { $in: ['confirmed', 'used'] },
        });

        return {
          ...promoter,
          reservationCount,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      items: enrichedPromoters,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (error: any) {
    console.error('GET /api/promoters error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    return errorResponse(error.message || 'Failed to fetch promoters', 500);
  }
}

/**
 * POST /api/promoters
 * Create a new promoter with a unique referral token. Requires organizer.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['organizer', 'admin']);
    await dbConnect();

    const body = await request.json();
    const validation = createPromoterSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { userId, eventId, commissionRate, assignedTables } = validation.data;

    // Verify user exists
    const user = await User.findById(userId).lean();
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Verify event exists and belongs to organizer
    const Event = (await import('@/models/Event')).default;
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    if (
      event.organizerId.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return errorResponse('Forbidden: you do not own this event', 403);
    }

    // Check if promoter already exists for this user+event
    const existingPromoter = await Promoter.findOne({ userId, eventId }).lean();
    if (existingPromoter) {
      return errorResponse('This user is already a promoter for this event', 409);
    }

    // Generate unique referral token
    const referralToken = `promo_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    const promoter = await Promoter.create({
      userId,
      eventId,
      organizerId: session.user.id,
      commissionRate,
      assignedTables,
      referralToken,
      totalSales: 0,
      totalEarnings: 0,
      isActive: true,
    });

    const populatedPromoter = await Promoter.findById(promoter._id)
      .populate('userId', 'name email phone avatar')
      .populate('eventId', 'title date status')
      .lean();

    return successResponse(populatedPromoter, 201);
  } catch (error: any) {
    console.error('POST /api/promoters error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    if (error.code === 11000) {
      return errorResponse('A promoter with this configuration already exists', 409);
    }
    return errorResponse(error.message || 'Failed to create promoter', 500);
  }
}
