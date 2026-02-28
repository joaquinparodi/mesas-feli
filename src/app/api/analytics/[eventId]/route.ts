import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Event from '@/models/Event';
import Table from '@/models/Table';
import Reservation from '@/models/Reservation';
import Promoter from '@/models/Promoter';
import TableCategory from '@/models/TableCategory';

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/analytics/[eventId]
 * Get comprehensive event analytics for the organizer dashboard.
 * Includes: total revenue, reservations by status, occupancy rate,
 * revenue by category, sales over time, top promoters, table status distribution.
 * Requires organizer or admin.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return errorResponse('Invalid event ID', 400);
    }

    const event = await Event.findById(eventId)
      .populate('venue', 'name address')
      .lean();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    // Authorization: organizer or admin
    const isOrganizer = event.organizerId.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return errorResponse('Forbidden: only event organizers can view analytics', 403);
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // 1. Total revenue (from confirmed + used reservations)
    const revenueResult = await Reservation.aggregate([
      {
        $match: {
          eventId: eventObjectId,
          status: { $in: ['confirmed', 'used'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // 2. Reservations by status
    const reservationsByStatus = await Reservation.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
    ]);

    const statusBreakdown: Record<string, { count: number; revenue: number }> = {};
    let totalReservations = 0;
    for (const item of reservationsByStatus) {
      statusBreakdown[item._id] = { count: item.count, revenue: item.revenue };
      totalReservations += item.count;
    }

    // 3. Table status distribution and occupancy rate
    const tableStatusDist = await Table.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const tableStatus: Record<string, number> = {};
    let totalTables = 0;
    let soldTables = 0;
    for (const item of tableStatusDist) {
      tableStatus[item._id] = item.count;
      totalTables += item.count;
      if (item._id === 'sold') soldTables += item.count;
    }

    const occupancyRate = totalTables > 0 ? Math.round((soldTables / totalTables) * 100) : 0;

    // 4. Revenue by category
    const revenueByCategory = await Reservation.aggregate([
      {
        $match: {
          eventId: eventObjectId,
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
          categoryPrice: { $first: '$category.price' },
          reservationCount: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // 5. Sales over time (daily for last 30 days)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesOverTime = await Reservation.aggregate([
      {
        $match: {
          eventId: eventObjectId,
          status: { $in: ['confirmed', 'used'] },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 6. Top promoters by sales
    const topPromoters = await Reservation.aggregate([
      {
        $match: {
          eventId: eventObjectId,
          promoterId: { $ne: null },
          status: { $in: ['confirmed', 'used'] },
        },
      },
      {
        $group: {
          _id: '$promoterId',
          reservationCount: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'promoters',
          let: { userId: '$_id', eventId: eventObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$eventId', '$$eventId'] },
                  ],
                },
              },
            },
          ],
          as: 'promoter',
        },
      },
      { $unwind: { path: '$promoter', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          reservationCount: 1,
          revenue: 1,
          userName: '$user.name',
          userEmail: '$user.email',
          commissionRate: '$promoter.commissionRate',
          commission: {
            $multiply: ['$revenue', { $divide: ['$promoter.commissionRate', 100] }],
          },
          referralToken: '$promoter.referralToken',
        },
      },
    ]);

    // 7. Get categories list for this event
    const categories = await TableCategory.find({ eventId }).lean();

    return successResponse({
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        endDate: event.endDate,
        status: event.status,
        venue: event.venue,
      },
      totalRevenue,
      totalReservations,
      occupancyRate,
      totalTables,
      soldTables,
      reservationsByStatus: statusBreakdown,
      tableStatusDistribution: tableStatus,
      revenueByCategory,
      salesOverTime,
      topPromoters,
      categories,
    });
  } catch (error: any) {
    console.error('GET /api/analytics/[eventId] error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to fetch analytics', 500);
  }
}
