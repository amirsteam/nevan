/**
 * Advanced Data Table Component using TanStack Table
 * Features: Sorting, Filtering, Pagination, Column Visibility, Export, Row Selection
 */
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type PaginationState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  Download,
  X,
  Check,
} from "lucide-react";

interface AdvancedDataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  // Pagination
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  // Server-side pagination
  serverPagination?: {
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  // Features
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableGlobalFilter?: boolean;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  enableExport?: boolean;
  // Callbacks
  onRowClick?: (row: T) => void;
  onRowSelectionChange?: (selectedRows: T[]) => void;
  onExport?: (data: T[], format: "csv" | "json") => void;
  // Styling
  compact?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  // Custom render
  renderRowActions?: (row: T) => React.ReactNode;
}

export function AdvancedDataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  serverPagination,
  enableSorting = true,
  enableFiltering = true,
  enableGlobalFilter = true,
  enableColumnVisibility = true,
  enableRowSelection = false,
  enableExport = true,
  onRowClick,
  onRowSelectionChange,
  onExport,
  compact = false,
  stickyHeader = false,
  striped = false,
  renderRowActions,
}: AdvancedDataTableProps<T>) {
  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: serverPagination?.pageIndex ?? 0,
    pageSize: serverPagination?.pageSize ?? pageSize,
  });

  // UI State
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Add row actions column if provided
  const tableColumns = useMemo(() => {
    if (!renderRowActions) return columns;

    return [
      ...columns,
      {
        id: "actions",
        header: "",
        cell: ({ row }) => renderRowActions(row.original),
        enableSorting: false,
        enableHiding: false,
        size: 60,
      },
    ] as ColumnDef<T, unknown>[];
  }, [columns, renderRowActions]);

  // Add selection column if enabled
  const finalColumns = useMemo(() => {
    if (!enableRowSelection) return tableColumns;

    return [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      ...tableColumns,
    ] as ColumnDef<T, unknown>[];
  }, [tableColumns, enableRowSelection]);

  // Table instance
  const table = useReactTable<T>({
    data,
    columns: finalColumns as ColumnDef<T, unknown>[],
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination: serverPagination
        ? {
            pageIndex: serverPagination.pageIndex,
            pageSize: serverPagination.pageSize,
          }
        : pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      if (onRowSelectionChange) {
        const newSelection =
          typeof updater === "function" ? updater(rowSelection) : updater;
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key)]);
        onRowSelectionChange(selectedRows);
      }
    },
    onPaginationChange: serverPagination
      ? (updater) => {
          const newState =
            typeof updater === "function" ? updater(pagination) : updater;
          if (newState.pageIndex !== pagination.pageIndex) {
            serverPagination.onPageChange(newState.pageIndex);
          }
          if (newState.pageSize !== pagination.pageSize) {
            serverPagination.onPageSizeChange(newState.pageSize);
          }
          setPagination(newState);
        }
      : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel:
      enablePagination && !serverPagination
        ? getPaginationRowModel()
        : undefined,
    globalFilterFn: "includesString",
    manualPagination: !!serverPagination,
    pageCount: serverPagination
      ? Math.ceil(serverPagination.totalItems / serverPagination.pageSize)
      : undefined,
  });

  // Export handlers
  const handleExport = (format: "csv" | "json") => {
    const exportData = table
      .getFilteredRowModel()
      .rows.map((row) => row.original) as T[];
    if (onExport) {
      onExport(exportData, format);
    } else {
      // Default export implementation
      if (format === "json") {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        downloadBlob(blob, "data.json");
      } else {
        const headers = columns
          .filter(
            (col): col is ColumnDef<T, unknown> & { accessorKey: string } =>
              "accessorKey" in col && typeof col.accessorKey === "string",
          )
          .map((col) =>
            "header" in col && typeof col.header === "string"
              ? col.header
              : String(col.id || ""),
          );
        const keys = columns
          .filter(
            (col): col is ColumnDef<T, unknown> & { accessorKey: string } =>
              "accessorKey" in col && typeof col.accessorKey === "string",
          )
          .map((col) => col.accessorKey);

        const csvRows = [headers.join(",")];
        exportData.forEach((row) => {
          const values = keys.map((key) => {
            const value = (row as Record<string, unknown>)[key];
            return JSON.stringify(value ?? "");
          });
          csvRows.push(values.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        downloadBlob(blob, "data.csv");
      }
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paddingClass = compact ? "px-3 py-2" : "px-4 py-3";
  const totalItems =
    serverPagination?.totalItems ?? table.getFilteredRowModel().rows.length;
  const pageCount = serverPagination
    ? Math.ceil(serverPagination.totalItems / serverPagination.pageSize)
    : table.getPageCount();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {/* Global Search */}
        {enableGlobalFilter && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search all columns..."
              className="input pl-10 w-full"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--color-bg)] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {/* Column Visibility */}
          {enableColumnVisibility && (
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Columns</span>
              </button>

              {showColumnSettings && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowColumnSettings(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 py-2">
                    <div className="px-3 py-2 border-b border-[var(--color-border)] font-medium text-sm">
                      Toggle Columns
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {table.getAllLeafColumns().map((column) => {
                        if (!column.getCanHide()) return null;
                        return (
                          <label
                            key={column.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-bg)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={column.getIsVisible()}
                              onChange={column.getToggleVisibilityHandler()}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">
                              {typeof column.columnDef.header === "string"
                                ? column.columnDef.header
                                : column.id}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Export */}
          {enableExport && (
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              {showExportDropdown && (
                <>
                  {/* Backdrop to close dropdown when clicking outside */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        handleExport("csv");
                        setShowExportDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-bg)]"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        handleExport("json");
                        setShowExportDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-bg)]"
                    >
                      Export as JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {columnFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-[var(--color-text-muted)]">
            Active filters:
          </span>
          {columnFilters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-sm"
            >
              {filter.id}: {String(filter.value)}
              <button
                onClick={() =>
                  table.getColumn(filter.id)?.setFilterValue(undefined)
                }
                className="hover:bg-[var(--color-primary)]/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setColumnFilters([])}
            className="text-sm text-[var(--color-error)] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Row Selection Info */}
      {enableRowSelection && Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-[var(--color-primary)]/10 rounded-lg">
          <Check className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-sm font-medium">
            {Object.keys(rowSelection).filter((k) => rowSelection[k]).length}{" "}
            row(s) selected
          </span>
          <button
            onClick={() => setRowSelection({})}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
        <table className="w-full">
          {/* Header */}
          <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`${paddingClass} text-left text-sm font-medium text-[var(--color-text-muted)] whitespace-nowrap`}
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="space-y-1">
                        {/* Header with sort */}
                        <div
                          className={`flex items-center gap-2 ${
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:text-[var(--color-text)]"
                              : ""
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-[var(--color-text-muted)]">
                              {header.column.getIsSorted() === "asc" ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronsUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Column Filter */}
                        {enableFiltering && header.column.getCanFilter() && (
                          <input
                            type="text"
                            value={
                              (header.column.getFilterValue() as string) ?? ""
                            }
                            onChange={(e) =>
                              header.column.setFilterValue(e.target.value)
                            }
                            placeholder="Filter..."
                            className="w-full px-2 py-1 text-xs border border-[var(--color-border)] rounded bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              // Loading skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]">
                  {finalColumns.map((_, j) => (
                    <td key={j} className={paddingClass}>
                      <div
                        className="h-5 rounded bg-[var(--color-border)] animate-pulse"
                        style={{ width: "80%" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={finalColumns.length}
                  className="p-8 text-center text-[var(--color-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`
                                        border-b border-[var(--color-border)] last:border-0
                                        ${striped && index % 2 === 1 ? "bg-[var(--color-bg)]" : ""}
                                        ${onRowClick ? "cursor-pointer hover:bg-[var(--color-bg-elevated)]" : "hover:bg-[var(--color-bg)]"}
                                        ${row.getIsSelected() ? "bg-[var(--color-primary)]/5" : ""}
                                        transition-colors
                                    `}
                  onClick={() => onRowClick?.(row.original as T)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={paddingClass}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && !loading && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Info */}
          <div className="text-sm text-[var(--color-text-muted)]">
            Showing{" "}
            <span className="font-medium">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                totalItems,
              )}
            </span>{" "}
            of <span className="font-medium">{totalItems}</span> results
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Page Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">
                Per page:
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="select w-auto py-1.5 text-sm"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded hover:bg-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded hover:bg-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 px-2">
                {generatePageNumbers(
                  table.getState().pagination.pageIndex,
                  pageCount,
                ).map((pageNum, idx) =>
                  pageNum === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-[var(--color-text-muted)]"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => table.setPageIndex(pageNum as number)}
                      className={`min-w-[32px] h-8 rounded text-sm font-medium ${
                        table.getState().pagination.pageIndex === pageNum
                          ? "bg-[var(--color-primary)] text-white"
                          : "hover:bg-[var(--color-bg)]"
                      }`}
                    >
                      {(pageNum as number) + 1}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded hover:bg-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded hover:bg-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to generate page numbers with ellipsis
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages: (number | string)[] = [];

  if (currentPage <= 3) {
    pages.push(0, 1, 2, 3, 4, "...", totalPages - 1);
  } else if (currentPage >= totalPages - 4) {
    pages.push(
      0,
      "...",
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
    );
  } else {
    pages.push(
      0,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages - 1,
    );
  }

  return pages;
}

export default AdvancedDataTable;
