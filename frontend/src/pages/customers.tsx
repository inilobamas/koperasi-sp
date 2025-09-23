import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreateCustomer, ListCustomers, GetCustomer, UpdateCustomer, DeleteCustomer } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"

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
}

interface CustomerListResponse {
  customers: Customer[]
  total: number
  page: number
  limit: number
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | undefined>()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  
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
      })
      
      const response = await ListCustomers(request)
      if (response.success) {
        const data = response.data as CustomerListResponse
        setCustomers(data.customers || [])
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
  }, [page, searchTerm, statusFilter, verifiedFilter])

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

  const handleDeleteCustomer = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus nasabah ini?")) {
      try {
        const response = await DeleteCustomer(id)
        if (response.success) {
          loadCustomers()
        }
      } catch (error) {
        console.error("Error deleting customer:", error)
      }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nasabah</h2>
          <p className="text-muted-foreground">
            Kelola data nasabah koperasi
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Nasabah
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
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
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("")
                  setVerifiedFilter(undefined)
                }}
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setShowEditForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
    </div>
  )
}