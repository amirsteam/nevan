/**
 * Sign-up page
 */
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import SignUpForm from "../components/auth/SignUpForm";

// Router state: where to go afterwards (passed on from the sign-in page)
type AuthPageState = { from?: { pathname?: string; search?: string } } | null;

const Register = () => {
  usePageTitle("Create an account");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as AuthPageState;
  const from = state?.from?.pathname ? `${state.from.pathname}${state.from.search ?? ""}` : "/";
  const goBack = () => navigate(from, { replace: true });

  // Already signed in: nothing to sign up for
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ from: state?.from }}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <GoogleSignInButton text="signup_with" onSuccess={goBack} />
        <SignUpForm
          onSuccess={goBack}
          onSignInInstead={(email) => navigate("/login", { state: { from: state?.from, email } })}
        />
      </div>
    </AuthLayout>
  );
};

export default Register;
