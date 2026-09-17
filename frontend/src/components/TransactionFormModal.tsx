import React, { useEffect, useRef, useState } from 'react';
import { models } from '../../wailsjs/go/models';
import { CreateCategory, CreateTransaction, EditTransaction, GetAllCategories } from '../../wailsjs/go/main/App';
import { Modal } from './Modal';
import { AlertCircle, Plus } from 'lucide-react';

interface TransactionFormModalProps {
  open: boolean;
  /** null creates a new transaction, otherwise the row being edited. */
  transaction: models.TransactionResponse | null;
  categories: models.CategoryResponse[];
  onClose: () => void;
  onSaved: () => void;
  /** Refreshes the category list in the parent after an inline add. */
  onCategoriesChanged?: (categories: models.CategoryResponse[]) => void;
}

const labelClass = 'text-xs font-semibold text-slate-700 dark:text-slate-300';
const inputClass =
  'w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-60';

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  open,
  transaction,
  categories,
  onClose,
  onSaved,
  onCategoriesChanged,
}) => {
  const isEditing = Boolean(transaction);

  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Inline "add category" sub-form state (create flow only).
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [catSaving, setCatSaving] = useState<boolean>(false);
  const [catError, setCatError] = useState<string | null>(null);
  const newCatInputRef = useRef<HTMLInputElement | null>(null);

  // Reload the form fields every time the dialog opens.
  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setSaving(false);
    setShowAddCategory(false);
    setNewCatName('');
    setNewCatType('expense');
    setCatError(null);
    setCatSaving(false);

    if (transaction) {
      setCategoryId(String(transaction.category_id));
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
    } else {
      setCategoryId('');
      setDescription('');
      setAmount('');
    }
  }, [open, transaction]);

  // Focus the inline name input when the sub-form opens.
  useEffect(() => {
    if (showAddCategory) {
      newCatInputRef.current?.focus();
    }
  }, [showAddCategory]);

  const handleAddCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newCatName.trim();
    if (trimmed.length < 2) {
      setCatError('Category name must be at least 2 characters long');
      return;
    }
    setCatSaving(true);
    setCatError(null);
    try {
      await CreateCategory({ name: trimmed, type: newCatType });
      const list = await GetAllCategories();
      onCategoriesChanged?.(list ?? []);
      // Auto-select the newly created category (match by name, case-insensitive).
      const created = (list ?? []).find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.type === newCatType
      );
      if (created) {
        setCategoryId(String(created.id));
      }
      setShowAddCategory(false);
      setNewCatName('');
      setCatError(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to create the category';
      setCatError(
        message.includes('UNIQUE')
          ? `A category called "${trimmed}" already exists`
          : message
      );
    } finally {
      setCatSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedDescription = description.trim();
    const parsedAmount = Number(amount);

    if (!isEditing && !categoryId) {
      setError('Select a category for this transaction');
      return;
    }
    if (trimmedDescription.length < 2) {
      setError('Description must be at least 2 characters long');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (transaction) {
        await EditTransaction({
          id: transaction.id,
          description: trimmedDescription,
          amount: parsedAmount,
        });
      } else {
        await CreateTransaction({
          category_id: Number(categoryId),
          description: trimmedDescription,
          amount: parsedAmount,
        });
      }
      onSaved();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      setError(err?.message || 'Failed to save the transaction');
    } finally {
      setSaving(false);
    }
  };

  const incomeCategories = categories.filter((category) => category.type === 'income');
  const expenseCategories = categories.filter((category) => category.type === 'expense');

  return (
    <Modal
      open={open}
      title={isEditing ? 'Edit transaction' : 'New transaction'}
      subtitle={
        isEditing
          ? 'Update the description or amount'
          : 'Pick the category and amount'
      }
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
            form="transaction-form"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add transaction'}
          </button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className={labelClass}>Category</label>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setCatError(null);
                  setShowAddCategory((v) => !v);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-accent-600 dark:text-accent-400 hover:underline"
              >
                <Plus className="w-3 h-3" />
                {showAddCategory ? 'Hide' : 'Add category'}
              </button>
            )}
          </div>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={isEditing}
            className={inputClass}
          >
            <option value="">Select a category...</option>
            {incomeCategories.length > 0 && (
              <optgroup label="Income">
                {incomeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
            {expenseCategories.length > 0 && (
              <optgroup label="Expense">
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {isEditing && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              The category of an existing transaction cannot be changed.
            </p>
          )}
          {!isEditing && showAddCategory && (
            <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                New category
              </p>
              <input
                ref={newCatInputRef}
                type="text"
                value={newCatName}
                onChange={(event) => setNewCatName(event.target.value)}
                placeholder="e.g. School fees"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newCatType}
                  onChange={(event) => setNewCatType(event.target.value === 'income' ? 'income' : 'expense')}
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={catSaving}
                  className="px-3.5 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {catSaving ? 'Adding...' : 'Add'}
                </button>
              </div>
              {catError && (
                <p className="text-[11px] font-medium text-rose-500">{catError}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. September school fees"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
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

export default TransactionFormModal;