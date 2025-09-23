import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { Layout } from "@/components/layout/layout"
import { Dashboard } from "@/pages/dashboard"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="koperasi-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout title="Dashboard" description="Overview aktivitas koperasi" />}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/customers" element={<Layout title="Nasabah" description="Kelola data nasabah" />}>
            <Route index element={<div>Customer Management - Coming Soon</div>} />
          </Route>
          <Route path="/referrals" element={<Layout title="Referral" description="Kelola kode referral" />}>
            <Route index element={<div>Referral Management - Coming Soon</div>} />
          </Route>
          <Route path="/documents" element={<Layout title="Dokumen" description="Verifikasi dokumen KTP" />}>
            <Route index element={<div>Document Management - Coming Soon</div>} />
          </Route>
          <Route path="/loans" element={<Layout title="Pinjaman" description="Kelola pinjaman dan angsuran" />}>
            <Route index element={<div>Loan Management - Coming Soon</div>} />
          </Route>
          <Route path="/notifications" element={<Layout title="Notifikasi" description="Kelola notifikasi sistem" />}>
            <Route index element={<div>Notification Management - Coming Soon</div>} />
          </Route>
          <Route path="/settings" element={<Layout title="Settings" description="Konfigurasi sistem" />}>
            <Route index element={<div>Settings - Coming Soon</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
