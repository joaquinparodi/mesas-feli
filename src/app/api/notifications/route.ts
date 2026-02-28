import { NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Notification from '@/models/Notification';

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().optional().default(false),
});

/**
 * GET /api/notifications
 * Get the authenticated user's notifications with pagination.
 * Optionally mark as read on fetch with ?markRead=true.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const markRead = searchParams.get('markRead') === 'true';
    const type = searchParams.get('type');

    const filter: Record<string, any> = { userId: session.user.id };

    if (unreadOnly) {
      filter.read = false;
    }

    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: session.user.id, read: false }),
    ]);

    // Mark fetched notifications as read if requested
    if (markRead && notifications.length > 0) {
      const notificationIds = notifications
        .filter((n: any) => !n.read)
        .map((n: any) => n._id);

      if (notificationIds.length > 0) {
        await Notification.updateMany(
          { _id: { $in: notificationIds } },
          { $set: { read: true } }
        );
      }
    }

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      items: notifications,
      total,
      unreadCount: markRead ? Math.max(0, unreadCount - notifications.filter((n: any) => !n.read).length) : unreadCount,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to fetch notifications', 500);
  }
}

/**
 * PUT /api/notifications
 * Mark notifications as read (by id or all).
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const body = await request.json();
    const validation = markReadSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { notificationIds, markAll } = validation.data;

    if (markAll) {
      // Mark all unread notifications as read for this user
      const result = await Notification.updateMany(
        { userId: session.user.id, read: false },
        { $set: { read: true } }
      );

      return successResponse({
        marked: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`,
      });
    }

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const result = await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          userId: session.user.id, // Ensure user owns these notifications
        },
        { $set: { read: true } }
      );

      return successResponse({
        marked: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`,
      });
    }

    return errorResponse('Provide notificationIds or set markAll to true', 400);
  } catch (error: any) {
    console.error('PUT /api/notifications error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to update notifications', 500);
  }
}
