import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface LayoutProps {
  title: string
  description?: string
}

export function Layout({ title, description }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} description={description} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}