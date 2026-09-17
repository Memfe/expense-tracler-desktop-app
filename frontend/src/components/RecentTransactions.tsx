import React from 'react';
import { models } from '../../wailsjs/go/models';
import { useTheme } from '../context/ThemeContext';
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: models.TransactionResponse[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const { formatCurrency } = useTheme();

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Activity
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Latest activity in the selected period
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
          <ReceiptText className="w-9 h-9 stroke-1 opacity-60" />
          <p className="text-sm font-medium">No transactions in this period</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {transactions.map((tx) => {
            const isIncome = tx.category_type === 'income';
            return (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
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

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {tx.description}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tx.category_name}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {tx.transaction_date.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-bold tracking-tight ${
                      isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

