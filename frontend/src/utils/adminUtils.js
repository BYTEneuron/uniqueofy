export function formatCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function truncateOrderId(orderId) {
  if (!orderId) return '-';
  const text = String(orderId);
  return text.slice(-8);
}

export const formatEnumLabel = (value) => {
  const labels = {
    pending_review: 'Pending Review',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    unpaid: 'Unpaid',
    paid: 'Paid',
    ac: 'AC',
    water_tank: 'Water Tank',
  };

  return labels[value] || value;
};

export function formatRelativeTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const make = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ${future ? 'from now' : 'ago'}`;

  if (absMs < minute) return future ? 'just now' : 'just now';
  if (absMs < hour) return make(Math.floor(absMs / minute), 'minute');
  if (absMs < day) return make(Math.floor(absMs / hour), 'hour');
  return make(Math.floor(absMs / day), 'day');
}
