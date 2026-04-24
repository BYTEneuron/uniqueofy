import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  IndianRupee,
  ReceiptText,
  TrendingUp,
  Users,
  RefreshCcw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import api from '../../api/axios';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { formatCurrency, formatDate, truncateOrderId, formatEnumLabel } from '../../utils/adminUtils';

const PERIODS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const DONUT_COLORS = {
  ac: 'hsl(var(--primary))',
  water_tank: 'hsl(var(--secondary-foreground))',
};

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-16" />
      </CardContent>
    </Card>
  );
}

function getStatusBadgeClass(status) {
  if (status === 'pending_review') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (status === 'confirmed') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'completed') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function getPaymentBadgeClass(status) {
  if (status === 'paid') return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function TrendsTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const count = payload.find((entry) => entry.dataKey === 'count')?.value || 0;
  const revenue = payload.find((entry) => entry.dataKey === 'revenue')?.value || 0;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="text-sm text-slate-700">Orders: {count}</p>
      <p className="text-sm text-slate-700">Revenue: {formatCurrency(revenue)}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [period, setPeriod] = useState('daily');
  const [trendRows, setTrendRows] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [trendsError, setTrendsError] = useState('');

  const [breakdownRows, setBreakdownRows] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [breakdownError, setBreakdownError] = useState('');

  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');

    try {
      const response = await api.get('/admin/analytics/summary');
      setSummary(response.data?.data || null);
    } catch (error) {
      setSummaryError(error.response?.data?.message || 'Failed to load summary cards.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchTrends = async (nextPeriod = period) => {
    setTrendsLoading(true);
    setTrendsError('');

    try {
      const response = await api.get('/admin/analytics/order-trends', {
        params: { period: nextPeriod, days: 30 },
      });
      setTrendRows(response.data?.data?.trends || []);
    } catch (error) {
      setTrendsError(error.response?.data?.message || 'Failed to load order trends.');
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchBreakdown = async () => {
    setBreakdownLoading(true);
    setBreakdownError('');

    try {
      const response = await api.get('/admin/analytics/revenue-breakdown');
      setBreakdownRows(response.data?.data?.breakdown || []);
    } catch (error) {
      setBreakdownError(error.response?.data?.message || 'Failed to load revenue breakdown.');
    } finally {
      setBreakdownLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');

    try {
      const response = await api.get('/admin/orders', {
        params: {
          page: 1,
          limit: 5,
        },
      });
      setRecentOrders(response.data?.data?.orders || []);
    } catch (error) {
      setOrdersError(error.response?.data?.message || 'Failed to load recent orders.');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTrends(period);
  }, [period]);

  useEffect(() => {
    fetchBreakdown();
  }, []);

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        key: 'totalOrders',
        label: 'Total Orders',
        value: summary?.orders?.total ?? 0,
        icon: ReceiptText,
        subtitle: 'All-time orders',
        className: '',
      },
      {
        key: 'pendingReview',
        label: 'Pending Review',
        value: summary?.orders?.pending_review ?? 0,
        icon: Clock3,
        subtitle: 'Needs attention',
        className: 'border-amber-300 bg-amber-50',
      },
      {
        key: 'completedOrders',
        label: 'Completed Orders',
        value: summary?.orders?.completed ?? 0,
        icon: CheckCircle2,
        subtitle: 'Successfully finished',
        className: '',
      },
      {
        key: 'totalRevenue',
        label: 'Total Revenue',
        value: formatCurrency(summary?.revenue?.total ?? 0),
        icon: IndianRupee,
        subtitle: 'Paid revenue',
        className: '',
      },
      {
        key: 'thisMonthRevenue',
        label: 'This Month Revenue',
        value: formatCurrency(summary?.revenue?.thisMonth ?? 0),
        icon: TrendingUp,
        subtitle: 'Current month',
        className: '',
      },
      {
        key: 'totalUsers',
        label: 'Total Users',
        value: summary?.users?.total ?? 0,
        icon: Users,
        subtitle: 'Registered users',
        className: '',
      },
    ],
    [summary]
  );

  const chartReadyData = useMemo(() => {
    if (!Array.isArray(breakdownRows)) return [];

    return breakdownRows.map((row) => ({
      ...row,
      displayRevenue: Number(row.revenue) || 0,
      pieValue: Number(row.revenue) > 0 ? Number(row.revenue) : 0.0001,
    }));
  }, [breakdownRows]);

  const totalRevenue = useMemo(
    () => chartReadyData.reduce((acc, row) => acc + row.displayRevenue, 0),
    [chartReadyData]
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">Live snapshot of orders, revenue, and users.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryLoading
            ? Array.from({ length: 6 }).map((_, index) => <SummaryCardSkeleton key={index} />)
            : summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.key} className={card.className}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardDescription className="text-sm font-medium text-slate-600">{card.label}</CardDescription>
                      <Icon className="h-5 w-5 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</div>
                      <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {summaryError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{summaryError}</span>
            <Button variant="outline" className="h-8" onClick={fetchSummary}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-lg">Order Trends</CardTitle>
              <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
                {PERIODS.map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={period === item.value ? 'default' : 'ghost'}
                    disabled={trendsLoading}
                    onClick={() => setPeriod(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <CardDescription>Order volume and paid revenue across the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : trendsError ? (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{trendsError}</p>
                <Button variant="outline" onClick={() => fetchTrends(period)}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendRows} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value, index) => {
                        const step = isMobile ? 10 : 5;
                        return index % step === 0 ? value : '';
                      }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<TrendsTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} hide />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
            <CardDescription>Paid revenue split by service category.</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : breakdownError ? (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{breakdownError}</p>
                <Button variant="outline" onClick={fetchBreakdown}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartReadyData}
                        dataKey="pieValue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={80}
                        paddingAngle={2}
                        labelLine={false}
                        label={({ category }) => {
                          const row = chartReadyData.find((item) => item.category === category);
                          const percentage = totalRevenue > 0 ? ((row?.displayRevenue || 0) / totalRevenue) * 100 : 0;
                          return `${formatEnumLabel(category)} ${percentage.toFixed(0)}%`;
                        }}
                      >
                        {chartReadyData.map((entry) => (
                          <Cell key={entry.category} fill={DONUT_COLORS[entry.category] || 'hsl(var(--muted-foreground))'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, item) => {
                          const actual = item?.payload?.displayRevenue || 0;
                          return [formatCurrency(actual), name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {chartReadyData.map((entry) => (
                    <div key={entry.category} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[entry.category] || 'hsl(var(--muted-foreground))' }}
                        />
                        <span className="font-medium text-slate-700">{formatEnumLabel(entry.category)}</span>
                      </div>
                      <span className="text-slate-900">{formatCurrency(entry.displayRevenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <CardDescription>Latest 5 orders from the admin orders feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersError ? (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{ordersError}</p>
                <Button variant="outline" onClick={fetchRecentOrders}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                        </TableRow>
                      ))
                    : recentOrders.map((order) => {
                        const fullName = [order?.user?.firstName, order?.user?.lastName].filter(Boolean).join(' ').trim();
                        const customerName = fullName || order?.user?.phone || '-';

                        return (
                          <TableRow
                            key={order._id}
                            className="cursor-pointer"
                            onClick={() => navigate('/admin/orders')}
                          >
                            <TableCell className="font-medium">{truncateOrderId(order._id)}</TableCell>
                            <TableCell>{customerName}</TableCell>
                            <TableCell>{formatDate(order.serviceDate)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                                {formatEnumLabel(order.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getPaymentBadgeClass(order.paymentStatus)}`}>
                                {formatEnumLabel(order.paymentStatus)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                          </TableRow>
                        );
                      })}

                  {!ordersLoading && recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No recent orders found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end">
              <Link to="/admin/orders" className="text-sm font-medium text-blue-700 hover:underline">
                View all orders
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
