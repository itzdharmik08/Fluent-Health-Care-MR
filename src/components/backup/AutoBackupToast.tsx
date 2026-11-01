import React from 'react';
import { useAutoBackup } from '../../hooks/useAutoBackup';
import { ShieldCheck, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AutoBackupToast: React.FC = () => {
  const { lastNotification, dismissNotification } = useAutoBackup();
  const navigate = useNavigate();

  if (!lastNotification) return null;

  const isMidnight = lastNotification.type === 'auto_midnight';

  return (
    <aside aria-label="Backup notifications" className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {isMidnight ? '12:00 AM Midnight Auto-Backup' : 'System Backup Captured'}
              </h2>
              <button
                onClick={dismissNotification}
                className="text-slate-400 hover:text-white p-1 -mr-1"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-300">
              {isMidnight
                ? 'Your daily 12:00 AM snapshot was automatically saved and exported into a JSON file.'
                : 'System data snapshot was successfully exported and secured in the backup vault.'}
            </p>

            {lastNotification.summary && (
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-emerald-300">
                  {lastNotification.summary.doctorsCount} Doctors
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-emerald-300">
                  {lastNotification.summary.medicinesCount} Medicines
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-emerald-300">
                  {lastNotification.summary.ordersCount} Orders
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  dismissNotification();
                  navigate('/settings?tab=backup');
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Open Backup Vault</span>
              </button>
              <button
                onClick={dismissNotification}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
