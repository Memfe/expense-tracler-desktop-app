import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Categories } from './pages/Categories';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { Tab, TAB_META } from './utils/navigation';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderPage = () => {
    switch (activeTab) {
      case 'transactions':
        return <Transactions onNavigate={setActiveTab} />;
      case 'categories':
        return <Categories />;
      case 'report':
        return <Report />;
      case 'settings':
        return <Settings />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans select-none transition-colors duration-200">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header title={TAB_META[activeTab].title} subtitle={TAB_META[activeTab].subtitle} />

          <main className="flex-1 overflow-y-auto">{renderPage()}</main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;

