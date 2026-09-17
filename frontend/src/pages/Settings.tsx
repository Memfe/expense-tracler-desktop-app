import React, { useCallback, useEffect, useState } from 'react';
import {
  useTheme,
  ThemeMode,
  AccentColor,
  DefaultPeriod,
  CURRENCY_OPTIONS,
} from '../context/ThemeContext';
import {
  BackupDatabase,
  GetSystemInfo,
  PickBackupDestination,
  PickBackupSource,
  ResetAllData,
  RestoreBackup,
} from '../../wailsjs/go/main/App';
import { WindowReload } from '../../wailsjs/runtime/runtime';
import { models } from '../../wailsjs/go/models';
import { PERIOD_OPTIONS } from '../utils/period';
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  Calendar,
  Coins,
  Database,
  DatabaseBackup,
  Check,
  CheckCircle2,
  Sliders,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Download,
  Upload,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

type Feedback = { kind: 'success' | 'error'; message: string };

const THEME_OPTIONS: {
  id: ThemeMode;
  title: string;
  description: string;
  Icon: LucideIcon;
  iconWrapper: string;
}[] = [
  {
    id: 'light',
    title: 'Light Mode',
    description: 'Crisp, clean white interface',
    Icon: Sun,
    iconWrapper: 'bg-white border border-slate-200 text-amber-500',
  },
  {
    id: 'dark',
    title: 'Dark Mode',
    description: 'Easy on eyes for nighttime',
    Icon: Moon,
    iconWrapper: 'bg-slate-950 border border-slate-800 text-indigo-400',
  },
  {
    id: 'system',
    title: 'System Sync',
    description: 'Follows the desktop OS theme live',
    Icon: Laptop,
    iconWrapper: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  },
];

const ACCENT_OPTIONS: { id: AccentColor; color: string }[] = [
  { id: 'amber', color: 'bg-amber-500' },
  { id: 'emerald', color: 'bg-emerald-500' },
  { id: 'indigo', color: 'bg-indigo-500' },
  { id: 'violet', color: 'bg-violet-500' },
  { id: 'rose', color: 'bg-rose-500' },
  { id: 'blue', color: 'bg-blue-500' },
];

