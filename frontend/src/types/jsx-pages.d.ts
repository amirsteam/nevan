/**
 * Type declarations for JSX page components
 * This allows TypeScript to import .jsx files without errors
 */

// Main pages
declare module "*.jsx" {
  const Component: React.FC;
  export default Component;
}

declare module "../pages/Home.jsx" {
  const Home: React.FC;
  export default Home;
}

declare module "../pages/About.jsx" {
  const About: React.FC;
  export default About;
}

declare module "../pages/Contact.jsx" {
  const Contact: React.FC;
  export default Contact;
}

declare module "../pages/Products.jsx" {
  const Products: React.FC;
  export default Products;
}

declare module "../pages/ProductDetail.jsx" {
  const ProductDetail: React.FC;
  export default ProductDetail;
}

declare module "../pages/Categories.jsx" {
  const Categories: React.FC;
  export default Categories;
}

declare module "../pages/Orders.jsx" {
  const Orders: React.FC;
  export default Orders;
}

declare module "../pages/OrderDetail.jsx" {
  const OrderDetail: React.FC;
  export default OrderDetail;
}

declare module "../pages/Login.jsx" {
  const Login: React.FC;
  export default Login;
}

declare module "../pages/Register.jsx" {
  const Register: React.FC;
  export default Register;
}

declare module "../pages/Cart.jsx" {
  const Cart: React.FC;
  export default Cart;
}

declare module "../pages/Checkout.jsx" {
  const Checkout: React.FC;
  export default Checkout;
}

declare module "../pages/OrderSuccess.jsx" {
  const OrderSuccess: React.FC;
  export default OrderSuccess;
}

declare module "../pages/OrderFailed.jsx" {
  const OrderFailed: React.FC;
  export default OrderFailed;
}

declare module "../pages/placeholders.jsx" {
  export const Profile: React.FC;
  export const NotFound: React.FC;
}

// Admin pages
declare module "../pages/admin/AdminLayout.jsx" {
  const AdminLayout: React.FC;
  export default AdminLayout;
}

declare module "../pages/admin/Dashboard.jsx" {
  const Dashboard: React.FC;
  export default Dashboard;
}

declare module "../pages/admin/Products.jsx" {
  const Products: React.FC;
  export default Products;
}

declare module "../pages/admin/Categories.jsx" {
  const Categories: React.FC;
  export default Categories;
}

declare module "../pages/admin/Users.jsx" {
  const Users: React.FC;
  export default Users;
}
