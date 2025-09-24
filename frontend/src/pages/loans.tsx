import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Calendar,
  User,
  FileText,
  Banknote,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreateLoan, ListLoans, GetLoan, UpdateLoan, DisburseLoan, PayInstallment, GetOverdueInstallments } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"
import { usePermissions } from "@/hooks/usePermissions"

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

export function Loans() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [overdueInstallments, setOverdueInstallments] = useState<LoanInstallment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [customerFilter, setCustomerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null)
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null)
  
  const [newLoan, setNewLoan] = useState({
    customer_id: "",
    amount: 0,
    interest_rate: 0,
    term: 12,
  })

  const [editLoanData, setEditLoanData] = useState({
    amount: 0,
    interest_rate: 0,
    term: 12,
    status: "",
  })

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
  })

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

  const handleCreateLoan = async () => {
    try {
      const request = new services.LoanCreateRequest(newLoan)
      
      const response = await CreateLoan(request)
      if (response.success) {
        setShowCreateForm(false)
        setNewLoan({
          customer_id: "",
          amount: 0,
          interest_rate: 0,
          term: 12,
        })
        loadLoans()
      }
    } catch (error) {
      console.error("Error creating loan:", error)
    }
  }

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setEditLoanData({
      amount: loan.amount,
      interest_rate: loan.interest_rate,
      term: loan.term,
      status: loan.status,
    })
    setShowEditForm(true)
  }

  const handleUpdateLoan = async () => {
    if (!selectedLoan) return
    
    try {
      const request = new services.LoanUpdateRequest(editLoanData)
      
      const response = await UpdateLoan(selectedLoan.id, request)
      if (response.success) {
        setShowEditForm(false)
        setSelectedLoan(null)
        loadLoans()
      }
    } catch (error) {
      console.error("Error updating loan:", error)
    }
  }

  const handleDeleteLoan = async () => {
    if (!loanToDelete) return
    
    try {
      // Note: DeleteLoan API should be implemented in backend
      console.log("Delete loan:", loanToDelete)
      setShowDeleteConfirm(false)
      setLoanToDelete(null)
      loadLoans()
    } catch (error) {
      console.error("Error deleting loan:", error)
    }
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

  const handlePayInstallment = async () => {
    if (!selectedInstallment) return
    
    try {
      const request = new services.InstallmentPaymentRequest({
        installment_id: selectedInstallment.id,
        amount: paymentData.amount,
        payment_date: new Date(paymentData.payment_date),
      })
      
      const response = await PayInstallment(request)
      if (response.success) {
        setShowPaymentModal(false)
        setSelectedInstallment(null)
        setPaymentData({
          amount: 0,
          payment_date: new Date().toISOString().split('T')[0],
        })
        loadLoans()
        loadOverdueInstallments()
      }
    } catch (error) {
      console.error("Error processing payment:", error)
    }
  }

  const handleViewDetails = async (loan: Loan) => {
    try {
      const response = await GetLoan(loan.id)
      if (response.success) {
        setSelectedLoan(response.data)
        setShowDetailModal(true)
      }
    } catch (error) {
      console.error("Error loading loan details:", error)
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

  const getInstallmentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Lunas</Badge>
      case 'overdue':
        return <Badge variant="destructive">Terlambat</Badge>
      case 'partial':
        return <Badge variant="secondary">Sebagian</Badge>
      case 'pending':
      default:
        return <Badge variant="outline">Belum Bayar</Badge>
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
    overdueCount: overdueInstallments.length,
    totalDisbursed: loans.reduce((sum, l) => sum + (l.status !== 'pending' ? l.amount : 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pinjaman</h2>
          <p className="text-muted-foreground">
            Kelola pinjaman dan angsuran nasabah
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Pinjaman
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pinjaman
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanStats.totalLoans}</div>
            <p className="text-xs text-muted-foreground">
              Kontrak pinjaman
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pinjaman Aktif
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanStats.activeLoans}</div>
            <p className="text-xs text-muted-foreground">
              Sedang berjalan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Angsuran Terlambat
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanStats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Perlu tindakan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Dicairkan
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(loanStats.totalDisbursed)}</div>
            <p className="text-xs text-muted-foreground">
              Dana tersalurkan
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="loans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="loans">Daftar Pinjaman</TabsTrigger>
          <TabsTrigger value="overdue">Angsuran Terlambat</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filter & Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customer_search">ID Nasabah</Label>
                  <Input
                    id="customer_search"
                    placeholder="UUID nasabah"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status_search">Status</Label>
                  <select
                    id="status_search"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
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
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCustomerFilter("")
                      setStatusFilter("")
                    }}
                  >
                    Reset Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Loan Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Buat Pinjaman Baru</CardTitle>
                <CardDescription>Buat kontrak pinjaman untuk nasabah</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_id">ID Nasabah</Label>
                    <Input
                      id="customer_id"
                      value={newLoan.customer_id}
                      onChange={(e) => setNewLoan({ ...newLoan, customer_id: e.target.value })}
                      placeholder="UUID nasabah"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Jumlah Pinjaman</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newLoan.amount}
                      onChange={(e) => setNewLoan({ ...newLoan, amount: parseInt(e.target.value) || 0 })}
                      placeholder="5000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interest_rate">Suku Bunga (%)</Label>
                    <Input
                      id="interest_rate"
                      type="number"
                      step="0.1"
                      value={newLoan.interest_rate}
                      onChange={(e) => setNewLoan({ ...newLoan, interest_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="15.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="term">Jangka Waktu (bulan)</Label>
                    <Input
                      id="term"
                      type="number"
                      value={newLoan.term}
                      onChange={(e) => setNewLoan({ ...newLoan, term: parseInt(e.target.value) || 12 })}
                      placeholder="12"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateLoan}>Buat Pinjaman</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loans List */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Pinjaman</CardTitle>
              <CardDescription>
                Total {total} pinjaman ditemukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : loans.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">Tidak ada pinjaman</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Belum ada pinjaman yang dibuat.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="flex items-center space-x-2">
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
                                    <Banknote className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      Cair: {new Date(loan.disbursed_at).toLocaleDateString('id-ID')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Progress Bar for Active Loans */}
                              {loan.status === 'active' && loan.installments && (
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Progress: {calculateProgress(loan)}%</span>
                                    <span>Terbayar: {formatCurrency(calculateTotalPaid(loan))}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full" 
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
                            onClick={() => handleViewDetails(loan)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditLoan(loan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {loan.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisburseLoan(loan.id)}
                            >
                              Cairkan
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setLoanToDelete(loan.id)
                              setShowDeleteConfirm(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page * limit >= total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                Angsuran Terlambat
              </CardTitle>
              <CardDescription>
                {overdueInstallments.length} angsuran memerlukan tindakan segera
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
                    <div key={installment.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Angsuran #{installment.number}</h3>
                          <p className="text-sm text-muted-foreground">
                            Jatuh tempo: {new Date(installment.due_date).toLocaleDateString('id-ID')} • 
                            Terlambat: {installment.dpd} hari
                          </p>
                          <p className="text-sm font-medium">
                            Jumlah: {formatCurrency(installment.amount_due)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInstallment(installment)
                            setPaymentData({
                              amount: installment.amount_due - installment.amount_paid,
                              payment_date: new Date().toISOString().split('T')[0],
                            })
                            setShowPaymentModal(true)
                          }}
                        >
                          Bayar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Pinjaman</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted'].map((status) => {
                    const count = loans.filter(l => l.status === status).length
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{status}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tingkat Kolektibilitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {total > 0 ? Math.round(((total - loanStats.overdueCount) / total) * 100) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Tingkat pembayaran tepat waktu</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Loan Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detail Pinjaman</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Informasi Pinjaman</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Kontrak:</span>
                      <span className="text-sm font-medium">{selectedLoan.contract_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Nasabah:</span>
                      <span className="text-sm font-medium">{selectedLoan.customer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Jumlah:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedLoan.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bunga:</span>
                      <span className="text-sm font-medium">{selectedLoan.interest_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tenor:</span>
                      <span className="text-sm font-medium">{selectedLoan.term} bulan</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Angsuran:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedLoan.monthly_payment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedLoan.status)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Jadwal Angsuran</h3>
                  {selectedLoan.installments && selectedLoan.installments.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {selectedLoan.installments.map((installment) => (
                        <div key={installment.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <span className="font-medium">#{installment.number}</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(installment.due_date).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(installment.amount_due)}</p>
                            {getInstallmentStatusBadge(installment.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Jadwal angsuran belum dibuat</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailModal(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Loan Modal */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pinjaman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_amount">Jumlah Pinjaman</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  value={editLoanData.amount}
                  onChange={(e) => setEditLoanData({ ...editLoanData, amount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit_interest_rate">Suku Bunga (%)</Label>
                <Input
                  id="edit_interest_rate"
                  type="number"
                  step="0.1"
                  value={editLoanData.interest_rate}
                  onChange={(e) => setEditLoanData({ ...editLoanData, interest_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit_term">Jangka Waktu (bulan)</Label>
                <Input
                  id="edit_term"
                  type="number"
                  value={editLoanData.term}
                  onChange={(e) => setEditLoanData({ ...editLoanData, term: parseInt(e.target.value) || 12 })}
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <select
                  id="edit_status"
                  value={editLoanData.status}
                  onChange={(e) => setEditLoanData({ ...editLoanData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Disetujui</option>
                  <option value="disbursed">Dicairkan</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Selesai</option>
                  <option value="defaulted">Bermasalah</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditForm(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateLoan}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran Angsuran</DialogTitle>
            <DialogDescription>
              Proses pembayaran angsuran #{selectedInstallment?.number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment_amount">Jumlah Pembayaran</Label>
              <Input
                id="payment_amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="payment_date">Tanggal Pembayaran</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Batal
            </Button>
            <Button onClick={handlePayInstallment}>
              <DollarSign className="mr-2 h-4 w-4" />
              Proses Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus pinjaman ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteLoan}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}