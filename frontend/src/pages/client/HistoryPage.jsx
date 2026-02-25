import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPaymentHistory } from '../../store/slices/paymentSlice'
import { formatDateTime, formatMoney } from '../../utils/date'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'

export default function HistoryPage() {
  const dispatch = useDispatch()
  const { history, loading } = useSelector(s => s.payment)

  useEffect(() => {
    dispatch(fetchPaymentHistory())
  }, [dispatch])

  return (
    <div className="space-y-6 pb-24 md:pb-0 md:pl-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">История платежей</h1>
        <p className="text-slate-400 mt-1">Все ваши оплаты за интернет</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : history.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-slate-400">История платежей пуста</p>
          <p className="text-slate-500 text-sm mt-1">Ваши будущие оплаты появятся здесь</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-700">
                  <th className="pb-3 pr-4 text-slate-400 font-medium">Дата</th>
                  <th className="pb-3 pr-4 text-slate-400 font-medium">Тариф</th>
                  <th className="pb-3 pr-4 text-slate-400 font-medium">Период</th>
                  <th className="pb-3 pr-4 text-slate-400 font-medium">Сумма</th>
                  <th className="pb-3 pr-4 text-slate-400 font-medium">Действует до</th>
                  <th className="pb-3 text-slate-400 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {history.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 pr-4 text-slate-300">{formatDateTime(payment.created_at)}</td>
                    <td className="py-3 pr-4 text-slate-300 capitalize">
                      {payment.tariff?.replace('tariff-', '') || '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{payment.period_label}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-100">
                      {formatMoney(payment.amount)}
                      {payment.discount_info && (
                        <span className="ml-1.5 text-green-400 text-xs">{payment.discount_info}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {payment.extended_to
                        ? new Date(payment.extended_to).toLocaleDateString('ru-KZ')
                        : '—'}
                    </td>
                    <td className="py-3"><StatusBadge status={payment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {history.map(payment => (
              <div key={payment.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-100 text-lg">{formatMoney(payment.amount)}</div>
                    {payment.discount_info && (
                      <div className="text-green-400 text-xs">{payment.discount_info}</div>
                    )}
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
                <div className="space-y-1.5 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Дата</span>
                    <span className="text-slate-300">{formatDateTime(payment.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Период</span>
                    <span className="text-slate-300">{payment.period_label}</span>
                  </div>
                  {payment.extended_to && (
                    <div className="flex justify-between">
                      <span>До</span>
                      <span className="text-slate-300">
                        {new Date(payment.extended_to).toLocaleDateString('ru-KZ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
