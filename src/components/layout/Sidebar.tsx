import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Pill, FileText, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { profile, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctors', label: 'Doctors', icon: UserCheck },
    { to: '/medicines', label: 'Medicines', icon: Pill },
    { to: '/orders', label: 'Orders', icon: FileText },
    { to: '/settings?tab=backup', label: 'Backup & Recovery', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex fixed top-0 left-0 z-50 h-screen w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xs">
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md">
          <Pill className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-none">Apex MR</h1>
          <span className="text-xs font-medium text-slate-400">Distributor System</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 pt-4 flex items-center justify-between px-2">
        <div className="truncate">
          <div className="text-xs font-semibold text-slate-900 truncate">
            {profile?.full_name || 'MR Representative'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {profile?.email || 'fluent@healthcare.com'}
          </div>
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
