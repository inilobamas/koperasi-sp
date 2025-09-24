import { Sidebar } from "./layout/sidebar"
import { Header } from "./layout/header"

export function AccessDenied() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Akses Ditolak" description="Anda tidak memiliki izin untuk mengakses halaman ini" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Akses Ditolak</h2>
            <p className="text-muted-foreground">
              Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}