import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Database, 
  Users, 
  Save,
  Plus,
  Trash2,
  Edit
} from "lucide-react"

export function Settings() {
  const [loading, setLoading] = useState(false)
  const [systemSettings, setSystemSettings] = useState({
    siteName: "Koperasi Simpan Pinjam",
    siteDescription: "Sistem Manajemen Koperasi",
    adminEmail: "admin@koperasi.com",
    maxLoanAmount: 50000000,
    defaultInterestRate: 12.5,
    maxLoanTerm: 36
  })
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    whatsappEnabled: true,
    reminderDaysBefore: 3,
    overdueReminderDays: 7
  })

  const [users, setUsers] = useState([
    { id: "1", name: "Super Admin", email: "superadmin@koperasi.com", role: "superadmin" },
    { id: "2", name: "Admin Cabang", email: "admin@koperasi.com", role: "admin" },
    { id: "3", name: "Karyawan 1", email: "karyawan1@koperasi.com", role: "karyawan" }
  ])

  const handleSaveSystemSettings = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call
      console.log("Saving system settings:", systemSettings)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Save settings error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotificationSettings = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call
      console.log("Saving notification settings:", notificationSettings)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Save notification settings error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'karyawan':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Kelola konfigurasi sistem</p>
        </div>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Sistem
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Keamanan
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifikasi
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Pengguna
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Sistem</CardTitle>
              <CardDescription>
                Konfigurasi dasar aplikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nama Situs</Label>
                  <Input
                    id="siteName"
                    value={systemSettings.siteName}
                    onChange={(e) => setSystemSettings({...systemSettings, siteName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email Admin</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={systemSettings.adminEmail}
                    onChange={(e) => setSystemSettings({...systemSettings, adminEmail: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Deskripsi Situs</Label>
                <Input
                  id="siteDescription"
                  value={systemSettings.siteDescription}
                  onChange={(e) => setSystemSettings({...systemSettings, siteDescription: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLoanAmount">Maksimal Pinjaman (Rp)</Label>
                  <Input
                    id="maxLoanAmount"
                    type="number"
                    value={systemSettings.maxLoanAmount}
                    onChange={(e) => setSystemSettings({...systemSettings, maxLoanAmount: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultInterestRate">Suku Bunga Default (%)</Label>
                  <Input
                    id="defaultInterestRate"
                    type="number"
                    step="0.1"
                    value={systemSettings.defaultInterestRate}
                    onChange={(e) => setSystemSettings({...systemSettings, defaultInterestRate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoanTerm">Maksimal Tenor (bulan)</Label>
                  <Input
                    id="maxLoanTerm"
                    type="number"
                    value={systemSettings.maxLoanTerm}
                    onChange={(e) => setSystemSettings({...systemSettings, maxLoanTerm: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={handleSaveSystemSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Keamanan</CardTitle>
              <CardDescription>
                Konfigurasi keamanan dan autentikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Kebijakan Password</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Minimal 8 karakter</p>
                    <p>• Harus mengandung huruf besar dan kecil</p>
                    <p>• Harus mengandung angka</p>
                    <p>• Harus mengandung karakter khusus</p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Session Timeout</h4>
                  <p className="text-sm text-muted-foreground">
                    Sesi akan berakhir setelah 8 jam tidak aktif
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Login Attempts</h4>
                  <p className="text-sm text-muted-foreground">
                    Akun akan dikunci setelah 5 kali percobaan login gagal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi</CardTitle>
              <CardDescription>
                Konfigurasi notifikasi dan pengingat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Notifikasi</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) => setNotificationSettings({...notificationSettings, emailEnabled: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Aktifkan notifikasi email</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Notifikasi</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationSettings.whatsappEnabled}
                      onChange={(e) => setNotificationSettings({...notificationSettings, whatsappEnabled: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Aktifkan notifikasi WhatsApp</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderDaysBefore">Pengingat Sebelum Jatuh Tempo (hari)</Label>
                  <Input
                    id="reminderDaysBefore"
                    type="number"
                    value={notificationSettings.reminderDaysBefore}
                    onChange={(e) => setNotificationSettings({...notificationSettings, reminderDaysBefore: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overdueReminderDays">Pengingat Setelah Jatuh Tempo (hari)</Label>
                  <Input
                    id="overdueReminderDays"
                    type="number"
                    value={notificationSettings.overdueReminderDays}
                    onChange={(e) => setNotificationSettings({...notificationSettings, overdueReminderDays: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={handleSaveNotificationSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Menyimpan..." : "Simpan Pengaturan Notifikasi"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Manajemen Pengguna
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pengguna
                </Button>
              </CardTitle>
              <CardDescription>
                Kelola akun pengguna sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manajemen Database</CardTitle>
              <CardDescription>
                Operasi database dan backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Backup Database</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Backup otomatis dilakukan setiap hari pada jam 02:00 WIB
                  </p>
                  <Button variant="outline" size="sm">
                    Download Backup Terakhir
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Statistik Database</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Nasabah:</span>
                      <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Pinjaman:</span>
                      <span className="font-medium">456</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Dokumen:</span>
                      <span className="font-medium">2,468</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}