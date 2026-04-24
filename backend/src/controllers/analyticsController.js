const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;
const ALLOWED_PERIODS = ['daily', 'weekly', 'monthly'];
const CATEGORIES = ['ac', 'water_tank'];

function createValidationError(message) {
  const error = new Error(message);
  error.isValidationError = true;
  return error;
}

function startOfMonthUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUTC(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDaysUTC(date, days) {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function formatDailyLabelUTC(date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthlyLabelUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getIsoWeekYearAndWeekUTC(date) {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const isoYear = tmp.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return { isoYear, week };
}

function formatWeeklyLabelUTC(date) {
  const { isoYear, week } = getIsoWeekYearAndWeekUTC(date);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

function startOfIsoWeekUTC(date) {
  const out = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const day = out.getUTCDay() || 7;
  out.setUTCDate(out.getUTCDate() - day + 1);
  return out;
}

function addWeeksUTC(date, weeks) {
  return addDaysUTC(date, weeks * 7);
}

function parseDays(rawValue) {
  if (rawValue === undefined) return DEFAULT_DAYS;
  const value = String(rawValue).trim();
  if (!/^\d+$/.test(value)) {
    throw createValidationError('days must be a positive integer');
  }
  const parsed = Number(value);
  if (parsed < 1) {
    throw createValidationError('days must be a positive integer');
  }
  return Math.min(parsed, MAX_DAYS);
}

function parsePeriod(rawValue) {
  if (rawValue === undefined) return 'daily';
  const value = String(rawValue).trim().toLowerCase();
  if (!ALLOWED_PERIODS.includes(value)) {
    throw createValidationError(`period must be one of: ${ALLOWED_PERIODS.join(', ')}`);
  }
  return value;
}

function buildTrendLabels(period, startDate, endDateExclusive) {
  const labels = [];

  if (period === 'daily') {
    let cursor = startOfDayUTC(startDate);
    while (cursor < endDateExclusive) {
      labels.push(formatDailyLabelUTC(cursor));
      cursor = addDaysUTC(cursor, 1);
    }
    return labels;
  }

  if (period === 'weekly') {
    let cursor = startOfIsoWeekUTC(startDate);
    while (cursor < endDateExclusive) {
      labels.push(formatWeeklyLabelUTC(cursor));
      cursor = addWeeksUTC(cursor, 1);
    }
    return labels;
  }

  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  while (cursor < endDateExclusive) {
    labels.push(formatMonthlyLabelUTC(cursor));
    cursor = addMonthsUTC(cursor, 1);
  }
  return labels;
}

const getAnalyticsSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const thisMonthStart = startOfMonthUTC(now);
    const nextMonthStart = addMonthsUTC(thisMonthStart, 1);
    const lastMonthStart = addMonthsUTC(thisMonthStart, -1);

    const [summary] = await Order.aggregate([
      {
        $facet: {
          orderStatuses: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          paidRevenue: [
            {
              $match: { paymentStatus: 'paid' },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' },
                thisMonth: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$paidAt', thisMonthStart] },
                          { $lt: ['$paidAt', nextMonthStart] },
                        ],
                      },
                      '$totalAmount',
                      0,
                    ],
                  },
                },
                lastMonth: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$paidAt', lastMonthStart] },
                          { $lt: ['$paidAt', thisMonthStart] },
                        ],
                      },
                      '$totalAmount',
                      0,
                    ],
                  },
                },
              },
            },
          ],
          paymentCounts: [
            {
              $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 },
              },
            },
          ],
          activeUsersThisMonth: [
            {
              $match: {
                createdAt: {
                  $gte: thisMonthStart,
                  $lt: nextMonthStart,
                },
              },
            },
            {
              $group: {
                _id: '$user',
              },
            },
            {
              $count: 'count',
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          pipeline: [{ $count: 'count' }],
          as: 'usersTotal',
        },
      },
      {
        $lookup: {
          from: 'services',
          pipeline: [
            {
              $group: {
                _id: '$isActive',
                count: { $sum: 1 },
              },
            },
          ],
          as: 'serviceCounts',
        },
      },
    ]);

    const ordersByStatus = {
      pending_review: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalOrders = 0;
    for (const row of summary?.orderStatuses || []) {
      totalOrders += row.count || 0;
      if (Object.prototype.hasOwnProperty.call(ordersByStatus, row._id)) {
        ordersByStatus[row._id] = row.count || 0;
      }
    }

    const paymentCounts = { paid: 0, unpaid: 0 };
    for (const row of summary?.paymentCounts || []) {
      if (row._id === 'paid') paymentCounts.paid = row.count || 0;
      if (row._id === 'unpaid') paymentCounts.unpaid = row.count || 0;
    }

    const paidRevenue = summary?.paidRevenue?.[0] || {};

    let activeServices = 0;
    let inactiveServices = 0;
    for (const row of summary?.serviceCounts || []) {
      if (row._id === true) activeServices = row.count || 0;
      if (row._id === false) inactiveServices = row.count || 0;
    }

    const usersTotal = summary?.usersTotal?.[0]?.count || 0;
    const activeUsersThisMonth = summary?.activeUsersThisMonth?.[0]?.count || 0;

    return successResponse(
      res,
      {
        orders: {
          total: totalOrders,
          pending_review: ordersByStatus.pending_review,
          confirmed: ordersByStatus.confirmed,
          completed: ordersByStatus.completed,
          cancelled: ordersByStatus.cancelled,
        },
        revenue: {
          total: paidRevenue.total || 0,
          thisMonth: paidRevenue.thisMonth || 0,
          lastMonth: paidRevenue.lastMonth || 0,
        },
        payments: {
          totalPaid: paymentCounts.paid,
          totalUnpaid: paymentCounts.unpaid,
        },
        users: {
          total: usersTotal,
          activeThisMonth: activeUsersThisMonth,
        },
        services: {
          total: activeServices + inactiveServices,
          active: activeServices,
          inactive: inactiveServices,
        },
      },
      'Summary fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

const getOrderTrends = async (req, res, next) => {
  try {
    const period = parsePeriod(req.query.period);
    const days = parseDays(req.query.days);

    const now = new Date();
    const endDateExclusive = addDaysUTC(startOfDayUTC(now), 1);
    const startDate = addDaysUTC(endDateExclusive, -days);

    const labelExpr = (() => {
      if (period === 'daily') {
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
        };
      }

      if (period === 'weekly') {
        return {
          $dateToString: { format: '%G-W%V', date: '$createdAt', timezone: 'UTC' },
        };
      }

      return {
        $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' },
      };
    })();

    const trendRows = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDateExclusive,
          },
        },
      },
      {
        $group: {
          _id: labelExpr,
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          label: '$_id',
          count: 1,
          revenue: 1,
        },
      },
      {
        $sort: { label: 1 },
      },
    ]);

    const byLabel = new Map(trendRows.map((row) => [row.label, row]));
    const labels = buildTrendLabels(period, startDate, endDateExclusive);

    const trends = labels.map((label) => {
      const row = byLabel.get(label);
      return {
        label,
        count: row?.count || 0,
        revenue: row?.revenue || 0,
      };
    });

    return successResponse(
      res,
      {
        period,
        days,
        trends,
      },
      'Order trends fetched successfully'
    );
  } catch (error) {
    if (error.isValidationError) {
      return errorResponse(res, error.message, 'BAD_REQUEST', 400);
    }
    next(error);
  }
};

const getRevenueBreakdown = async (req, res, next) => {
  try {
    const rows = await Order.aggregate([
      {
        $match: { paymentStatus: 'paid' },
      },
      {
        $unwind: '$services',
      },
      {
        $lookup: {
          from: 'services',
          localField: 'services.serviceId',
          foreignField: '_id',
          as: 'serviceMeta',
        },
      },
      {
        $unwind: {
          path: '$serviceMeta',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'serviceMeta.category': { $in: CATEGORIES },
        },
      },
      {
        $group: {
          _id: '$serviceMeta.category',
          revenue: { $sum: '$services.lineTotal' },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          revenue: 1,
          orderCount: { $size: '$orderIds' },
        },
      },
    ]);

    const byCategory = new Map(rows.map((row) => [row.category, row]));
    const breakdown = CATEGORIES.map((category) => {
      const row = byCategory.get(category);
      return {
        category,
        revenue: row?.revenue || 0,
        orderCount: row?.orderCount || 0,
      };
    });

    return successResponse(
      res,
      { breakdown },
      'Revenue breakdown fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalyticsSummary,
  getOrderTrends,
  getRevenueBreakdown,
};
