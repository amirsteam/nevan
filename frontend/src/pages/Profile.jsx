/**
 * Profile Page
 * View account info and change password
 */
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api/auth";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Loader2,
  ShoppingBag,
  Heart,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully!");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to change password";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">
          Home
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">My Profile</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-8">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Account Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <User className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Full Name
                  </p>
                  <p className="font-medium text-sm">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <Mail className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Email</p>
                  <p className="font-medium text-sm">{user.email}</p>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                  <Phone className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Phone
                    </p>
                    <p className="font-medium text-sm">{user.phone}</p>
                  </div>
                </div>
              )}

              {user.addresses?.[0] && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                  <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Address
                    </p>
                    <p className="font-medium text-sm">
                      {[
                        user.addresses[0].street,
                        user.addresses[0].city,
                        user.addresses[0].district,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mt-4">
              Member since{" "}
              {new Date(user.createdAt || Date.now()).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "long" }
              )}
            </p>
          </div>

          {/* Change Password Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Password & Security</h2>
              <button
                onClick={() => {
                  setShowPasswordForm((v) => !v);
                  setPasswordError("");
                }}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
            </div>

            {!showPasswordForm ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    ••••••••••
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-md text-sm">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Password
                  </label>
                  <div className="input-group">
                    <Lock className="input-icon w-4 h-4" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <div className="input-group">
                    <Lock className="input-icon w-4 h-4" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <div className="input-group">
                    <Lock className="input-icon w-4 h-4" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="input"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn btn-primary py-2.5"
                >
                  {passwordLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Quick Links Sidebar */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold mb-3 text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
              Quick Links
            </h3>
            <div className="space-y-1">
              <Link
                to="/orders"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
                  <span className="text-sm font-medium">My Orders</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" />
              </Link>

              <Link
                to="/wishlist"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[var(--color-primary)]" />
                  <span className="text-sm font-medium">My Wishlist</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" />
              </Link>
            </div>
          </div>

          {/* Help */}
          <div className="card p-4">
            <h3 className="font-semibold mb-3 text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
              Need Help?
            </h3>
            <div className="space-y-1">
              <Link
                to="/faq"
                className="block p-2 text-sm hover:text-[var(--color-primary)] transition-colors"
              >
                Frequently Asked Questions
              </Link>
              <Link
                to="/shipping"
                className="block p-2 text-sm hover:text-[var(--color-primary)] transition-colors"
              >
                Shipping Information
              </Link>
              <Link
                to="/returns"
                className="block p-2 text-sm hover:text-[var(--color-primary)] transition-colors"
              >
                Returns & Refunds
              </Link>
              <Link
                to="/contact"
                className="block p-2 text-sm hover:text-[var(--color-primary)] transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
