/**
 * 404 Page
 */
import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="container-app py-20 text-center">
    <h1 className="text-6xl font-bold text-[var(--color-primary)] mb-4">404</h1>
    <p className="text-xl text-[var(--color-text-muted)] mb-6">Page not found</p>
    <Link to="/" className="btn btn-primary">
      Go Home
    </Link>
  </div>
);

export default NotFound;
