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
  Copy,
  Edit,
  Trash2,
  Users,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { CreateReferralCode, ListReferralCodes, UpdateReferralCode, DeleteReferralCode, ValidateReferralCode } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"

interface ReferralCode {
  id: string
  code: string
  owner_user_id: string
  quota: number
  used: number
  active: boolean
  expires_at?: string
  created_at: string
  updated_at: string
  owner_user?: {
    id: string
    name: string
    email: string
  }
}

interface ReferralCodeListResponse {
  referral_codes: ReferralCode[]
  total: number
  page: number
  limit: number
}

export function Referrals() {
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<ReferralCode | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  
  const [newReferral, setNewReferral] = useState({
    owner_user_id: "",
    quota: 10,
    expires_at: "",
  })

  const [validationCode, setValidationCode] = useState("")
  const [validationResult, setValidationResult] = useState<any>(null)

  const loadReferralCodes = async () => {
    setLoading(true)
    try {
      const request = new services.ReferralCodeListRequest({
        page,
        limit,
        owner_user_id: ownerFilter,
        active: activeFilter,
      })
      
      const response = await ListReferralCodes(request)
      if (response.success) {
        const data = response.data as ReferralCodeListResponse
        setReferralCodes(data.referral_codes || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error loading referral codes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferralCodes()
  }, [page, ownerFilter, activeFilter])

  const handleCreateReferral = async () => {
    try {
      const request = new services.ReferralCodeCreateRequest({
        ...newReferral,
        expires_at: newReferral.expires_at ? new Date(newReferral.expires_at) : undefined,
      })
      
      const response = await CreateReferralCode(request)
      if (response.success) {
        setShowCreateForm(false)
        setNewReferral({
          owner_user_id: "",
          quota: 10,
          expires_at: "",
        })
        loadReferralCodes()
      }
    } catch (error) {
      console.error("Error creating referral code:", error)
    }
  }

  const handleDeleteReferral = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus kode referral ini?")) {
      try {
        const response = await DeleteReferralCode(id)
        if (response.success) {
          loadReferralCodes()
        }
      } catch (error) {
        console.error("Error deleting referral code:", error)
      }
    }
  }

  const handleValidateCode = async () => {
    if (!validationCode.trim()) return
    
    try {
      const response = await ValidateReferralCode(validationCode)
      setValidationResult(response)
    } catch (error) {
      console.error("Error validating code:", error)
      setValidationResult({ success: false, message: "Error validating code" })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You might want to show a toast notification here
  }

  const getStatusBadge = (referral: ReferralCode) => {
    if (!referral.active) {
      return <Badge variant="secondary">Tidak Aktif</Badge>
    } else if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
      return <Badge variant="destructive">Kadaluarsa</Badge>
    } else if (referral.used >= referral.quota) {
      return <Badge variant="outline">Quota Habis</Badge>
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
    }
  }

  const getUsagePercentage = (used: number, quota: number) => {
    return Math.round((used / quota) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kode Referral</h2>
          <p className="text-muted-foreground">
            Kelola kode referral untuk acquisition nasabah
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Kode Referral
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Daftar Kode</TabsTrigger>
          <TabsTrigger value="validate">Validasi Kode</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="owner">Owner User ID</Label>
                  <Input
                    id="owner"
                    placeholder="User ID pemilik kode"
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="active">Status</Label>
                  <select
                    id="active"
                    value={activeFilter === undefined ? "" : activeFilter.toString()}
                    onChange={(e) => setActiveFilter(e.target.value === "" ? undefined : e.target.value === "true")}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Semua</option>
                    <option value="true">Aktif</option>
                    <option value="false">Tidak Aktif</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setOwnerFilter("")
                      setActiveFilter(undefined)
                    }}
                  >
                    Reset Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Referral Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Buat Kode Referral Baru</CardTitle>
                <CardDescription>Buat kode referral untuk user tertentu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="owner_user_id">Owner User ID</Label>
                    <Input
                      id="owner_user_id"
                      value={newReferral.owner_user_id}
                      onChange={(e) => setNewReferral({ ...newReferral, owner_user_id: e.target.value })}
                      placeholder="UUID user pemilik"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quota">Quota Penggunaan</Label>
                    <Input
                      id="quota"
                      type="number"
                      value={newReferral.quota}
                      onChange={(e) => setNewReferral({ ...newReferral, quota: parseInt(e.target.value) || 0 })}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expires_at">Tanggal Kadaluarsa (Opsional)</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={newReferral.expires_at}
                      onChange={(e) => setNewReferral({ ...newReferral, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateReferral}>Buat Kode</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral Code List */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Kode Referral</CardTitle>
              <CardDescription>
                Total {total} kode referral ditemukan
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
              ) : referralCodes.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">Tidak ada kode referral</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mulai dengan membuat kode referral baru.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referralCodes.map((referral) => (
                    <div
                      key={referral.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold font-mono text-lg">{referral.code}</h3>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(referral.code)}
                                  className="h-6 w-6"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Owner: {referral.owner_user?.name || referral.owner_user_id}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-1">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {referral.used}/{referral.quota} ({getUsagePercentage(referral.used, referral.quota)}%)
                                  </span>
                                </div>
                                {referral.expires_at && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      Exp: {new Date(referral.expires_at).toLocaleDateString('id-ID')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            {getStatusBadge(referral)}
                            <p className="text-xs text-muted-foreground mt-1">
                              Dibuat: {new Date(referral.created_at).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedReferral(referral)
                                setShowEditForm(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteReferral(referral.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Usage Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${getUsagePercentage(referral.used, referral.quota)}%` }}
                          ></div>
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

        <TabsContent value="validate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Validasi Kode Referral</CardTitle>
              <CardDescription>
                Cek validitas dan status kode referral
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Masukkan kode referral"
                  value={validationCode}
                  onChange={(e) => setValidationCode(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={handleValidateCode}>
                  <Search className="mr-2 h-4 w-4" />
                  Validasi
                </Button>
              </div>
              
              {validationResult && (
                <div className={`p-4 rounded-lg border ${
                  validationResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {validationResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${
                      validationResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResult.success ? 'Kode Valid' : 'Kode Tidak Valid'}
                    </span>
                  </div>
                  {validationResult.message && (
                    <p className={`mt-2 text-sm ${
                      validationResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {validationResult.message}
                    </p>
                  )}
                  {validationResult.success && validationResult.data && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-green-700">
                        <strong>Kode:</strong> {validationResult.data.code}
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Sisa Quota:</strong> {validationResult.data.quota - validationResult.data.used}
                      </p>
                      {validationResult.data.expires_at && (
                        <p className="text-sm text-green-700">
                          <strong>Kadaluarsa:</strong> {new Date(validationResult.data.expires_at).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Kode
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-xs text-muted-foreground">
                  Kode referral dibuat
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Kode Aktif
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralCodes.filter(r => r.active && (!r.expires_at || new Date(r.expires_at) > new Date())).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dapat digunakan
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Penggunaan
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralCodes.reduce((sum, r) => sum + r.used, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nasabah via referral
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tingkat Penggunaan
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralCodes.length > 0 
                    ? Math.round((referralCodes.reduce((sum, r) => sum + r.used, 0) / referralCodes.reduce((sum, r) => sum + r.quota, 0)) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Dari total quota
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}