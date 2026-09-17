import React, { useCallback, useEffect, useState } from 'react';
import { GetDashboardData } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';
import { useTheme } from '../context/ThemeContext';
import { MetricCard } from '../components/MetricCard';
import { CategoryChart } from '../components/CategoryChart';
import { RecentTransactions } from '../components/RecentTransactions';
import { PeriodSelector } from '../components/PeriodSelector';
import {
  isPeriodOptionId,
  PeriodOptionId,
  PeriodPreset,
  resolvePeriodRange,
} from '../utils/period';
import { TrendingUp, TrendingDown, Wallet, Percent, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { formatCurrency, defaultPeriod } = useTheme();

  // The period stored in the settings page decides which range we start with.
  const initialPreset: PeriodOptionId = isPeriodOptionId(defaultPeriod)
    ? defaultPeriod
    : 'this-week';

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(initialPreset);
  const [range, setRange] = useState(() => resolvePeriodRange(initialPreset));

  const [dashboardData, setDashboardData] = useState<models.DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { start, end } = range;

  const loadData = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);
    try {
      setDashboardData(await GetDashboardData(startDate, endDate));
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Failed to load dashboard data');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(start, end);
  }, [loadData, start, end]);

  const handlePeriodChange = (preset: PeriodPreset, newStart: string, newEnd: string) => {
    setPeriodPreset(preset);
    setRange({ start: newStart, end: newEnd });
  };

  const income = dashboardData?.total_income ?? 0;
  const expense = dashboardData?.total_expense ?? 0;
  const balance = dashboardData?.net_balance ?? 0;
  const savingsRate =
    income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Summary of your income, expenses, and category metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PeriodSelector
            currentPeriod={periodPreset}
            onPeriodChange={handlePeriodChange}
            startDate={start}
            endDate={end}
          />
          <button
            onClick={() => loadData(start, end)}
            disabled={loading}
            title="Refresh Data"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-500' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 transition-opacity duration-200 ${
          loading ? 'opacity-60' : 'opacity-100'
        }`}
      >
        <MetricCard
          title="Total Income"
          amount={formatCurrency(income)}
          icon={TrendingUp}
          variant="income"
          subtitle="Earnings in this period"
        />
        <MetricCard
          title="Total Expenses"
          amount={formatCurrency(expense)}
          icon={TrendingDown}
          variant="expense"
          subtitle="Outflows in this period"
        />
        <MetricCard
          title="Net Balance"
          amount={formatCurrency(balance)}
          icon={Wallet}
          variant="accent"
          subtitle={balance >= 0 ? 'Surplus / Savings' : 'Deficit'}
        />
        <MetricCard
          title="Savings Rate"
          amount={`${savingsRate}%`}
          icon={Percent}
          variant="neutral"
          subtitle={income > 0 ? `${savingsRate}% of income saved` : 'No income recorded'}
        />
      </div>

      {/* Analytics Section: Category Breakdown + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <CategoryChart data={dashboardData?.category_breakdown ?? []} />
        </div>
        <div className="lg:col-span-5">
          <RecentTransactions transactions={dashboardData?.recent_transactions ?? []} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;