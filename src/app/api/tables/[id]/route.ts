import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Table from '@/models/Table';
import Event from '@/models/Event';

const updateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  status: z.enum(['available', 'reserved', 'sold', 'blocked']).optional(),
  position3D: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
      rotation: z.number().optional().default(0),
    })
    .optional(),
  sectorLabel: z.string().min(1).max(100).optional(),
  categoryId: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tables/[id]
 * Get a single table with category info.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid table ID', 400);
    }

    const table = await Table.findById(id)
      .populate('categoryId', 'name price capacity color benefits icon')
      .populate('eventId', 'title date status organizerId')
      .lean();

    if (!table) {
      return errorResponse('Table not found', 404);
    }

    // Check if reservation hold has expired
    if (
      table.status === 'reserved' &&
      table.reservedUntil &&
      new Date(table.reservedUntil) < new Date()
    ) {
      await Table.findByIdAndUpdate(id, {
        status: 'available',
        reservedUntil: null,
        reservedBy: null,
      });
      table.status = 'available';
      table.reservedUntil = undefined;
      table.reservedBy = undefined;
    }

    return successResponse(table);
  } catch (error: any) {
    console.error('GET /api/tables/[id] error:', error);
    return errorResponse(error.message || 'Failed to fetch table', 500);
  }
}

/**
 * PUT /api/tables/[id]
 * Update a table (status, position, etc). Requires organizer.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid table ID', 400);
    }

    const table = await Table.findById(id).populate('eventId', 'organizerId');
    if (!table) {
      return errorResponse('Table not found', 404);
    }

    // Check ownership via the event
    const event = table.eventId as any;
    if (
      event.organizerId?.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return errorResponse('Forbidden: you do not own this event', 403);
    }

    const body = await request.json();
    const validation = updateTableSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const updatedTable = await Table.findByIdAndUpdate(id, validation.data, {
      new: true,
      runValidators: true,
    })
      .populate('categoryId', 'name price capacity color benefits icon')
      .lean();

    return successResponse(updatedTable);
  } catch (error: any) {
    console.error('PUT /api/tables/[id] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to update table', 500);
  }
}
