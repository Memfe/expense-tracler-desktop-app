import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { GetAppSettings, ResetSettings, UpdateSetting } from '../../wailsjs/go/main/App';
import { DEFAULT_PERIOD, isPeriodOptionId, PeriodOptionId } from '../utils/period';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'amber' | 'emerald' | 'indigo' | 'violet' | 'rose' | 'blue';
export type DefaultPeriod = PeriodOptionId;

export const ACCENT_COLORS: AccentColor[] = [
  'amber',
  'emerald',
  'indigo',
  'violet',
  'rose',
  'blue',
];

export const CURRENCY_OPTIONS: { id: string; label: string }[] = [
  { id: 'GHS', label: 'GH₵ - Ghana Cedi (GHS)' },
  { id: 'USD', label: '$ - US Dollar (USD)' },
  { id: 'EUR', label: '€ - Euro (EUR)' },
  { id: 'GBP', label: '£ - British Pound (GBP)' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: 'GH₵',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Defaults shared by the provider and the settings page. */
export const SETTING_DEFAULTS = {
  theme: 'light' as ThemeMode,
  accent: 'amber' as AccentColor,
  defaultPeriod: DEFAULT_PERIOD,
  currency: 'GHS',
};

interface ThemeContextType {
  theme: ThemeMode;
  accent: AccentColor;
  defaultPeriod: DefaultPeriod;
  currency: string;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setAccent: (accent: AccentColor) => Promise<void>;
  setDefaultPeriod: (period: DefaultPeriod) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  resetSettings: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(SETTING_DEFAULTS.theme);
  const [accent, setAccentState] = useState<AccentColor>(SETTING_DEFAULTS.accent);
  const [defaultPeriod, setDefaultPeriodState] = useState<DefaultPeriod>(
    SETTING_DEFAULTS.defaultPeriod
  );
  const [currency, setCurrencyState] = useState<string>(SETTING_DEFAULTS.currency);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load from the backend SQLite settings.
  useEffect(() => {
    GetAppSettings()
      .then((settings) => {
        if (!settings) {
          return;
        }
        if (
          settings.theme === 'light' ||
          settings.theme === 'dark' ||
          settings.theme === 'system'
        ) {
          setThemeState(settings.theme as ThemeMode);
        }
        if (ACCENT_COLORS.includes(settings.accent as AccentColor)) {
          setAccentState(settings.accent as AccentColor);
        }
        if (isPeriodOptionId(settings.default_period)) {
          setDefaultPeriodState(settings.default_period);
        }
        if (settings.currency) {
          setCurrencyState(settings.currency);
        }
      })
      .catch((err) => {
        console.warn('Could not load settings from backend, using defaults:', err);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  // Apply the resolved theme. "system" follows the operating system live.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    if (theme !== 'system') {
      return;
    }

    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  // Update the DOM when the accent colour changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  const persist = useCallback(async (key: string, value: string, label: string) => {
    try {
      await UpdateSetting(key, value);
    } catch (err) {
      console.error(`Failed to save ${label}:`, err);
    }
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    await persist('theme', newTheme, 'theme setting');
  };

  const setAccent = async (newAccent: AccentColor) => {
    setAccentState(newAccent);
    await persist('accent', newAccent, 'accent setting');
  };

  const setDefaultPeriod = async (newPeriod: DefaultPeriod) => {
    setDefaultPeriodState(newPeriod);
    await persist('default_period', newPeriod, 'default period setting');
  };

  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    await persist('currency', newCurrency, 'currency setting');
  };

  // Resets every stored preference. It throws when the backend rejects the call
  // so the settings page can surface the error to the user.
  const resetSettings = async () => {
    await ResetSettings();
    setThemeState(SETTING_DEFAULTS.theme);
    setAccentState(SETTING_DEFAULTS.accent);
    setDefaultPeriodState(SETTING_DEFAULTS.defaultPeriod);
    setCurrencyState(SETTING_DEFAULTS.currency);
  };

  const formatCurrency = (amount: number) => {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${symbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading Expense Tracker...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accent,
        defaultPeriod,
        currency,
        setTheme,
        setAccent,
        setDefaultPeriod,
        setCurrency,
        resetSettings,
        formatCurrency,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};