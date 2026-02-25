import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login, clearError } from '../../store/slices/authSlice'
import Spinner from '../../components/common/Spinner'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated, user } = useSelector(s => s.auth)

  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' || user.is_staff ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const onSubmit = async (data) => {
    dispatch(clearError())
    const result = await dispatch(login({ phone: data.phone, password: data.password }))
    if (login.fulfilled.match(result)) {
      const u = result.payload
      navigate(u.role === 'admin' || u.is_staff ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-blue-600/30">
            N
          </div>
          <h1 className="text-2xl font-bold text-slate-100">NetVillage</h1>
          <p className="text-slate-400 mt-1">Личный кабинет клиента</p>
        </div>

        {/* Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Вход в систему</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Номер телефона</label>
              <input
                {...register('phone', {
                  required: 'Введите номер телефона',
                  pattern: {
                    value: /^[\+\d\s\(\)-]{7,20}$/,
                    message: 'Неверный формат телефона',
                  },
                })}
                type="tel"
                placeholder="+7 777 123 4567"
                className="input"
                autoComplete="tel"
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="label">Пароль</label>
              <input
                {...register('password', { required: 'Введите пароль' })}
                type="password"
                placeholder="••••••••"
                className="input"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? <><Spinner size="sm" /> Вход...</> : 'Войти'}
            </button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-6">
            Для получения доступа обратитесь к администратору
          </p>
        </div>
      </div>
    </div>
  )
}
