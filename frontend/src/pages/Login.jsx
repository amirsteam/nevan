/**
 * Login Page
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader2 } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const validateForm = () => {
        const newErrors = {};
        
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        setErrors({}); // Clear global errors

        const result = await login(email, password);

        setLoading(false);
        if (result.success) {
            navigate(from, { replace: true });
        } else {
            setErrors(prev => ({ ...prev, global: result.error }));
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                    <p className="text-[var(--color-text-muted)]">
                        Sign in to continue shopping
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                    {errors.global && (
                        <div className="bg-red-50 text-[var(--color-error)] p-3 rounded-md text-sm text-center">
                            {errors.global}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <div className="input-group">
                            <Mail className={`input-icon w-4 h-4 ${errors.email ? 'text-[var(--color-error)]' : ''}`} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors({ ...errors, email: '' });
                                }}
                                placeholder="you@example.com"
                                className={`input ${errors.email ? 'border-[var(--color-error)] focus:border-[var(--color-error)]' : ''}`}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-xs text-[var(--color-error)] mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium">Password</label>
                            <Link
                                to="/forgot-password"
                                className="text-xs text-[var(--color-primary)] hover:underline"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="input-group">
                            <Lock className={`input-icon w-4 h-4 ${errors.password ? 'text-[var(--color-error)]' : ''}`} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors({ ...errors, password: '' });
                                }}
                                placeholder="••••••••"
                                className={`input ${errors.password ? 'border-[var(--color-error)] focus:border-[var(--color-error)]' : ''}`}
                            />
                        </div>
                        {errors.password && (
                            <p className="text-xs text-[var(--color-error)] mt-1">{errors.password}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <p className="text-center text-sm text-[var(--color-text-muted)]">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-[var(--color-primary)] hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