export const Settings: React.FC = () => {
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    defaultPeriod,
    setDefaultPeriod,
    currency,
    setCurrency,
    resetSettings,
  } = useTheme();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [systemInfo, setSystemInfo] = useState<models.SystemInfo | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restorePick, setRestorePick] = useState<{ path: string; name: string } | null>(null);
  const [eraseBusy, setEraseBusy] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState(false);

  const showFeedback = useCallback((kind: Feedback['kind'], message: string) => {
    setFeedback({ kind, message });
    window.setTimeout(() => setFeedback(null), 2500);
  }, []);

  // The database card is fed by the backend so it always shows real values.
  const loadSystemInfo = useCallback(async () => {
    try {
      setSystemInfo(await GetSystemInfo());
    } catch (err) {
      console.error('Failed to load system information:', err);
      setSystemInfo(null);
    }
  }, []);

  useEffect(() => {
    loadSystemInfo();
  }, [loadSystemInfo]);

  const handleThemeChange = async (newTheme: ThemeMode) => {
    await setTheme(newTheme);
    showFeedback('success', `Theme changed to ${newTheme}`);
  };

  const handleAccentChange = async (newAccent: AccentColor) => {
    await setAccent(newAccent);
    showFeedback('success', `Accent colour changed to ${newAccent}`);
  };

  const handlePeriodChange = async (newPeriod: DefaultPeriod) => {
    await setDefaultPeriod(newPeriod);
    showFeedback('success', 'Default dashboard period updated');
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    await setCurrency(newCurrency);
    showFeedback('success', `Currency set to ${newCurrency}`);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSettings();
      showFeedback('success', 'All settings restored to defaults');
    } catch (err: any) {
      console.error('Failed to reset settings:', err);
      showFeedback('error', err?.message || 'Failed to reset settings');
    } finally {
      setIsResetting(false);
      await loadSystemInfo();
    }
  };

  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      const dest = await PickBackupDestination();
      if (!dest) {
        return; // the user closed the dialog
      }
      await BackupDatabase(dest);
      showFeedback('success', `Backup saved: ${dest.split('/').pop() ?? dest}`);
    } catch (err: any) {
      console.error('Failed to create the backup:', err);
      showFeedback('error', err?.message || 'Failed to create the backup');
    } finally {
      setBackupBusy(false);
    }
  };

  const handlePickRestore = async () => {
    try {
      const src = await PickBackupSource();
      if (!src) {
        return; // the user closed the dialog
      }
      setRestorePick({ path: src, name: src.split('/').pop() ?? src });
    } catch (err: any) {
      console.error('Failed to open the file dialog:', err);
      showFeedback('error', err?.message || 'Failed to open the file dialog');
    }
  };

  const handleRestore = async () => {
    if (!restorePick) {
      return;
    }
    setRestoreBusy(true);
    try {
      await RestoreBackup(restorePick.path);
      showFeedback('success', 'Backup restored. Reloading the app...');
      window.setTimeout(() => WindowReload(), 800);
    } catch (err: any) {
      console.error('Failed to restore the backup:', err);
      showFeedback('error', err?.message || 'Failed to restore the backup');
      setRestoreBusy(false);
      setRestorePick(null);
    }
  };

  const handleEraseData = async () => {
    if (!eraseConfirm) {
      // Two-step confirmation: the first click arms the button.
      setEraseConfirm(true);
      window.setTimeout(() => setEraseConfirm(false), 5000);
      return;
    }
    setEraseBusy(true);
    try {
      await ResetAllData();
      showFeedback('success', 'All data erased. Reloading the app...');
      window.setTimeout(() => WindowReload(), 800);
    } catch (err: any) {
      console.error('Failed to erase the data:', err);
      showFeedback('error', err?.message || 'Failed to erase the data');
      setEraseConfirm(false);
    } finally {
      setEraseBusy(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Application Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize appearance, theme, and financial display preferences
          </p>
        </div>

        {/* Saved Status Notification */}
        {feedback && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border animate-in fade-in duration-200 ${
              feedback.kind === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
            }`}
          >
            {feedback.kind === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {feedback.message}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* SECTION 1: Theme Mode */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Appearance & Theme
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Choose light, dark, or sync with your operating system
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {THEME_OPTIONS.map(({ id, title, description, Icon, iconWrapper }) => {
              const isSelected = theme === id;
              return (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-accent-500 bg-accent-50/40 dark:bg-accent-950/20 ring-2 ring-accent-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-xl shadow-sm ${iconWrapper}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Accent Color */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Accent Highlight Color
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Primary color for buttons, badges, charts, and brand accents
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
            {ACCENT_OPTIONS.map((option) => {
              const isSelected = accent === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleAccentChange(option.id)}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-accent-500 bg-accent-50/40 dark:bg-accent-950/20 ring-2 ring-accent-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center shadow-md`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                    {option.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Preferences (Default Period & Currency) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Financial Preferences
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Default startup period and currency symbol
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* Default Period */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent-500" />
                Default Dashboard Timeframe
              </label>
              <select
                value={defaultPeriod}
                onChange={(e) => handlePeriodChange(e.target.value as DefaultPeriod)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Today, this week, this month or the last 6 months. Used as the starting
                range every time the dashboard opens.
              </p>
            </div>

            {/* Currency Symbol */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-accent-500" />
                Currency Display
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Amounts are stored in GH₵ pesewas and only the display changes.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Database & System Information */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Database Information
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Embedded local SQLite engine
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Database Path</span>
              <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 break-all">
                {systemInfo?.database_path ?? '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Engine</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {systemInfo?.engine ?? '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Runtime</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    systemInfo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                ></span>
                {systemInfo?.runtime ?? 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Categories</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {systemInfo?.categories_count ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Transactions</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {systemInfo?.transactions_count ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Stored Settings</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {systemInfo?.settings_count ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Migrations Applied</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {systemInfo?.migrations?.length ?? 0}
              </span>
            </div>
          </div>

          {systemInfo && systemInfo.migrations.length > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono pt-1 break-all">
              Latest migration: {systemInfo.migrations[systemInfo.migrations.length - 1]}
            </p>
          )}
        </div>

        {/* SECTION 5: Data & Backups */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400">
              <DatabaseBackup className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Data &amp; Backups
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Save a single-file copy of the database, restore it later, or erase everything
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleBackup}
              disabled={backupBusy}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${backupBusy ? 'animate-bounce' : ''}`} />
              {backupBusy ? 'Creating backup...' : 'Create backup'}
            </button>
            <button
              onClick={handlePickRestore}
              disabled={restoreBusy || restorePick !== null}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore from backup
            </button>
          </div>

          {restorePick && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Replace ALL current data with the backup "{restorePick.name}"? This cannot be
                undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRestorePick(null)}
                  disabled={restoreBusy}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoreBusy}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {restoreBusy ? 'Restoring...' : 'Restore now'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
              Erase every transaction, category and setting and start completely empty. The
              database schema is kept, so the app keeps working right away.
            </p>
            <button
              onClick={handleEraseData}
              disabled={eraseBusy}
              className={`mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 ${
                eraseConfirm
                  ? 'bg-rose-500 border-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${eraseBusy ? 'animate-pulse' : ''}`} />
              {eraseBusy
                ? 'Erasing...'
                : eraseConfirm
                  ? 'Are you sure? Click again to erase everything'
                  : 'Reset all data'}
            </button>
          </div>
        </div>

        {/* SECTION 6: Maintenance */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Maintenance</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Restore the default theme, accent, period and currency
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Restoring defaults...' : 'Restore default preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
