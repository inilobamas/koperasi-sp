import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Lock, Mail, AlertCircle } from "lucide-react"
import { Login } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const request = new services.LoginRequest({
        email: formData.email,
        password: formData.password,
      })

      const response = await Login(request)
      
      if (response.success) {
        // Store token in localStorage
        localStorage.setItem("authToken", response.data.token)
        localStorage.setItem("currentUser", JSON.stringify(response.data.user))
        
        // Call success callback
        onLoginSuccess(response.data.user, response.data.token)
      } else {
        setError(response.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Terjadi kesalahan saat login. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError("") // Clear error when user starts typing
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Koperasi Simpan Pinjam</CardTitle>
          <CardDescription className="text-center">
            Masuk ke sistem manajemen koperasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@koperasi.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.email || !formData.password}
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Sistem Manajemen Koperasi Simpan Pinjam
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              v1.0.0 - © 2024
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}