/**
 * Users Management Page
 * List users with role and status management
 */
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import { formatDate } from '../../utils/helpers';
import {
    DataTable,
    Pagination,
    SearchInput,
    StatusBadge,
    ConfirmDialog,
} from '../../components/admin';
import { User, Shield, ShieldCheck, ToggleLeft, ToggleRight, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
    // State
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
    });

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Dialogs
    const [roleDialog, setRoleDialog] = useState({ open: false, user: null, newRole: '' });
    const [statusDialog, setStatusDialog] = useState({ open: false, user: null });
    const [updating, setUpdating] = useState(false);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
            };
            if (roleFilter) params.role = roleFilter;

            const response = await adminAPI.getUsers(params);
            setUsers(response.data.data.users);
            setPagination((prev) => ({
                ...prev,
                totalPages: response.data.pagination?.totalPages || 1,
                totalItems: response.data.pagination?.totalItems || response.data.results,
            }));
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.itemsPerPage, roleFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Filter users by search (client-side for name/email)
    const filteredUsers = users.filter((user) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
        );
    });

    // Handle page change
    const handlePageChange = (page) => {
        setPagination((prev) => ({ ...prev, currentPage: page }));
    };

    // Toggle user status
    const handleStatusClick = (user) => {
        setStatusDialog({ open: true, user });
    };

    // Confirm status toggle
    const handleStatusConfirm = async () => {
        if (!statusDialog.user) return;

        setUpdating(true);
        try {
            const newStatus = !statusDialog.user.isActive;
            await adminAPI.updateUserStatus(statusDialog.user._id, newStatus);
            toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update user status');
        } finally {
            setUpdating(false);
            setStatusDialog({ open: false, user: null });
        }
    };

    // Change user role
    const handleRoleClick = (user) => {
        const newRole = user.role === 'admin' ? 'customer' : 'admin';
        setRoleDialog({ open: true, user, newRole });
    };

    // Confirm role change
    const handleRoleConfirm = async () => {
        if (!roleDialog.user) return;

        setUpdating(true);
        try {
            await adminAPI.updateUserRole(roleDialog.user._id, roleDialog.newRole);
            toast.success(`User role updated to ${roleDialog.newRole}`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update user role');
        } finally {
            setUpdating(false);
            setRoleDialog({ open: false, user: null, newRole: '' });
        }
    };

    // Table columns
    const columns = [
        {
            key: 'avatar',
            label: '',
            width: '50px',
            render: (_, user) => (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-primary)] flex items-center justify-center text-white font-medium">
                    {user.avatar?.url ? (
                        <img
                            src={user.avatar.url}
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        user.name?.charAt(0).toUpperCase()
                    )}
                </div>
            ),
        },
        {
            key: 'name',
            label: 'User',
            sortable: true,
            render: (name, user) => (
                <div>
                    <p className="font-medium flex items-center gap-2">
                        {name}
                        {user.role === 'admin' && (
                            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
                        )}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (phone) => phone || '-',
        },
        {
            key: 'role',
            label: 'Role',
            render: (role) => (
                <StatusBadge
                    status={role}
                    variant={role === 'admin' ? 'primary' : 'default'}
                    uppercase
                />
            ),
        },
        {
            key: 'isActive',
            label: 'Status',
            render: (isActive) => (
                <StatusBadge
                    status={isActive ? 'Active' : 'Inactive'}
                    variant={isActive ? 'success' : 'error'}
                />
            ),
        },
        {
            key: 'createdAt',
            label: 'Joined',
            sortable: true,
            render: (date) => (
                <span className="text-sm text-[var(--color-text-muted)]">
                    {formatDate(date)}
                </span>
            ),
        },
        {
            key: 'lastLogin',
            label: 'Last Login',
            render: (date) => (
                <span className="text-sm text-[var(--color-text-muted)]">
                    {date ? formatDate(date) : 'Never'}
                </span>
            ),
        },
    ];

    // Row actions
    const getRowActions = (user) => [
        {
            label: user.isActive ? 'Deactivate' : 'Activate',
            icon: user.isActive ? ToggleRight : ToggleLeft,
            onClick: () => handleStatusClick(user),
        },
        {
            label: user.role === 'admin' ? 'Remove Admin' : 'Make Admin',
            icon: user.role === 'admin' ? Shield : ShieldCheck,
            onClick: () => handleRoleClick(user),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Users</h1>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by name or email..."
                        className="flex-1"
                    />

                    <select
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, currentPage: 1 }));
                        }}
                        className="select w-auto"
                    >
                        <option value="">All Roles</option>
                        <option value="customer">Customers</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="card">
                <DataTable
                    columns={columns}
                    data={filteredUsers}
                    loading={loading}
                    emptyMessage="No users found"
                    actions={getRowActions}
                />

                {/* Pagination */}
                {!loading && filteredUsers.length > 0 && (
                    <div className="p-4 border-t border-[var(--color-border)]">
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            itemsPerPage={pagination.itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Status Toggle Confirmation */}
            <ConfirmDialog
                isOpen={statusDialog.open}
                onClose={() => setStatusDialog({ open: false, user: null })}
                onConfirm={handleStatusConfirm}
                title={statusDialog.user?.isActive ? 'Deactivate User' : 'Activate User'}
                message={
                    statusDialog.user?.isActive
                        ? `Are you sure you want to deactivate "${statusDialog.user?.name}"? They will not be able to log in.`
                        : `Are you sure you want to activate "${statusDialog.user?.name}"?`
                }
                confirmText={statusDialog.user?.isActive ? 'Deactivate' : 'Activate'}
                variant={statusDialog.user?.isActive ? 'danger' : 'info'}
                loading={updating}
            />

            {/* Role Change Confirmation */}
            <ConfirmDialog
                isOpen={roleDialog.open}
                onClose={() => setRoleDialog({ open: false, user: null, newRole: '' })}
                onConfirm={handleRoleConfirm}
                title={roleDialog.newRole === 'admin' ? 'Promote to Admin' : 'Remove Admin Role'}
                message={
                    roleDialog.newRole === 'admin'
                        ? `Are you sure you want to make "${roleDialog.user?.name}" an admin? They will have full access to the admin panel.`
                        : `Are you sure you want to remove admin privileges from "${roleDialog.user?.name}"?`
                }
                confirmText={roleDialog.newRole === 'admin' ? 'Make Admin' : 'Remove Admin'}
                variant={roleDialog.newRole === 'admin' ? 'warning' : 'danger'}
                loading={updating}
            />
        </div>
    );
};

export default Users;
