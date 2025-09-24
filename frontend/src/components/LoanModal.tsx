import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, DollarSign, User, FileText, Calculator, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
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
    address?: string
    identity_number?: string
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

interface LoanModalProps {
  mode: 'create' | 'edit' | 'view'
  loan?: Loan
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: any) => Promise<void>
  customers?: Array<{ id: string; name: string; phone: string }>
}

export function LoanModal({ mode, loan, open, onOpenChange, onSubmit, customers = [] }: LoanModalProps) {
  const [formData, setFormData] = useState({
    customer_id: "",
    amount: 0,
    interest_rate: 12,
    term: 12,
    status: "pending"
  })
  
  const [loading, setLoading] = useState(false)
  const [calculatedPayment, setCalculatedPayment] = useState(0)

  useEffect(() => {
    if (loan && (mode === 'edit' || mode === 'view')) {
      setFormData({
        customer_id: loan.customer_id,
        amount: loan.amount,
        interest_rate: loan.interest_rate,
        term: loan.term,
        status: loan.status
      })
    } else if (mode === 'create') {
      setFormData({
        customer_id: "",
        amount: 0,
        interest_rate: 12,
        term: 12,
        status: "pending"
      })
    }
  }, [loan, mode, open])

  useEffect(() => {
    if (formData.amount > 0 && formData.interest_rate > 0 && formData.term > 0) {
      const monthlyRate = formData.interest_rate / 100 / 12
      const payment = (formData.amount * monthlyRate * Math.pow(1 + monthlyRate, formData.term)) / 
                     (Math.pow(1 + monthlyRate, formData.term) - 1)
      setCalculatedPayment(payment)
    }
  }, [formData.amount, formData.interest_rate, formData.term])

  const handleSubmit = async () => {
    if (!onSubmit) return
    
    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting loan:", error)
    } finally {
      setLoading(false)
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

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Buat Pinjaman Baru'
      case 'edit': return 'Edit Pinjaman'
      case 'view': return 'Detail Pinjaman'
      default: return 'Pinjaman'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
          {mode === 'view' && loan && (
            <DialogDescription>
              Kontrak: {loan.contract_number} • Status: {getStatusBadge(loan.status)}
            </DialogDescription>
          )}
        </DialogHeader>

        {mode === 'view' && loan ? (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detail Pinjaman</TabsTrigger>
              <TabsTrigger value="installments">Jadwal Angsuran</TabsTrigger>
              <TabsTrigger value="history">Riwayat Pembayaran</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Informasi Nasabah
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Nama:</span>
                      <span className="text-sm font-medium">{loan.customer?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Telepon:</span>
                      <span className="text-sm font-medium">{loan.customer?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium">{loan.customer?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">NIK:</span>
                      <span className="text-sm font-medium">{loan.customer?.identity_number || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Informasi Pinjaman
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Kontrak:</span>
                      <span className="text-sm font-medium">{loan.contract_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Jumlah:</span>
                      <span className="text-sm font-medium">{formatCurrency(loan.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bunga:</span>
                      <span className="text-sm font-medium">{loan.interest_rate}% / tahun</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tenor:</span>
                      <span className="text-sm font-medium">{loan.term} bulan</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Angsuran:</span>
                      <span className="text-sm font-medium">{formatCurrency(loan.monthly_payment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {getStatusBadge(loan.status)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {loan.status === 'active' && loan.installments && (
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Pembayaran</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress: {calculateProgress(loan)}%</span>
                        <span>Terbayar: {formatCurrency(calculateTotalPaid(loan))}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${calculateProgress(loan)}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <div className="font-semibold text-green-600">
                            {loan.installments.filter(i => i.status === 'paid').length}
                          </div>
                          <div className="text-muted-foreground">Lunas</div>
                        </div>
                        <div>
                          <div className="font-semibold text-yellow-600">
                            {loan.installments.filter(i => i.status === 'pending').length}
                          </div>
                          <div className="text-muted-foreground">Pending</div>
                        </div>
                        <div>
                          <div className="font-semibold text-red-600">
                            {loan.installments.filter(i => i.status === 'overdue').length}
                          </div>
                          <div className="text-muted-foreground">Terlambat</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="installments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Jadwal Angsuran ({loan.installments?.length || 0} angsuran)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loan.installments && loan.installments.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {loan.installments.map((installment) => (
                        <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {installment.status === 'paid' && <CheckCircle className="h-5 w-5 text-green-600" />}
                              {installment.status === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
                              {installment.status === 'overdue' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                              {installment.status === 'partial' && <Clock className="h-5 w-5 text-blue-600" />}
                            </div>
                            <div>
                              <div className="font-medium">Angsuran #{installment.number}</div>
                              <div className="text-sm text-muted-foreground">
                                Jatuh tempo: {new Date(installment.due_date).toLocaleDateString('id-ID')}
                                {installment.dpd > 0 && (
                                  <span className="text-red-600 ml-2">
                                    (Terlambat {installment.dpd} hari)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(installment.amount_due)}</div>
                            <div className="text-sm text-muted-foreground">
                              Terbayar: {formatCurrency(installment.amount_paid)}
                            </div>
                            {getInstallmentStatusBadge(installment.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="mx-auto h-12 w-12 mb-4" />
                      <p>Jadwal angsuran belum dibuat</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>Riwayat pembayaran akan ditampilkan di sini</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_id">Nasabah *</Label>
                {mode === 'create' ? (
                  <select
                    id="customer_id"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    disabled={mode === 'view'}
                    required
                  >
                    <option value="">Pilih Nasabah</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="customer_id"
                    value={loan?.customer?.name || formData.customer_id}
                    disabled
                  />
                )}
              </div>
              
              <div>
                <Label htmlFor="amount">Jumlah Pinjaman *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  placeholder="5000000"
                  disabled={mode === 'view'}
                  required
                />
              </div>

              <div>
                <Label htmlFor="interest_rate">Suku Bunga (% per tahun) *</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.1"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="12.0"
                  disabled={mode === 'view'}
                  required
                />
              </div>

              <div>
                <Label htmlFor="term">Jangka Waktu (bulan) *</Label>
                <Input
                  id="term"
                  type="number"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: parseInt(e.target.value) || 12 })}
                  placeholder="12"
                  disabled={mode === 'view'}
                  required
                />
              </div>

              {mode === 'edit' && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
              )}
            </div>

            {(mode === 'create' || mode === 'edit') && calculatedPayment > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-4 w-4" />
                    Kalkulasi Angsuran
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Jumlah Pinjaman:</span>
                      <span className="font-medium">{formatCurrency(formData.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bunga per tahun:</span>
                      <span className="font-medium">{formData.interest_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tenor:</span>
                      <span className="font-medium">{formData.term} bulan</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Angsuran per bulan:</span>
                      <span className="text-lg">{formatCurrency(calculatedPayment)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total pembayaran:</span>
                      <span>{formatCurrency(calculatedPayment * formData.term)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {mode === 'view' ? 'Tutup' : 'Batal'}
          </Button>
          {mode !== 'view' && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Menyimpan...' : mode === 'create' ? 'Buat Pinjaman' : 'Simpan Perubahan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}