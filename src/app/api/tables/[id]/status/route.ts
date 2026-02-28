import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Table from '@/models/Table';
import Event from '@/models/Event';
import { triggerEvent, channels, pusherEvents } from '@/lib/pusher';

const updateStatusSchema = z.object({
  status: z.enum(['available', 'reserved', 'sold', 'blocked']),
  reservedBy: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/tables/[id]/status
 * Update table status with reservation hold logic.
 * - If 'reserved': set reservedUntil to 15 minutes from now, set reservedBy
 * - If 'available': clear reservedUntil and reservedBy
 * - Triggers Pusher event for real-time updates
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid table ID', 400);
    }

    const table = await Table.findById(id);
    if (!table) {
      return errorResponse('Table not found', 404);
    }

    // Verify ownership via event
    const event = await Event.findById(table.eventId).lean();
    if (!event) {
      return errorResponse('Associated event not found', 404);
    }

    // Only organizer, admin, or the system (for reservation flow) can change status
    const isOrganizer = event.organizerId.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return errorResponse('Forbidden: insufficient permissions', 403);
    }

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { status, reservedBy } = validation.data;
    const updateData: Record<string, any> = { status };

    if (status === 'reserved') {
      // Set 15-minute reservation hold
      updateData.reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
      updateData.reservedBy = reservedBy || session.user.id;
    } else if (status === 'available') {
      // Clear reservation hold
      updateData.reservedUntil = null;
      updateData.reservedBy = null;
    } else if (status === 'sold') {
      // Clear temporary hold fields; table is permanently sold
      updateData.reservedUntil = null;
    } else if (status === 'blocked') {
      updateData.reservedUntil = null;
      updateData.reservedBy = null;
    }

    const updatedTable = await Table.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('categoryId', 'name price capacity color')
      .lean();

    // Trigger Pusher event for real-time update
    try {
      await triggerEvent(
        channels.eventTables(table.eventId.toString()),
        pusherEvents.TABLE_STATUS_CHANGED,
        {
          tableId: id,
          status: updatedTable!.status,
          number: updatedTable!.number,
          label: updatedTable!.label,
          sectorLabel: updatedTable!.sectorLabel,
          reservedUntil: (updatedTable as any)?.reservedUntil || null,
          reservedBy: (updatedTable as any)?.reservedBy || null,
          category: (updatedTable as any)?.categoryId || null,
        }
      );
    } catch (pusherError) {
      console.error('Pusher event failed:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return successResponse(updatedTable);
  } catch (error: any) {
    console.error('PUT /api/tables/[id]/status error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to update table status', 500);
  }
}
