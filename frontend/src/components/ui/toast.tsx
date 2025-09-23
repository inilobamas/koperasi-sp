import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

export interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

export function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={`flex items-start space-x-3 p-4 border rounded-lg shadow-lg ${getBackgroundColor()} max-w-sm`}>
      {getIcon()}
      <div className="flex-1">
        <h4 className="font-medium text-sm">{toast.title}</h4>
        {toast.description && (
          <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const showSuccess = (title: string, description?: string) => {
    addToast({ title, description, type: 'success' })
  }

  const showError = (title: string, description?: string) => {
    addToast({ title, description, type: 'error' })
  }

  const showInfo = (title: string, description?: string) => {
    addToast({ title, description, type: 'info' })
  }

  const showWarning = (title: string, description?: string) => {
    addToast({ title, description, type: 'warning' })
  }

  return {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  }
}