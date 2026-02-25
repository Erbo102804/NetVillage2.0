import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchProfile } from '../../store/slices/authSlice'
import { mikrotikAPI } from '../../api/endpoints'
import { formatDate, daysUntil } from '../../utils/date'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'

export default function DashboardPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [mtStatus, setMtStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await dispatch(fetchProfile())
      try {
        const { data } = await mikrotikAPI.getMyStatus()
        setMtStatus(data)
      } catch {}
      setLoading(false)
    }
    loadData()
  }, [dispatch])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const subscriptionEnd = user?.subscription_end
  const days = subscriptionEnd ? daysUntil(subscriptionEnd) : null
  const isActive = user?.is_active_subscription && days !== null && days >= 0

  const expiryWarning = days !== null && days >= 0 && days <= 7

  return (
    <div className="space-y-6 pb-24 md:pb-0 md:pl-20">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Привет, {user?.full_name?.split(' ')[0] || user?.username}! 👋
        </h1>
        <p className="text-slate-400 mt-1">Добро пожаловать в личный кабинет NetVillage</p>
      </div>

      {/* Expiry warning */}
      {expiryWarning && isActive && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 flex items-start gap-3">
          <span className="text-yellow-400 text-xl">⚠️</span>
          <div>
            <p className="text-yellow-300 font-medium">Подписка скоро истекает</p>
            <p className="text-yellow-400 text-sm mt-0.5">
              До окончания осталось {days === 0 ? 'менее суток' : `${days} ${days === 1 ? 'день' : 'дней'}`}.
              Рекомендуем продлить заранее.
            </p>
            <button onClick={() => navigate('/payment')} className="btn-primary mt-3 text-sm py-1.5">
              Продлить сейчас →
            </button>
          </div>
        </div>
      )}

      {/* Expired */}
      {!isActive && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-xl">🔴</span>
          <div>
            <p className="text-red-300 font-medium">Подписка истекла</p>
            <p className="text-red-400 text-sm mt-0.5">Ваш доступ в интернет приостановлен.</p>
            <button onClick={() => navigate('/payment')} className="btn-primary mt-3 text-sm py-1.5">
              Оплатить и восстановить →
            </button>
          </div>
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Subscription */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Статус подписки</h3>
            <StatusBadge status={isActive ? 'active' : 'inactive'} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Дата окончания</span>
              <span className="text-slate-100 font-medium">
                {subscriptionEnd ? formatDate(subscriptionEnd) : '—'}
              </span>
            </div>
            {days !== null && days >= 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Осталось</span>
                <span className={`font-medium ${days <= 3 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {days === 0 ? 'Сегодня' : `${days} дн.`}
                </span>
              </div>
            )}
            {isActive && (
              <div className="pt-2">
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${days <= 3 ? 'bg-red-500' : days <= 7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, Math.max(5, ((days || 0) / 30) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tariff */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Тариф</h3>
            <span className="text-blue-400 text-sm font-medium">
              {user?.tariff_price ? `${user.tariff_price} ₸/мес` : '—'}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Скорость</span>
              <span className="text-slate-100 font-medium text-lg">
                {user?.tariff_speed || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Тарифный план</span>
              <span className="text-slate-100 font-medium capitalize">
                {user?.tariff?.replace('tariff-', '') || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Подключение</h3>
            {mtStatus && (
              <span className={`badge ${mtStatus.is_online ? 'badge-green' : 'badge-red'}`}>
                {mtStatus.is_online ? '● Онлайн' : '○ Оффлайн'}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">PPPoE логин</span>
              <span className="text-slate-100 font-mono text-sm">{user?.pppoe_login || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Аккаунт</span>
              <span className="text-slate-100 text-sm">{user?.phone}</span>
            </div>
          </div>
        </div>

        {/* Quick pay */}
        <div className="card bg-gradient-to-br from-blue-900/40 to-slate-800 border-blue-700/50">
          <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wide mb-4">Быстрая оплата</h3>
          <p className="text-slate-300 text-sm mb-4">
            Продлите доступ в интернет через Kaspi Pay
          </p>
          <button
            onClick={() => navigate('/payment')}
            className="btn-primary w-full"
          >
            💳 Продлить интернет
          </button>
        </div>
      </div>
    </div>
  )
}
