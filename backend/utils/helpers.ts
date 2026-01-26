import slugify from 'slugify';

/**
 * Helper Utilities
 * Common utility functions used across the application
 */

/**
 * Generate URL-friendly slug from text
 */
export const createSlug = (text: string): string => {
    return slugify(text, {
        lower: true,
        strict: true, // Remove special characters
        trim: true,
    });
};

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXX (random)
 */
export const generateOrderNumber = (): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${dateStr}-${random}`;
};

export interface PaginationResult {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
  skip: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Calculate pagination values
 */
export const paginate = (page: string | number = 1, limit: string | number = 10, total: number = 0): PaginationResult => {
    const currentPage = Math.max(1, typeof page === 'string' ? parseInt(page) : page);
    const itemsPerPage = Math.min(100, Math.max(1, typeof limit === 'string' ? parseInt(limit) : limit));
    const totalPages = Math.ceil(total / itemsPerPage);
    const skip = (currentPage - 1) * itemsPerPage;

    return {
        currentPage,
        itemsPerPage,
        totalPages,
        totalItems: total,
        skip,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
    };
};

/**
 * Filter object to only include allowed fields
 */
export const filterObject = (obj: Record<string, any>, allowedFields: string[]): Record<string, any> => {
    const filtered: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
        if (allowedFields.includes(key)) {
            filtered[key] = obj[key];
        }
    });
    return filtered;
};

/**
 * Format price in NPR (Nepali Rupees)
 */
export const formatNPR = (amount: number, inPaisa: boolean = false): string => {
    const rupees = inPaisa ? amount / 100 : amount;
    return new Intl.NumberFormat('ne-NP', {
        style: 'currency',
        currency: 'NPR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(rupees);
};

/**
 * Validate Nepali phone number
 */
export const isValidNepaliPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s-]/g, '');
    const pattern = /^(\+?977)?[0-9]{10}$/;
    return pattern.test(cleaned);
};
