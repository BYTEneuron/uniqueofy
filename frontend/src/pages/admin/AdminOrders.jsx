import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';

import api from '../../api/axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  formatRelativeTime,
  truncateOrderId,
} from '../../utils/adminUtils';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  paymentStatus: '',
  serviceDateFrom: '',
  serviceDateTo: '',
  sortBy: '',
  sortOrder: '',
  page: 1,
  limit: 20,
};

const ORDER_STATUSES = ['pending_review', 'confirmed', 'completed', 'cancelled'];
const PAYMENT_STATUSES = ['paid', 'unpaid'];
const SORTABLE_COLUMNS = ['createdAt', 'serviceDate', 'totalAmount'];

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseFiltersFromSearchParams(searchParams) {
  const next = {
    ...DEFAULT_FILTERS,
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    paymentStatus: searchParams.get('paymentStatus') || '',
    serviceDateFrom: searchParams.get('serviceDateFrom') || '',
    serviceDateTo: searchParams.get('serviceDateTo') || '',
    sortBy: searchParams.get('sortBy') || '',
    sortOrder: searchParams.get('sortOrder') || '',
    page: parseIntOrDefault(searchParams.get('page'), 1),
    limit: parseIntOrDefault(searchParams.get('limit'), 20),
  };

  if (!ORDER_STATUSES.includes(next.status)) next.status = '';
  if (!PAYMENT_STATUSES.includes(next.paymentStatus)) next.paymentStatus = '';
  if (!SORTABLE_COLUMNS.includes(next.sortBy)) {
    next.sortBy = '';
    next.sortOrder = '';
  }
  if (!['asc', 'desc'].includes(next.sortOrder)) next.sortOrder = '';

  if (![10, 20, 50].includes(next.limit)) {
    next.limit = 20;
  }

  return next;
}

function buildSearchParamsFromFilters(filters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.status) params.set('status', filters.status);
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
  if (filters.serviceDateFrom) params.set('serviceDateFrom', filters.serviceDateFrom);
  if (filters.serviceDateTo) params.set('serviceDateTo', filters.serviceDateTo);
  if (filters.sortBy && filters.sortOrder) {
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
  }
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 20) params.set('limit', String(filters.limit));

  return params;
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

function getAvailableActions(order) {
  if (!order) return [];

  if (order.status === 'pending_review') {
    return [
      { key: 'confirm', label: 'Confirm', tone: 'default' },
      { key: 'cancel', label: 'Cancel', tone: 'destructive' },
    ];
  }

  if (order.status === 'confirmed' && order.paymentStatus === 'unpaid') {
    return [
      { key: 'mark-paid', label: 'Mark Paid', tone: 'default' },
      { key: 'cancel', label: 'Cancel', tone: 'destructive' },
    ];
  }

  if (order.status === 'confirmed' && order.paymentStatus === 'paid') {
    return [{ key: 'complete', label: 'Complete', tone: 'default' }];
  }

  return [];
}

function truncateServices(services) {
  if (!Array.isArray(services) || services.length === 0) return '-';
  const text = services.map((svc) => svc?.name).filter(Boolean).join(', ');
  if (!text) return '-';
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}

