import { NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generalLimiter } from '@/lib/rate-limit';
import Event from '@/models/Event';
import Venue from '@/models/Venue';

// Zod schema for creating an event
const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  venue: z.string().min(1, 'Venue ID is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date format'),
  status: z.enum(['draft', 'active', 'sold_out', 'finished']).optional().default('draft'),
  coverImage: z.string().url().optional(),
  tags: z.array(z.string()).max(10).optional().default([]),
  ticketPrice: z.number().min(0).optional(),
});

/**
 * GET /api/events
 * List events with filters, search, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = generalLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const venue = searchParams.get('venue');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query filter
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = status;
    }

    if (venue) {
      filter.venue = venue;
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortField = ['date', 'title', 'createdAt'].includes(sortBy) ? sortBy : 'date';
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('venue', 'name address images')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      items: events,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (error: any) {
    console.error('GET /api/events error:', error);
    return errorResponse(error.message || 'Failed to fetch events', 500);
  }
}

/**
 * POST /api/events
 * Create a new event. Requires organizer or admin role.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['organizer', 'admin']);
    await dbConnect();

    const body = await request.json();
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const data = validation.data;

    // Verify venue exists
    const venueExists = await Venue.findById(data.venue).lean();
    if (!venueExists) {
      return errorResponse('Venue not found', 404);
    }

    // Validate date logic
    const startDate = new Date(data.date);
    const endDate = new Date(data.endDate);

    if (startDate <= new Date()) {
      return errorResponse('Event date must be in the future', 400);
    }

    if (endDate <= startDate) {
      return errorResponse('End date must be after start date', 400);
    }

    const event = await Event.create({
      ...data,
      date: startDate,
      endDate: endDate,
      organizerId: session.user.id,
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('venue', 'name address images')
      .lean();

    return successResponse(populatedEvent, 201);
  } catch (error: any) {
    console.error('POST /api/events error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    return errorResponse(error.message || 'Failed to create event', 500);
  }
}
