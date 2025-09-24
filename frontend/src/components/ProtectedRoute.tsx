import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/pages/login'
import { AccessDenied } from './AccessDenied'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, login } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLoginSuccess={login} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied />
  }

  return <>{children}</>
}