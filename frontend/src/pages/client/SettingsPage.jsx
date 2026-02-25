import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector, useDispatch } from 'react-redux'
import { fetchProfile } from '../../store/slices/authSlice'
import { authAPI } from '../../api/endpoints'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useSelector(s => s.auth)
  const dispatch = useDispatch()

  return (
    <div className="max-w-2xl space-y-6 pb-24 md:pb-0 md:pl-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Настройки</h1>
        <p className="text-slate-400 mt-1">Управление вашим аккаунтом</p>
      </div>

      {/* Profile info */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-200">Информация об аккаунте</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">Имя</span>
            <span className="text-slate-100 font-medium">{user?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">Телефон</span>
            <span className="text-slate-100 font-medium">{user?.phone}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">PPPoE логин</span>
            <span className="text-slate-100 font-mono">{user?.pppoe_login || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">Тариф</span>
            <span className="text-slate-100">{user?.tariff_speed || '—'} ({user?.tariff_price} ₸/мес)</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <ChangePasswordForm />

      {/* Change PPPoE password */}
      <ChangePPPoEPasswordForm />
    </div>
  )
}

function ChangePasswordForm() {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()
  const newPwd = watch('new_password')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authAPI.changePassword(data)
      toast.success('Пароль успешно изменён')
      reset()
    } catch (err) {
      const msg = err.response?.data?.old_password ||
                  err.response?.data?.detail ||
                  Object.values(err.response?.data || {})[0]?.[0] ||
                  'Ошибка изменения пароля'
      toast.error(typeof msg === 'string' ? msg : 'Ошибка изменения пароля')
    }
    setLoading(false)
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-slate-200">Смена пароля сайта</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Текущий пароль</label>
          <input
            {...register('old_password', { required: 'Введите текущий пароль' })}
            type="password"
            className="input"
            placeholder="••••••••"
          />
          {errors.old_password && <p className="text-red-400 text-xs mt-1">{errors.old_password.message}</p>}
        </div>
        <div>
          <label className="label">Новый пароль</label>
          <input
            {...register('new_password', {
              required: 'Введите новый пароль',
              minLength: { value: 6, message: 'Минимум 6 символов' }
            })}
            type="password"
            className="input"
            placeholder="••••••••"
          />
          {errors.new_password && <p className="text-red-400 text-xs mt-1">{errors.new_password.message}</p>}
        </div>
        <div>
          <label className="label">Повторите пароль</label>
          <input
            {...register('confirm_password', {
              required: 'Повторите пароль',
              validate: v => v === newPwd || 'Пароли не совпадают'
            })}
            type="password"
            className="input"
            placeholder="••••••••"
          />
          {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Spinner size="sm" /> Сохранение...</> : 'Сменить пароль'}
        </button>
      </form>
    </div>
  )
}

function ChangePPPoEPasswordForm() {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()
  const newPwd = watch('new_pppoe_password')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authAPI.changePPPoEPassword(data)
      toast.success('PPPoE пароль успешно изменён. Переподключитесь.')
      reset()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ошибка изменения PPPoE пароля'
      toast.error(msg)
    }
    setLoading(false)
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold text-slate-200">Смена пароля PPPoE</h2>
        <p className="text-slate-400 text-sm mt-1">
          Это пароль для подключения к интернету. После смены потребуется переподключение роутера.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Новый PPPoE пароль</label>
          <input
            {...register('new_pppoe_password', {
              required: 'Введите новый пароль',
              minLength: { value: 6, message: 'Минимум 6 символов' }
            })}
            type="password"
            className="input"
            placeholder="••••••••"
          />
          {errors.new_pppoe_password && <p className="text-red-400 text-xs mt-1">{errors.new_pppoe_password.message}</p>}
        </div>
        <div>
          <label className="label">Повторите пароль</label>
          <input
            {...register('confirm_password', {
              required: 'Повторите пароль',
              validate: v => v === newPwd || 'Пароли не совпадают'
            })}
            type="password"
            className="input"
            placeholder="••••••••"
          />
          {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-yellow-400 text-xs">
          ⚠️ После смены пароля роутер потеряет соединение и потребует ввода нового пароля
        </div>
        <button type="submit" disabled={loading} className="btn-danger">
          {loading ? <><Spinner size="sm" /> Применение...</> : 'Сменить PPPoE пароль'}
        </button>
      </form>
    </div>
  )
}
