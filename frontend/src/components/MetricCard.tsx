import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  amount: string;
  icon: LucideIcon;
  variant?: 'income' | 'expense' | 'neutral' | 'accent';
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  amount,
  icon: Icon,
  variant = 'neutral',
  subtitle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'income':
        return {
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30',
          amountColor: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'expense':
        return {
          iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30',
          amountColor: 'text-rose-600 dark:text-rose-400',
        };
      case 'accent':
        return {
          iconBg: 'bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 border border-accent-200/50 dark:border-accent-800/30',
          amountColor: 'text-accent-600 dark:text-accent-400',
        };
      default:
        return {
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60',
          amountColor: 'text-slate-900 dark:text-white',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className={`text-2xl font-bold tracking-tight ${styles.amountColor}`}>
          {amount}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

