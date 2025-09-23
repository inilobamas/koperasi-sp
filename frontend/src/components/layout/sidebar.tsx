import { useState } from "react"
import { NavLink } from "react-router-dom"
import {
  Users,
  UserCheck,
  FileText,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Nasabah", href: "/customers", icon: Users },
  { name: "Referral", href: "/referrals", icon: UserCheck },
  { name: "Dokumen", href: "/documents", icon: FileText },
  { name: "Pinjaman", href: "/loans", icon: CreditCard },
  { name: "Notifikasi", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Koperasi App</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                collapsed && "justify-center"
              )
            }
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div className="text-xs text-muted-foreground">
              v1.0.0
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}