/**
 * Mock API — эмулирует backend ответы для демонстрации.
 * Активируется автоматически когда backend недоступен.
 */
import { DEMO_USERS, DEMO_PAYMENTS, DEMO_CLIENTS, DEMO_STATISTICS } from './mockData'
import { addDays, format } from 'date-fns'

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms))

let mockClients = [...DEMO_CLIENTS]
let mockPayments = [...DEMO_PAYMENTS]
let nextClientId = 20

// In-memory "session"
let currentUser = null

export const mockAuth = {
  async login(phone, password) {
    await delay(600)
    const user = DEMO_USERS[phone]
    if (!user) throw { response: { data: { detail: 'Пользователь не найден' } } }
    if (user.password !== password) throw { response: { data: { detail: 'Неверный пароль' } } }
    currentUser = user
    localStorage.setItem('demo_user_phone', phone)
    return {
      access: 'demo-access-token',
      refresh: 'demo-refresh-token',
      user,
    }
  },

  async getProfile() {
    await delay(300)
    const phone = localStorage.getItem('demo_user_phone')
    if (!phone || !DEMO_USERS[phone]) throw { response: { status: 401 } }
    return DEMO_USERS[phone]
  },

  async changePassword() {
    await delay(500)
    return { detail: 'Пароль успешно изменён' }
  },

  async changePPPoEPassword() {
    await delay(800)
    return { detail: 'PPPoE пароль успешно изменён. Переподключитесь.' }
  },
}

export const mockMikrotik = {
  async getMyStatus() {
    await delay(400)
    const phone = localStorage.getItem('demo_user_phone')
    const user = DEMO_USERS[phone]
    return {
      pppoe_login: user?.pppoe_login,
      profile: user?.tariff,
      expire_date: user?.subscription_end,
      is_active: user?.is_active_subscription,
      is_online: Math.random() > 0.3,
      disabled: false,
    }
  },
}

export const mockPaymentsApi = {
  async getHistory() {
    await delay(400)
    const phone = localStorage.getItem('demo_user_phone')
    const user = DEMO_USERS[phone]
    return mockPayments.filter(p => p.user === user?.id)
  },

  async create(periodMonths) {
    await delay(700)
    const phone = localStorage.getItem('demo_user_phone')
    const user = DEMO_USERS[phone]
    const prices = { 1: 1, 3: 0.93, 6: 0.87 }
    const total = Math.round(user.tariff_price * periodMonths * prices[periodMonths])
    const payment = {
      id: `pay-demo-${Date.now()}`,
      user: user.id,
      amount: String(total),
      period_months: periodMonths,
      period_label: periodMonths === 1 ? '1 месяц' : periodMonths === 3 ? '3 месяца' : '6 месяцев',
      status: 'pending',
      tariff: user.tariff,
      kaspi_qr_url: `https://kaspi.kz/pay/demo?amount=${total}&comment=NetVillage+${user.pppoe_login}`,
      extended_from: null,
      extended_to: null,
      discount_info: periodMonths === 3 ? '−7%' : periodMonths === 6 ? '−13%' : null,
      created_at: new Date().toISOString(),
      paid_at: null,
    }
    mockPayments = [payment, ...mockPayments]

    // Auto-confirm after 8 seconds (demo)
    setTimeout(() => {
      const idx = mockPayments.findIndex(p => p.id === payment.id)
      if (idx !== -1 && mockPayments[idx].status === 'pending') {
        const today = new Date()
        const curUser = DEMO_USERS[phone]
        const currentEnd = curUser.subscription_end ? new Date(curUser.subscription_end) : today
        const startFrom = currentEnd > today ? currentEnd : today
        const newEnd = addDays(startFrom, 30 * periodMonths)
        mockPayments[idx] = {
          ...mockPayments[idx],
          status: 'paid',
          extended_to: format(newEnd, 'yyyy-MM-dd'),
          paid_at: new Date().toISOString(),
        }
        DEMO_USERS[phone].subscription_end = format(newEnd, 'yyyy-MM-dd')
        DEMO_USERS[phone].is_active_subscription = true
        // Dispatch custom event for polling to pick up
        window.dispatchEvent(new CustomEvent('demo-payment-paid', { detail: { id: payment.id } }))
      }
    }, 8000)

    return {
      payment,
      amount_info: {
        tariff: user.tariff,
        period_months: periodMonths,
        base_price: user.tariff_price,
        total,
        discount: periodMonths > 1 ? {
          percent: periodMonths === 3 ? 7 : 13,
          saved: user.tariff_price * periodMonths - total,
        } : null,
      },
      qr_url: payment.kaspi_qr_url,
      payment_id: payment.id,
    }
  },

  async getStatus(paymentId) {
    await delay(200)
    return mockPayments.find(p => p.id === paymentId) || { status: 'pending', id: paymentId }
  },

  async calculate(periodMonths) {
    await delay(200)
    const phone = localStorage.getItem('demo_user_phone')
    const user = DEMO_USERS[phone]
    const prices = { 1: 1, 3: 0.93, 6: 0.87 }
    const total = Math.round(user.tariff_price * periodMonths * prices[periodMonths])
    return {
      tariff: user.tariff,
      period_months: periodMonths,
      base_price: user.tariff_price,
      total,
      discount: periodMonths > 1 ? {
        percent: periodMonths === 3 ? 7 : 13,
        saved: user.tariff_price * periodMonths - total,
      } : null,
    }
  },
}

