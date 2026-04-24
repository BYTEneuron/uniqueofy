const ORDER_STATUSES = ['pending_review', 'confirmed', 'completed', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'paid'];
const ORDER_SORT_FIELDS = ['createdAt', 'serviceDate', 'totalAmount'];

const SERVICE_CATEGORIES = ['ac', 'water_tank'];
const SERVICE_SORT_FIELDS = ['name', 'price', 'category', 'createdAt'];

const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_SEARCH_LENGTH = 100;

function createValidationError(message) {
  const error = new Error(message);
  error.isValidationError = true;
  error.errorCode = 'BAD_REQUEST';
  return error;
}

function parseIntegerParam(rawValue, fieldName) {
  const value = String(rawValue).trim();
  if (!/^\d+$/.test(value)) {
    throw createValidationError(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function normalizePage(rawValue) {
  if (rawValue === undefined) return DEFAULT_PAGE;
  const page = parseIntegerParam(rawValue, 'page');
  if (page < 1) return 1;
  return page;
}

function normalizeLimit(rawValue) {
  if (rawValue === undefined) return DEFAULT_LIMIT;
  const limit = parseIntegerParam(rawValue, 'limit');
  if (limit < 1) {
    throw createValidationError('limit must be a positive integer');
  }
  return Math.min(limit, MAX_LIMIT);
}

function normalizeEnum(rawValue, fieldName, allowedValues) {
  if (rawValue === undefined) return undefined;
  const value = String(rawValue).trim();
  if (!allowedValues.includes(value)) {
    throw createValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  return value;
}

function normalizeSortOrder(rawValue, defaultValue) {
  if (rawValue === undefined) return defaultValue;
  const value = String(rawValue).trim().toLowerCase();
  if (!['asc', 'desc'].includes(value)) {
    throw createValidationError('sortOrder must be asc or desc');
  }
  return value;
}

function normalizeSearch(rawValue) {
  if (rawValue === undefined) return undefined;
  const value = String(rawValue).trim();
  if (!value) return undefined;
  if (value.length > MAX_SEARCH_LENGTH) {
    throw createValidationError(`search must not exceed ${MAX_SEARCH_LENGTH} characters`);
  }
  return value;
}

function normalizeDateParam(rawValue, fieldName, mode) {
  if (rawValue === undefined) return undefined;
  const value = String(rawValue).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createValidationError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createValidationError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
  }

  if (mode === 'start') {
    date.setUTCHours(0, 0, 0, 0);
  } else {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
}

function parseOrdersQuery(query) {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);

  const status = normalizeEnum(query.status, 'status', ORDER_STATUSES);
  const paymentStatus = normalizeEnum(query.paymentStatus, 'paymentStatus', PAYMENT_STATUSES);

  const sortBy = normalizeEnum(query.sortBy, 'sortBy', ORDER_SORT_FIELDS) || 'createdAt';
  const sortOrder = normalizeSortOrder(query.sortOrder, 'desc');

  const serviceDateFrom = normalizeDateParam(query.serviceDateFrom, 'serviceDateFrom', 'start');
  const serviceDateTo = normalizeDateParam(query.serviceDateTo, 'serviceDateTo', 'end');

  const search = normalizeSearch(query.search);

  return {
    page,
    limit,
    status,
    paymentStatus,
    serviceDateFrom,
    serviceDateTo,
    search,
    sortBy,
    sortOrder,
  };
}

function parseServicesQuery(query) {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);

  const category = normalizeEnum(query.category, 'category', SERVICE_CATEGORIES);

  let isActive;
  if (query.isActive !== undefined) {
    const raw = String(query.isActive).trim().toLowerCase();
    if (!['true', 'false'].includes(raw)) {
      throw createValidationError('isActive must be true or false');
    }
    isActive = raw === 'true';
  }

  const sortBy = normalizeEnum(query.sortBy, 'sortBy', SERVICE_SORT_FIELDS);
  const sortOrder = normalizeSortOrder(query.sortOrder, 'asc');

  const search = normalizeSearch(query.search);

  return {
    page,
    limit,
    category,
    isActive,
    search,
    sortBy,
    sortOrder,
  };
}

module.exports = {
  parseOrdersQuery,
  parseServicesQuery,
};
