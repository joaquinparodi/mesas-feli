import { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Event from '@/models/Event';
import Table from '@/models/Table';
import TableCategory from '@/models/TableCategory';

const position3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const updateLayoutSchema = z.object({
  layout3DConfig: z
    .object({
      floorTexture: z.string().optional(),
      wallColor: z.string().optional(),
      ambientLight: z.number().optional(),
      spotLights: z
        .array(
          z.object({
            position: position3DSchema,
            color: z.string(),
            intensity: z.number(),
          })
        )
        .optional(),
      decorations: z
        .array(
          z.object({
            type: z.string(),
            position: position3DSchema,
            scale: z.number(),
            rotation: z.number().optional(),
          })
        )
        .optional(),
      cameraPosition: position3DSchema.optional(),
      cameraTarget: position3DSchema.optional(),
    })
    .optional(),
  tables: z
    .array(
      z.object({
        _id: z.string(),
        position3D: z.object({
          x: z.number(),
          y: z.number(),
          z: z.number(),
          rotation: z.number().optional().default(0),
        }),
        sectorLabel: z.string().optional(),
      })
    )
    .optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/layout
 * Get the 3D layout configuration for an event, including table positions and venue config.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid event ID', 400);
    }

    const event = await Event.findById(id)
      .select('layout3DConfig title venue')
      .populate('venue', 'name layout3DModel')
      .lean();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    // Get all tables with positions
    const tables = await Table.find({ eventId: id })
      .select('number label status position3D sectorLabel categoryId')
      .populate('categoryId', 'name color icon')
      .sort({ sectorLabel: 1, number: 1 })
      .lean();

    // Get categories with their position info
    const categories = await TableCategory.find({ eventId: id })
      .select('name color position3D icon')
      .lean();

    return successResponse({
      eventId: id,
      title: event.title,
      layout3DConfig: event.layout3DConfig || {},
      venueLayout: (event.venue as any)?.layout3DModel || {},
      tables,
      categories,
    });
  } catch (error: any) {
    console.error('GET /api/events/[id]/layout error:', error);
    return errorResponse(error.message || 'Failed to fetch layout', 500);
  }
}

/**
 * PUT /api/events/[id]/layout
 * Update the 3D layout configuration (table positions, sectors, venue elements).
 * Requires organizer role.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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
    const validation = updateLayoutSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { layout3DConfig, tables } = validation.data;

    // Update event layout config if provided
    if (layout3DConfig) {
      await Event.findByIdAndUpdate(id, { layout3DConfig });
    }

    // Update table positions if provided
    if (tables && tables.length > 0) {
      const bulkOps = tables.map((t) => ({
        updateOne: {
          filter: { _id: t._id, eventId: id },
          update: {
            $set: {
              position3D: t.position3D,
              ...(t.sectorLabel ? { sectorLabel: t.sectorLabel } : {}),
            },
          },
        },
      }));

      await Table.bulkWrite(bulkOps);
    }

    // Return updated layout
    const updatedEvent = await Event.findById(id)
      .select('layout3DConfig')
      .lean();

    const updatedTables = await Table.find({ eventId: id })
      .select('number label status position3D sectorLabel categoryId')
      .populate('categoryId', 'name color icon')
      .sort({ sectorLabel: 1, number: 1 })
      .lean();

    return successResponse({
      eventId: id,
      layout3DConfig: updatedEvent?.layout3DConfig || {},
      tables: updatedTables,
    });
  } catch (error: any) {
    console.error('PUT /api/events/[id]/layout error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    return errorResponse(error.message || 'Failed to update layout', 500);
  }
}
