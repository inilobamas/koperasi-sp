import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Layout } from "@/components/layout/layout"
import { Dashboard } from "@/pages/dashboard"
import { Customers } from "@/pages/customers"
import { Referrals } from "@/pages/referrals"
import { Documents } from "@/pages/documents"
import { Loans } from "@/pages/loans"
import { Profile } from "@/pages/profile"
import { Settings } from "@/pages/settings"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="koperasi-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Layout title="Dashboard" description="Overview aktivitas koperasi" />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/customers" element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'karyawan']}>
                <Layout title="Nasabah" description="Kelola data nasabah" />
              </ProtectedRoute>
            }>
              <Route index element={<Customers />} />
            </Route>
            <Route path="/referrals" element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <Layout title="Referral" description="Kelola kode referral" />
              </ProtectedRoute>
            }>
              <Route index element={<Referrals />} />
            </Route>
            <Route path="/documents" element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'karyawan']}>
                <Layout title="Dokumen" description="Verifikasi dokumen KTP" />
              </ProtectedRoute>
            }>
              <Route index element={<Documents />} />
            </Route>
            <Route path="/loans" element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'karyawan']}>
                <Layout title="Pinjaman" description="Kelola pinjaman dan angsuran" />
              </ProtectedRoute>
            }>
              <Route index element={<Loans />} />
            </Route>
            <Route path="/notifications" element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'karyawan']}>
                <Layout title="Notifikasi" description="Kelola notifikasi sistem" />
              </ProtectedRoute>
            }>
              <Route index element={<div>Notification Management - Coming Soon</div>} />
            </Route>
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Layout title="Settings" description="Konfigurasi sistem" />
              </ProtectedRoute>
            }>
              <Route index element={<Settings />} />
            </Route>
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'karyawan']}>
                <Layout title="Profile" description="Kelola informasi akun Anda" />
              </ProtectedRoute>
            }>
              <Route index element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
