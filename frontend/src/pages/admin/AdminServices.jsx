import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plus, Search, Trash2 } from 'lucide-react';

import api from '../../api/axios';
import { formatCurrency, formatDate, formatEnumLabel } from '../../utils/adminUtils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Skeleton } from '../../components/ui/skeleton';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useSearchParams } from 'react-router-dom';

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  isActive: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

const INITIAL_FORM = {
  name: '',
  description: '',
  category: 'ac',
  duration: '',
  price: '',
  isCustom: false,
  isActive: true,
};

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseFiltersFromSearchParams(searchParams) {
  const filters = {
    ...DEFAULT_FILTERS,
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    isActive: searchParams.get('isActive') || 'all',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: parseIntOrDefault(searchParams.get('page'), 1),
    limit: parseIntOrDefault(searchParams.get('limit'), 20),
  };

  if (!['ac', 'water_tank', ''].includes(filters.category)) filters.category = '';
  if (!['all', 'true', 'false'].includes(filters.isActive)) filters.isActive = 'all';
  if (!['name', 'price', 'category', 'createdAt'].includes(filters.sortBy)) filters.sortBy = 'createdAt';
  if (!['asc', 'desc'].includes(filters.sortOrder)) filters.sortOrder = 'desc';
  if (![10, 20, 50].includes(filters.limit)) filters.limit = 20;

  return filters;
}

function buildSearchParamsFromFilters(filters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.isActive !== 'all') params.set('isActive', filters.isActive);
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== DEFAULT_FILTERS.limit) params.set('limit', String(filters.limit));

  return params;
}

