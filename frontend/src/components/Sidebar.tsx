import React, { useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { GetSystemInfo } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';
import { NAV_ITEMS, Tab } from '../utils/navigation';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [dbError, setDbError] = useState(false);

  // The real database location comes from the backend so this card never
  // lies about where the data lives (it is per-user and per-OS).
  useEffect(() => {
    GetSystemInfo()
      .then((info: models.SystemInfo) => setDbPath(info.database_path))
      .catch(() => setDbError(true));
  }, []);
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none shrink-0 transition-colors duration-200">
      <div>
        {/* Brand Header */}
        <div className="h-18 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-accent-500 text-white flex items-center justify-center shadow-md shadow-accent-500/20">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Expenser
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Desktop Finance
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-1">
          <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu
          </p>

          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 shadow-sm border border-accent-200/50 dark:border-accent-800/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-accent-600 dark:text-accent-400' : ''
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Card */}
      <div className="p-4 m-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              dbError ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
            }`}
          ></div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Local SQLite DB
          </span>
        </div>
        <p
          className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed"
          title={dbPath ?? undefined}
        >
          {dbError ? (
            'Storage status unavailable'
          ) : dbPath ? (
            <>
              Storage connected at{' '}
              <code className="text-accent-600 dark:text-accent-400 font-mono break-all">
                {dbPath}
              </code>
            </>
          ) : (
            'Checking storage...'
          )}
        </p>
      </div>
    </aside>
  );
};

