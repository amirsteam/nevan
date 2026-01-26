import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Header from './Header';
import AuthContext from '../../context/AuthContext';
import cartReducer from '../../store/cartSlice';

// Mock logo asset
vi.mock('../../assets/logo.png', () => ({ default: 'test-logo' }));

const renderHeader = (authValue = {}) => {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { 
      cart: { 
        items: [], 
        subtotal: 0,
        itemCount: 0,
        loading: false,
        error: null 
      } 
    }
  });

  const defaultAuth = {
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    updateUser: vi.fn(),
    ...authValue
  };

  return render(
    <Provider store={store}>
      <AuthContext.Provider value={defaultAuth}>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </AuthContext.Provider>
    </Provider>
  );
};

describe('Header Component', () => {
  it('renders "Login" and "Sign Up" links when unauthenticated', () => {
    renderHeader({ isAuthenticated: false });
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });

  it('renders user initial when authenticated', () => {
    renderHeader({ 
      isAuthenticated: true, 
      user: { name: 'John Doe', email: 'john@example.com' } 
    });
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.queryByText(/Login/i)).not.toBeInTheDocument();
  });
});
