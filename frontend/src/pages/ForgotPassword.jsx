/**
 * Forgot Password Page
 * 3-step flow: Enter Email → Enter OTP → Set New Password
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth";
import toast from "react-hot-toast";
import { Mail, KeyRound, Lock, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

const STEPS = {
  EMAIL: 0,
  OTP: 1,
  NEW_PASSWORD: 2,
  SUCCESS: 3,
};

const ForgotPassword = () => {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success("OTP sent to your email!");
      setStep(STEPS.OTP);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length < 4) {
      setError("Please enter the OTP sent to your email");
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyResetOTP(email, otp);
      toast.success("OTP verified!");
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired OTP";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(email, otp, newPassword);
      setStep(STEPS.SUCCESS);
      toast.success("Password reset successfully!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Step indicators */}
        {step < STEPS.SUCCESS && (
          <div className="flex items-center gap-2 mb-8">
            {[0, 1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    s <= step
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                  }`}
                >
                  {s + 1}
                </div>
                {s < 2 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      s < step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Email */}
        {step === STEPS.EMAIL && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
              <p className="text-[var(--color-text-muted)]">
                Enter your email and we'll send you a reset code
              </p>
            </div>

            <form onSubmit={handleSendOTP} className="card p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-md text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <div className="input-group">
                  <Mail className={`input-icon w-4 h-4 ${error ? "text-[var(--color-error)]" : ""}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: OTP */}
        {step === STEPS.OTP && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Enter Reset Code</h1>
              <p className="text-[var(--color-text-muted)]">
                We sent a code to <span className="font-medium text-[var(--color-text)]">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="card p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-md text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Reset Code (OTP)</label>
                <div className="input-group">
                  <KeyRound className="input-icon w-4 h-4" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    className="input text-center tracking-widest text-lg"
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(STEPS.EMAIL);
                  setOtp("");
                  setError("");
                }}
                className="w-full text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-center"
              >
                Didn't get the code? Try again
              </button>
            </form>
          </>
        )}

        {/* Step 3: New Password */}
        {step === STEPS.NEW_PASSWORD && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
              <p className="text-[var(--color-text-muted)]">
                Choose a strong password for your account
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="card p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-md text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <div className="input-group">
                  <Lock className="input-icon w-4 h-4" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="input-group">
                  <Lock className="input-icon w-4 h-4" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {/* Success */}
        {step === STEPS.SUCCESS && (
          <div className="card p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn btn-primary w-full py-3"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
