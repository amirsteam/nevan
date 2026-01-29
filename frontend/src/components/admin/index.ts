/**
 * Admin Components Index
 * Exports all reusable admin UI components with TypeScript declarations
 */
import { ReactNode } from "react";

// ============================================
// Type Definitions
// ============================================

export interface ImageUploaderImage {
  id?: string;
  _id?: string;
  url?: string;
  preview?: string;
  isPrimary?: boolean;
  file?: File;
  publicId?: string;
}

export interface ImageUploaderProps {
  images?: ImageUploaderImage[];
  onUpload?: (files: File[]) => void;
  onDelete?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  uploading?: boolean;
  showPrimarySelector?: boolean;
}

export interface ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
}

export interface StatusBadgeProps {
  status?: string;
  type?: "success" | "warning" | "error" | "info" | "default";
}

export interface ConfirmDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ============================================
// Component Exports
// ============================================

export { default as Modal } from "./Modal";
export { default as DataTable } from "./DataTable";
export { AdvancedDataTable } from "./AdvancedDataTable";
export { default as Pagination } from "./Pagination";
export { default as SearchInput } from "./SearchInput";
export { default as StatusBadge } from "./StatusBadge";
export { default as ConfirmDialog } from "./ConfirmDialog";
export { default as ImageUploader } from "./ImageUploader";
export { default as LoadingSpinner } from "./LoadingSpinner";

// Export DashboardWidgets (TypeScript component)
export * from "./DashboardWidgets";
