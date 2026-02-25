import { format, differenceInDays, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    return format(d, 'd MMMM yyyy', { locale: ru })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    return format(d, 'd MMM yyyy, HH:mm', { locale: ru })
  } catch {
    return dateStr
  }
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    return differenceInDays(d, new Date())
  } catch {
    return null
  }
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
