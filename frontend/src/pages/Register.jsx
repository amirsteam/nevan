/**
 * Register Page
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, Phone, Loader2 } from "lucide-react";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

    setLoading(false);
    if (result.success) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-[var(--color-text-muted)]">
            Join us and start shopping
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <div className="input-group">
              <User className="input-icon w-4 h-4" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Anjana Shrestha"
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="input-group">
              <Mail className="input-icon w-4 h-4" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <div className="input-group">
              <Phone className="input-icon w-4 h-4" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+977 98XXXXXXXX"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="input-group">
              <Lock className="input-icon w-4 h-4" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <div className="input-group">
              <Lock className="input-icon w-4 h-4" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                required
                minLength={6}
              />
            </div>
            {formData.password &&
              formData.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <p className="text-sm text-[var(--color-error)] mt-1">
                  Passwords don't match
                </p>
              )}
          </div>

          <button
            type="submit"
            disabled={loading || formData.password !== formData.confirmPassword}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>

          <p className="text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[var(--color-primary)] hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
