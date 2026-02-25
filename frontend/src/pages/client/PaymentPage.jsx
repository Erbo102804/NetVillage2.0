import { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { QRCodeSVG } from 'qrcode.react'
import { createPayment, clearCurrentPayment, updatePaymentStatus } from '../../store/slices/paymentSlice'
import { paymentsAPI } from '../../api/endpoints'
import { formatMoney, formatDate } from '../../utils/date'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const PERIODS = [
  { months: 1, label: '1 месяц', discount: null, suffix: '' },
  { months: 3, label: '3 месяца', discount: 7, suffix: '−7%' },
  { months: 6, label: '6 месяцев', discount: 13, suffix: '−13%' },
]

export default function PaymentPage() {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const { currentPayment, creating, error } = useSelector(s => s.payment)

  const [selectedPeriod, setSelectedPeriod] = useState(1)
  const [priceInfo, setPriceInfo] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [pollInterval, setPollInterval] = useState(null)
  const wsRef = useRef(null)

  // Load price calculation when period changes
  useEffect(() => {
    if (!user?.tariff) return
    const load = async () => {
      setPriceLoading(true)
      try {
        const { data } = await paymentsAPI.calculate({ period_months: selectedPeriod })
        setPriceInfo(data)
      } catch {}
      setPriceLoading(false)
    }
    load()
  }, [selectedPeriod, user?.tariff])

  // WebSocket + polling + demo event listener for real-time payment status
  useEffect(() => {
    if (!currentPayment) return

    // Demo mode: listen for custom event from mockApi
    const demoHandler = (e) => {
      if (e.detail.id === currentPayment.id) {
        dispatch(updatePaymentStatus({ payment_id: currentPayment.id, status: 'paid' }))
        toast.success('Оплата подтверждена! Подписка продлена 🎉')
      }
    }
    window.addEventListener('demo-payment-paid', demoHandler)

    // WebSocket (only when real backend available)
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws/payment/${currentPayment.id}/`)
      wsRef.current = ws
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.status === 'paid') {
          dispatch(updatePaymentStatus(data))
          toast.success('Оплата подтверждена! Подписка продлена 🎉')
        }
      }
    } catch {}

    // Fallback polling
    const interval = setInterval(async () => {
      if (currentPayment?.status === 'pending') {
        try {
          const { data } = await paymentsAPI.getStatus(currentPayment.id)
          if (data.status === 'paid') {
            dispatch(updatePaymentStatus({ payment_id: data.id, status: 'paid' }))
            toast.success('Оплата подтверждена! Подписка продлена 🎉')
            clearInterval(interval)
          }
        } catch {}
      }
    }, 5000)
    setPollInterval(interval)

    return () => {
      window.removeEventListener('demo-payment-paid', demoHandler)
      if (wsRef.current) wsRef.current.close()
      clearInterval(interval)
    }
  }, [currentPayment?.id])

  const handlePayment = async () => {
    const result = await dispatch(createPayment(selectedPeriod))
    if (createPayment.rejected.match(result)) {
      toast.error(result.payload || 'Ошибка создания платежа')
    }
  }

  const handleReset = () => {
    dispatch(clearCurrentPayment())
    clearInterval(pollInterval)
    if (wsRef.current) wsRef.current.close()
  }

  if (currentPayment) {
    return <PaymentQRView payment={currentPayment} priceInfo={priceInfo} onReset={handleReset} />
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 md:pb-0 md:pl-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Оплата подписки</h1>
        <p className="text-slate-400 mt-1">Выберите период и оплатите через Kaspi Pay</p>
      </div>

      {/* Period selection */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-200">Выберите период</h2>
        <div className="space-y-3">
          {PERIODS.map(period => {
            const isSelected = selectedPeriod === period.months
            const pInfo = priceInfo && !priceLoading && selectedPeriod === period.months ? priceInfo : null
            const basePrice = user?.tariff_price || 0
            const preview = period.months === 1
              ? basePrice
              : period.months === 3
              ? Math.round(basePrice * 3 * 0.93)
              : Math.round(basePrice * 6 * 0.87)

            return (
              <button
                key={period.months}
                onClick={() => setSelectedPeriod(period.months)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-100">{period.label}</div>
                    {period.discount && (
                      <div className="text-green-400 text-xs">Скидка {period.suffix}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-100">{formatMoney(preview)}</div>
                  {period.months > 1 && (
                    <div className="text-slate-400 text-xs line-through">
                      {formatMoney(basePrice * period.months)}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      {priceInfo && !priceLoading && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-200">Итого</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Тариф</span>
              <span className="text-slate-200">{priceInfo.tariff?.replace('tariff-', '')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Базовая цена</span>
              <span className="text-slate-200">{formatMoney(priceInfo.base_price)}/мес</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Период</span>
              <span className="text-slate-200">{priceInfo.period_months} мес.</span>
            </div>
            {priceInfo.discount && (
              <div className="flex justify-between text-green-400">
                <span>Скидка {priceInfo.discount.percent}%</span>
                <span>−{formatMoney(priceInfo.discount.saved)}</span>
              </div>
            )}
            <div className="border-t border-slate-600 pt-2 flex justify-between text-base font-bold">
              <span className="text-slate-100">К оплате</span>
              <span className="text-blue-400 text-xl">{formatMoney(priceInfo.total)}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={creating || !user?.tariff}
        className="btn-kaspi w-full text-lg"
      >
        {creating ? (
          <><Spinner size="sm" /> Создание платежа...</>
        ) : (
          <>
            <img src="https://cdn.kaspi.kz/kaspimall/images/logo.png" alt="Kaspi" className="h-6 hidden" />
            Оплатить через Kaspi Pay
          </>
        )}
      </button>

      <p className="text-slate-500 text-xs text-center">
        После нажатия откроется QR-код для оплаты в приложении Kaspi.kz
      </p>
    </div>
  )
}

function PaymentQRView({ payment, priceInfo, onReset }) {
  const isPaid = payment.status === 'paid'
  const isExpired = payment.status === 'expired' || payment.status === 'cancelled'

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-0 md:pl-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Оплата через Kaspi</h1>
        <p className="text-slate-400 mt-1">Отсканируйте QR-код в приложении Kaspi.kz</p>
      </div>

      {isPaid ? (
        <div className="card text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-xl font-bold text-green-400">Оплата прошла успешно!</h2>
          <p className="text-slate-400">Подписка продлена до {formatDate(payment.extended_to)}</p>
          <button onClick={onReset} className="btn-primary">Вернуться к личному кабинету</button>
        </div>
      ) : isExpired ? (
        <div className="card text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-xl font-bold text-red-400">Платёж не завершён</h2>
          <button onClick={onReset} className="btn-secondary">Попробовать снова</button>
        </div>
      ) : (
        <div className="card space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            {payment.kaspi_qr_url ? (
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG
                  value={payment.kaspi_qr_url}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>
            ) : (
              <div className="bg-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">QR-код недоступен</p>
                <p className="text-slate-500 text-xs mt-1">Обратитесь к администратору</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-slate-400 text-sm">Ожидаем подтверждение оплаты...</span>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-slate-100">
              {formatMoney(payment.amount)}
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Период: {payment.period_months} мес.
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2 text-sm text-slate-400">
            <p className="font-medium text-slate-300">Инструкция по оплате:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Откройте приложение <span className="text-red-400 font-medium">Kaspi.kz</span></li>
              <li>Нажмите <strong className="text-slate-300">«Оплатить» → «QR-код»</strong></li>
              <li>Наведите камеру на QR-код выше</li>
              <li>Подтвердите платёж</li>
            </ol>
          </div>

          <button onClick={onReset} className="btn-secondary w-full">
            ← Отменить и вернуться
          </button>
        </div>
      )}
    </div>
  )
}
