import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Header from './Header';
import AuthContext from '../../context/AuthContext';
import cartReducer from '../../store/cartSlice';

// Mock logo asset
vi.mock('../../assets/logo.png', () => ({ default: 'test-logo' }));

// Campaign and category data are swapped per test
const mocks = vi.hoisted(() => ({
  campaign: { campaign: null as unknown, loading: false, isPreview: false },
}));
vi.mock('../../context/CampaignContext', () => ({ useCampaign: () => mocks.campaign }));
vi.mock('../../hooks/useNavCategories', () => ({
  useNavCategories: () => [{ _id: 'c1', name: 'Jhablas', slug: 'jhablas' }],
}));

const liveCampaign = {
  _id: 'k1',
  name: 'Tihar Sale',
  slug: 'tihar-2026',
  emoji: '🪔',
  state: 'live',
  theme: { bg: '#3b1d0f', text: '#fff7ed', accent: '#f59e0b', onAccent: '#1c1917', highlight: '#fde68a', label: 'Tihar' },
  sale: { type: 'percent', value: 15, scope: 'all', label: '15% off', categories: [] },
};

const renderHeader = (authValue = {}) => {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: {
      cart: {
        items: [],
        subtotal: 0,
        savings: 0,
        itemCount: 0,
        loading: false,
        hasLoaded: true,
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
    loginWithGoogle: vi.fn(),
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
  beforeEach(() => {
    mocks.campaign = { campaign: null, loading: false, isPreview: false };
  });

  it('renders "Sign in" and "Sign up" links when unauthenticated', () => {
    renderHeader({ isAuthenticated: false });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
  });

  it('renders user initial when authenticated', () => {
    renderHeader({
      isAuthenticated: true,
      user: { name: 'John Doe', email: 'john@example.com' }
    });
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('falls back to the email initial when the user has no name', () => {
    renderHeader({ isAuthenticated: true, user: { name: '', email: 'sita@example.com' } });
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('opens the account menu and closes it with Escape, returning focus to the avatar', () => {
    renderHeader({ isAuthenticated: true, user: { name: 'John Doe', email: 'john@example.com' } });
    const avatar = screen.getByRole('button', { name: 'Account menu' });
    fireEvent.click(avatar);
    expect(avatar).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/orders');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument();
    expect(avatar).toHaveFocus();
  });

  it('shows shop-by-age, gender and category links in the Shop menu', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Shop' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const ages = screen.getByRole('list', { name: 'Shop by age' });
    expect(within(ages).getByRole('link', { name: /Newborn/ })).toHaveAttribute('href', '/products?age=0-3%20Months');
    expect(screen.getByRole('link', { name: 'Girls' })).toHaveAttribute('href', '/products?gender=girl');
    expect(screen.getByRole('link', { name: 'Jhablas' })).toHaveAttribute('href', '/products?category=jhablas');
  });

  it('links to the sale only while a campaign with a sale is live', () => {
    const { unmount } = renderHeader();
    expect(screen.queryByRole('link', { name: /Sale/ })).not.toBeInTheDocument();
    unmount();

    mocks.campaign = { campaign: liveCampaign, loading: false, isPreview: false };
    renderHeader();
    expect(screen.getByRole('link', { name: /Sale/ })).toHaveAttribute('href', '/sale/tihar-2026');
  });

  it('opens the menu drawer with shop and help links', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(drawer).getByRole('link', { name: /Toddler/ })).toHaveAttribute('href', '/products?age=1-2%20Years');
    expect(within(drawer).getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
    expect(within(drawer).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me'));

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});