export const mockAdmin = {
  async getClients(params = {}) {
    await delay(400)
    let result = [...mockClients]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.pppoe_login.toLowerCase().includes(q)
      )
    }
    if (params.tariff) result = result.filter(c => c.tariff === params.tariff)
    if (params.active === 'true') result = result.filter(c => c.is_active_subscription)
    if (params.active === 'false') result = result.filter(c => !c.is_active_subscription)
    return result
  },

  async getClient(id) {
    await delay(300)
    return mockClients.find(c => c.id === Number(id)) || null
  },

  async createClient(data) {
    await delay(800)
    const login = data.pppoe_login || data.full_name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 999)
    const newClient = {
      id: nextClientId++,
      phone: data.phone,
      full_name: data.full_name,
      username: login,
      pppoe_login: login,
      pppoe_password: data.pppoe_password || 'pass' + Math.floor(Math.random() * 9999),
      tariff: data.tariff,
      tariff_price: { 'tariff-5mbps': 3000, 'tariff-10mbps': 4500, 'tariff-15mbps': 6000, 'tariff-25mbps': 8500 }[data.tariff],
      tariff_speed: { 'tariff-5mbps': '5 Мбит/с', 'tariff-10mbps': '10 Мбит/с', 'tariff-15mbps': '15 Мбит/с', 'tariff-25mbps': '25 Мбит/с' }[data.tariff],
      is_active_subscription: true,
      subscription_end: format(addDays(new Date(), 30 * (data.subscription_months || 1)), 'yyyy-MM-dd'),
      payment_count: 0,
      last_payment: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockClients = [newClient, ...mockClients]
    return newClient
  },

  async updateClient(id, data) {
    await delay(400)
    const idx = mockClients.findIndex(c => c.id === Number(id))
    if (idx !== -1) mockClients[idx] = { ...mockClients[idx], ...data }
    return mockClients[idx]
  },

  async deleteClient(id) {
    await delay(400)
    mockClients = mockClients.filter(c => c.id !== Number(id))
    return { detail: 'Удалено' }
  },

  async changeTariff(id, tariff) {
    await delay(600)
    const prices = { 'tariff-5mbps': 3000, 'tariff-10mbps': 4500, 'tariff-15mbps': 6000, 'tariff-25mbps': 8500 }
    const speeds = { 'tariff-5mbps': '5 Мбит/с', 'tariff-10mbps': '10 Мбит/с', 'tariff-15mbps': '15 Мбит/с', 'tariff-25mbps': '25 Мбит/с' }
    const idx = mockClients.findIndex(c => c.id === Number(id))
    if (idx !== -1) {
      mockClients[idx] = { ...mockClients[idx], tariff, tariff_price: prices[tariff], tariff_speed: speeds[tariff] }
    }
    return { detail: 'Тариф изменён', client: mockClients[idx] }
  },

  async extendSubscription(id, { months }) {
    await delay(600)
    const idx = mockClients.findIndex(c => c.id === Number(id))
    if (idx !== -1) {
      const current = mockClients[idx].subscription_end ? new Date(mockClients[idx].subscription_end) : new Date()
      const start = current > new Date() ? current : new Date()
      const newEnd = addDays(start, 30 * months)
      mockClients[idx] = {
        ...mockClients[idx],
        subscription_end: format(newEnd, 'yyyy-MM-dd'),
        is_active_subscription: true,
      }
    }
    return { detail: `Продлено на ${months} мес.`, client: mockClients[idx] }
  },

  async toggleClient(id, action) {
    await delay(500)
    const idx = mockClients.findIndex(c => c.id === Number(id))
    if (idx !== -1) mockClients[idx] = { ...mockClients[idx], is_active_subscription: action === 'enable' }
    return { detail: action === 'enable' ? 'Включён' : 'Отключён' }
  },

  async getStatistics() {
    await delay(500)
    return {
      ...DEMO_STATISTICS,
      clients: {
        total: mockClients.length,
        active: mockClients.filter(c => c.is_active_subscription).length,
        inactive: mockClients.filter(c => !c.is_active_subscription).length,
        expiring_soon: mockClients.filter(c => {
          if (!c.subscription_end || !c.is_active_subscription) return false
          const days = Math.ceil((new Date(c.subscription_end) - new Date()) / 86400000)
          return days >= 0 && days <= 7
        }).length,
      },
    }
  },

  async getPayments() {
    await delay(400)
    return mockPayments.map(p => {
      const client = mockClients.find(c => c.id === p.user) ||
        Object.values(DEMO_USERS).find(u => u.id === p.user)
      return { ...p, user_name: client?.full_name, user_phone: client?.phone }
    })
  },
}
