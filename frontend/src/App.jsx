import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProfile } from './store/slices/authSlice'

// Client pages
import LoginPage from './pages/client/LoginPage'
import DashboardPage from './pages/client/DashboardPage'
import PaymentPage from './pages/client/PaymentPage'
import HistoryPage from './pages/client/HistoryPage'
import SettingsPage from './pages/client/SettingsPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminClients from './pages/admin/AdminClients'
import AdminClientDetail from './pages/admin/AdminClientDetail'
import AdminCreateClient from './pages/admin/AdminCreateClient'
import AdminPayments from './pages/admin/AdminPayments'

// Layouts
import ClientLayout from './components/client/ClientLayout'
import AdminLayout from './components/admin/AdminLayout'

function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useSelector(s => s.auth)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && user && !['admin'].includes(user.role) && !user.is_staff) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector(s => s.auth)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfile())
    }
  }, [dispatch, isAuthenticated])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Client routes */}
      <Route path="/" element={<PrivateRoute><ClientLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="clients/new" element={<AdminCreateClient />} />
        <Route path="clients/:id" element={<AdminClientDetail />} />
        <Route path="payments" element={<AdminPayments />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
