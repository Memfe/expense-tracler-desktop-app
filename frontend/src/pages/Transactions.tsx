import React, { useCallback, useEffect, useState } from 'react';
import { models } from '../../wailsjs/go/models';
import {  GetAllCategories,
  GetAllTransactions,
  GetTransactionsByCategoryID,
  GetTransactionsByCategoryType,
  GetTransactionsByDateRange,
  ExportTransactionsCSV,
} from '../../wailsjs/go/main/App';
import { useTheme } from '../context/ThemeContext';
import { PeriodSelector } from '../components/PeriodSelector';
import { TransactionFormModal } from '../components/TransactionFormModal';
import {
  isPeriodOptionId,
  PeriodOptionId,
  PeriodPreset,
  resolvePeriodRange,
} from '../utils/period';
import { Tab } from '../utils/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,} from 'lucide-react';

type TypeFilter = 'all' | 'income' | 'expense';

const PAGE_SIZE = 10;

interface TransactionsProps {
  onNavigate: (tab: Tab) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ onNavigate }) => {
  const { formatCurrency, defaultPeriod } = useTheme();

  const initialPreset: PeriodOptionId = isPeriodOptionId(defaultPeriod)
    ? defaultPeriod
    : 'this-month';

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(initialPreset);
  const [range, setRange] = useState(() => resolvePeriodRange(initialPreset));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  const [categories, setCategories] = useState<models.CategoryResponse[]>([]);
  const [data, setData] = useState<models.PaginatedTransactions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<models.TransactionResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);

  const { start, end } = range;

  // Categories feed both the filter dropdown and the create form.
  const loadCategories = useCallback(async () => {
    try {
      setCategories(await GetAllCategories());
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Refresh categories when a new one is created from the transaction form.
  const handleCategoriesChanged = useCallback(async () => {
    try {
      setCategories(await GetAllCategories());
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  }, []);

  // The backend exposes the date range, the type and the category as separate
  // queries, plus a global search. Searching replaces the period; a
  // type/category filter replaces both the period and the search.
  const filtersReplaceRange = appliedSearch !== '' || typeFilter !== 'all' || categoryFilter !== 'all';

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result: models.PaginatedTransactions;

      if (appliedSearch !== '') {
        result = await GetAllTransactions(page, PAGE_SIZE, appliedSearch);
      } else if (typeFilter !== 'all') {
        result = await GetTransactionsByCategoryType(typeFilter, page, PAGE_SIZE);
      } else if (categoryFilter !== 'all') {
        result = await GetTransactionsByCategoryID(Number(categoryFilter), page, PAGE_SIZE);
      } else {
        result = await GetTransactionsByDateRange(start, end, page, PAGE_SIZE);
      }

      setData(result);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err?.message || 'Failed to load transactions');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, typeFilter, categoryFilter, start, end, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const rows = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + rows.length;

  const handlePeriodChange = (preset: PeriodPreset, newStart: string, newEnd: string) => {
    setPeriodPreset(preset);
    setRange({ start: newStart, end: newEnd });
    setPage(1);
  };

  const handleTypeFilter = (value: TypeFilter) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const submitSearch = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (transaction: models.TransactionResponse) => {
    setEditing(transaction);
    setFormOpen(true);
  };

  const handleSaved = async () => {
    setFormOpen(false);
    setNotice(editing ? 'Transaction updated' : 'Transaction added');
    window.setTimeout(() => setNotice(null), 2500);
    await loadCategories();
    await loadTransactions();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await ExportTransactionsCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('Transactions exported as CSV');
      window.setTimeout(() => setNotice(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Record income and expenses, then review them by period, type or category
          </p>
        </div>

        <div className="flex items-center gap-3">
          {notice && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40 animate-in fade-in duration-200">
              {notice}
            </div>
          )}

          <button
            onClick={loadTransactions}
            disabled={loading}
            title="Refresh list"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-500' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            title="Download every transaction as CSV"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={openCreate}
            disabled={categories.length === 0}
            title={
              categories.length === 0
                ? 'Create a category before adding a transaction'
                : 'Add a transaction'
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitSearch();
                }}
                placeholder="Search descriptions or categories..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <button
              onClick={submitSearch}
              className="px-3.5 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white transition-colors"
            >
              Search
            </button>
            {appliedSearch !== '' && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <PeriodSelector
          currentPeriod={periodPreset}
          onPeriodChange={handlePeriodChange}
          startDate={start}
          endDate={end}
        />

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            {(
              [
                { value: 'all' as TypeFilter, label: 'All types' },
                { value: 'income' as TypeFilter, label: 'Income' },
                { value: 'expense' as TypeFilter, label: 'Expenses' },
              ]
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => handleTypeFilter(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  typeFilter === option.value
                    ? 'bg-white dark:bg-slate-900 text-accent-600 dark:text-accent-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => handleCategoryFilter(event.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.type})
              </option>
            ))}
          </select>

          {filtersReplaceRange && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Search, type and category filters list every matching transaction, so the selected period is
              not applied.
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Result list */}
      <div
        className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-opacity duration-200 ${
          loading ? 'opacity-60' : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transaction history</h3>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {total === 0 ? 'No records' : `Showing ${firstRow}-${lastRow} of ${total}`}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
            <ReceiptText className="w-10 h-10 stroke-1 opacity-60" />
            {categories.length === 0 ? (
              <>
                <p className="text-sm font-medium">Create a category to start recording</p>
                <button
                  onClick={() => onNavigate('categories')}
                  className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white transition-colors"
                >
                  Go to Categories
                </button>
              </>
            ) : (
              <p className="text-sm font-medium">
                {loading ? 'Loading transactions...' : 'No transactions match these filters'}
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.map((transaction) => {
              const isIncome = transaction.category_type === 'income';

              return (
                <div
                  key={transaction.id}
                  className="py-3.5 px-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                        isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {transaction.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {transaction.category_name}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {transaction.transaction_date.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-bold tracking-tight ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>

                    <button
                      onClick={() => openEdit(transaction)}
                      title="Edit transaction"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <TransactionFormModal
        open={formOpen}
        transaction={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onCategoriesChanged={handleCategoriesChanged}
      />
    </div>
  );
};

export default Transactions;
