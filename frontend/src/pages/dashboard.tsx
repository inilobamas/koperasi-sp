import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  UserCheck,
  CreditCard,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DashboardStats {
  totalCustomers: number
  verifiedCustomers: number
  activeLoans: number
  overdueInstallments: number
  totalLoanAmount: number
  monthlyCollection: number
  conversionRate: number
  onTimePaymentRate: number
}

interface RecentActivity {
  id: string
  type: 'customer' | 'loan' | 'payment' | 'document'
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error'
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    verifiedCustomers: 0,
    activeLoans: 0,
    overdueInstallments: 0,
    totalLoanAmount: 0,
    monthlyCollection: 0,
    conversionRate: 0,
    onTimePaymentRate: 0,
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would call the backend APIs
    // For now, using mock data
    setTimeout(() => {
      setStats({
        totalCustomers: 200,
        verifiedCustomers: 175,
        activeLoans: 120,
        overdueInstallments: 15,
        totalLoanAmount: 2500000000,
        monthlyCollection: 450000000,
        conversionRate: 87.5,
        onTimePaymentRate: 92.3,
      })

      setRecentActivity([
        {
          id: '1',
          type: 'customer',
          description: 'Nasabah baru: Ahmad Susanto telah terdaftar',
          timestamp: '10 menit yang lalu',
          status: 'success'
        },
        {
          id: '2',
          type: 'document',
          description: 'KTP nasabah Siti Rahayu telah diverifikasi',
          timestamp: '25 menit yang lalu',
          status: 'success'
        },
        {
          id: '3',
          type: 'payment',
          description: 'Pembayaran angsuran KOP-2024-0150 terlambat',
          timestamp: '1 jam yang lalu',
          status: 'warning'
        },
        {
          id: '4',
          type: 'loan',
          description: 'Pinjaman baru Rp 15.000.000 telah dicairkan',
          timestamp: '2 jam yang lalu',
          status: 'success'
        },
      ])

      setLoading(false)
    }, 1000)
  }, [])

  const statCards = [
    {
      title: "Total Nasabah",
      value: stats.totalCustomers.toLocaleString(),
      description: `${stats.verifiedCustomers} telah terverifikasi`,
      icon: Users,
      trend: "+12% dari bulan lalu"
    },
    {
      title: "Pinjaman Aktif",
      value: stats.activeLoans.toLocaleString(),
      description: `${stats.overdueInstallments} angsuran terlambat`,
      icon: CreditCard,
      trend: "+5% dari bulan lalu"
    },
    {
      title: "Total Pinjaman",
      value: formatCurrency(stats.totalLoanAmount),
      description: "Total nilai pinjaman yang beredar",
      icon: DollarSign,
      trend: "+8% dari bulan lalu"
    },
    {
      title: "Koleksi Bulanan",
      value: formatCurrency(stats.monthlyCollection),
      description: "Target bulan ini: Rp 500M",
      icon: TrendingUp,
      trend: "90% dari target"
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-40 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
              <div className="flex items-center pt-1">
                <Badge variant="secondary" className="text-xs">
                  {card.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
              Tingkat Konversi
            </CardTitle>
            <CardDescription>
              Persentase nasabah yang melanjutkan ke pinjaman
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.conversionRate}%
            </div>
            <div className="text-sm text-muted-foreground">
              Target: 85% ✓ Tercapai
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              On-Time Payment Rate
            </CardTitle>
            <CardDescription>
              Persentase pembayaran tepat waktu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.onTimePaymentRate}%
            </div>
            <div className="text-sm text-muted-foreground">
              Target: 90% ✓ Tercapai
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Aktivitas Terbaru</TabsTrigger>
          <TabsTrigger value="alerts">Peringatan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>
                Aktivitas sistem dalam 24 jam terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className={`rounded-full p-2 ${
                      activity.status === 'success' ? 'bg-green-100 text-green-600' :
                      activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {activity.type === 'customer' && <Users className="h-4 w-4" />}
                      {activity.type === 'loan' && <CreditCard className="h-4 w-4" />}
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4" />}
                      {activity.type === 'document' && <UserCheck className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
                Peringatan Sistem
              </CardTitle>
              <CardDescription>
                Item yang memerlukan perhatian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">15 Angsuran Terlambat</p>
                    <p className="text-sm text-muted-foreground">
                      Perlu tindakan penagihan segera
                    </p>
                  </div>
                  <Button size="sm">Lihat Detail</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">8 Dokumen Menunggu Verifikasi</p>
                    <p className="text-sm text-muted-foreground">
                      KTP nasabah baru perlu diverifikasi
                    </p>
                  </div>
                  <Button size="sm">Verifikasi</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Target Koleksi 90%</p>
                    <p className="text-sm text-muted-foreground">
                      Butuh Rp 50M lagi untuk mencapai target bulan ini
                    </p>
                  </div>
                  <Button size="sm" variant="outline">Detail</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}