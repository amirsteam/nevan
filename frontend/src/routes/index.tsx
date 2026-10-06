/**
 * Router Configuration
 * Defines all routes for the application
 */
import { lazy, Suspense, ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Layout
import { Layout } from "../components/layout";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

// Pages
import Home from "../pages/Home";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Products from "../pages/Products";
import ProductDetail from "../pages/ProductDetail";
import Categories from "../pages/Categories";
import Orders from "../pages/Orders";
import OrderDetail from "../pages/OrderDetail";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import OrderSuccess from "../pages/OrderSuccess";
import OrderFailed from "../pages/OrderFailed";
import Profile from "../pages/Profile";
import Wishlist from "../pages/Wishlist";
import FAQ from "../pages/FAQ";
import ShippingInfo from "../pages/ShippingInfo";
import Returns from "../pages/Returns";
import Privacy from "../pages/Privacy";
import NotFound from "../pages/NotFound";

// Admin pages are code-split so shoppers don't download the admin panel
// (and its charting/table libraries)
const AdminLayout = lazy(() => import("../pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("../pages/admin/Products"));
const AdminCategories = lazy(() => import("../pages/admin/Categories"));
const AdminOrders = lazy(() => import("../pages/admin/OrdersAdvanced"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));

const withSuspense = (element: ReactNode) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    }
  >
    {element}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      // Public routes
      { index: true, element: <Home /> },
      { path: "products", element: <Products /> },
      { path: "products/:slug", element: <ProductDetail /> },
      { path: "categories", element: <Categories /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "about", element: <About /> },
      { path: "contact", element: <Contact /> },
      { path: "faq", element: <FAQ /> },
      { path: "shipping", element: <ShippingInfo /> },
      { path: "returns", element: <Returns /> },
      { path: "privacy", element: <Privacy /> },

      // Protected routes
      {
        path: "cart",
        element: (
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        ),
      },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "wishlist",
        element: (
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders",
        element: (
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "order-success",
        element: (
          <ProtectedRoute>
            <OrderSuccess />
          </ProtectedRoute>
        ),
      },
      {
        path: "order-failed",
        element: <OrderFailed />,
      },

      // 404
      { path: "*", element: <NotFound /> },
    ],
  },

  // Admin routes (separate layout)
  {
    path: "/admin",
    element: (
      <AdminRoute>{withSuspense(<AdminLayout />)}</AdminRoute>
    ),
    children: [
      { index: true, element: withSuspense(<AdminDashboard />) },
      { path: "products", element: withSuspense(<AdminProducts />) },
      { path: "categories", element: withSuspense(<AdminCategories />) },
      { path: "orders", element: withSuspense(<AdminOrders />) },
      { path: "users", element: withSuspense(<AdminUsers />) },
    ],
  },
]);

export default router;
