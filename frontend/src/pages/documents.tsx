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
import { useToast, ToastContainer } from "@/components/ui/toast"
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  User,
  Calendar,
  FileCheck,
  FileX,
} from "lucide-react"
import { ListDocuments, GetDocument, VerifyDocument, DeleteDocument, GetDocumentFile } from "../../wailsjs/go/main/App"
import { services } from "../../wailsjs/go/models"
import { usePermissions } from "@/hooks/usePermissions"

interface Document {
  id: string
  customer_id: string
  type: 'ktp' | 'kk' | 'sim' | 'npwp'
  filename: string
  original_name: string
  path: string
  size: number
  mime_type: string
  status: 'pending' | 'verified' | 'rejected'
  verified_by?: string
  verified_at?: string
  notes: string
  created_at: string
  updated_at: string
  customer?: {
    id: string
    name: string
  }
}

interface DocumentListResponse {
  documents: Document[]
  total: number
  page: number
  limit: number
}

export function Documents() {
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [customerFilter, setCustomerFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  
  const [verifyData, setVerifyData] = useState({
    status: "",
    notes: "",
    verifier_id: "admin-user-id", // This should come from auth context
  })

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const request = new services.DocumentListRequest({
        page,
        limit,
        customer_id: customerFilter,
        type: typeFilter,
        status: statusFilter,
      })
      
      const response = await ListDocuments(request)
      if (response.success) {
        const data = response.data as DocumentListResponse
        setDocuments(data.documents || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error loading documents:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [page, customerFilter, typeFilter, statusFilter])

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document)
    setShowDetailModal(true)
  }

  const handleVerifyDocument = async () => {
    if (!selectedDocument || !verifyData.status) return
    
    try {
      const request = new services.DocumentVerifyRequest({
        document_id: selectedDocument.id,
        verifier_id: verifyData.verifier_id,
        status: verifyData.status,
        notes: verifyData.notes,
      })
      
      const response = await VerifyDocument(request)
      if (response.success) {
        showSuccess(
          "Dokumen Berhasil Diverifikasi!", 
          `Dokumen ${selectedDocument.customer?.name} telah ${verifyData.status === 'verified' ? 'disetujui' : 'ditolak'}.`
        )
        setShowVerifyModal(false)
        setVerifyData({ status: "", notes: "", verifier_id: "admin-user-id" })
        setSelectedDocument(null)
        loadDocuments()
      } else {
        showError("Error Verifikasi", response.message)
      }
    } catch (error) {
      console.error("Error verifying document:", error)
      showError("Error", "Terjadi kesalahan saat memverifikasi dokumen.")
    }
  }

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return
    
    try {
      const response = await DeleteDocument(documentToDelete)
      if (response.success) {
        showSuccess("Dokumen Dihapus", "Dokumen berhasil dihapus dari sistem.")
        setShowDeleteConfirm(false)
        setDocumentToDelete(null)
        loadDocuments()
      } else {
        showError("Error Hapus", response.message)
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      showError("Error", "Terjadi kesalahan saat menghapus dokumen.")
    }
  }

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const filePath = await GetDocumentFile(documentId)
      // In a real implementation, this would trigger a file download
      console.log("Download document from:", filePath)
      // You could use window.open() or create a download link
    } catch (error) {
      console.error("Error downloading document:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Terverifikasi</Badge>
      case 'rejected':
        return <Badge variant="destructive">Ditolak</Badge>
      case 'pending':
      default:
        return <Badge variant="secondary">Menunggu</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ktp':
        return 'KTP'
      case 'kk':
        return 'Kartu Keluarga'
      case 'sim':
        return 'SIM'
      case 'npwp':
        return 'NPWP'
      default:
        return type.toUpperCase()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dokumen</h2>
          <p className="text-muted-foreground">
            Kelola dan verifikasi dokumen nasabah
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Dokumen
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              Dokumen yang diupload
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Menunggu Verifikasi
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Perlu ditinjau
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Terverifikasi
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.status === 'verified').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Dokumen valid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ditolak
            </CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Perlu diperbaiki
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Semua Dokumen</TabsTrigger>
          <TabsTrigger value="pending">Menunggu Verifikasi</TabsTrigger>
          <TabsTrigger value="verified">Terverifikasi</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
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
                  <Label htmlFor="customer_filter">ID Nasabah</Label>
                  <Input
                    id="customer_filter"
                    placeholder="UUID nasabah"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="type_filter">Jenis Dokumen</Label>
                  <select
                    id="type_filter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Semua Jenis</option>
                    <option value="ktp">KTP</option>
                    <option value="kk">Kartu Keluarga</option>
                    <option value="sim">SIM</option>
                    <option value="npwp">NPWP</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status_filter">Status</Label>
                  <select
                    id="status_filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Semua Status</option>
                    <option value="pending">Menunggu</option>
                    <option value="verified">Terverifikasi</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCustomerFilter("")
                      setTypeFilter("")
                      setStatusFilter("")
                    }}
                  >
                    Reset Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Dokumen</CardTitle>
              <CardDescription>
                Total {total} dokumen ditemukan
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
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">Tidak ada dokumen</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Belum ada dokumen yang diupload.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {getStatusIcon(document.status)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">{getTypeLabel(document.type)}</h3>
                                {getStatusBadge(document.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Nasabah: {document.customer?.name || 'Unknown'} • 
                                File: {document.original_name} • 
                                Size: {formatFileSize(document.size)}
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    Upload: {new Date(document.created_at).toLocaleDateString('id-ID')}
                                  </span>
                                </div>
                                {document.verified_at && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      Verified: {new Date(document.verified_at).toLocaleDateString('id-ID')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewDocument(document)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownloadDocument(document.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {document.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedDocument(document)
                                setShowVerifyModal(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setDocumentToDelete(document.id)
                              setShowDeleteConfirm(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {document.notes && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-sm">
                            <strong>Catatan:</strong> {document.notes}
                          </p>
                        </div>
                      )}
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

        {/* Filter by status tabs would have similar content but with pre-filtered data */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
                Dokumen Menunggu Verifikasi
              </CardTitle>
              <CardDescription>
                {documents.filter(d => d.status === 'pending').length} dokumen perlu ditinjau
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.filter(d => d.status === 'pending').map((document) => (
                  <div key={document.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{getTypeLabel(document.type)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {document.customer?.name} • {document.original_name}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedDocument(document)
                          setShowVerifyModal(true)
                        }}
                      >
                        Verifikasi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                Dokumen Terverifikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                <h3 className="mt-2 text-sm font-semibold">
                  {documents.filter(d => d.status === 'verified').length} dokumen terverifikasi
                </h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <XCircle className="mr-2 h-5 w-5 text-red-600" />
                Dokumen Ditolak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <XCircle className="mx-auto h-12 w-12 text-red-600" />
                <h3 className="mt-2 text-sm font-semibold">
                  {documents.filter(d => d.status === 'rejected').length} dokumen ditolak
                </h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Dokumen</DialogTitle>
            <DialogDescription>
              Informasi lengkap dokumen
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Jenis:</span>
                    <span className="text-sm font-medium">{getTypeLabel(selectedDocument.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedDocument.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nasabah:</span>
                    <span className="text-sm font-medium">{selectedDocument.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">File:</span>
                    <span className="text-sm font-medium">{selectedDocument.original_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Size:</span>
                    <span className="text-sm font-medium">{formatFileSize(selectedDocument.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Upload:</span>
                    <span className="text-sm font-medium">
                      {new Date(selectedDocument.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  {selectedDocument.verified_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Verified:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedDocument.verified_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {selectedDocument.notes && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <strong>Catatan:</strong> {selectedDocument.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailModal(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Document Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen</DialogTitle>
            <DialogDescription>
              Verifikasi dokumen {selectedDocument?.customer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="verify_status">Hasil Verifikasi</Label>
              <select
                id="verify_status"
                value={verifyData.status}
                onChange={(e) => setVerifyData({ ...verifyData, status: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Pilih hasil verifikasi</option>
                <option value="verified">Terverifikasi</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div>
              <Label htmlFor="verify_notes">Catatan</Label>
              <textarea
                id="verify_notes"
                value={verifyData.notes}
                onChange={(e) => setVerifyData({ ...verifyData, notes: e.target.value })}
                className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background resize-none"
                placeholder="Berikan catatan untuk verifikasi ini..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyModal(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleVerifyDocument}
              disabled={!verifyData.status}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Verifikasi
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
              Apakah Anda yakin ingin menghapus dokumen ini? File akan dihapus dari sistem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}