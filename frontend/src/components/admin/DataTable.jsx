/**
 * DataTable Component
 * Reusable table with sorting, loading states, and actions
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, MoreVertical } from 'lucide-react';

const DataTable = ({
    columns, // [{ key, label, sortable, render, width, align }]
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
}) => {
    const [sort, setSort] = useState(defaultSort);
    const [openActionMenu, setOpenActionMenu] = useState(null);

    // Handle column sort
    const handleSort = (column) => {
        if (!column.sortable) return;

        const newDirection = sort?.key === column.key && sort?.direction === 'asc' ? 'desc' : 'asc';
        const newSort = { key: column.key, direction: newDirection };
        setSort(newSort);

        if (onSort) {
            onSort(newSort);
        }
    };

    // Get sorted data (client-side if no onSort provided)
    const getSortedData = () => {
        if (!sort || onSort) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sort.key];
            const bVal = b[sort.key];

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
                                key={row[rowKey]}
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
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </td>
                                ))}
                                {actions && (
                                    <td className={`${paddingClass} relative`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenActionMenu(openActionMenu === row[rowKey] ? null : row[rowKey]);
                                            }}
                                            className="p-1 rounded hover:bg-[var(--color-bg)]"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {/* Actions dropdown */}
                                        {openActionMenu === row[rowKey] && (
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
