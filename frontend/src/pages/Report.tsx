import React, { useCallback, useEffect, useState } from 'react';
import { models } from '../../wailsjs/go/models';
import {
  GetDashboardData,
  PickReportDestination,
  GenerateReport,
} from '../../wailsjs/go/main/App';
import { useTheme } from '../context/ThemeContext';
import { PeriodSelector } from '../components/PeriodSelector';
import {
  isPeriodOptionId,
  PeriodOptionId,
  PeriodPreset,
  resolvePeriodRange,
} from '../utils/period';
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Download,
  Calendar,
} from 'lucide-react';

export const Report: React.FC = () => {
  const { formatCurrency, defaultPeriod } = useTheme();

  const initialPreset: PeriodOptionId = isPeriodOptionId(defaultPeriod)
    ? defaultPeriod
    : 'this-month';

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(initialPreset);
  const [range, setRange] = useState(() => resolvePeriodRange(initialPreset));
  const [data, setData] = useState<models.DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  const { start, end } = range;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dashboardData = await GetDashboardData(start, end);
      setData(dashboardData);
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setError(err?.message || 'Failed to load report data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodChange = (preset: PeriodPreset, newStart: string, newEnd: string) => {
    setPeriodPreset(preset);
    setRange({ start: newStart, end: newEnd });
  };

  const handleExport = async () => {
    try {
      const destPath = await PickReportDestination();
      if (destPath === '') {
        return;
      }

      setGenerating(true);
      try {
        await GenerateReport(start, end, destPath);
        setError(null);
        alert('Report generated successfully!');
      } catch (err: any) {
        console.error('Failed to generate report:', err);
        setError(err?.message || 'Failed to generate report');
      } finally {
        setGenerating(false);
      }
    } catch (err) {
      console.error('Failed to open save dialog:', err);
      setError('Failed to open save dialog');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Report
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Generate a PDF report of your income and expenses
        </p>
      </div>

      <PeriodSelector
        currentPeriod={periodPreset}
        onPeriodChange={handlePeriodChange}
        startDate={start}
        endDate={end}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent-500 border-t-transparent"></div>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Income</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.total_income)}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(data.total_expense)}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-2 rounded-xl ${data.net_balance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Balance</span>
              </div>
              <p className={`text-2xl font-bold ${data.net_balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(data.net_balance)}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export to PDF
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report period</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {start} to {end}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
