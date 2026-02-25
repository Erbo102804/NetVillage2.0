import api from './axios'
import { mockAuth, mockMikrotik, mockPaymentsApi, mockAdmin } from './mockApi'

// Demo mode: enabled when VITE_DEMO=true OR when backend returns network errors
const DEMO_MODE = import.meta.env.VITE_DEMO === 'true'

// Wrap: try real API, fall back to mock on network/server error
function withMockFallback(realFn, mockFn) {
  return async (...args) => {
    if (DEMO_MODE) {
      const result = await mockFn(...args)
      return { data: result }
    }
    try {
      return await realFn(...args)
    } catch (err) {
      // Network error or 5xx → use mock
      if (!err.response || err.response.status >= 500) {
        console.warn('[Demo mode activated] Backend unavailable, using mock data')
        localStorage.setItem('demo_mode_active', 'true')
        const result = await mockFn(...args)
        return { data: result }
      }
      throw err
    }
  }
}

// Auth
export const authAPI = {
  login: async (phone, password) => {
    if (DEMO_MODE || localStorage.getItem('demo_mode_active')) {
      const result = await mockAuth.login(phone, password)
      return { data: result }
    }
    try {
      return await api.post('/auth/login/', { phone, password })
    } catch (err) {
      if (!err.response) {
        localStorage.setItem('demo_mode_active', 'true')
        const result = await mockAuth.login(phone, password)
        return { data: result }
      }
      throw err
    }
  },

  logout: (refresh) => api.post('/auth/logout/', { refresh }).catch(() => {}),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),

  getProfile: withMockFallback(
    () => api.get('/auth/profile/'),
    () => mockAuth.getProfile()
  ),

  updateProfile: withMockFallback(
    (data) => api.patch('/auth/profile/', data),
    () => mockAuth.getProfile()
  ),

  changePassword: withMockFallback(
    (data) => api.post('/auth/change-password/', data),
    () => mockAuth.changePassword()
  ),

  changePPPoEPassword: withMockFallback(
    (data) => api.post('/auth/change-pppoe-password/', data),
    () => mockAuth.changePPPoEPassword()
  ),
}

// Payments
export const paymentsAPI = {
  getHistory: withMockFallback(
    () => api.get('/payments/history/'),
    () => mockPaymentsApi.getHistory()
  ),

  create: withMockFallback(
    (data) => api.post('/payments/create/', data),
    (data) => mockPaymentsApi.create(data.period_months)
  ),

  getStatus: withMockFallback(
    (id) => api.get(`/payments/status/${id}/`),
    (id) => mockPaymentsApi.getStatus(id)
  ),

  calculate: withMockFallback(
    (data) => api.post('/payments/calculate/', data),
    (data) => mockPaymentsApi.calculate(data.period_months)
  ),
}

// MikroTik
export const mikrotikAPI = {
  getMyStatus: withMockFallback(
    () => api.get('/mikrotik/my-status/'),
    () => mockMikrotik.getMyStatus()
  ),
}

// Admin
export const adminAPI = {
  getClients: withMockFallback(
    (params) => api.get('/admin/clients/', { params }),
    (params) => mockAdmin.getClients(params)
  ),

  createClient: withMockFallback(
    (data) => api.post('/admin/clients/create/', data),
    (data) => mockAdmin.createClient(data)
  ),

  getClient: withMockFallback(
    (id) => api.get(`/admin/clients/${id}/`),
    (id) => mockAdmin.getClient(id)
  ),

  updateClient: withMockFallback(
    (id, data) => api.patch(`/admin/clients/${id}/`, data),
    (id, data) => mockAdmin.updateClient(id, data)
  ),

  deleteClient: withMockFallback(
    (id) => api.delete(`/admin/clients/${id}/`),
    (id) => mockAdmin.deleteClient(id)
  ),

  changeTariff: withMockFallback(
    (id, tariff) => api.post(`/admin/clients/${id}/tariff/`, { tariff }),
    (id, tariff) => mockAdmin.changeTariff(id, tariff)
  ),

  extendSubscription: withMockFallback(
    (id, data) => api.post(`/admin/clients/${id}/extend/`, data),
    (id, data) => mockAdmin.extendSubscription(id, data)
  ),

  toggleClient: withMockFallback(
    (id, action) => api.post(`/admin/clients/${id}/toggle/`, { action }),
    (id, action) => mockAdmin.toggleClient(id, action)
  ),

  getStatistics: withMockFallback(
    () => api.get('/admin/statistics/'),
    () => mockAdmin.getStatistics()
  ),

  getPayments: withMockFallback(
    () => api.get('/admin/payments/'),
    () => mockAdmin.getPayments()
  ),
}
