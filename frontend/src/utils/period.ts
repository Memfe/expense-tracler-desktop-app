/**
 * Single source of truth for the dashboard period presets. Both the dashboard
 * page, its period selector and the settings page use these helpers so the
 * stored "default period" setting always matches the UI.
 */

export type PeriodOptionId = 'today' | 'this-week' | 'this-month' | 'last-6-months';

export type PeriodPreset = PeriodOptionId | 'custom';

export interface PeriodRange {
  start: string;
  end: string;
}

export interface PeriodOption {
  id: PeriodOptionId;
  label: string;
  shortLabel: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today' },
  { id: 'this-week', label: 'This Week (Monday - Sunday)', shortLabel: 'This Week' },
  { id: 'this-month', label: 'This Month', shortLabel: 'This Month' },
  { id: 'last-6-months', label: 'Last 6 Months', shortLabel: 'Last 6 Months' },
];

export const DEFAULT_PERIOD: PeriodOptionId = 'this-week';

const pad = (value: number): string => value.toString().padStart(2, '0');

export const toDateString = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Narrows an arbitrary string (e.g. a stored setting) to a known preset. */
export const isPeriodOptionId = (value: string): value is PeriodOptionId =>
  PERIOD_OPTIONS.some((option) => option.id === value);

/** Resolves a preset into an inclusive start/end date range. */
export const resolvePeriodRange = (
  preset: PeriodOptionId,
  reference: Date = new Date()
): PeriodRange => {
  const year = reference.getFullYear();
  const month = reference.getMonth();

  switch (preset) {
    case 'today': {
      const today = toDateString(reference);
      return { start: today, end: today };
    }
    case 'this-month':
      return {
        start: toDateString(new Date(year, month, 1)),
        end: toDateString(new Date(year, month + 1, 0)),
      };
    case 'last-6-months':
      // Six calendar months counted back from the current one, ending with the
      // last day of the current month (matching the full-month behaviour of the
      // other presets). Negative month values roll the year back correctly.
      return {
        start: toDateString(new Date(year, month - 5, 1)),
        end: toDateString(new Date(year, month + 1, 0)),
      };
    case 'this-week':
    default: {
      const day = reference.getDay();
      const monday = new Date(year, month, reference.getDate() - day + (day === 0 ? -6 : 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: toDateString(monday), end: toDateString(sunday) };
    }
  }
};
