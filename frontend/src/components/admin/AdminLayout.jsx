import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../store/slices/authSlice'

const navItems = [
  { to: '/admin/dashboard', label: 'Дашборд', icon: '📊' },
  { to: '/admin/clients', label: 'Клиенты', icon: '👥' },
  { to: '/admin/payments', label: 'Платежи', icon: '💰' },
]

export default function AdminLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col fixed top-0 bottom-0">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">N</div>
            <div>
              <div className="font-semibold text-slate-100 text-sm">NetVillage</div>
              <div className="text-xs text-slate-400">Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="mt-auto">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            >
              <span>🏠</span> Личный кабинет
            </NavLink>
          </div>
        </nav>
        <div className="p-3 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2 px-3">{user?.full_name || user?.phone}</div>
          <button
            onClick={handleLogout}
            className="w-full btn-secondary text-xs justify-start gap-2"
          >
            <span>🚪</span> Выйти
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-56 p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
