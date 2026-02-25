import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { adminAPI } from '../../api/endpoints'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const TARIFFS = [
  { value: 'tariff-5mbps', label: '5 Мбит/с — 3 000 ₸/мес' },
  { value: 'tariff-10mbps', label: '10 Мбит/с — 4 500 ₸/мес' },
  { value: 'tariff-15mbps', label: '15 Мбит/с — 6 000 ₸/мес' },
  { value: 'tariff-25mbps', label: '25 Мбит/с — 8 500 ₸/мес' },
]

export default function AdminCreateClient() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [createdClient, setCreatedClient] = useState(null)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { tariff: 'tariff-10mbps', subscription_months: 1 },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { data: client } = await adminAPI.createClient(data)
      setCreatedClient(client)
      toast.success('Клиент создан успешно!')
      if (client.mikrotik_warning) {
        toast.error(client.mikrotik_warning, { duration: 8000 })
      }
    } catch (err) {
      const errors = err.response?.data
      if (errors && typeof errors === 'object') {
        const firstErr = Object.values(errors)[0]
        toast.error(Array.isArray(firstErr) ? firstErr[0] : String(firstErr))
      } else {
        toast.error('Ошибка создания клиента')
      }
    }
    setLoading(false)
  }

  if (createdClient) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="card text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-green-400">Клиент создан!</h2>
          <div className="bg-slate-700 rounded-lg p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Имя</span>
              <span className="text-slate-100">{createdClient.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Телефон</span>
              <span className="text-slate-100">{createdClient.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PPPoE логин</span>
              <span className="text-slate-100 font-mono">{createdClient.pppoe_login}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PPPoE пароль</span>
              <span className="text-green-400 font-mono font-bold">{createdClient.pppoe_password}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Тариф</span>
              <span className="text-slate-100">{createdClient.tariff_speed}</span>
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-yellow-400 text-xs">
            ⚠️ Сохраните PPPoE пароль — он отображается только один раз
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/admin/clients')} className="btn-secondary flex-1">
              К списку клиентов
            </button>
            <button onClick={() => setCreatedClient(null)} className="btn-primary flex-1">
              Добавить ещё
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/clients')} className="text-slate-400 hover:text-slate-200">
          ← Назад
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Новый клиент</h1>
          <p className="text-slate-400 mt-0.5">Создание аккаунта в системе и MikroTik</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Полное имя *</label>
            <input
              {...register('full_name', { required: 'Введите имя клиента' })}
              className="input"
              placeholder="Иванов Иван"
            />
            {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="label">Номер телефона *</label>
            <input
              {...register('phone', {
                required: 'Введите номер телефона',
                pattern: { value: /^[\+\d\s\(\)-]{7,20}$/, message: 'Неверный формат' }
              })}
              type="tel"
              className="input"
              placeholder="+7 777 123 4567"
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label">Тарифный план *</label>
            <select {...register('tariff')} className="input">
              {TARIFFS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Начальный период</label>
            <select {...register('subscription_months', { valueAsNumber: true })} className="input">
              {[1, 2, 3, 6].map(m => (
                <option key={m} value={m}>
                  {m} {m === 1 ? 'месяц' : m < 5 ? 'месяца' : 'месяцев'}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-slate-400 text-xs mb-4">
              PPPoE логин и пароль будут сгенерированы автоматически.
              Клиент будет создан в базе данных и добавлен на MikroTik.
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/admin/clients')} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <><Spinner size="sm" /> Создание...</> : 'Создать клиента'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
