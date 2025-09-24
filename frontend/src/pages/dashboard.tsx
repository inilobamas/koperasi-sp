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
  RefreshCw,
  Plus,
  FileText,
  Calendar,
  Target,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Eye,
  Bell,
  Filter,
  Download,
  Settings
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Area, AreaChart, Pie } from 'recharts'

interface DashboardStats {
  totalCustomers: number
  verifiedCustomers: number
  newCustomersThisMonth: number
  activeLoans: number
  pendingLoans: number
  completedLoans: number
  overdueInstallments: number
  totalLoanAmount: number
  monthlyCollection: number
  collectionTarget: number
  conversionRate: number
  onTimePaymentRate: number
  nplRatio: number
  averageLoanSize: number
  portfolioGrowth: number
  totalDisbursed: number
  totalOutstanding: number
}

interface RecentActivity {
  id: string
  type: 'customer' | 'loan' | 'payment' | 'document' | 'verification' | 'collection'
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'info'
  amount?: number
  actionUrl?: string
}

interface ChartData {
  monthlyPerformance: Array<{
    month: string
    disbursed: number
    collected: number
    newCustomers: number
  }>
  loanDistribution: Array<{
    status: string
    value: number
    count: number
    color: string
  }>
  riskAnalysis: Array<{
    category: string
    current: number
    previous: number
  }>
  collectionTrend: Array<{
    week: string
    target: number
    actual: number
    efficiency: number
  }>
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  action: () => void
  variant: 'default' | 'destructive' | 'outline' | 'secondary'
  count?: number
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    verifiedCustomers: 0,
    newCustomersThisMonth: 0,
    activeLoans: 0,
    pendingLoans: 0,
    completedLoans: 0,
    overdueInstallments: 0,
    totalLoanAmount: 0,
    monthlyCollection: 0,
    collectionTarget: 0,
    conversionRate: 0,
    onTimePaymentRate: 0,
    nplRatio: 0,
    averageLoanSize: 0,
    portfolioGrowth: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [chartData, setChartData] = useState<ChartData>({
    monthlyPerformance: [],
    loanDistribution: [],
    riskAnalysis: [],
    collectionTrend: []
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')

  const loadDashboardData = async () => {
    // In a real app, this would call the backend APIs
    // For now, using enhanced mock data
    try {
      setStats({
        totalCustomers: 248,
        verifiedCustomers: 225,
        newCustomersThisMonth: 18,
        activeLoans: 142,
        pendingLoans: 23,
        completedLoans: 89,
        overdueInstallments: 12,
        totalLoanAmount: 3200000000,
        monthlyCollection: 485000000,
        collectionTarget: 520000000,
        conversionRate: 89.2,
        onTimePaymentRate: 94.1,
        nplRatio: 2.8,
        averageLoanSize: 22500000,
        portfolioGrowth: 15.3,
        totalDisbursed: 2850000000,
        totalOutstanding: 1950000000,
      })

      setChartData({
        monthlyPerformance: [
          { month: 'Jan', disbursed: 280000000, collected: 420000000, newCustomers: 15 },
          { month: 'Feb', disbursed: 320000000, collected: 390000000, newCustomers: 22 },
          { month: 'Mar', disbursed: 350000000, collected: 450000000, newCustomers: 19 },
          { month: 'Apr', disbursed: 380000000, collected: 470000000, newCustomers: 25 },
          { month: 'May', disbursed: 420000000, collected: 485000000, newCustomers: 18 },
        ],
        loanDistribution: [
          { status: 'Aktif', value: 142, count: 142, color: '#22c55e' },
          { status: 'Pending', value: 23, count: 23, color: '#f59e0b' },
          { status: 'Selesai', value: 89, count: 89, color: '#3b82f6' },
          { status: 'Bermasalah', value: 8, count: 8, color: '#ef4444' },
        ],
        riskAnalysis: [
          { category: 'NPL Ratio', current: 2.8, previous: 3.2 },
          { category: 'Collection Efficiency', current: 94.1, previous: 92.3 },
          { category: 'Approval Rate', current: 78.5, previous: 75.2 },
          { category: 'Default Rate', current: 1.2, previous: 1.8 },
        ],
        collectionTrend: [
          { week: 'W1', target: 130000000, actual: 125000000, efficiency: 96.2 },
          { week: 'W2', target: 130000000, actual: 138000000, efficiency: 106.2 },
          { week: 'W3', target: 130000000, actual: 122000000, efficiency: 93.8 },
          { week: 'W4', target: 130000000, actual: 135000000, efficiency: 103.8 },
        ]
      })

      setRecentActivity([
        {
          id: '1',
          type: 'payment',
          description: 'Pembayaran angsuran Rp 2.500.000 dari KOP-2024-0156',
          timestamp: '5 menit yang lalu',
          status: 'success',
          amount: 2500000
        },
        {
          id: '2',
          type: 'customer',
          description: 'Nasabah baru: Ahmad Susanto telah terdaftar',
          timestamp: '15 menit yang lalu',
          status: 'success'
        },
        {
          id: '3',
          type: 'verification',
          description: 'Dokumen KTP Siti Rahayu berhasil diverifikasi',
          timestamp: '25 menit yang lalu',
          status: 'success'
        },
        {
          id: '4',
          type: 'loan',
          description: 'Pinjaman baru Rp 25.000.000 telah dicairkan',
          timestamp: '45 menit yang lalu',
          status: 'success',
          amount: 25000000
        },
        {
          id: '5',
          type: 'collection',
          description: 'Angsuran KOP-2024-0145 terlambat 3 hari',
          timestamp: '1 jam yang lalu',
          status: 'warning',
          amount: 1800000
        },
        {
          id: '6',
          type: 'document',
          description: 'Upload slip gaji untuk pinjaman KOP-2024-0158',
          timestamp: '1.5 jam yang lalu',
          status: 'info'
        },
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setTimeout(() => setRefreshing(false), 500)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await loadDashboardData()
      setLoading(false)
    }
    
    fetchData()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 300000)
    
    return () => clearInterval(interval)
  }, [selectedTimeframe])

  const statCards = [
    {
      title: "Total Nasabah",
      value: stats.totalCustomers.toLocaleString(),
      description: `${stats.newCustomersThisMonth} baru bulan ini`,
      icon: Users,
      trend: "+12.3%",
      trendUp: true,
      subValue: `${Math.round((stats.verifiedCustomers / stats.totalCustomers) * 100)}% terverifikasi`
    },
    {
      title: "Portfolio Pinjaman",
      value: formatCurrency(stats.totalOutstanding),
      description: `${stats.activeLoans} pinjaman aktif`,
      icon: CreditCard,
      trend: `+${stats.portfolioGrowth}%`,
      trendUp: true,
      subValue: `Rata-rata: ${formatCurrency(stats.averageLoanSize)}`
    },
    {
      title: "Koleksi Bulanan",
      value: formatCurrency(stats.monthlyCollection),
      description: `Target: ${formatCurrency(stats.collectionTarget)}`,
      icon: Target,
      trend: `${Math.round((stats.monthlyCollection / stats.collectionTarget) * 100)}%`,
      trendUp: stats.monthlyCollection >= stats.collectionTarget * 0.9,
      subValue: `Sisa: ${formatCurrency(stats.collectionTarget - stats.monthlyCollection)}`
    },
    {
      title: "NPL Ratio",
      value: `${stats.nplRatio}%`,
      description: `${stats.overdueInstallments} angsuran terlambat`,
      icon: AlertTriangle,
      trend: "-0.4%",
      trendUp: true,
      subValue: `Target: <5%`,
      warning: stats.nplRatio > 5
    },
  ]

  const quickActions: QuickAction[] = [
    {
      id: 'new-loan',
      title: 'Pinjaman Baru',
      description: 'Buat aplikasi pinjaman',
      icon: Plus,
      action: () => console.log('Navigate to new loan'),
      variant: 'default'
    },
    {
      id: 'verify-docs',
      title: 'Verifikasi Dokumen',
      description: 'Review dokumen pending',
      icon: FileText,
      action: () => console.log('Navigate to document verification'),
      variant: 'outline',
      count: 8
    },
    {
      id: 'process-payments',
      title: 'Proses Pembayaran',
      description: 'Input pembayaran angsuran',
      icon: DollarSign,
      action: () => console.log('Navigate to payment processing'),
      variant: 'outline'
    },
    {
      id: 'collection-alerts',
      title: 'Tindak Lanjut Tagihan',
      description: 'Angsuran terlambat',
      icon: Bell,
      action: () => console.log('Navigate to collection'),
      variant: 'destructive',
      count: stats.overdueInstallments
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
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
    <div className="space-y-6 p-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Ringkasan performa koperasi dan aktivitas terkini
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="7d">7 Hari</option>
            <option value="30d">30 Hari</option>
            <option value="90d">90 Hari</option>
            <option value="1y">1 Tahun</option>
          </select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index} className={`hover:shadow-md transition-shadow ${card.warning ? 'border-red-200' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.warning ? 'text-red-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mb-2">
                {card.description}
              </p>
              <div className="flex items-center justify-between">
                <Badge 
                  variant={card.trendUp ? "default" : "secondary"} 
                  className={`text-xs ${card.trendUp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {card.trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {card.trend}
                </Badge>
              </div>
              {card.subValue && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subValue}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Aksi Cepat
          </CardTitle>
          <CardDescription>
            Tindakan yang sering digunakan untuk efisiensi kerja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                className="h-auto p-4 flex flex-col items-start space-y-2 relative"
                onClick={action.action}
              >
                <div className="flex items-center justify-between w-full">
                  <action.icon className="h-5 w-5" />
                  {action.count && action.count > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {action.count}
                    </Badge>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="activity">Aktivitas</TabsTrigger>
          <TabsTrigger value="alerts">Peringatan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Performa Bulanan
                </CardTitle>
                <CardDescription>Pencairan vs Koleksi (dalam juta Rupiah)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${value / 1000000}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="disbursed" fill="#3b82f6" name="Pencairan" />
                    <Bar dataKey="collected" fill="#22c55e" name="Koleksi" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Loan Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Distribusi Status Pinjaman
                </CardTitle>
                <CardDescription>Komposisi portfolio pinjaman</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={chartData.loanDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.loanDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} loans`, name]} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {chartData.loanDistribution.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.status}: {item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
                  Tingkat Konversi
                </CardTitle>
                <CardDescription>Nasabah → Peminjam</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.conversionRate}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${stats.conversionRate}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Target: 85% ✓ Tercapai
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-blue-600" />
                  Ketepatan Pembayaran
                </CardTitle>
                <CardDescription>On-Time Payment Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.onTimePaymentRate}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${stats.onTimePaymentRate}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Target: 90% ✓ Tercapai
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-purple-600" />
                  Efisiensi Koleksi
                </CardTitle>
                <CardDescription>Collection Efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round((stats.monthlyCollection / stats.collectionTarget) * 100)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${Math.round((stats.monthlyCollection / stats.collectionTarget) * 100)}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {formatCurrency(stats.collectionTarget - stats.monthlyCollection)} dari target
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Analisis Risiko</CardTitle>
                <CardDescription>Perbandingan dengan periode sebelumnya</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chartData.riskAnalysis.map((item, index) => {
                    const improvement = item.current < item.previous
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.category}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{item.current}%</span>
                          <Badge 
                            variant={improvement ? "default" : "secondary"}
                            className={`text-xs ${improvement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {improvement ? '↓' : '↑'} {Math.abs(item.current - item.previous).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Collection Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Tren Koleksi Mingguan</CardTitle>
                <CardDescription>Target vs Aktual (dalam juta Rupiah)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData.collectionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis tickFormatter={(value) => `${value / 1000000}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" name="Target" />
                    <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} name="Aktual" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                  <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className={`rounded-full p-2 ${
                      activity.status === 'success' ? 'bg-green-100 text-green-600' :
                      activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      activity.status === 'info' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {activity.type === 'customer' && <Users className="h-4 w-4" />}
                      {activity.type === 'loan' && <CreditCard className="h-4 w-4" />}
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4" />}
                      {activity.type === 'document' && <UserCheck className="h-4 w-4" />}
                      {activity.type === 'verification' && <CheckCircle2 className="h-4 w-4" />}
                      {activity.type === 'collection' && <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {activity.timestamp}
                        </p>
                        {activity.amount && (
                          <span className="text-sm font-medium">
                            {formatCurrency(activity.amount)}
                          </span>
                        )}
                      </div>
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
                Peringatan & Tindakan Diperlukan
              </CardTitle>
              <CardDescription>
                Item yang memerlukan perhatian segera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">{stats.overdueInstallments} Angsuran Terlambat</p>
                      <p className="text-sm text-red-700">
                        Perlu tindakan penagihan segera - Total: {formatCurrency(stats.overdueInstallments * 2000000)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive">Lihat Detail</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">8 Dokumen Menunggu Verifikasi</p>
                      <p className="text-sm text-yellow-700">
                        KTP dan dokumen pendukung nasabah baru
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Verifikasi</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-start space-x-3">
                    <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Target Koleksi {Math.round((stats.monthlyCollection / stats.collectionTarget) * 100)}%</p>
                      <p className="text-sm text-blue-700">
                        Perlu {formatCurrency(stats.collectionTarget - stats.monthlyCollection)} lagi untuk mencapai target
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Detail</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">{stats.pendingLoans} Pinjaman Menunggu Persetujuan</p>
                      <p className="text-sm text-green-700">
                        Total nilai: {formatCurrency(stats.pendingLoans * 15000000)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}