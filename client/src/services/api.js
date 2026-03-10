import axios from 'axios';
import { getApiBaseUrl } from '../utils/url';

const api = axios.create({
  baseURL: getApiBaseUrl()
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || '';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('name');
      localStorage.removeItem('email');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  sendVerificationCode: async (email) => {
    const response = await api.post('/auth/send-verification-code', { email });
    return response.data;
  },

  verifyContact: async (email, code) => {
    const response = await api.post('/auth/verify-contact', { email, code });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
  },

  getCurrentUser: () => ({
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
    name: localStorage.getItem('name'),
    email: localStorage.getItem('email')
  })
};

export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  }
};

export const orderService = {
  getAllOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  updateOrder: async (id, updateData) => {
    const response = await api.put(`/orders/${id}`, updateData);
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  requestCancellation: async (id, reason) => {
    const response = await api.post(`/orders/${id}/cancel-request`, { reason });
    return response.data;
  },

  approveCancellation: async (id, note) => {
    const response = await api.post(`/orders/${id}/cancel-approve`, { note });
    return response.data;
  },

  rejectCancellation: async (id, note) => {
    const response = await api.post(`/orders/${id}/cancel-reject`, { note });
    return response.data;
  },

  cancelOrder: async (id) => {
    const response = await api.put(`/orders/${id}/cancel`);
    return response.data;
  },

  deleteOrder: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },

  getCustomerOrders: async (customerId) => {
    const response = await api.get(`/orders/customer/${customerId}`);
    return response.data;
  }
};

export const inventoryService = {
  getAllItems: async () => {
    const response = await api.get('/inventory');
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  createItem: async (itemData) => {
    const response = await api.post('/inventory', itemData);
    return response.data;
  },

  updateItem: async (id, updateData) => {
    const response = await api.put(`/inventory/${id}`, updateData);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  },

  updateStock: async (id, quantity) => {
    const response = await api.patch(`/inventory/${id}/stock`, { quantity });
    return response.data;
  },

  getLowStockItems: async () => {
    const response = await api.get('/inventory/low-stock');
    return response.data;
  }
};

export const customerService = {
  getAllCustomers: async () => {
    const response = await api.get('/customers');
    return response.data;
  },

  getCustomerById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  updateCustomer: async (id, updateData) => {
    const response = await api.put(`/customers/${id}`, updateData);
    return response.data;
  },

  getCustomerStats: async (id) => {
    const response = await api.get(`/customers/${id}/stats`);
    return response.data;
  }
};

export const serviceService = {
  getAllServices: async () => {
    const response = await api.get('/services');
    return response.data;
  },

  getServiceById: async (id) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  createService: async (serviceData) => {
    const isFormData = serviceData instanceof FormData;
    const response = await api.post(
      '/services',
      serviceData,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data;
  },

  updateService: async (id, updateData) => {
    const isFormData = updateData instanceof FormData;
    const response = await api.put(
      `/services/${id}`,
      updateData,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data;
  },

  deleteService: async (id) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  }
};

export const reportService = {
  getSalesReport: async (period) => {
    const response = await api.get('/reports/sales', { params: { period } });
    return response.data;
  },

  getInventoryReport: async () => {
    const response = await api.get('/reports/inventory');
    return response.data;
  },

  getCustomerReport: async () => {
    const response = await api.get('/reports/customers');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  }
};

export const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  }
};

export const handleApiError = (error) => {
  if (error.response) {
    return {
      message: error.response.data.message || 'An error occurred',
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    return {
      message: 'Network error. Please check your connection.',
      status: 0
    };
  }
  return {
    message: error.message || 'An unexpected error occurred',
    status: 500
  };
};

export default api;
