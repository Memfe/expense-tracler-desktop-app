import React, { useState } from 'react';
import { models } from '../../wailsjs/go/models';
import { useTheme } from '../context/ThemeContext';
import { PieChart, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CategoryChartProps {
  data: models.CategoryBreakdownResponse[];
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  const { formatCurrency } = useTheme();
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter items for active type and positive totals
  const items = data
    .filter((d) => d.category_type === activeType && d.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalSum = items.reduce((acc, curr) => acc + curr.total, 0);

  // Color palette for slices
  const sliceColors = [
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#84cc16', // lime
  ];

  // Calculate SVG donut slice paths
  let cumulativeAngle = 0;
  const radius = 64;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 24;

  const slices = items.map((item, idx) => {
    const fraction = totalSum > 0 ? item.total / totalSum : 0;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // Convert angles to radians
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    // Circumference / stroke dash approach for donut
    const pathData =
      items.length === 1
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.001} ${cy - radius}`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return {
      ...item,
      color: sliceColors[idx % sliceColors.length],
      pathData,
      percentage: (fraction * 100).toFixed(1),
    };
  });

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
      {/* Header with Type Switcher */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Category Breakdown
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Distribution for selected date range
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveType('expense')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeType === 'expense'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Expenses
          </button>
          <button
            onClick={() => setActiveType('income')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeType === 'income'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Income
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
          <PieChart className="w-10 h-10 stroke-1 opacity-60" />
          <p className="text-sm font-medium">No {activeType} transactions in this period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 160 160" className="w-48 h-48 transform -rotate-0">
              {slices.map((slice, idx) => (
                <path
                  key={slice.category_id}
                  d={slice.pathData}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="transition-all duration-200 cursor-pointer opacity-90 hover:opacity-100"
                />
              ))}
            </svg>

            {/* Centered Total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {hoveredIdx !== null ? slices[hoveredIdx].category_name : 'Total'}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {hoveredIdx !== null
                  ? formatCurrency(slices[hoveredIdx].total)
                  : formatCurrency(totalSum)}
              </span>
              {hoveredIdx !== null && (
                <span className="text-[10px] font-medium text-slate-400">
                  {slices[hoveredIdx].percentage}%
                </span>
              )}
            </div>
          </div>

          {/* Category Progress List */}
          <div className="md:col-span-7 space-y-3 max-h-64 overflow-y-auto pr-1">
            {slices.map((slice, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={slice.category_id}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-slate-50 dark:bg-slate-800/80 shadow-sm'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      ></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {slice.category_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({slice.transaction_count} txs)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(slice.total)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium w-9 text-right">
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${slice.percentage}%`,
                        backgroundColor: slice.color,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

