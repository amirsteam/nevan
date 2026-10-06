/**
 * DataTable Component
 * Reusable table with sorting, loading states, and actions
 */
import { useState, ReactNode, ComponentType } from 'react';
import { ChevronUp, ChevronDown, MoreVertical } from 'lucide-react';

export interface DataTableColumn<T> {
    key: string;
    label: ReactNode;
    sortable?: boolean;
    // The cell value is looked up by `key`, so its type isn't known statically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render?: (value: any, row: T) => ReactNode;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
}

export interface DataTableSort {
    key: string;
    direction: 'asc' | 'desc';
}

export interface DataTableAction<T> {
    label: string;
    icon?: ComponentType<{ className?: string }>;
    onClick: (row: T) => void;
    variant?: 'danger' | string;
}

interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data?: T[];
    loading?: boolean;
    emptyMessage?: ReactNode;
    sortable?: boolean;
    defaultSort?: DataTableSort | null;
    onSort?: ((sort: DataTableSort) => void) | null;
    rowKey?: string;
    onRowClick?: ((row: T) => void) | null;
    actions?: ((row: T) => DataTableAction<T>[]) | null;
    compact?: boolean;
}

const cell = (row: object, key: string): unknown => (row as Record<string, unknown>)[key];

const DataTable = <T extends object>({
    columns,
    data = [],
    loading = false,
    emptyMessage = 'No data available',
    sortable = true,
    defaultSort = null, // { key, direction }
    onSort = null,
    rowKey = '_id',
    onRowClick = null,
    actions = null, // (row) => [{ label, icon, onClick, variant }]
    compact = false,
}: DataTableProps<T>) => {
    const [sort, setSort] = useState<DataTableSort | null>(defaultSort);
    const [openActionMenu, setOpenActionMenu] = useState<unknown>(null);

    // Handle column sort
    const handleSort = (column: DataTableColumn<T>) => {
        if (!column.sortable) return;

        const newDirection = sort?.key === column.key && sort?.direction === 'asc' ? 'desc' : 'asc';
        const newSort: DataTableSort = { key: column.key, direction: newDirection };
        setSort(newSort);

        if (onSort) {
            onSort(newSort);
        }
    };

    // Get sorted data (client-side if no onSort provided)
    const getSortedData = () => {
        if (!sort || onSort) return data;

        return [...data].sort((a, b) => {
            const aVal = cell(a, sort.key) as string | number | null | undefined;
            const bVal = cell(b, sort.key) as string | number | null | undefined;

            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            const comparison = aVal < bVal ? -1 : 1;
            return sort.direction === 'asc' ? comparison : -comparison;
        });
    };

    const sortedData = getSortedData();
    const paddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                {/* Header */}
                <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`
                                    ${paddingClass} text-left text-sm font-medium text-[var(--color-text-muted)]
                                    ${column.sortable && sortable ? 'cursor-pointer hover:text-[var(--color-text)] select-none' : ''}
                                    ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
                                `}
                                style={{ width: column.width }}
                                onClick={() => sortable && handleSort(column)}
                            >
                                <div className="flex items-center gap-1">
                                    <span>{column.label}</span>
                                    {column.sortable && sortable && (
                                        <span className="flex flex-col">
                                            <ChevronUp
                                                className={`w-3 h-3 -mb-1 ${sort?.key === column.key && sort?.direction === 'asc' ? 'text-[var(--color-primary)]' : 'opacity-30'}`}
                                            />
                                            <ChevronDown
                                                className={`w-3 h-3 ${sort?.key === column.key && sort?.direction === 'desc' ? 'text-[var(--color-primary)]' : 'opacity-30'}`}
                                            />
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                        {actions && <th className={`${paddingClass} w-12`}></th>}
                    </tr>
                </thead>

                {/* Body */}
                <tbody>
                    {loading ? (
                        // Loading skeleton
                        [...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b border-[var(--color-border)]">
                                {columns.map((column) => (
                                    <td key={column.key} className={paddingClass}>
                                        <div className="h-5 rounded skeleton" style={{ width: '80%' }} />
                                    </td>
                                ))}
                                {actions && (
                                    <td className={paddingClass}>
                                        <div className="h-5 w-5 rounded skeleton" />
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : sortedData.length === 0 ? (
                        // Empty state
                        <tr>
                            <td
                                colSpan={columns.length + (actions ? 1 : 0)}
                                className="p-8 text-center text-[var(--color-text-muted)]"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        // Data rows
                        sortedData.map((row) => (
                            <tr
                                key={String(cell(row, rowKey))}
                                className={`
                                    border-b border-[var(--color-border)] last:border-0
                                    ${onRowClick ? 'cursor-pointer hover:bg-[var(--color-bg)]' : ''}
                                `}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`
                                            ${paddingClass}
                                            ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
                                        `}
                                    >
                                        {column.render ? column.render(cell(row, column.key), row) : (cell(row, column.key) as ReactNode)}
                                    </td>
                                ))}
                                {actions && (
                                    <td className={`${paddingClass} relative`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenActionMenu(openActionMenu === cell(row, rowKey) ? null : cell(row, rowKey));
                                            }}
                                            className="p-1 rounded hover:bg-[var(--color-bg)]"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {/* Actions dropdown */}
                                        {openActionMenu === cell(row, rowKey) && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setOpenActionMenu(null)}
                                                />
                                                <div className="absolute right-0 mt-1 py-1 w-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-20">
                                                    {actions(row).map((action, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                action.onClick(row);
                                                                setOpenActionMenu(null);
                                                            }}
                                                            className={`
                                                                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                                                                hover:bg-[var(--color-bg)]
                                                                ${action.variant === 'danger' ? 'text-[var(--color-error)]' : ''}
                                                            `}
                                                        >
                                                            {action.icon && <action.icon className="w-4 h-4" />}
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
