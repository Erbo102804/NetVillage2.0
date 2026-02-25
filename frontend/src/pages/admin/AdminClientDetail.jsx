import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../api/endpoints'
import { formatDate, formatDateTime, formatMoney } from '../../utils/date'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

export default function AdminClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [clientRes, paymentsRes] = await Promise.all([
          adminAPI.getClient(id),
          adminAPI.getPayments(),
        ])
        setClient(clientRes.data)
        setPayments(paymentsRes.data.filter(p => p.user === Number(id)))
      } catch (err) {
        toast.error('Ошибка загрузки данных')
        navigate('/admin/clients')
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleExtend = async (months) => {
    setActionLoading(true)
    try {
      const { data } = await adminAPI.extendSubscription(id, { months })
      setClient(data.client)
      toast.success(`Продлено на ${months} мес.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    }
    setActionLoading(false)
  }

  const handleToggle = async () => {
    const action = client.is_active_subscription ? 'disable' : 'enable'
    setActionLoading(true)
    try {
      await adminAPI.toggleClient(id, action)
      setClient(prev => ({ ...prev, is_active_subscription: !prev.is_active_subscription }))
      toast.success(action === 'enable' ? 'Клиент включён' : 'Клиент отключён')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    }
    setActionLoading(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!client) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/clients')} className="text-slate-400 hover:text-slate-200">
          ← Назад
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{client.full_name || client.username}</h1>
          <p className="text-slate-400">{client.phone}</p>
        </div>
        <StatusBadge status={client.is_active_subscription ? 'active' : 'inactive'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-200">Информация</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Телефон', value: client.phone },
              { label: 'PPPoE логин', value: client.pppoe_login, mono: true },
              { label: 'PPPoE пароль', value: client.pppoe_password, mono: true },
              { label: 'Тариф', value: client.tariff_speed },
              { label: 'Стоимость', value: `${formatMoney(client.tariff_price)}/мес` },
              { label: 'Дата окончания', value: formatDate(client.subscription_end) },
              { label: 'Создан', value: formatDateTime(client.created_at) },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-700/50">
                <span className="text-slate-400">{row.label}</span>
                <span className={`text-slate-100 ${row.mono ? 'font-mono text-xs' : ''}`}>
                  {row.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Extend subscription */}
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">Продлить подписку</h2>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 6].map(m => (
                <button
                  key={m}
                  onClick={() => handleExtend(m)}
                  disabled={actionLoading}
                  className="btn-secondary text-sm"
                >
                  {actionLoading ? <Spinner size="sm" /> : `+${m} мес.`}
                </button>
              ))}
            </div>
          </div>

          {/* Enable/Disable */}
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">Доступ</h2>
            <button
              onClick={handleToggle}
              disabled={actionLoading}
              className={client.is_active_subscription ? 'btn-danger w-full' : 'btn-success w-full'}
            >
              {actionLoading ? <Spinner size="sm" /> : (
                client.is_active_subscription ? '🔴 Отключить клиента' : '🟢 Включить клиента'
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-3">Статистика</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Всего платежей</span>
                <span className="text-slate-100">{client.payment_count}</span>
              </div>
              {client.last_payment && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Последняя оплата</span>
                  <span className="text-slate-100">{formatMoney(client.last_payment.amount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-slate-200 mb-4">История платежей</h2>
        {payments.length === 0 ? (
          <p className="text-slate-500 text-sm">Платежей нет</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="pb-2 pr-4 text-slate-400 font-medium">Дата</th>
                <th className="pb-2 pr-4 text-slate-400 font-medium">Сумма</th>
                <th className="pb-2 pr-4 text-slate-400 font-medium">Период</th>
                <th className="pb-2 pr-4 text-slate-400 font-medium">До</th>
                <th className="pb-2 text-slate-400 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="py-2.5 pr-4 text-slate-300">{formatDateTime(p.created_at)}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate-100">{formatMoney(p.amount)}</td>
                  <td className="py-2.5 pr-4 text-slate-300">{p.period_months} мес.</td>
                  <td className="py-2.5 pr-4 text-slate-300">{formatDate(p.extended_to)}</td>
                  <td className="py-2.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
