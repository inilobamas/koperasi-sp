import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function maskNIK(nik: string): string {
  if (nik.length < 4) return "****"
  return "************" + nik.slice(-4)
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return "****"
  return phone.slice(0, 4) + "****" + phone.slice(-2)
}

export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex === -1 || atIndex < 2) return "****"
  return email.slice(0, 2) + "****" + email.slice(atIndex)
}