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
  
  // Karyawan can only manage customers from their referral codes
  // Since the customer list is already filtered, karyawan can manage all displayed customers
  const canManageCustomer = (customerId?: string) => {
    if (isSuperAdmin() || isAdmin()) return true
    if (isKaryawan()) return true // Karyawan can manage all customers they can see (already filtered)
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