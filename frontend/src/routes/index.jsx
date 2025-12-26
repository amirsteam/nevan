/**
 * Router Configuration
 * Defines all routes for the application
 */
import { createBrowserRouter } from 'react-router-dom';

// Layout
import { Layout } from '../components/layout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

// Pages
import Home from '../pages/Home';
import Products from '../pages/Products';
import ProductDetail from '../pages/ProductDetail';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Cart from '../pages/Cart';
import {
    Categories,
    Checkout,
    Profile,
    Orders,
    OrderDetail,
    OrderSuccess,
    NotFound,
} from '../pages/placeholders';

// Admin Pages
import AdminLayout from '../pages/admin/AdminLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminCategories from '../pages/admin/Categories';
import AdminOrders from '../pages/admin/Orders';
import AdminUsers from '../pages/admin/Users';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            // Public routes
            { index: true, element: <Home /> },
            { path: 'products', element: <Products /> },
            { path: 'products/:slug', element: <ProductDetail /> },
            { path: 'categories', element: <Categories /> },
            { path: 'login', element: <Login /> },
            { path: 'register', element: <Register /> },

            // Protected routes
            {
                path: 'cart',
                element: <ProtectedRoute><Cart /></ProtectedRoute>
            },
            {
                path: 'checkout',
                element: <ProtectedRoute><Checkout /></ProtectedRoute>
            },
            {
                path: 'profile',
                element: <ProtectedRoute><Profile /></ProtectedRoute>
            },
            {
                path: 'orders',
                element: <ProtectedRoute><Orders /></ProtectedRoute>
            },
            {
                path: 'orders/:id',
                element: <ProtectedRoute><OrderDetail /></ProtectedRoute>
            },
            {
                path: 'order-success',
                element: <ProtectedRoute><OrderSuccess /></ProtectedRoute>
            },

            // 404
            { path: '*', element: <NotFound /> },
        ],
    },

    // Admin routes (separate layout)
    {
        path: '/admin',
        element: <AdminRoute><AdminLayout /></AdminRoute>,
        children: [
            { index: true, element: <AdminDashboard /> },
            { path: 'products', element: <AdminProducts /> },
            { path: 'categories', element: <AdminCategories /> },
            { path: 'orders', element: <AdminOrders /> },
            { path: 'users', element: <AdminUsers /> },
        ],
    },
]);

export default router;
