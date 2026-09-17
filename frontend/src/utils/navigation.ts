import { LayoutDashboard, Receipt, Settings as SettingsIcon, Tags, FileText } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/** Every page reachable from the sidebar. */
export type Tab = 'dashboard' | 'transactions' | 'categories' | 'report' | 'settings';

export interface NavItem {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

/** Sidebar entries, in display order. */
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

/** Header title and subtitle for each page. */
export const TAB_META: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Income, expenses and analytics' },
  transactions: { title: 'Transactions', subtitle: 'Record and review income and expenses' },
  categories: { title: 'Categories', subtitle: 'Organise income and expense categories' },
  report: { title: 'Report', subtitle: 'Generate PDF reports for any period' },
  settings: { title: 'Settings', subtitle: 'Preferences and appearance' },
};