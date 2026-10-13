/**
 * Sign-in page
 */
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import SignInForm from "../components/auth/SignInForm";

// Router state: where to go afterwards (ProtectedRoute, sign-up page) and a known email
type AuthPageState = { from?: { pathname?: string; search?: string }; email?: string } | null;

const Login = () => {
  usePageTitle("Sign in");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as AuthPageState;
  const from = state?.from?.pathname ? `${state.from.pathname}${state.from.search ?? ""}` : "/";
  const goBack = () => navigate(from, { replace: true });

  // Already signed in (e.g. Back after signing in): go where they were headed
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track orders and check out faster."
      footer={
        <>
          New to Nevan?{" "}
          <Link
            to="/register"
            state={{ from: state?.from }}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <GoogleSignInButton text="signin_with" onSuccess={goBack} />
        <SignInForm onSuccess={goBack} initialEmail={state?.email} />
      </div>
    </AuthLayout>
  );
};

export default Login;
