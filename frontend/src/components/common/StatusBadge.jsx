import clsx from 'clsx'

const STATUS_MAP = {
  // Subscription
  active: { label: 'Активен', class: 'badge-green' },
  inactive: { label: 'Неактивен', class: 'badge-red' },
  // Payment
  paid: { label: 'Оплачено', class: 'badge-green' },
  pending: { label: 'Ожидает', class: 'badge-yellow' },
  failed: { label: 'Ошибка', class: 'badge-red' },
  expired: { label: 'Истёк', class: 'badge-red' },
  cancelled: { label: 'Отменён', class: 'badge-red' },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, class: 'badge-blue' }
  return <span className={cfg.class}>{cfg.label}</span>
}
