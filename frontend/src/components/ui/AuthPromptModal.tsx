/**
 * Auth Prompt Modal
 * Shows login/register options when unauthenticated user tries to add to cart
 * Displays product preview to remind user what they wanted
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  ShoppingCart,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { usePendingCart } from "../../context/PendingCartContext";
import { formatPrice } from "../../utils/helpers";

type TabType = "login" | "register";

const AuthPromptModal = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { pendingItem, isModalOpen, closeModal } = usePendingCart();
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");

  const handleClose = () => {
    closeModal();
    // Reset form states
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterError("");
    setActiveTab("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail || !loginPassword) {
      setLoginError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const result = await login(loginEmail, loginPassword);
    setLoading(false);

    if (result.success) {
      handleClose();
      // Pending cart will be handled by the component that triggered this
    } else {
      setLoginError(result.error || "Login failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    if (!registerName || !registerEmail || !registerPassword) {
      setRegisterError("Please fill in all fields");
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await register({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
    });
    setLoading(false);

    if (result.success) {
      handleClose();
    } else {
      setRegisterError(result.error || "Registration failed");
    }
  };

  const handleGoToLogin = () => {
    closeModal();
    navigate("/login", {
      state: { from: { pathname: window.location.pathname } },
    });
  };

  const handleGoToRegister = () => {
    closeModal();
    navigate("/register", {
      state: { from: { pathname: window.location.pathname } },
    });
  };

  if (!isModalOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-xl shadow-xl animate-slideIn overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-bg)] transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Preview (if pending item exists) */}
        {pendingItem && (
          <div className="bg-[var(--color-primary)]/5 p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-bg)] flex-shrink-0">
                <img
                  src={pendingItem.productImage}
                  alt={pendingItem.productName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[var(--color-primary)] text-sm font-medium mb-1">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Ready to add to cart</span>
                </div>
                <p className="font-medium truncate">
                  {pendingItem.productName}
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <span>{formatPrice(pendingItem.productPrice)}</span>
                  {pendingItem.variantDetails && (
                    <>
                      <span>•</span>
                      <span>{pendingItem.variantDetails.size}</span>
                      <span>•</span>
                      <span>{pendingItem.variantDetails.color}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Qty: {pendingItem.quantity}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <h2 id="auth-modal-title" className="text-xl font-bold mb-2">
            Sign in to continue
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Login or create an account to add items to your cart
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] mx-6">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "login"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <LogIn className="w-4 h-4 inline-block mr-2" />
            Login
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "register"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-2" />
            Register
          </button>
        </div>

        {/* Forms */}
        <div className="p-6">
          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-lg text-sm text-center">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Sign In & Add to Cart"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {registerError && (
                <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-lg text-sm text-center">
                  {registerError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    className="input pl-10 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="input pl-10 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Create Account & Add to Cart"
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--color-surface)] px-4 text-[var(--color-text-muted)]">
                or continue on full page
              </span>
            </div>
          </div>

          {/* Full page links */}
          <div className="flex gap-3">
            <button
              onClick={handleGoToLogin}
              className="flex-1 btn btn-outline text-sm"
            >
              Login Page
            </button>
            <button
              onClick={handleGoToRegister}
              className="flex-1 btn btn-outline text-sm"
            >
              Register Page
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            By continuing, you agree to our{" "}
            <Link
              to="/terms"
              className="text-[var(--color-primary)] hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="text-[var(--color-primary)] hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AuthPromptModal;
