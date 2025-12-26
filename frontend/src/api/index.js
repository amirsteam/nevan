/**
 * API Index
 * Exports all API modules
 */
export { default as api } from './axios';
export { authAPI } from './auth';
export { productsAPI, categoriesAPI } from './products';
export { cartAPI } from './cart';
export { ordersAPI, paymentsAPI } from './orders';
export { adminAPI } from './admin';