function normalizeService(service) {
  return {
    _id: service._id,
    name: service.name || '',
    description: service.description || '',
    category: service.category || 'ac',
    price: Number(service.price) || 0,
    duration: service.duration || '',
    isCustom: Boolean(service.isCustom),
    isActive: Boolean(service.isActive),
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

function serviceMatchesFilters(service, filters, searchTerm) {
  if (filters.category && service.category !== filters.category) return false;
  if (filters.isActive === 'true' && !service.isActive) return false;
  if (filters.isActive === 'false' && service.isActive) return false;

  const query = (searchTerm || '').trim().toLowerCase();
  if (!query) return true;

  return (
    service.name.toLowerCase().includes(query) ||
    service.description.toLowerCase().includes(query)
  );
}

function compareServices(a, b, sortBy, sortOrder) {
  const direction = sortOrder === 'asc' ? 1 : -1;

  if (sortBy === 'price') {
    return (a.price - b.price) * direction;
  }

  if (sortBy === 'createdAt') {
    return ((new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0)) * direction;
  }

  const aValue = String(a[sortBy] || '').toLowerCase();
  const bValue = String(b[sortBy] || '').toLowerCase();
  if (aValue < bValue) return -1 * direction;
  if (aValue > bValue) return 1 * direction;
  return 0;
}

export default function AdminServices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => parseFiltersFromSearchParams(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(() => parseFiltersFromSearchParams(searchParams).search);

  const [services, setServices] = useState([]);
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
  const [fetchNonce, setFetchNonce] = useState(0);

  const [actionError, setActionError] = useState('');
  const [activeAction, setActiveAction] = useState({ id: '', type: '' });

  const [pricePopoverId, setPricePopoverId] = useState('');
  const [priceDraft, setPriceDraft] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, service: null });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingServiceId, setEditingServiceId] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.search.trim() ||
      filters.category ||
      filters.isActive !== 'all' ||
      filters.sortBy !== DEFAULT_FILTERS.sortBy ||
      filters.sortOrder !== DEFAULT_FILTERS.sortOrder
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
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setFetchError('');

      try {
        const params = {
          page: filters.page,
          limit: filters.limit,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (filters.category) params.category = filters.category;
        if (filters.isActive !== 'all') params.isActive = filters.isActive;

        const response = await api.get('/admin/services', { params });
        const data = response.data?.data || {};

        setServices((data.services || []).map(normalizeService));
        setPagination(
          data.pagination || {
            total: 0,
            page: filters.page,
            limit: filters.limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          }
        );
      } catch (error) {
        setFetchError(error.response?.data?.message || 'Failed to fetch services.');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [
    filters.page,
    filters.limit,
    filters.category,
    filters.isActive,
    filters.sortBy,
    filters.sortOrder,
    debouncedSearch,
    fetchNonce,
  ]);

  useEffect(() => {
    const totalPages = pagination.totalPages || 0;
    if (totalPages > 0 && filters.page > totalPages) {
      setFilters((prev) => ({ ...prev, page: 1 }));
    }
  }, [filters.page, pagination.totalPages]);

  const updateFilters = (partial, resetPage = true) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: resetPage ? 1 : (partial.page ?? prev.page),
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActionError('');
  };

  const updateServiceInList = (service, options = {}) => {
    const normalized = normalizeService(service);
    const shouldMatch = serviceMatchesFilters(normalized, filters, debouncedSearch);

    setServices((prev) => {
      const withoutCurrent = prev.filter((row) => row._id !== normalized._id);
      if (!shouldMatch) return withoutCurrent;

      const next = [normalized, ...withoutCurrent].sort((a, b) => compareServices(a, b, filters.sortBy, filters.sortOrder));
      return next.slice(0, pagination.limit || filters.limit);
    });

    setPagination((prev) => {
      const isExisting = services.some((row) => row._id === normalized._id);
      if (options.created && shouldMatch) {
        const total = prev.total + 1;
        const totalPages = Math.ceil(total / (prev.limit || filters.limit)) || 1;
        return {
          ...prev,
          total,
          totalPages,
          hasNextPage: (prev.page || 1) < totalPages,
        };
      }

      if (!isExisting) return prev;
      if (options.removed && !shouldMatch) {
        const total = Math.max(0, prev.total - 1);
        const totalPages = total === 0 ? 0 : Math.ceil(total / (prev.limit || filters.limit));
        return {
          ...prev,
          total,
          totalPages,
          hasNextPage: (prev.page || 1) < totalPages,
        };
      }

      return prev;
    });
  };

  const openCreateDialog = () => {
    setEditorMode('create');
    setEditingServiceId('');
    setForm(INITIAL_FORM);
    setFormError('');
    setEditorOpen(true);
  };

  const openEditDialog = (service) => {
    setEditorMode('edit');
    setEditingServiceId(service._id);
    setForm({
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.duration,
      price: String(service.price),
      isCustom: Boolean(service.isCustom),
      isActive: Boolean(service.isActive),
    });
    setFormError('');
    setEditorOpen(true);
  };

  const validateForm = () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const duration = form.duration.trim();
    const price = Number(form.price);

    if (name.length < 3) return 'Name must be at least 3 characters.';
    if (description.length < 5) return 'Description must be at least 5 characters.';
    if (!['ac', 'water_tank'].includes(form.category)) return 'Please choose a valid category.';
    if (duration.length < 3) return 'Duration must be at least 3 characters.';
    if (!Number.isFinite(price) || price < 0) return 'Price must be 0 or greater.';

    return '';
  };

  const handleSaveForm = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSavingForm(true);
    setFormError('');
    setActionError('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      duration: form.duration.trim(),
      price: Number(form.price),
      isCustom: Boolean(form.isCustom),
      isActive: Boolean(form.isActive),
    };

    try {
      if (editorMode === 'create') {
        const response = await api.post('/services', payload);
        const createdService = response.data?.data;
        if (createdService) {
          updateServiceInList(createdService, { created: true });
        }
      } else {
        const response = await api.put(`/services/${editingServiceId}`, payload);
        const updatedService = response.data?.data;
        if (updatedService) {
          updateServiceInList(updatedService);
        }
      }

      setEditorOpen(false);
      setEditingServiceId('');
      setForm(INITIAL_FORM);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to save service.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleToggleActive = async (service) => {
    setActiveAction({ id: service._id, type: 'toggle' });
    setActionError('');

    try {
      const response = await api.patch(`/admin/services/${service._id}/activate`);
      const updated = response.data?.data;
      if (updated) {
        const next = normalizeService(updated);
        const stillMatches = serviceMatchesFilters(next, filters, debouncedSearch);

        setServices((prev) => {
          if (!stillMatches) {
            return prev.filter((row) => row._id !== service._id);
          }

          return prev
            .map((row) => (row._id === service._id ? next : row))
            .sort((a, b) => compareServices(a, b, filters.sortBy, filters.sortOrder));
        });

        if (!stillMatches) {
          setPagination((prev) => {
            const total = Math.max(0, prev.total - 1);
            const totalPages = total === 0 ? 0 : Math.ceil(total / (prev.limit || filters.limit));
            return {
              ...prev,
              total,
              totalPages,
              hasNextPage: (prev.page || 1) < totalPages,
            };
          });
        }
      }
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to update service status.');
    } finally {
      setActiveAction({ id: '', type: '' });
    }
  };

  const openPriceEditor = (service) => {
    setPricePopoverId(service._id);
    setPriceDraft(String(service.price));
    setActionError('');
  };

  const handleUpdatePrice = async (service) => {
    const price = Number(priceDraft);
    if (!Number.isFinite(price) || price < 0) {
      setActionError('Price must be 0 or greater.');
      return;
    }

    setActiveAction({ id: service._id, type: 'price' });
    setActionError('');

    try {
      const response = await api.patch(`/admin/services/${service._id}/price`, { price });
      const updated = response.data?.data;
      if (updated) {
        const normalized = normalizeService(updated);
        setServices((prev) =>
          prev
            .map((row) => (row._id === service._id ? normalized : row))
            .sort((a, b) => compareServices(a, b, filters.sortBy, filters.sortOrder))
        );
      }
      setPricePopoverId('');
      setPriceDraft('');
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to update service price.');
    } finally {
      setActiveAction({ id: '', type: '' });
    }
  };

  const confirmDelete = (service) => {
    setDeleteDialog({ open: true, service });
    setActionError('');
  };

  const runDelete = async () => {
    if (!deleteDialog.service) return;

    const service = deleteDialog.service;
    setActiveAction({ id: service._id, type: 'delete' });

    try {
      await api.delete(`/services/${service._id}`);

      setServices((prev) => prev.filter((row) => row._id !== service._id));
      setPagination((prev) => {
        const total = Math.max(0, prev.total - 1);
        const totalPages = total === 0 ? 0 : Math.ceil(total / (prev.limit || filters.limit));
        return {
          ...prev,
          total,
          totalPages,
          hasNextPage: (prev.page || 1) < totalPages,
        };
      });

      setDeleteDialog({ open: false, service: null });
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to delete service.');
    } finally {
      setActiveAction({ id: '', type: '' });
    }
  };

  const total = pagination.total || 0;
  const page = pagination.page || filters.page;
  const limit = pagination.limit || filters.limit;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Services Catalog</h1>
          <p className="text-sm text-slate-600">Manage services, pricing, and availability.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </section>

      <section className="rounded-lg border bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Search service name or description"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
            <Select value={filters.category} onChange={(event) => updateFilters({ category: event.target.value })}>
              <option value="">All</option>
              <option value="ac">AC</option>
              <option value="water_tank">Water Tank</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
            <Select value={filters.isActive} onChange={(event) => updateFilters({ isActive: event.target.value })}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Sort By</label>
            <Select value={filters.sortBy} onChange={(event) => updateFilters({ sortBy: event.target.value })}>
              <option value="createdAt">Created At</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="category">Category</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Order</label>
            <Select value={filters.sortOrder} onChange={(event) => updateFilters({ sortOrder: event.target.value })}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
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
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Custom</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`service-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  </TableRow>
                ))
              : null}

            {!loading && fetchError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <p>{fetchError}</p>
                    <Button variant="outline" onClick={() => setFetchNonce((prev) => prev + 1)}>Retry</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && !fetchError && services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">No services found for the current filters.</p>
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && !fetchError && services.length > 0
              ? services.map((service) => {
                  const isToggling = activeAction.id === service._id && activeAction.type === 'toggle';
                  const isDeleting = activeAction.id === service._id && activeAction.type === 'delete';
                  const isUpdatingPrice = activeAction.id === service._id && activeAction.type === 'price';

                  return (
                    <TableRow key={service._id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{service.name}</div>
                        <div className="line-clamp-1 text-xs text-slate-500">{service.description}</div>
                      </TableCell>
                      <TableCell>{formatEnumLabel(service.category)}</TableCell>
                      <TableCell>{service.duration || '-'}</TableCell>
                      <TableCell>{formatCurrency(service.price)}</TableCell>
                      <TableCell>{service.isCustom ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={service.isActive}
                            onCheckedChange={() => handleToggleActive(service)}
                            disabled={isToggling}
                          />
                          <span className="text-xs text-slate-600">{service.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(service.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Popover
                            open={pricePopoverId === service._id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setPricePopoverId('');
                                setPriceDraft('');
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPriceEditor(service)}
                              >
                                Price
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-56 space-y-3">
                              <div className="space-y-1">
                                <Label htmlFor={`price-${service._id}`}>Update Price</Label>
                                <Input
                                  id={`price-${service._id}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={priceDraft}
                                  onChange={(event) => setPriceDraft(event.target.value)}
                                />
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md"
                                onClick={() => handleUpdatePrice(service)}
                                disabled={isUpdatingPrice}
                              >
                                {isUpdatingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Price
                              </Button>
                            </PopoverContent>
                          </Popover>

                          <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>Edit</Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => confirmDelete(service)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                          </Button>
                        </div>
                      </TableCell>
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
            ? 'Showing 0 services'
            : `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total} services`}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page</span>
            <Select
              value={String(filters.limit)}
              onChange={(event) => updateFilters({ limit: Number(event.target.value), page: 1 }, false)}
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

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setFormError('');
            setEditingServiceId('');
            setForm(INITIAL_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editorMode === 'create' ? 'Create Service' : 'Edit Service'}</DialogTitle>
            <DialogDescription>
              {editorMode === 'create'
                ? 'Add a new catalog service with pricing and visibility controls.'
                : 'Update service details and catalog settings.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="service-name">Name</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="service-description">Description</Label>
              <Textarea
                id="service-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="service-category">Category</Label>
              <Select
                id="service-category"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="ac">AC</option>
                <option value="water_tank">Water Tank</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="service-duration">Duration</Label>
              <Input
                id="service-duration"
                value={form.duration}
                onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                placeholder="e.g. 1 hour"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="service-price">Price</Label>
              <Input
                id="service-price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2">
                <Checkbox
                  checked={form.isCustom}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isCustom: Boolean(checked) }))}
                />
                <span className="text-sm">Custom Service</span>
              </label>

              <label className="inline-flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: Boolean(checked) }))}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>

          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={savingForm}>Cancel</Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-md" onClick={handleSaveForm} disabled={savingForm}>
              {savingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editorMode === 'create' ? 'Create Service' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, service: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.service
                ? `Delete ${deleteDialog.service.name}? This action cannot be undone.`
                : 'Confirm deletion.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(activeAction.id)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} disabled={Boolean(activeAction.id)}>
              {activeAction.type === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