function applyActionUpdate(order, actionKey) {
  if (!order) return order;

  if (actionKey === 'confirm') {
    return { ...order, status: 'confirmed' };
  }

  if (actionKey === 'cancel') {
    return { ...order, status: 'cancelled' };
  }

  if (actionKey === 'mark-paid') {
    return { ...order, paymentStatus: 'paid', paidAt: new Date().toISOString() };
  }

  if (actionKey === 'complete') {
    return { ...order, status: 'completed', completedAt: new Date().toISOString() };
  }

  return order;
}

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => parseFiltersFromSearchParams(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(() => parseFiltersFromSearchParams(searchParams).search);

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [fetchNonce, setFetchNonce] = useState(0);

  const [activeDialog, setActiveDialog] = useState({
    open: false,
    action: null,
    order: null,
  });

  const [activeAction, setActiveAction] = useState({
    orderId: '',
    action: '',
  });

  const [drawerOrder, setDrawerOrder] = useState(null);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.search.trim() ||
      filters.status ||
      filters.paymentStatus ||
      filters.serviceDateFrom ||
      filters.serviceDateTo ||
      filters.sortBy ||
      filters.sortOrder
    );
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const params = buildSearchParamsFromFilters(filters);
    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setFetchError('');

      try {
        const params = {
          page: filters.page,
          limit: filters.limit,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (filters.status) params.status = filters.status;
        if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
        if (filters.serviceDateFrom) params.serviceDateFrom = filters.serviceDateFrom;
        if (filters.serviceDateTo) params.serviceDateTo = filters.serviceDateTo;
        if (filters.sortBy && filters.sortOrder) {
          params.sortBy = filters.sortBy;
          params.sortOrder = filters.sortOrder;
        }

        const response = await api.get('/admin/orders', { params });
        const data = response.data?.data || {};
        setOrders(data.orders || []);
        setPagination(data.pagination || {
          total: 0,
          page: filters.page,
          limit: filters.limit,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        });
      } catch (error) {
        setFetchError(error.response?.data?.message || 'Failed to fetch orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [
    filters.page,
    filters.limit,
    filters.status,
    filters.paymentStatus,
    filters.serviceDateFrom,
    filters.serviceDateTo,
    filters.sortBy,
    filters.sortOrder,
    debouncedSearch,
    fetchNonce,
  ]);

  useEffect(() => {
    const page = filters.page;
    const totalPages = pagination.totalPages || 0;

    if (totalPages > 0 && page > totalPages) {
      setSearchParams((prev) => {
        prev.set('page', '1');
        return prev;
      });

      setFilters((prev) => ({ ...prev, page: 1 }));
    }
  }, [filters.page, pagination.totalPages, setSearchParams]);

  const updateFilters = (partial, resetPage = true) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: resetPage ? 1 : (partial.page ?? prev.page),
    }));
  };

  const handleSortToggle = (column) => {
    setFilters((prev) => {
      if (prev.sortBy !== column) {
        return { ...prev, sortBy: column, sortOrder: 'asc', page: 1 };
      }

      if (prev.sortOrder === 'asc') {
        return { ...prev, sortOrder: 'desc', page: 1 };
      }

      if (prev.sortOrder === 'desc') {
        return { ...prev, sortBy: '', sortOrder: '', page: 1 };
      }

      return { ...prev, sortBy: column, sortOrder: 'asc', page: 1 };
    });
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActionError('');
  };

  const openActionDialog = (order, action) => {
    setActiveDialog({
      open: true,
      action,
      order,
    });
  };

  const closeActionDialog = () => {
    setActiveDialog({
      open: false,
      action: null,
      order: null,
    });
  };

  const runOrderAction = async () => {
    if (!activeDialog.order || !activeDialog.action) return;

    const order = activeDialog.order;
    const action = activeDialog.action;

    setActiveAction({ orderId: order._id, action: action.key });
    setActionError('');

    try {
      if (action.key === 'confirm') {
        await api.put(`/admin/orders/${order._id}/status`, { status: 'confirmed' });
      } else if (action.key === 'cancel') {
        await api.put(`/admin/orders/${order._id}/status`, { status: 'cancelled' });
      } else if (action.key === 'mark-paid') {
        await api.put(`/admin/orders/${order._id}/mark-paid`);
      } else if (action.key === 'complete') {
        await api.put(`/admin/orders/${order._id}/complete`);
      }

      setOrders((prev) => prev.map((row) => (row._id === order._id ? applyActionUpdate(row, action.key) : row)));
      setDrawerOrder((prev) => (prev && prev._id === order._id ? applyActionUpdate(prev, action.key) : prev));
      closeActionDialog();
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to update order.';
      setActionError(message);
      closeActionDialog();
    } finally {
      setActiveAction({ orderId: '', action: '' });
    }
  };

  const total = pagination.total || 0;
  const page = pagination.page || filters.page;
  const limit = pagination.limit || filters.limit;

  const renderSortIcon = (column) => {
    if (filters.sortBy !== column || !filters.sortOrder) {
      return <span className="text-slate-300">↕</span>;
    }

    return filters.sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-slate-700" />
    ) : (
      <ChevronDown className="h-4 w-4 text-slate-700" />
    );
  };

  const renderActions = (order) => {
    const actions = getAvailableActions(order);

    if (!actions.length) {
      return <span className="text-slate-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        {actions.map((action) => {
          const isBusy = activeAction.orderId === order._id && activeAction.action === action.key;
          const isDanger = action.tone === 'destructive';

          return (
            <Button
              key={action.key}
              size="sm"
              variant={isDanger ? 'outline' : 'default'}
              className={isDanger ? 'border-red-300 text-red-700 hover:bg-red-50' : ''}
              onClick={() => openActionDialog(order, action)}
              disabled={isBusy}
            >
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {action.label}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Search order, phone, customer"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
            <Select value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
              <option value="">All</option>
              <option value="pending_review">Pending Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Payment</label>
            <Select
              value={filters.paymentStatus}
              onChange={(event) => updateFilters({ paymentStatus: event.target.value })}
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">From</label>
            <Input
              type="date"
              value={filters.serviceDateFrom}
              onChange={(event) => updateFilters({ serviceDateFrom: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">To</label>
            <Input
              type="date"
              value={filters.serviceDateTo}
              onChange={(event) => updateFilters({ serviceDateTo: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleClearFilters}>Clear Filters</Button>
        </div>
      </section>

      {actionError ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{actionError}</span>
        </div>
      ) : null}

      <section className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left !ring-0 !outline-none focus:!ring-0 focus-visible:!ring-0 focus-visible:!outline-none border-none shadow-none"
                  onClick={() => handleSortToggle('serviceDate')}
                >
                  Service Date
                  {renderSortIcon('serviceDate')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left !ring-0 !outline-none focus:!ring-0 focus-visible:!ring-0 focus-visible:!outline-none border-none shadow-none"
                  onClick={() => handleSortToggle('createdAt')}
                >
                  Created At
                  {renderSortIcon('createdAt')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left !ring-0 !outline-none focus:!ring-0 focus-visible:!ring-0 focus-visible:!outline-none border-none shadow-none"
                  onClick={() => handleSortToggle('totalAmount')}
                >
                  Total Amount
                  {renderSortIcon('totalAmount')}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              : null}

            {!loading && fetchError ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <p>{fetchError}</p>
                    <Button variant="outline" onClick={() => setFetchNonce((prev) => prev + 1)}>Retry</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && !fetchError && orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">No orders found for the current filters.</p>
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={handleClearFilters}>Clear Filters</Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && !fetchError && orders.length > 0
              ? orders.map((order) => {
                  const fullName = [order?.user?.firstName, order?.user?.lastName].filter(Boolean).join(' ').trim();
                  const customerName = fullName || 'Unknown Customer';

                  return (
                    <TableRow
                      key={order._id}
                      className="cursor-pointer"
                      onClick={() => setDrawerOrder(order)}
                    >
                      <TableCell className="font-mono text-xs sm:text-sm">{truncateOrderId(order._id)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{customerName}</div>
                        <div className="text-xs text-slate-500">{order?.user?.phone || '-'}</div>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm text-slate-700">{truncateServices(order.services)}</TableCell>
                      <TableCell>{formatDate(order.serviceDate)}</TableCell>
                      <TableCell>{formatRelativeTime(order.createdAt)}</TableCell>
                      <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
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
                      <TableCell>{renderActions(order)}</TableCell>
                    </TableRow>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          {total === 0
            ? 'Showing 0 orders'
            : `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total} orders`}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page</span>
            <Select
              value={String(filters.limit)}
              onChange={(event) => {
                updateFilters({ limit: Number(event.target.value), page: 1 }, false);
              }}
              className="w-[88px]"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) }, false)}
            disabled={!pagination.hasPrevPage || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-700">Page {pagination.page || 1} of {pagination.totalPages || 1}</span>
          <Button
            variant="outline"
            onClick={() => updateFilters({ page: filters.page + 1 }, false)}
            disabled={!pagination.hasNextPage || loading}
          >
            Next
          </Button>
        </div>
      </section>

      <Sheet open={Boolean(drawerOrder)} onOpenChange={(open) => !open && setDrawerOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0">
          {drawerOrder ? (
            <div className="admin-shell h-full flex flex-col bg-white overflow-y-auto p-6">
              <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>Order Details</SheetTitle>
              </SheetHeader>

              <div className="rounded-md border p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p>
                <p className="mt-1 font-mono text-sm text-slate-900">{drawerOrder._id}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {[drawerOrder?.user?.firstName, drawerOrder?.user?.lastName].filter(Boolean).join(' ').trim() || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-slate-600">{drawerOrder?.user?.phone || '-'}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Service Date & Slot</p>
                  <p className="mt-1 text-sm text-slate-900">{formatDate(drawerOrder.serviceDate)}</p>
                  <p className="text-xs text-slate-600">{drawerOrder.timeSlot || '-'}</p>
                </div>
              </div>

              <div className="rounded-md border p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Services</p>
                <div className="space-y-2">
                  {(drawerOrder.services || []).map((service, index) => (
                    <div key={`${service.serviceId || service.name || index}-${index}`} className="rounded border px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{service.name || '-'}</div>
                      <div className="text-xs text-slate-600">
                        Qty {service.quantity || 1} • Unit {formatCurrency(service.unitPrice)} • Line {formatCurrency(service.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Address</p>
                <p className="mt-1 text-sm text-slate-900">{drawerOrder.address || '-'}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Note</p>
                <p className="mt-1 text-sm text-slate-900">{drawerOrder.note || '-'}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(drawerOrder.status)}`}>
                  {formatEnumLabel(drawerOrder.status)}
                </span>
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getPaymentBadgeClass(drawerOrder.paymentStatus)}`}>
                  {formatEnumLabel(drawerOrder.paymentStatus)}
                </span>
                <span className="ml-auto text-sm font-semibold text-slate-900">{formatCurrency(drawerOrder.totalAmount)}</span>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-4" onClick={(event) => event.stopPropagation()}>
                {getAvailableActions(drawerOrder).length === 0 ? (
                  <span className="text-sm text-slate-500">—</span>
                ) : (
                  getAvailableActions(drawerOrder).map((action) => {
                    const isBusy = activeAction.orderId === drawerOrder._id && activeAction.action === action.key;
                    const isDanger = action.tone === 'destructive';

                    return (
                      <Button
                        key={`drawer-${action.key}`}
                        size="sm"
                        variant={isDanger ? 'outline' : 'default'}
                        className={isDanger ? 'border-red-300 text-red-700 hover:bg-red-50' : ''}
                        onClick={() => openActionDialog(drawerOrder, action)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {action.label}
                      </Button>
                    );
                  })
                )}
              </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={activeDialog.open} onOpenChange={(open) => !open && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {activeDialog.order && activeDialog.action
                ? `Are you sure you want to ${activeDialog.action.label.toLowerCase()} order ${truncateOrderId(activeDialog.order._id)}?`
                : 'Please confirm this action.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(activeAction.orderId)}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={runOrderAction} disabled={Boolean(activeAction.orderId)}>
              {activeAction.orderId && activeAction.action ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
