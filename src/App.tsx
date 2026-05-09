import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import { usePlans } from './hooks/usePlans'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import IO from './pages/IO'
import PlanNew from './pages/PlanNew'

function RequireAuth() {
  const isValid = useAuthStore(s => s.isValid)
  usePlans()
  if (!isValid) return <Navigate to="/auth" replace />
  return <Outlet />
}

export default function App() {
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    document.body.style.background = theme.colors.bg
    document.documentElement.style.setProperty('--plan-accent', theme.colors.accent)
    document.documentElement.setAttribute('data-color-scheme', theme.isDark ? 'dark' : 'light')
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<RequireAuth />}>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/io"            element={<IO />} />
          <Route path="/plans/new"     element={<PlanNew />} />
          {/* Legacy routes — redirect to dashboard */}
          <Route path="/scenarios"       element={<Navigate to="/dashboard" replace />} />
          <Route path="/plans/:id/edit"  element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
