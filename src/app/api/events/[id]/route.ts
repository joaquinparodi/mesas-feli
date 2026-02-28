import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Event from '@/models/Event';
import Table from '@/models/Table';
import TableCategory from '@/models/TableCategory';
import Reservation from '@/models/Reservation';
import Venue from '@/models/Venue';

const updateEventSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  venue: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format').optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date format').optional(),
  status: z.enum(['draft', 'active', 'sold_out', 'finished']).optional(),
  coverImage: z.string().url().optional().nullable(),
  tags: z.array(z.string()).max(10).optional(),
  ticketPrice: z.number().min(0).optional(),
  layout3DConfig: z.record(z.string(), z.any()).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]
 * Get a single event by ID with venue, categories, and table counts.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid event ID', 400);
    }

    const event = await Event.findById(id)
      .populate('venue', 'name address capacity images layout3DModel')
      .lean();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    // Get table categories for this event
    const categories = await TableCategory.find({ eventId: id }).lean();

    // Get table counts by status
    const tableCounts = await Table.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const tableCountsByStatus: Record<string, number> = {};
    let totalTables = 0;
    for (const tc of tableCounts) {
      tableCountsByStatus[tc._id] = tc.count;
      totalTables += tc.count;
    }

    return successResponse({
      ...event,
      tableCategories: categories,
      tableCountsByStatus,
      totalTables,
      availableTables: tableCountsByStatus['available'] || 0,
    });
  } catch (error: any) {
    console.error('GET /api/events/[id] error:', error);
    return errorResponse(error.message || 'Failed to fetch event', 500);
  }
}

/**
 * PUT /api/events/[id]
 * Update an event. Requires organizer who owns it or admin.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid event ID', 400);
    }

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    // Check ownership: must be the organizer or an admin
    if (
      event.organizerId.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return errorResponse('Forbidden: you do not own this event', 403);
    }

    const body = await request.json();
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const updateData: Record<string, any> = { ...validation.data };

    // Convert date strings to Date objects if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Validate date order if both provided
    const startDate = updateData.date || event.date;
    const endDate = updateData.endDate || event.endDate;
    if (endDate <= startDate) {
      return errorResponse('End date must be after start date', 400);
    }

    // Verify venue if being changed
    if (updateData.venue) {
      const venueExists = await (await import('@/models/Venue')).default.findById(updateData.venue).lean();
      if (!venueExists) {
        return errorResponse('Venue not found', 404);
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('venue', 'name address capacity images')
      .lean();

    return successResponse(updatedEvent);
  } catch (error: any) {
    console.error('PUT /api/events/[id] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to update event', 500);
  }
}

/**
 * DELETE /api/events/[id]
 * Delete event and associated tables, categories, and reservations.
 * Requires organizer who owns it or admin.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid event ID', 400);
    }

    const event = await Event.findById(id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    // Check ownership
    if (
      event.organizerId.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return errorResponse('Forbidden: you do not own this event', 403);
    }

    // Delete all associated data in parallel
    await Promise.all([
      Table.deleteMany({ eventId: id }),
      TableCategory.deleteMany({ eventId: id }),
      Reservation.deleteMany({ eventId: id }),
      Event.findByIdAndDelete(id),
    ]);

    return successResponse({ message: 'Event and associated data deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/events/[id] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to delete event', 500);
  }
}
