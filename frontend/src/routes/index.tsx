/**
 * Router Configuration
 * Defines all routes for the application
 */
import { lazy, Suspense, ReactNode } from "react";
import { createBrowserRouter, type RouteObject } from "react-router-dom";
import PageFallback from "../components/PageFallback";

// Layout
import { Layout } from "../components/layout";
import AppShell from "../components/layout/AppShell";
import RouteError from "../components/RouteError";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

// The landing page and product page are the most common entry points, so they
// ship in the main bundle; every other page is its own chunk (smaller first
// load on mobile data).
import Home from "../pages/Home";
import ProductDetail from "../pages/ProductDetail";

const Products = lazy(() => import("../pages/Products"));
const Categories = lazy(() => import("../pages/Categories"));
const About = lazy(() => import("../pages/About"));
const Contact = lazy(() => import("../pages/Contact"));
const Orders = lazy(() => import("../pages/Orders"));
const OrderDetail = lazy(() => import("../pages/OrderDetail"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const Cart = lazy(() => import("../pages/Cart"));
const Checkout = lazy(() => import("../pages/Checkout"));
const OrderSuccess = lazy(() => import("../pages/OrderSuccess"));
const OrderFailed = lazy(() => import("../pages/OrderFailed"));
const Profile = lazy(() => import("../pages/Profile"));
const Wishlist = lazy(() => import("../pages/Wishlist"));
const FAQ = lazy(() => import("../pages/FAQ"));
const ShippingInfo = lazy(() => import("../pages/ShippingInfo"));
const Returns = lazy(() => import("../pages/Returns"));
const Privacy = lazy(() => import("../pages/Privacy"));
const NotFound = lazy(() => import("../pages/NotFound"));
const Sale = lazy(() => import("../pages/Sale"));

// Admin pages are code-split so shoppers don't download the admin panel
// (and its charting/table libraries)
const AdminLayout = lazy(() => import("../pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("../pages/admin/Products"));
const AdminProductEditor = lazy(() => import("../pages/admin/ProductEditor"));
const AdminCategories = lazy(() => import("../pages/admin/Categories"));
const AdminOrders = lazy(() => import("../pages/admin/OrdersAdvanced"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));
const AdminMessages = lazy(() => import("../pages/admin/Messages"));
const AdminLiveChat = lazy(() => import("../pages/admin/LiveChat"));
const AdminCampaigns = lazy(() => import("../pages/admin/Campaigns"));
const AdminCampaignEditor = lazy(() => import("../pages/admin/CampaignEditor"));

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<PageFallback />}>{element}</Suspense>
);

const page = (element: ReactNode) => withSuspense(element);
const protectedPage = (element: ReactNode) => (
  <ProtectedRoute>{withSuspense(element)}</ProtectedRoute>
);

// Everything renders inside AppShell (page + floating chat widget), so the
// chat UI is inside the router and can use <Link>/navigation
export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: <Layout />,
        errorElement: <RouteError />,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              // Public routes
              { index: true, element: <Home /> },
              { path: "products", element: page(<Products />) },
              { path: "products/:slug", element: <ProductDetail /> },
              { path: "categories", element: page(<Categories />) },
              { path: "sale/:slug", element: page(<Sale />) },
              { path: "login", element: page(<Login />) },
              { path: "register", element: page(<Register />) },
              { path: "forgot-password", element: page(<ForgotPassword />) },
              { path: "about", element: page(<About />) },
              { path: "contact", element: page(<Contact />) },
              { path: "faq", element: page(<FAQ />) },
              { path: "shipping", element: page(<ShippingInfo />) },
              { path: "returns", element: page(<Returns />) },
              { path: "privacy", element: page(<Privacy />) },

              // Protected routes
              { path: "cart", element: protectedPage(<Cart />) },
              { path: "checkout", element: protectedPage(<Checkout />) },
              { path: "profile", element: protectedPage(<Profile />) },
              { path: "wishlist", element: protectedPage(<Wishlist />) },
              { path: "orders", element: protectedPage(<Orders />) },
              { path: "orders/:id", element: protectedPage(<OrderDetail />) },
              {
                path: "order-success",
                element: protectedPage(<OrderSuccess />),
              },
              { path: "order-failed", element: page(<OrderFailed />) },

              // 404
              { path: "*", element: page(<NotFound />) },
            ],
          },
        ],
      },

      // Admin routes (separate layout)
      {
        path: "/admin",
        element: <AdminRoute>{withSuspense(<AdminLayout />)}</AdminRoute>,
        errorElement: <RouteError />,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              { index: true, element: withSuspense(<AdminDashboard />) },
              { path: "products", element: withSuspense(<AdminProducts />) },
              {
                path: "products/new",
                element: withSuspense(<AdminProductEditor />),
              },
              {
                path: "products/:id/edit",
                element: withSuspense(<AdminProductEditor />),
              },
              {
                path: "categories",
                element: withSuspense(<AdminCategories />),
              },
              { path: "orders", element: withSuspense(<AdminOrders />) },
              { path: "messages", element: withSuspense(<AdminMessages />) },
          { path: "chat", element: withSuspense(<AdminLiveChat />) },
              { path: "campaigns", element: withSuspense(<AdminCampaigns />) },
              {
                path: "campaigns/new",
                element: withSuspense(<AdminCampaignEditor />),
              },
              {
                path: "campaigns/:id/edit",
                element: withSuspense(<AdminCampaignEditor />),
              },
              { path: "users", element: withSuspense(<AdminUsers />) },
            ],
          },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(appRoutes);

export default router;
