import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Event from '@/models/Event';
import TableCategory from '@/models/TableCategory';

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  price: z.number().min(0),
  capacity: z.number().int().min(1).max(50),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
  benefits: z.array(z.string()).max(20).optional().default([]),
  position3D: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional()
    .default({ x: 0, y: 0, z: 0 }),
  icon: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/categories
 * Get all table categories for an event.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid event ID', 400);
    }

    const event = await Event.findById(id).lean();
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const categories = await TableCategory.find({ eventId: id })
      .sort({ price: 1 })
      .lean();

    return successResponse(categories);
  } catch (error: any) {
    console.error('GET /api/events/[id]/categories error:', error);
    return errorResponse(error.message || 'Failed to fetch categories', 500);
  }
}

/**
 * POST /api/events/[id]/categories
 * Create a table category for an event. Requires organizer role.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRole(['organizer', 'admin']);
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

    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const category = await TableCategory.create({
      ...validation.data,
      eventId: id,
    });

    return successResponse(category, 201);
  } catch (error: any) {
    console.error('POST /api/events/[id]/categories error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    if (error.code === 11000) {
      return errorResponse('A category with this name already exists for this event', 409);
    }
    return errorResponse(error.message || 'Failed to create category', 500);
  }
}
