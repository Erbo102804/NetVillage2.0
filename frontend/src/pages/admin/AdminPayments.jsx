import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAdminPayments } from '../../store/slices/adminSlice'
import { formatDateTime, formatMoney } from '../../utils/date'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'

export default function AdminPayments() {
  const dispatch = useDispatch()
  const { payments, loading } = useSelector(s => s.admin)

  useEffect(() => {
    dispatch(fetchAdminPayments())
  }, [dispatch])

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Платежи</h1>
          <p className="text-slate-400 mt-1">{payments.length} записей</p>
        </div>
        <div className="card py-2 px-4">
          <span className="text-slate-400 text-sm">Сумма оплат: </span>
          <span className="font-bold text-green-400">{formatMoney(totalPaid)}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-700">
                {['Дата', 'Клиент', 'Тариф', 'Период', 'Сумма', 'Статус', 'Продлено до'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-slate-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-slate-700/30">
                  <td className="py-3 pr-4 text-slate-300 whitespace-nowrap">
                    {formatDateTime(payment.created_at)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-slate-100">{payment.user_name}</div>
                    <div className="text-slate-500 text-xs">{payment.user_phone}</div>
                  </td>
                  <td className="py-3 pr-4 text-slate-300 capitalize">
                    {payment.tariff?.replace('tariff-', '') || '—'}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">{payment.period_months} мес.</td>
                  <td className="py-3 pr-4 font-semibold text-slate-100">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={payment.status} /></td>
                  <td className="py-3 text-slate-300">
                    {payment.extended_to
                      ? new Date(payment.extended_to).toLocaleDateString('ru-KZ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="text-center py-12 text-slate-500">Платежей нет</div>
          )}
        </div>
      )}
    </div>
  )
}
