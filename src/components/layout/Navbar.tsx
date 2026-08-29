import React from 'react';
import { Pill, Search, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { setSearchOpen } = useAppStore();
  const { logout, profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 md:px-6 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2 font-bold text-indigo-600 text-lg md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-sm">
          <Pill className="h-5 w-5" />
        </div>
        <span>Apex MR</span>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Welcome, <span className="text-indigo-600">{profile?.full_name || 'MR Representative'}</span>
        </h2>
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-indigo-400 hover:bg-white transition-all w-36 sm:w-64 md:w-80"
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate text-left flex-1">Search doctors, medicines...</span>
        <kbd className="hidden sm:inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
          /
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={logout}
          title="Logout"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
