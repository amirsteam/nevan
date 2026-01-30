/**
 * Register Page
 * With comprehensive real-time validation
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  Lock,
  Phone,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Validation rules
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2)
          return "Name must be at least 2 characters";
        if (value.trim().length > 50)
          return "Name must be less than 50 characters";
        return "";
      case "email":
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email address";
        return "";
      case "phone":
        if (value && !/^(\+977)?[0-9]{10}$/.test(value.replace(/[\s-]/g, ""))) {
          return "Enter a valid Nepali phone number (e.g., 98XXXXXXXX)";
        }
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        if (!/[a-zA-Z]/.test(value))
          return "Password must contain at least one letter";
        if (!/[0-9]/.test(value))
          return "Password must contain at least one number";
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords don't match";
        return "";
      default:
        return "";
    }
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate on change if field was touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }

    // Also validate confirmPassword when password changes
    if (
      name === "password" &&
      touched.confirmPassword &&
      formData.confirmPassword
    ) {
      const confirmError =
        value !== formData.confirmPassword ? "Passwords don't match" : "";
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      phone: formData.phone.replace(/[\s-]/g, ""),
      password: formData.password,
    });

    setLoading(false);
    if (result.success) {
      navigate("/");
    } else if (result.error) {
      // Show server-side validation errors
      setErrors((prev) => ({ ...prev, global: result.error }));
    }
  };

  // Check if form is valid for submit button
  const isFormValid = () => {
    return (
      formData.name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.password.length >= 6 &&
      formData.password === formData.confirmPassword
    );
  };

  // Helper function to get field state classes
  const getFieldState = (name) => {
    const hasError = touched[name] && errors[name];
    const isValid = touched[name] && !errors[name] && formData[name];
    return { hasError, isValid };
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
          {/* Global error message */}
          {errors.global && (
            <div className="bg-red-50 border border-red-200 text-[var(--color-error)] p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors.global}
            </div>
          )}

          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name<span className="text-[var(--color-error)] ml-1">*</span>
            </label>
            <div className="relative">
              <div
                className={`input-group ${getFieldState("name").hasError ? "ring-2 ring-[var(--color-error)] rounded-lg" : getFieldState("name").isValid ? "ring-2 ring-green-500 rounded-lg" : ""}`}
              >
                <User
                  className={`input-icon w-4 h-4 ${getFieldState("name").hasError ? "text-[var(--color-error)]" : getFieldState("name").isValid ? "text-green-500" : ""}`}
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Anjana Shrestha"
                  className="input pr-10"
                  required
                />
                {getFieldState("name").isValid && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            {getFieldState("name").hasError && (
              <p className="flex items-center gap-1 text-xs text-[var(--color-error)] mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email<span className="text-[var(--color-error)] ml-1">*</span>
            </label>
            <div className="relative">
              <div
                className={`input-group ${getFieldState("email").hasError ? "ring-2 ring-[var(--color-error)] rounded-lg" : getFieldState("email").isValid ? "ring-2 ring-green-500 rounded-lg" : ""}`}
              >
                <Mail
                  className={`input-icon w-4 h-4 ${getFieldState("email").hasError ? "text-[var(--color-error)]" : getFieldState("email").isValid ? "text-green-500" : ""}`}
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="you@example.com"
                  className="input pr-10"
                  required
                />
                {getFieldState("email").isValid && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            {getFieldState("email").hasError && (
              <p className="flex items-center gap-1 text-xs text-[var(--color-error)] mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <div className="relative">
              <div
                className={`input-group ${getFieldState("phone").hasError ? "ring-2 ring-[var(--color-error)] rounded-lg" : getFieldState("phone").isValid ? "ring-2 ring-green-500 rounded-lg" : ""}`}
              >
                <Phone
                  className={`input-icon w-4 h-4 ${getFieldState("phone").hasError ? "text-[var(--color-error)]" : getFieldState("phone").isValid ? "text-green-500" : ""}`}
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="+977 98XXXXXXXX"
                  className="input pr-10"
                />
                {getFieldState("phone").isValid && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            {getFieldState("phone").hasError && (
              <p className="flex items-center gap-1 text-xs text-[var(--color-error)] mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Password<span className="text-[var(--color-error)] ml-1">*</span>
            </label>
            <div className="relative">
              <div
                className={`input-group ${getFieldState("password").hasError ? "ring-2 ring-[var(--color-error)] rounded-lg" : getFieldState("password").isValid ? "ring-2 ring-green-500 rounded-lg" : ""}`}
              >
                <Lock
                  className={`input-icon w-4 h-4 ${getFieldState("password").hasError ? "text-[var(--color-error)]" : getFieldState("password").isValid ? "text-green-500" : ""}`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {getFieldState("password").hasError && (
              <p className="flex items-center gap-1 text-xs text-[var(--color-error)] mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Password strength indicator */}
          {formData.password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                <div
                  className={`h-1 flex-1 rounded ${formData.password.length >= 6 ? "bg-green-500" : "bg-gray-300"}`}
                />
                <div
                  className={`h-1 flex-1 rounded ${/[a-zA-Z]/.test(formData.password) ? "bg-green-500" : "bg-gray-300"}`}
                />
                <div
                  className={`h-1 flex-1 rounded ${/[0-9]/.test(formData.password) ? "bg-green-500" : "bg-gray-300"}`}
                />
                <div
                  className={`h-1 flex-1 rounded ${/[!@#$%^&*]/.test(formData.password) ? "bg-green-500" : "bg-gray-300"}`}
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Use 6+ characters with letters, numbers & symbols
              </p>
            </div>
          )}

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Confirm Password
              <span className="text-[var(--color-error)] ml-1">*</span>
            </label>
            <div className="relative">
              <div
                className={`input-group ${getFieldState("confirmPassword").hasError ? "ring-2 ring-[var(--color-error)] rounded-lg" : getFieldState("confirmPassword").isValid ? "ring-2 ring-green-500 rounded-lg" : ""}`}
              >
                <Lock
                  className={`input-icon w-4 h-4 ${getFieldState("confirmPassword").hasError ? "text-[var(--color-error)]" : getFieldState("confirmPassword").isValid ? "text-green-500" : ""}`}
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {getFieldState("confirmPassword").hasError && (
              <p className="flex items-center gap-1 text-xs text-[var(--color-error)] mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>

          <p className="text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[var(--color-primary)] hover:underline font-medium"
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
