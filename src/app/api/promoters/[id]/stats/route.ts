import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Promoter from '@/models/Promoter';
import Reservation from '@/models/Reservation';
import TableCategory from '@/models/TableCategory';
import Table from '@/models/Table';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/promoters/[id]/stats
 * Get promoter statistics:
 * - Total reservations
 * - Total revenue generated
 * - Commission earned
 * - Sales by table category
 * Aggregated from reservations.
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
      .populate('userId', 'name email')
      .lean();

    if (!promoter) {
      return errorResponse('Promoter not found', 404);
    }

    // Authorization check
    const isPromoterUser = (promoter as any).userId?._id?.toString() === session.user.id;
    const isOrganizer = promoter.organizerId.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isPromoterUser && !isOrganizer && !isAdmin) {
      return errorResponse('Forbidden', 403);
    }

    const promoterUserId = (promoter as any).userId?._id || promoter.userId;

    // Total reservations by status
    const reservationsByStatus = await Reservation.aggregate([
      {
        $match: {
          promoterId: new mongoose.Types.ObjectId(promoterUserId),
          eventId: new mongoose.Types.ObjectId(promoter.eventId as any),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
    ]);

    let totalReservations = 0;
    let totalRevenue = 0;
    const statusBreakdown: Record<string, { count: number; revenue: number }> = {};

    for (const item of reservationsByStatus) {
      statusBreakdown[item._id] = { count: item.count, revenue: item.revenue };
      totalReservations += item.count;
      if (item._id === 'confirmed' || item._id === 'used') {
        totalRevenue += item.revenue;
      }
    }

    // Commission earned
    const commissionEarned = (totalRevenue * promoter.commissionRate) / 100;

    // Sales by table category
    const salesByCategory = await Reservation.aggregate([
      {
        $match: {
          promoterId: new mongoose.Types.ObjectId(promoterUserId),
          eventId: new mongoose.Types.ObjectId(promoter.eventId as any),
          status: { $in: ['confirmed', 'used'] },
        },
      },
      {
        $lookup: {
          from: 'tables',
          localField: 'tableId',
          foreignField: '_id',
          as: 'table',
        },
      },
      { $unwind: '$table' },
      {
        $lookup: {
          from: 'tablecategories',
          localField: 'table.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          categoryColor: { $first: '$category.color' },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Recent reservations
    const recentReservations = await Reservation.find({
      promoterId: new mongoose.Types.ObjectId(promoterUserId),
      eventId: promoter.eventId,
    })
      .populate('tableId', 'number label sectorLabel')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return successResponse({
      promoter: {
        _id: promoter._id,
        commissionRate: promoter.commissionRate,
        isActive: promoter.isActive,
        referralToken: promoter.referralToken,
        user: promoter.userId,
      },
      totalReservations,
      totalRevenue,
      commissionEarned,
      commissionRate: promoter.commissionRate,
      statusBreakdown,
      salesByCategory,
      recentReservations,
    });
  } catch (error: any) {
    console.error('GET /api/promoters/[id]/stats error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to fetch promoter stats', 500);
  }
}
