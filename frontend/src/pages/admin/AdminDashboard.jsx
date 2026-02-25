import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { fetchStatistics } from '../../store/slices/adminSlice'
import { formatMoney } from '../../utils/date'
import Spinner from '../../components/common/Spinner'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement)

const TARIFF_COLORS = {
  'tariff-5mbps': '#6366f1',
  'tariff-10mbps': '#3b82f6',
  'tariff-15mbps': '#06b6d4',
  'tariff-25mbps': '#10b981',
}

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const { statistics, loading } = useSelector(s => s.admin)

  useEffect(() => {
    dispatch(fetchStatistics())
    const interval = setInterval(() => dispatch(fetchStatistics()), 60000)
    return () => clearInterval(interval)
  }, [dispatch])

  if (!statistics && loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }
  if (!statistics) return null

  const { revenue, clients, charts, tariff_distribution } = statistics

  // Chart data: monthly revenue
  const monthlyData = {
    labels: charts.monthly.map(r => r.month),
    datasets: [{
      label: 'Доход, ₸',
      data: charts.monthly.map(r => r.total),
      backgroundColor: '#3b82f680',
      borderColor: '#3b82f6',
      borderWidth: 2,
      borderRadius: 6,
    }],
  }

  // Tariff doughnut
  const tariffData = {
    labels: tariff_distribution.map(t => t.tariff.replace('tariff-', '')),
    datasets: [{
      data: tariff_distribution.map(t => t.count),
      backgroundColor: tariff_distribution.map(t => TARIFF_COLORS[t.tariff] || '#64748b'),
      borderColor: '#1e293b',
      borderWidth: 2,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#334155' } },
    },
  }

  const statCards = [
    { label: 'Доход сегодня', value: formatMoney(revenue.today), icon: '💵', color: 'text-green-400' },
    { label: 'Доход за неделю', value: formatMoney(revenue.week), icon: '📈', color: 'text-blue-400' },
    { label: 'Доход за месяц', value: formatMoney(revenue.month), icon: '💰', color: 'text-purple-400' },
    { label: 'Всего клиентов', value: clients.total, icon: '👥', color: 'text-slate-300' },
    { label: 'Активных', value: clients.active, icon: '✅', color: 'text-green-400' },
    { label: 'Неактивных', value: clients.inactive, icon: '⏸', color: 'text-red-400' },
    { label: 'Истекают (7 дней)', value: clients.expiring_soon, icon: '⚠️', color: 'text-yellow-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Дашборд</h1>
        <p className="text-slate-400 mt-1">Общая статистика NetVillage ISP</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs uppercase tracking-wide">{card.label}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly revenue chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-slate-200 mb-4">Доходы по месяцам</h3>
          <div className="h-56">
            {charts.monthly.length > 0 ? (
              <Bar data={monthlyData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">Данных пока нет</div>
            )}
          </div>
        </div>

        {/* Tariff distribution */}
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">Распределение тарифов</h3>
          <div className="h-40 flex items-center justify-center">
            {tariff_distribution.length > 0 ? (
              <Doughnut
                data={tariffData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#94a3b8', font: { size: 11 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="text-slate-500 text-sm">Данных пока нет</div>
            )}
          </div>
        </div>
      </div>

      {/* Expiring clients */}
      {clients.expiring_soon > 0 && (
        <div className="card bg-yellow-900/10 border-yellow-800/50">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-300">
                {clients.expiring_soon} {clients.expiring_soon === 1 ? 'клиент' : 'клиентов'} — подписка истекает в ближайшие 7 дней
              </p>
              <p className="text-yellow-500 text-sm mt-0.5">
                Рекомендуется связаться с клиентами для продления
              </p>
            </div>
            <a href="/admin/clients" className="ml-auto btn-secondary text-sm whitespace-nowrap">
              Просмотреть →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
