import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

// SuperAdmin Audit Logs base URL
const AUDIT_API_URL = `${API_BASE_URL}/api/superadmin/audit-logs`;

// Axios instance
const auditClient = axios.create({
  baseURL: AUDIT_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: context-aware superadmin token
auditClient.interceptors.request.use(
  (config) => {
    const isSuperAdminContext = window.location.pathname.includes('/superadmin');
    let token = null;
    if (isSuperAdminContext) {
      token = AuthService.getToken('superadmin') || AuthService.getToken('super admin') || AuthService.getToken('admin');
    } else {
      token = AuthService.getToken('superadmin') || AuthService.getToken('super admin') || AuthService.getToken();
    }
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: superadmin-specific logout
auditClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      AuthService.logout(null, 'superadmin');
      if (!window.location.pathname.includes('/superadmin/login')) {
        window.location.href = '/superadmin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Normalize backend response into a common shape
const normalizeListResponse = (data) => {
  return {
    items: data?.items || data?.logs || data?.data || [],
    total: data?.total ?? data?.count ?? data?.total_count ?? (Array.isArray(data?.items || data?.logs || data?.data) ? (data?.items || data?.logs || data?.data).length : 0),
    page: data?.page ?? 1,
    limit: data?.limit ?? data?.per_page ?? 10,
  };
};

// Service
const AuditLogsService = {
  // GET list with filters and pagination
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.action && filters.action !== 'All') params.append('action', filters.action);
    if (filters.role && filters.role !== 'All') params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const url = params.toString() ? `/?${params.toString()}` : '/';
    const res = await auditClient.get(url);
    return normalizeListResponse(res.data);
  },

  // GET distinct action types
  getActions: async () => {
    const res = await auditClient.get('/actions');
    return res.data?.actions || res.data || [];
  },

  // GET by id
  getAuditLogById: async (id) => {
    const res = await auditClient.get(`/${id}`);
    return res.data;
  },

  // Export CSV with filters
  exportAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.action && filters.action !== 'All') params.append('action', filters.action);
    if (filters.role && filters.role !== 'All') params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const res = await auditClient.get(`/export/csv?${params.toString()}`, { responseType: 'blob' });
    return res.data;
  }
};

export default AuditLogsService;
