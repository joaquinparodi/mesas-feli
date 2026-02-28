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
  rotation: z.number().optional().default(0),
});

const createTableSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  number: z.number().int().min(1),
  label: z.string().min(1).max(50),
  sectorLabel: z.string().min(1).max(100),
  position3D: position3DSchema.optional().default({ x: 0, y: 0, z: 0, rotation: 0 }),
  status: z.enum(['available', 'reserved', 'sold', 'blocked']).optional().default('available'),
});

const batchCreateSchema = z.object({
  tables: z.array(createTableSchema).min(1).max(100),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/tables
 * Get all tables for an event, grouped by sector, with category info and real-time status.
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

    // Fetch tables with category info
    const tables = await Table.find({ eventId: id })
      .populate('categoryId', 'name price capacity color benefits icon')
      .sort({ sectorLabel: 1, number: 1 })
      .lean();

    // Check for expired reservations and release them
    const now = new Date();
    const expiredTableIds = tables
      .filter(
        (t: any) =>
          t.status === 'reserved' && t.reservedUntil && new Date(t.reservedUntil) < now
      )
      .map((t: any) => t._id);

    if (expiredTableIds.length > 0) {
      await Table.updateMany(
        { _id: { $in: expiredTableIds } },
        { $set: { status: 'available', reservedUntil: null, reservedBy: null } }
      );

      // Update the in-memory table data
      for (const table of tables as any[]) {
        if (expiredTableIds.some((eid: any) => eid.toString() === table._id.toString())) {
          table.status = 'available';
          table.reservedUntil = null;
          table.reservedBy = null;
        }
      }
    }

    // Group tables by sector
    const sectors: Record<string, any[]> = {};
    for (const table of tables) {
      const sector = (table as any).sectorLabel || 'General';
      if (!sectors[sector]) {
        sectors[sector] = [];
      }
      sectors[sector].push(table);
    }

    // Summary counts
    const statusCounts: Record<string, number> = {};
    for (const table of tables) {
      const status = (table as any).status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    return successResponse({
      tables,
      sectors,
      statusCounts,
      total: tables.length,
    });
  } catch (error: any) {
    console.error('GET /api/events/[id]/tables error:', error);
    return errorResponse(error.message || 'Failed to fetch tables', 500);
  }
}

/**
 * POST /api/events/[id]/tables
 * Create table(s) for an event. Accepts single table or batch.
 * Requires organizer role.
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

    // Determine if single table or batch
    let tablesToCreate: z.infer<typeof createTableSchema>[];

    if (body.tables && Array.isArray(body.tables)) {
      // Batch creation
      const validation = batchCreateSchema.safeParse(body);
      if (!validation.success) {
        const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return errorResponse(errors, 400);
      }
      tablesToCreate = validation.data.tables;
    } else {
      // Single table creation
      const validation = createTableSchema.safeParse(body);
      if (!validation.success) {
        const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return errorResponse(errors, 400);
      }
      tablesToCreate = [validation.data];
    }

    // Verify all category IDs exist and belong to this event
    const categoryIds = Array.from(new Set(tablesToCreate.map((t) => t.categoryId)));
    const categories = await TableCategory.find({
      _id: { $in: categoryIds },
      eventId: id,
    }).lean();

    if (categories.length !== categoryIds.length) {
      return errorResponse('One or more category IDs are invalid or do not belong to this event', 400);
    }

    // Prepare table documents
    const tableDocs = tablesToCreate.map((t) => ({
      ...t,
      eventId: id,
    }));

    const createdTables = await Table.insertMany(tableDocs);

    // Populate category info on response
    const populatedTables = await Table.find({
      _id: { $in: createdTables.map((t) => t._id) },
    })
      .populate('categoryId', 'name price capacity color benefits icon')
      .lean();

    return successResponse(
      populatedTables.length === 1 ? populatedTables[0] : populatedTables,
      201
    );
  } catch (error: any) {
    console.error('POST /api/events/[id]/tables error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    if (error.code === 11000) {
      return errorResponse('Duplicate table number for this event', 409);
    }
    return errorResponse(error.message || 'Failed to create tables', 500);
  }
}
