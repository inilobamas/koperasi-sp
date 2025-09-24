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
  DialogClose,
} from "@/components/ui/dialog"
import { useToast, ToastContainer } from "@/components/ui/toast"
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Upload,
  FileText,
  Download,
  X,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreateCustomer, ListCustomers, GetCustomer, UpdateCustomer, DeleteCustomer, UploadDocument, ListDocuments } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"
import { usePermissions } from "@/hooks/usePermissions"

interface Customer {
  id: string
  nik: string
  name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  city: string
  province: string
  postal_code: string
  occupation: string
  monthly_income: number
  status: 'pending' | 'active' | 'inactive' | 'blocked'
  ktp_verified: boolean
  referral_code_id?: string
  created_at: string
  updated_at: string
  documents?: CustomerDocument[]
}

interface CustomerDocument {
  id: string
  type: 'ktp' | 'kk' | 'sim' | 'npwp'
  status: 'pending' | 'verified' | 'rejected'
  original_name: string
  created_at: string
}

interface CustomerListResponse {
  customers: Customer[]
  total: number
  page: number
  limit: number
}

export function Customers() {
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const { canViewAllCustomers, canManageCustomer, isKaryawan, user } = usePermissions()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | undefined>()
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    occupation: "",
    monthly_income: 0,
    status: "",
  })

  const [documentUpload, setDocumentUpload] = useState({
    type: "",
    file: null as File | null,
  })
  
  const [newCustomer, setNewCustomer] = useState({
    nik: "",
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    occupation: "",
    monthly_income: 0,
    referral_code: "",
  })

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const request = new services.CustomerListRequest({
        page,
        limit,
        search: searchTerm,
        status: statusFilter,
        verified: verifiedFilter,
        // If karyawan, only show customers from their referral codes
        owner_user_id: isKaryawan() ? user?.id : "",
      })
      
      const response = await ListCustomers(request)
      if (response.success) {
        const data = response.data as CustomerListResponse
        const customersWithDocs = await Promise.all(
          (data.customers || []).map(async (customer) => {
            try {
              // Load documents for each customer
              const docRequest = new services.DocumentListRequest({
                page: 1,
                limit: 10,
                customer_id: customer.id,
                type: "",
                status: "",
              })
              const docResponse = await ListDocuments(docRequest)
              if (docResponse.success) {
                customer.documents = docResponse.data.documents || []
              }
            } catch (error) {
              console.error(`Error loading documents for customer ${customer.id}:`, error)
              customer.documents = []
            }
            return customer
          })
        )
        const sortedCustomers = sortCustomers(customersWithDocs)
        setCustomers(sortedCustomers)
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error loading customers:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [page, searchTerm, statusFilter, verifiedFilter, sortBy, sortOrder])

  // Client-side sorting function
  const sortCustomers = (customers: Customer[]) => {
    if (!sortBy) return customers
    
    return [...customers].sort((a, b) => {
      let aValue: string | number = ""
      let bValue: string | number = ""
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "nik":
          aValue = a.nik
          bValue = b.nik
          break
        case "city":
          aValue = a.city.toLowerCase()
          bValue = b.city.toLowerCase()
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }

  const handleCreateCustomer = async () => {
    try {
      const request = new services.CustomerCreateRequest({
        ...newCustomer,
        date_of_birth: new Date(newCustomer.date_of_birth),
      })
      
      const response = await CreateCustomer(request)
      if (response.success) {
        setShowCreateForm(false)
        setNewCustomer({
          nik: "",
          name: "",
          email: "",
          phone: "",
          date_of_birth: "",
          address: "",
          city: "",
          province: "",
          postal_code: "",
          occupation: "",
          monthly_income: 0,
          referral_code: "",
        })
        loadCustomers()
      }
    } catch (error) {
      console.error("Error creating customer:", error)
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.date_of_birth.split('T')[0],
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postal_code: customer.postal_code,
      occupation: customer.occupation,
      monthly_income: customer.monthly_income,
      status: customer.status,
    })
    setShowEditForm(true)
  }

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return
    
    try {
      const request = new services.CustomerUpdateRequest({
        ...editFormData,
        date_of_birth: new Date(editFormData.date_of_birth),
      })
      
      const response = await UpdateCustomer(selectedCustomer.id, request)
      if (response.success) {
        setShowEditForm(false)
        setSelectedCustomer(null)
        loadCustomers()
      }
    } catch (error) {
      console.error("Error updating customer:", error)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    
    try {
      const response = await DeleteCustomer(customerToDelete)
      if (response.success) {
        setShowDeleteConfirm(false)
        setCustomerToDelete(null)
        loadCustomers()
      }
    } catch (error) {
      console.error("Error deleting customer:", error)
    }
  }

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailModal(true)
  }

  const handleDocumentUpload = async () => {
    if (!selectedCustomer || !documentUpload.file || !documentUpload.type) return
    
    try {
      // Convert file to byte array
      const fileBuffer = await documentUpload.file.arrayBuffer()
      const fileData = new Uint8Array(fileBuffer)
      
      // Call the upload API
      const response = await UploadDocument(
        selectedCustomer.id,
        documentUpload.type,
        documentUpload.file.name,
        Array.from(fileData)
      )
      
      if (response.success) {
        // Show success message
        showSuccess(
          "Dokumen Berhasil Diupload!", 
          "Admin akan memverifikasi dokumen Anda segera."
        )
        
        setShowDocumentUpload(false)
        setDocumentUpload({ type: "", file: null })
        loadCustomers() // Refresh to show updated document status
      } else {
        // Show error message
        showError("Upload Gagal", response.message)
      }
      
    } catch (error) {
      console.error("Error uploading document:", error)
      showError("Error Upload", "Terjadi kesalahan saat upload dokumen. Silakan coba lagi.")
    }
  }

  const getStatusBadge = (status: string, verified: boolean) => {
    if (status === 'active' && verified) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
    } else if (status === 'active' && !verified) {
      return <Badge variant="secondary">Belum Terverifikasi</Badge>
    } else if (status === 'pending') {
      return <Badge variant="outline">Pending</Badge>
    } else if (status === 'blocked') {
      return <Badge variant="destructive">Diblokir</Badge>
    } else {
      return <Badge variant="secondary">Tidak Aktif</Badge>
    }
  }

  const getDocumentStatusSummary = (documents: CustomerDocument[] = []) => {
    const docTypes = ['ktp', 'kk', 'sim', 'npwp']
    const summary = docTypes.map(type => {
      const doc = documents.find(d => d.type === type)
      return {
        type,
        status: doc ? doc.status : 'missing',
        hasDoc: !!doc
      }
    })
    
    const verified = summary.filter(s => s.status === 'verified').length
    const pending = summary.filter(s => s.status === 'pending').length
    const rejected = summary.filter(s => s.status === 'rejected').length
    const missing = summary.filter(s => s.status === 'missing').length
    
    return { verified, pending, rejected, missing, total: summary.length }
  }

  const getDocumentStatusDisplay = (documents: CustomerDocument[] = []) => {
    const summary = getDocumentStatusSummary(documents)
    
    return (
      <div className="flex items-center space-x-1 text-xs">
        {summary.verified > 0 && (
          <Badge variant="default" className="bg-green-100 text-green-800 text-xs px-1 py-0">
            ✓ {summary.verified}
          </Badge>
        )}
        {summary.pending > 0 && (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            ⏳ {summary.pending}
          </Badge>
        )}
        {summary.rejected > 0 && (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            ✗ {summary.rejected}
          </Badge>
        )}
        {summary.missing > 0 && (
          <Badge variant="outline" className="text-xs px-1 py-0">
            - {summary.missing}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nasabah</h2>
          <p className="text-muted-foreground">
            {isKaryawan() 
              ? "Kelola data nasabah Anda" 
              : "Kelola data nasabah koperasi"
            }
          </p>
        </div>
        {canViewAllCustomers() && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Nasabah
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Cari Nasabah</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nama, alamat, atau kota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="blocked">Diblokir</option>
              </select>
            </div>
            <div>
              <Label htmlFor="verified">Verifikasi KTP</Label>
              <select
                id="verified"
                value={verifiedFilter === undefined ? "" : verifiedFilter.toString()}
                onChange={(e) => setVerifiedFilter(e.target.value === "" ? undefined : e.target.value === "true")}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Semua</option>
                <option value="true">Terverifikasi</option>
                <option value="false">Belum Terverifikasi</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sortBy">Urutkan Berdasarkan</Label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Tanggal Daftar</option>
                <option value="name">Nama</option>
                <option value="nik">NIK</option>
                <option value="city">Kota</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <Button 
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="shrink-0"
              >
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("")
                  setVerifiedFilter(undefined)
                  setSortBy("")
                  setSortOrder("asc")
                }}
                className="whitespace-nowrap"
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Info for Karyawan */}
      {isKaryawan() && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">Mode Karyawan</h3>
                <p className="text-sm text-blue-600">
                  Anda hanya dapat melihat dan mengelola nasabah yang Anda tangani. 
                  Anda dapat melakukan verifikasi dokumen dan pemberian pinjaman untuk nasabah Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Customer Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Nasabah Baru</CardTitle>
            <CardDescription>Masukkan informasi nasabah baru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nik">NIK</Label>
                <Input
                  id="nik"
                  value={newCustomer.nik}
                  onChange={(e) => setNewCustomer({ ...newCustomer, nik: e.target.value })}
                  placeholder="1234567890123456"
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="08123456789"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Tanggal Lahir</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={newCustomer.date_of_birth}
                  onChange={(e) => setNewCustomer({ ...newCustomer, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="occupation">Pekerjaan</Label>
                <Input
                  id="occupation"
                  value={newCustomer.occupation}
                  onChange={(e) => setNewCustomer({ ...newCustomer, occupation: e.target.value })}
                  placeholder="Masukkan pekerjaan"
                />
              </div>
              <div>
                <Label htmlFor="monthly_income">Penghasilan Bulanan</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={newCustomer.monthly_income}
                  onChange={(e) => setNewCustomer({ ...newCustomer, monthly_income: parseInt(e.target.value) || 0 })}
                  placeholder="5000000"
                />
              </div>
              <div>
                <Label htmlFor="referral_code">Kode Referral (Opsional)</Label>
                <Input
                  id="referral_code"
                  value={newCustomer.referral_code}
                  onChange={(e) => setNewCustomer({ ...newCustomer, referral_code: e.target.value })}
                  placeholder="KODE123"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Jl. Contoh No. 123, RT/RW 01/02"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Kota/Kabupaten</Label>
                  <Input
                    id="city"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="Jakarta"
                  />
                </div>
                <div>
                  <Label htmlFor="province">Provinsi</Label>
                  <Input
                    id="province"
                    value={newCustomer.province}
                    onChange={(e) => setNewCustomer({ ...newCustomer, province: e.target.value })}
                    placeholder="DKI Jakarta"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Kode Pos</Label>
                  <Input
                    id="postal_code"
                    value={newCustomer.postal_code}
                    onChange={(e) => setNewCustomer({ ...newCustomer, postal_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreateCustomer}>Simpan</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Nasabah</CardTitle>
          <CardDescription>
            Total {total} nasabah ditemukan
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
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Tidak ada nasabah</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Mulai dengan menambahkan nasabah baru.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">{customer.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            NIK: {customer.nik} • {customer.city}, {customer.province}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {customer.occupation} • {formatCurrency(customer.monthly_income)}/bulan
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-muted-foreground">Dokumen:</span>
                            {getDocumentStatusDisplay(customer.documents)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        {getStatusBadge(customer.status, customer.ktp_verified)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(customer.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageCustomer(customer.id) && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setShowDocumentUpload(true)
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        {canViewAllCustomers() && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setCustomerToDelete(customer.id)
                              setShowDeleteConfirm(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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

      {/* Customer Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Detail Nasabah</span>
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap nasabah
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="overflow-y-auto flex-1 px-1">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Informasi Personal</TabsTrigger>
                  <TabsTrigger value="address">Alamat</TabsTrigger>
                  <TabsTrigger value="status">Status & Verifikasi</TabsTrigger>
                  <TabsTrigger value="documents">Dokumen</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informasi Personal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">NIK</label>
                            <p className="text-sm font-semibold">{selectedCustomer.nik}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                            <p className="text-sm font-semibold">{selectedCustomer.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p className="text-sm font-semibold">{selectedCustomer.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Nomor Telepon</label>
                            <p className="text-sm font-semibold">{selectedCustomer.phone}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Tanggal Lahir</label>
                            <p className="text-sm font-semibold">
                              {new Date(selectedCustomer.date_of_birth).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Pekerjaan</label>
                            <p className="text-sm font-semibold">{selectedCustomer.occupation}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Penghasilan Bulanan</label>
                            <p className="text-sm font-semibold">{formatCurrency(selectedCustomer.monthly_income)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Terdaftar</label>
                            <p className="text-sm font-semibold">
                              {new Date(selectedCustomer.created_at).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="address" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Alamat Lengkap</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Alamat</label>
                            <p className="text-sm font-semibold">{selectedCustomer.address}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Kota/Kabupaten</label>
                            <p className="text-sm font-semibold">{selectedCustomer.city}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Provinsi</label>
                            <p className="text-sm font-semibold">{selectedCustomer.province}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Kode Pos</label>
                            <p className="text-sm font-semibold">{selectedCustomer.postal_code}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="status" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Status & Verifikasi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Status Akun</label>
                            <div className="mt-1">
                              {getStatusBadge(selectedCustomer.status, selectedCustomer.ktp_verified)}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">KTP Terverifikasi</label>
                            <p className="text-sm font-semibold">
                              {selectedCustomer.ktp_verified ? "✅ Ya" : "❌ Belum"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Kode Referral</label>
                            <p className="text-sm font-semibold">
                              {selectedCustomer.referral_code_id ? "Ada" : "Tidak ada"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Terakhir Diupdate</label>
                            <p className="text-sm font-semibold">
                              {new Date(selectedCustomer.updated_at).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="documents" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dokumen</CardTitle>
                      <CardDescription>Status dokumen yang diperlukan untuk verifikasi</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['ktp', 'kk', 'sim', 'npwp'].map((docType) => {
                          const doc = selectedCustomer.documents?.find(d => d.type === docType)
                          const label = docType === 'ktp' ? 'KTP' : docType === 'kk' ? 'Kartu Keluarga' : docType === 'sim' ? 'SIM' : 'NPWP'
                          return (
                            <Card key={docType} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{label}</h4>
                                  {doc && (
                                    <p className="text-xs text-muted-foreground">{doc.original_name}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {doc ? (
                                    <div className="space-y-1">
                                      {doc.status === 'verified' && (
                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                          ✅ Verified
                                        </Badge>
                                      )}
                                      {doc.status === 'pending' && (
                                        <Badge variant="secondary">
                                          ⏳ Pending
                                        </Badge>
                                      )}
                                      {doc.status === 'rejected' && (
                                        <Badge variant="destructive">
                                          ❌ Rejected
                                        </Badge>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                                      </p>
                                    </div>
                                  ) : (
                                    <Badge variant="outline">
                                      📄 Belum Upload
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button 
              variant="outline"
              onClick={() => {
                setShowDetailModal(false)
                setShowDocumentUpload(true)
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Dokumen
            </Button>
            <Button onClick={() => setShowDetailModal(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Nasabah</DialogTitle>
            <DialogDescription>
              Ubah informasi nasabah
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Nama Lengkap</Label>
                <Input
                  id="edit_name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Nomor Telepon</Label>
                <Input
                  id="edit_phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_date_of_birth">Tanggal Lahir</Label>
                <Input
                  id="edit_date_of_birth"
                  type="date"
                  value={editFormData.date_of_birth}
                  onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_occupation">Pekerjaan</Label>
                <Input
                  id="edit_occupation"
                  value={editFormData.occupation}
                  onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_monthly_income">Penghasilan Bulanan</Label>
                <Input
                  id="edit_monthly_income"
                  type="number"
                  value={editFormData.monthly_income}
                  onChange={(e) => setEditFormData({ ...editFormData, monthly_income: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <select
                  id="edit_status"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                  <option value="blocked">Diblokir</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_address">Alamat Lengkap</Label>
                <Input
                  id="edit_address"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_city">Kota/Kabupaten</Label>
                  <Input
                    id="edit_city"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_province">Provinsi</Label>
                  <Input
                    id="edit_province"
                    value={editFormData.province}
                    onChange={(e) => setEditFormData({ ...editFormData, province: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_postal_code">Kode Pos</Label>
                  <Input
                    id="edit_postal_code"
                    value={editFormData.postal_code}
                    onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditForm(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateCustomer}>
              <Save className="mr-2 h-4 w-4" />
              Simpan
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
              Apakah Anda yakin ingin menghapus nasabah ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Modal */}
      <Dialog open={showDocumentUpload} onOpenChange={setShowDocumentUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dokumen</DialogTitle>
            <DialogDescription>
              Upload dokumen untuk {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc_type">Jenis Dokumen</Label>
              <select
                id="doc_type"
                value={documentUpload.type}
                onChange={(e) => setDocumentUpload({ ...documentUpload, type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Pilih jenis dokumen</option>
                <option value="ktp">KTP</option>
                <option value="kk">Kartu Keluarga</option>
                <option value="sim">SIM</option>
                <option value="npwp">NPWP</option>
              </select>
            </div>
            <div>
              <Label htmlFor="doc_file">File Dokumen</Label>
              <Input
                id="doc_file"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDocumentUpload({ 
                  ...documentUpload, 
                  file: e.target.files?.[0] || null 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format yang didukung: JPG, PNG, PDF (max 10MB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentUpload(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleDocumentUpload}
              disabled={!documentUpload.type || !documentUpload.file}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}