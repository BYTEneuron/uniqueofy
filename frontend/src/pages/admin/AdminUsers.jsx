import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';

import api from '../../api/axios';
import { formatDate } from '../../utils/adminUtils';
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

function getFullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
}

function getProfileStatus(user) {
  return Boolean(user?.firstName && user?.lastName);
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchNonce, setFetchNonce] = useState(0);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/admin/users');
        setUsers(response.data?.data || []);
      } catch (nextError) {
        setError(nextError.response?.data?.message || 'Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [fetchNonce]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (statusFilter === 'active' && !user.isActive) return false;
      if (statusFilter === 'inactive' && user.isActive) return false;

      if (!normalizedSearch) return true;

      const fullName = getFullName(user).toLowerCase();
      const phone = String(user.phone || '').toLowerCase();

      return fullName.includes(normalizedSearch) || phone.includes(normalizedSearch);
    });
  }, [users, roleFilter, statusFilter, normalizedSearch]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.isActive).length;
    const admins = users.filter((user) => user.role === 'admin').length;
    const completedProfiles = users.filter((user) => getProfileStatus(user)).length;

    const filtered = filteredUsers.length;

    return {
      total,
      active,
      admins,
      completedProfiles,
      filtered,
    };
  }, [users, filteredUsers]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Users Directory</h1>
        <p className="text-sm text-slate-600">Read-only user directory with client-side filtering and quick stats.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </article>

        <article className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.active}</p>
        </article>

        <article className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Admins</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.admins}</p>
        </article>

        <article className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Profiles Completed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.completedProfiles}</p>
        </article>

        <article className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Filtered Results</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.filtered}</p>
        </article>
      </section>

      <section className="rounded-lg border bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search by name or phone"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Role</label>
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`user-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              : null}

            {!loading && error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                    <Button variant="outline" onClick={() => setFetchNonce((prev) => prev + 1)}>Retry</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && !error && filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-600">
                  No users match the current filters.
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && !error && filteredUsers.length > 0
              ? filteredUsers.map((user) => {
                  const fullName = getFullName(user);
                  const profileComplete = getProfileStatus(user);

                  return (
                    <TableRow key={user._id}>
                      <TableCell>
                        <span className="font-medium text-slate-900">{fullName || 'Profile not set'}</span>
                      </TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
                            user.isActive
                              ? 'border-green-200 bg-green-100 text-green-800'
                              : 'border-red-200 bg-red-100 text-red-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
                            profileComplete
                              ? 'border-blue-200 bg-blue-100 text-blue-800'
                              : 'border-amber-200 bg-amber-100 text-amber-800'
                          }`}
                        >
                          {profileComplete ? 'Completed' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
