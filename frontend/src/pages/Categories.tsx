import React, { useCallback, useEffect, useState } from 'react';
import { models } from '../../wailsjs/go/models';
import { DeleteCategory, GetAllCategories, GetCategoryUsageCount } from '../../wailsjs/go/main/App';
import { CategoryFormModal } from '../components/CategoryFormModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
  Trash,
} from 'lucide-react';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<models.CategoryResponse[]>([]);
  const [usageCounts, setUsageCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<models.CategoryResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await GetAllCategories();
      setCategories(list ?? []);
      // Load usage counts for all categories
      const counts = new Map<number, number>();
      for (const cat of list ?? []) {
        try {
          const count = await GetCategoryUsageCount(cat.id);
          counts.set(cat.id, count);
        } catch (err) {
          console.error('Failed to get usage count for category', cat.id, err);
          counts.set(cat.id, 0);
        }
      }
      setUsageCounts(counts);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err?.message || 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incomeCategories = categories.filter((category) => category.type === 'income');
  const expenseCategories = categories.filter((category) => category.type === 'expense');

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (category: models.CategoryResponse) => {
    setEditing(category);
    setFormOpen(true);
  };

  const handleSaved = async () => {
    setFormOpen(false);
    setNotice(editing ? 'Category updated' : 'Category added');
    window.setTimeout(() => setNotice(null), 2500);
    await load();
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    setDeletingId(null);
    setDeleteConfirm(false);
    
    try {
      await DeleteCategory(deletingId);
      await load();
      setNotice('Category deleted');
      window.setTimeout(() => setNotice(null), 2500);
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      setError(err?.message || 'Failed to delete category');
    }
  };

  const confirmDelete = (category: models.CategoryResponse) => {
    const count = usageCounts.get(category.id) || 0;
    if (count > 0) {
      setError(`Cannot delete "${category.name}": it has ${count} transaction${count === 1 ? '' : 's'}`);
      return;
    }
    setDeletingId(category.id);
    setDeleteConfirm(true);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Categories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Keep income and expenses grouped so the dashboard totals stay accurate
          </p>
        </div>

        <div className="flex items-center gap-3">
          {notice && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40 animate-in fade-in duration-200">
              {notice}
            </div>
          )}

          <button
            onClick={load}
            disabled={loading}
            title="Refresh categories"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-500' : ''}`} />
          </button>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New category
          </button>
        </div>

        {/* Delete confirmation dialog */}
        {deleteConfirm && deletingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <Trash className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete category?</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Are you sure you want to delete this category? It will be permanently removed.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setDeleteConfirm(false); setDeletingId(null); }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block">Total categories</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {categories.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block">Income categories</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {incomeCategories.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 block">Expense categories</span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {expenseCategories.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <Tags className="w-10 h-10 stroke-1 opacity-60" />
          <p className="text-sm font-medium">No categories yet</p>
          <p className="text-xs">Create categories before recording any transaction</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white transition-colors"
          >
            Create your first category
          </button>
        </div>
      )}

      {categories.length > 0 && (
        <div className="space-y-6">
          <CategorySection
            title="Expense categories"
            subtitle="Money going out"
            tone="expense"
            categories={expenseCategories}
            onEdit={openEdit}
            onDelete={confirmDelete}
            usageCounts={usageCounts}
          />
          <CategorySection
            title="Income categories"
            subtitle="Money coming in"
            tone="income"
            categories={incomeCategories}
            onEdit={openEdit}
            onDelete={confirmDelete}
            usageCounts={usageCounts}
          />
        </div>
      )}

      <CategoryFormModal
        open={formOpen}
        category={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  subtitle: string;
  tone: 'income' | 'expense';
  categories: models.CategoryResponse[];
  onEdit: (category: models.CategoryResponse) => void;
  onDelete: (category: models.CategoryResponse) => void;
  usageCounts: Map<number, number>;
}

/** Card grid listing every category of a single type. */
const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  subtitle,
  tone,
  categories,
  onEdit,
  onDelete,
  usageCounts,
}) => {
  const isIncome = tone === 'income';

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div
          className={`p-2 rounded-xl ${
            isIncome
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
          }`}
        >
          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
          No {tone} categories yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {categories.map((category) => {
            return (
              <div
                key={category.id}
                className="p-1.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start justify-between gap-1"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {category.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-1 py-0 rounded ${
                        isIncome
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {category.type}
                    </span>
                  </div>
                  {usageCounts.get(category.id) !== undefined && usageCounts.get(category.id) !== 0 && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {usageCounts.get(category.id)} transaction{usageCounts.get(category.id) === 1 ? '' : 's'}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onEdit(category)}
                    title="Edit category"
                    className="shrink-0 p-0.5 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(category)}
                    title="Delete category"
                    className="shrink-0 p-0.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Categories;
