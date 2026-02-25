import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../store/slices/authSlice'

const navItems = [
  { to: '/dashboard', label: 'Главная', icon: '🏠' },
  { to: '/payment', label: 'Оплата', icon: '💳' },
  { to: '/history', label: 'История', icon: '📋' },
  { to: '/settings', label: 'Настройки', icon: '⚙️' },
]

export default function ClientLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">N</div>
            <span className="font-semibold text-slate-100">NetVillage</span>
          </div>
          <div className="flex items-center gap-4">
            {user?.is_staff && (
              <a href="/admin/dashboard" className="text-sm text-blue-400 hover:text-blue-300">
                Админ панель →
              </a>
            )}
            <span className="text-sm text-slate-400">{user?.display_name || user?.full_name}</span>
            <button onClick={handleLogout} className="btn-secondary text-xs py-1.5 px-3">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-800 border-t border-slate-700 flex">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar nav (desktop) */}
      <div className="hidden md:block fixed left-0 top-16 bottom-0 w-20 bg-slate-800 border-r border-slate-700">
        <div className="flex flex-col items-center py-4 gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `w-14 h-14 flex flex-col items-center justify-center rounded-xl text-xs gap-1 transition-colors ${
                  isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
