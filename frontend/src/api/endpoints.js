import api from './axios'

// Auth
export const authAPI = {
  login: (phone, password) => api.post('/auth/login/', { phone, password }),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  changePPPoEPassword: (data) => api.post('/auth/change-pppoe-password/', data),
}

// Payments
export const paymentsAPI = {
  getHistory: () => api.get('/payments/history/'),
  create: (data) => api.post('/payments/create/', data),
  getStatus: (paymentId) => api.get(`/payments/status/${paymentId}/`),
  calculate: (data) => api.post('/payments/calculate/', data),
}

// MikroTik
export const mikrotikAPI = {
  getMyStatus: () => api.get('/mikrotik/my-status/'),
}

// Admin
export const adminAPI = {
  getClients: (params) => api.get('/admin/clients/', { params }),
  createClient: (data) => api.post('/admin/clients/create/', data),
  getClient: (id) => api.get(`/admin/clients/${id}/`),
  updateClient: (id, data) => api.patch(`/admin/clients/${id}/`, data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}/`),
  changeTariff: (id, tariff) => api.post(`/admin/clients/${id}/tariff/`, { tariff }),
  extendSubscription: (id, data) => api.post(`/admin/clients/${id}/extend/`, data),
  toggleClient: (id, action) => api.post(`/admin/clients/${id}/toggle/`, { action }),
  getStatistics: () => api.get('/admin/statistics/'),
  getPayments: () => api.get('/admin/payments/'),
}
