import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import { usePlans } from './hooks/usePlans'
import { LOCAL_MODE } from './lib/mode'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import IO from './pages/IO'
import PlanNew from './pages/PlanNew'

function RequireAuth() {
  const isValid = useAuthStore(s => s.isValid)
  usePlans()
  if (!LOCAL_MODE && !isValid) return <Navigate to="/auth" replace />
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
        {/* Auth route only exists in PocketBase mode */}
        <Route path="/auth" element={LOCAL_MODE ? <Navigate to="/dashboard" replace /> : <Auth />} />

        <Route element={<RequireAuth />}>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/io"            element={<IO />} />
          <Route path="/plans/new"     element={<PlanNew />} />
          {/* Legacy redirects */}
          <Route path="/scenarios"      element={<Navigate to="/dashboard" replace />} />
          <Route path="/plans/:id/edit" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
