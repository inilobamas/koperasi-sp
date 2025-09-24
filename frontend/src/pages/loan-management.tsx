import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoanModal } from "@/components/LoanModal"
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Users,
  Calendar,
  Calculator,
  FileText,
  Target,
  Activity
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreateLoan, ListLoans, GetLoan, UpdateLoan, DisburseLoan, PayInstallment, GetOverdueInstallments } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"

interface Loan {
  id: string
  customer_id: string
  contract_number: string
  amount: number
  interest_rate: number
  term: number
  monthly_payment: number
  status: 'pending' | 'approved' | 'disbursed' | 'active' | 'completed' | 'defaulted' | 'cancelled'
  disbursed_at?: string
  due_date: string
  created_at: string
  updated_at: string
  customer?: {
    id: string
    name: string
    phone: string
    email?: string
  }
  installments?: LoanInstallment[]
}

interface LoanInstallment {
  id: string
  loan_id: string
  number: number
  due_date: string
  amount_due: number
  amount_paid: number
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  paid_at?: string
  dpd: number
  created_at: string
  updated_at: string
}

interface LoanListResponse {
  loans: Loan[]
  total: number
  page: number
  limit: number
}

export function LoanManagement() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [overdueInstallments, setOverdueInstallments] = useState<LoanInstallment[]>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [customerFilter, setCustomerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null)

  const loadLoans = async () => {
    setLoading(true)
    try {
      const request = new services.LoanListRequest({
        page,
        limit,
        customer_id: customerFilter,
        status: statusFilter,
      })
      
      const response = await ListLoans(request)
      if (response.success) {
        const data = response.data as LoanListResponse
        setLoans(data.loans || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error loading loans:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadOverdueInstallments = async () => {
    try {
      const response = await GetOverdueInstallments()
      if (response.success) {
        setOverdueInstallments(response.data || [])
      }
    } catch (error) {
      console.error("Error loading overdue installments:", error)
    }
  }

  useEffect(() => {
    loadLoans()
    loadOverdueInstallments()
  }, [page, customerFilter, statusFilter])

  const handleCreateLoan = async (data: any) => {
    try {
      const request = new services.LoanCreateRequest(data)
      const response = await CreateLoan(request)
      if (response.success) {
        loadLoans()
      }
    } catch (error) {
      console.error("Error creating loan:", error)
      throw error
    }
  }

  const handleUpdateLoan = async (data: any) => {
    if (!selectedLoan) return
    
    try {
      const request = new services.LoanUpdateRequest(data)
      const response = await UpdateLoan(selectedLoan.id, request)
      if (response.success) {
        loadLoans()
      }
    } catch (error) {
      console.error("Error updating loan:", error)
      throw error
    }
  }

  const handleViewLoan = async (loan: Loan) => {
    try {
      const response = await GetLoan(loan.id)
      if (response.success) {
        setSelectedLoan(response.data)
        setModalMode('view')
        setShowLoanModal(true)
      }
    } catch (error) {
      console.error("Error loading loan details:", error)
    }
  }

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setModalMode('edit')
    setShowLoanModal(true)
  }

  const handleDisburseLoan = async (loanId: string) => {
    try {
      const response = await DisburseLoan(loanId)
      if (response.success) {
        loadLoans()
      }
    } catch (error) {
      console.error("Error disbursing loan:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Selesai</Badge>
      case 'approved':
        return <Badge variant="secondary">Disetujui</Badge>
      case 'disbursed':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Dicairkan</Badge>
      case 'defaulted':
        return <Badge variant="destructive">Bermasalah</Badge>
      case 'cancelled':
        return <Badge variant="outline">Dibatalkan</Badge>
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const calculateProgress = (loan: Loan) => {
    if (!loan.installments) return 0
    const paidInstallments = loan.installments.filter(i => i.status === 'paid').length
    return Math.round((paidInstallments / loan.installments.length) * 100)
  }

  const calculateTotalPaid = (loan: Loan) => {
    if (!loan.installments) return 0
    return loan.installments.reduce((sum, i) => sum + i.amount_paid, 0)
  }

  const loanStats = {
    totalLoans: total,
    activeLoans: loans.filter(l => l.status === 'active').length,
    completedLoans: loans.filter(l => l.status === 'completed').length,
    pendingLoans: loans.filter(l => l.status === 'pending').length,
    overdueCount: overdueInstallments.length,
    totalDisbursed: loans.reduce((sum, l) => sum + (l.status !== 'pending' ? l.amount : 0), 0),
    totalOutstanding: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.amount, 0),
    averageLoanAmount: loans.length > 0 ? loans.reduce((sum, l) => sum + l.amount, 0) / loans.length : 0,
  }

  const filteredLoans = loans.filter(loan => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      loan.contract_number.toLowerCase().includes(query) ||
      loan.customer?.name.toLowerCase().includes(query) ||
      loan.customer?.phone.includes(query)
    )
  })

  return (
    <div className="space-y-6 p-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Pinjaman</h1>
          <p className="text-muted-foreground">
            Kelola seluruh aspek pinjaman dan angsuran nasabah dengan mudah
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadLoans}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => {
            setSelectedLoan(null)
            setModalMode('create')
            setShowLoanModal(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Pinjaman Baru
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pinjaman</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanStats.totalLoans}</div>
            <p className="text-xs text-muted-foreground">
              Rata-rata: {formatCurrency(loanStats.averageLoanAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pinjaman Aktif</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loanStats.activeLoans}</div>
            <p className="text-xs text-muted-foreground">
              Outstanding: {formatCurrency(loanStats.totalOutstanding)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Angsuran Terlambat</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loanStats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Perlu tindakan segera
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dicairkan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(loanStats.totalDisbursed)}</div>
            <p className="text-xs text-muted-foreground">
              {loanStats.completedLoans} pinjaman selesai
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">Aktif ({loanStats.activeLoans})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({loanStats.pendingLoans})</TabsTrigger>
          <TabsTrigger value="overdue">Terlambat ({loanStats.overdueCount})</TabsTrigger>
          <TabsTrigger value="all">Semua ({loanStats.totalLoans})</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan kontrak, nama nasabah, atau telepon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Disetujui</option>
                  <option value="disbursed">Dicairkan</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Selesai</option>
                  <option value="defaulted">Bermasalah</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCustomerFilter("")
                    setStatusFilter("")
                    setSearchQuery("")
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="active" className="space-y-4">
          <LoanList 
            loans={filteredLoans.filter(l => l.status === 'active')} 
            loading={loading}
            onView={handleViewLoan}
            onEdit={handleEditLoan}
            onDisburse={handleDisburseLoan}
            getStatusBadge={getStatusBadge}
            calculateProgress={calculateProgress}
            calculateTotalPaid={calculateTotalPaid}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <LoanList 
            loans={filteredLoans.filter(l => l.status === 'pending' || l.status === 'approved')} 
            loading={loading}
            onView={handleViewLoan}
            onEdit={handleEditLoan}
            onDisburse={handleDisburseLoan}
            getStatusBadge={getStatusBadge}
            calculateProgress={calculateProgress}
            calculateTotalPaid={calculateTotalPaid}
          />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Angsuran Terlambat ({overdueInstallments.length})
              </CardTitle>
              <CardDescription>
                Daftar angsuran yang memerlukan tindakan segera
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueInstallments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                  <h3 className="mt-2 text-sm font-semibold">Tidak ada angsuran terlambat</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Semua angsuran dibayar tepat waktu.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueInstallments.map((installment) => (
                    <div key={installment.id} className="border border-red-200 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">Angsuran #{installment.number}</h3>
                            <Badge variant="destructive">
                              Terlambat {installment.dpd} hari
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Jatuh tempo: {new Date(installment.due_date).toLocaleDateString('id-ID')}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm font-medium">
                              Jumlah: {formatCurrency(installment.amount_due)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Terbayar: {formatCurrency(installment.amount_paid)}
                            </span>
                            <span className="text-sm font-medium text-red-600">
                              Sisa: {formatCurrency(installment.amount_due - installment.amount_paid)}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                          <Button size="sm">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Bayar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <LoanList 
            loans={filteredLoans} 
            loading={loading}
            onView={handleViewLoan}
            onEdit={handleEditLoan}
            onDisburse={handleDisburseLoan}
            getStatusBadge={getStatusBadge}
            calculateProgress={calculateProgress}
            calculateTotalPaid={calculateTotalPaid}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Pinjaman</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted'].map((status) => {
                    const count = loans.filter(l => l.status === status).length
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{status}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performa Kolektibilitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {total > 0 ? Math.round(((total - loanStats.overdueCount) / total) * 100) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Tingkat pembayaran tepat waktu</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{total - loanStats.overdueCount}</div>
                      <div className="text-muted-foreground">Lancar</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{loanStats.overdueCount}</div>
                      <div className="text-muted-foreground">Bermasalah</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Loan Modal */}
      <LoanModal
        mode={modalMode}
        loan={selectedLoan}
        open={showLoanModal}
        onOpenChange={setShowLoanModal}
        onSubmit={modalMode === 'create' ? handleCreateLoan : handleUpdateLoan}
        customers={customers}
      />
    </div>
  )
}

// Reusable LoanList Component
interface LoanListProps {
  loans: Loan[]
  loading: boolean
  onView: (loan: Loan) => void
  onEdit: (loan: Loan) => void
  onDisburse: (loanId: string) => void
  getStatusBadge: (status: string) => JSX.Element
  calculateProgress: (loan: Loan) => number
  calculateTotalPaid: (loan: Loan) => number
}

function LoanList({ 
  loans, 
  loading, 
  onView, 
  onEdit, 
  onDisburse, 
  getStatusBadge, 
  calculateProgress, 
  calculateTotalPaid 
}: LoanListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loans.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">Tidak ada pinjaman</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Belum ada pinjaman yang sesuai dengan filter.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{loan.contract_number}</h3>
                        {getStatusBadge(loan.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {loan.customer?.name} • {formatCurrency(loan.amount)} • 
                        {loan.term} bulan • {loan.interest_rate}%
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Dibuat: {new Date(loan.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        {loan.disbursed_at && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Cair: {new Date(loan.disbursed_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {loan.status === 'active' && loan.installments && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress: {calculateProgress(loan)}%</span>
                            <span>Terbayar: {formatCurrency(calculateTotalPaid(loan))}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${calculateProgress(loan)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onView(loan)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(loan)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {loan.status === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDisburse(loan.id)}
                    >
                      Cairkan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}