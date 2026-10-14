import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Users from "./Users";
import AuthContext from "../../context/AuthContext";

const api = vi.hoisted(() => ({ getUsers: vi.fn(), updateUserStatus: vi.fn(), updateUserRole: vi.fn() }));
vi.mock("../../api", () => ({ adminAPI: api }));

const me = { _id: "me", name: "Anjana", email: "anjana@example.com", role: "admin", isActive: true, createdAt: "2026-01-01T00:00:00Z" };
const customer = {
  _id: "c1",
  name: "Sita",
  email: "sita@example.com",
  role: "customer",
  isActive: true,
  createdAt: "2026-02-01T00:00:00Z",
  orderStats: { orders: 3, spent: 4500, lastOrderAt: "2026-10-01T00:00:00Z" },
};

const renderUsers = () => {
  api.getUsers.mockResolvedValue({ data: { data: { users: [me, customer] }, pagination: { totalPages: 1, totalItems: 2 } } });
  const auth = { user: me, isAuthenticated: true, isAdmin: true, loading: false, logout: vi.fn(), login: vi.fn(), loginWithGoogle: vi.fn(), register: vi.fn(), updateUser: vi.fn() };
  return render(
    <AuthContext.Provider value={auth as never}>
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("Admin Users", () => {
  it("offers no status or role change on your own account", async () => {
    renderUsers();
    const myRow = (await screen.findByText("anjana@example.com")).closest("tr")!;
    fireEvent.click(within(myRow).getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("button", { name: /View orders/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Deactivate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove Admin/ })).not.toBeInTheDocument();
  });

  it("shows each customer's orders and spend, linked to their orders", async () => {
    renderUsers();
    const row = (await screen.findByText("sita@example.com")).closest("tr")!;
    expect(within(row).getByRole("link", { name: /3/ })).toHaveAttribute("href", "/admin/orders?search=sita%40example.com");
    expect(within(row).getByText(/4,500 spent/)).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("button", { name: /Deactivate/ })).toBeInTheDocument();
  });
});
