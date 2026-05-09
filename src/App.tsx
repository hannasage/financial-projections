import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { usePlans } from './hooks/usePlans'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Scenarios from './pages/Library'
import PlanNew from './pages/PlanNew'
import PlanEdit from './pages/PlanEdit'

function RequireAuth() {
  const isValid = useAuthStore(s => s.isValid)
  usePlans()
  if (!isValid) return <Navigate to="/auth" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/plans/new" element={<PlanNew />} />
          <Route path="/plans/:id/edit" element={<PlanEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
