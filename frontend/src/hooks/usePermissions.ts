import { useAuth } from "@/contexts/AuthContext"

export function usePermissions() {
  const { user } = useAuth()

  const isSuperAdmin = () => user?.role === 'superadmin'
  const isAdmin = () => user?.role === 'admin'
  const isKaryawan = () => user?.role === 'karyawan'
  
  const canManageUsers = () => isSuperAdmin()
  const canManageSettings = () => isSuperAdmin()
  const canManageReferrals = () => isSuperAdmin() || isAdmin()
  const canViewAllCustomers = () => isSuperAdmin() || isAdmin()
  const canViewAllLoans = () => isSuperAdmin() || isAdmin()
  const canViewAllDocuments = () => isSuperAdmin() || isAdmin()
  
  // Karyawan can only manage their own customers
  const canManageCustomer = (customerOwner?: string) => {
    if (isSuperAdmin() || isAdmin()) return true
    if (isKaryawan() && customerOwner === user?.id) return true
    return false
  }
  
  const canApproveLoan = () => isSuperAdmin() || isAdmin()
  const canVerifyDocument = () => isSuperAdmin() || isAdmin() || isKaryawan()
  
  return {
    user,
    isSuperAdmin,
    isAdmin,
    isKaryawan,
    canManageUsers,
    canManageSettings,
    canManageReferrals,
    canViewAllCustomers,
    canViewAllLoans,
    canViewAllDocuments,
    canManageCustomer,
    canApproveLoan,
    canVerifyDocument
  }
}