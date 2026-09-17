import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { PERIOD_OPTIONS, PeriodPreset, resolvePeriodRange } from '../utils/period';

interface PeriodSelectorProps {
  currentPeriod: PeriodPreset;
  onPeriodChange: (preset: PeriodPreset, startDate: string, endDate: string) => void;
  startDate: string;
  endDate: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  currentPeriod,
  onPeriodChange,
  startDate,
  endDate,
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  // Keep the custom inputs in sync with the range that is currently applied.
  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  const handleSelectPreset = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      setIsCustomOpen((open) => !open);
      return;
    }

    setIsCustomOpen(false);
    const { start, end } = resolvePeriodRange(preset);
    onPeriodChange(preset, start, end);
  };

  const isCustomRangeInvalid = Boolean(
    customStart && customEnd && customStart > customEnd
  );

  const handleApplyCustom = () => {
    if (!customStart || !customEnd || isCustomRangeInvalid) {
      return;
    }

    onPeriodChange('custom', customStart, customEnd);
    setIsCustomOpen(false);
  };

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Preset Pills */}
      <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
        {PERIOD_OPTIONS.map((option) => {
          const isActive = currentPeriod === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleSelectPreset(option.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-accent-600 dark:text-accent-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {option.shortLabel}
            </button>
          );
        })}

        <button
          onClick={() => handleSelectPreset('custom')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
            currentPeriod === 'custom'
              ? 'bg-white dark:bg-slate-900 text-accent-600 dark:text-accent-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Date Range Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
        <CalendarIcon className="w-3.5 h-3.5 text-accent-500" />
        <span>
          {startDate} to {endDate}
        </span>
      </div>

      {/* Custom Date Popover */}
      {isCustomOpen && (
        <div className="absolute right-0 top-12 z-20 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl w-72 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Select Custom Date Range
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {isCustomRangeInvalid && (
            <p className="text-[11px] font-medium text-rose-500">
              The start date must be before the end date.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsCustomOpen(false)}
              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustom}
              disabled={isCustomRangeInvalid}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-accent-500 hover:bg-accent-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};