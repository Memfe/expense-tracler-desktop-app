import React, { useEffect, useState } from 'react';
import { models } from '../../wailsjs/go/models';
import { CreateCategory, EditCategory } from '../../wailsjs/go/main/App';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

interface CategoryFormModalProps {
  open: boolean;
  /** null creates a new category, otherwise the category being edited. */
  category: models.CategoryResponse | null;
  onClose: () => void;
  onSaved: () => void;
}

const labelClass = 'text-xs font-semibold text-slate-700 dark:text-slate-300';
const inputClass =
  'w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500';

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  category,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(category);

  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setSaving(false);

    if (category) {
      setName(category.name);
      setType(category.type === 'income' ? 'income' : 'expense');
    } else {
      setName('');
      setType('expense');
    }
  }, [open, category]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Category name must be at least 2 characters long');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (category) {
        await EditCategory({ id: category.id, name: trimmedName, type });
      } else {
        await CreateCategory({ name: trimmedName, type });
      }
      onSaved();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      const message = err?.message || 'Failed to save the category';
      setError(
        message.includes('UNIQUE')
          ? `A category called "${trimmedName}" already exists`
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? 'Edit category' : 'New category'}
      subtitle="Categories decide whether a transaction counts as income or expense"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="category-form"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add category'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. School fees"
            className={inputClass}
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Names must be unique across all categories.
          </p>
        </div>

        <div>
          <label className={labelClass}>Type</label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value === 'income' ? 'income' : 'expense')}
            className={inputClass}
          >
            <option value="expense">Expense - money going out</option>
            <option value="income">Income - money coming in</option>
          </select>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CategoryFormModal;