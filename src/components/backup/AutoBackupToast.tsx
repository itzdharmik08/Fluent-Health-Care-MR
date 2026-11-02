import React, { useState } from 'react';
import { useAutoBackup } from '../../hooks/useAutoBackup';
import { backupService } from '../../services/backupService';
import { ShieldCheck, Download, Clock, X, CheckCircle2, Cloud } from 'lucide-react';

export const AutoBackupToast: React.FC = () => {
  const { lastNotification, dismissNotification } = useAutoBackup();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!lastNotification) return null;

  const isMidnight = lastNotification.type === 'auto_midnight';

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (lastNotification.backupRecord) {
        backupService.downloadBackupJson(lastNotification.backupRecord);
      } else {
        const id = lastNotification.backupId || lastNotification.id;
        if (id) {
          await backupService.downloadBackupById(id);
        }
      }
      setDownloaded(true);
      setTimeout(() => {
        setDownloaded(false);
        dismissNotification();
      }, 1400);
    } catch (err) {
      console.error('Failed to download backup JSON:', err);
      dismissNotification();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLater = () => {
    dismissNotification();
  };

  return (
    <aside
      aria-label="Backup prompt"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md w-[calc(100%-2rem)] md:w-full animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 sm:p-5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header & Dismiss X */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                <Cloud className="h-3 w-3" />
                {isMidnight ? '12:00 AM Daily Backup' : 'System Backup'}
              </span>
              <button
                onClick={handleLater}
                className="text-slate-400 hover:text-white p-1 -mr-1 transition-colors rounded-lg hover:bg-slate-800"
                aria-label="Close and continue"
                title="Later"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Title & Prompt */}
            <h2 className="mt-2 text-sm font-bold text-white">
              Download Backup File?
            </h2>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Your daily backup snapshot is safely secured in cloud storage and internal vault. Would you like to download the backup JSON file to your device now?
            </p>

            {/* Summary pills */}
            {lastNotification.summary && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
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

            {/* Action Buttons: Yes, Download & Later */}
            <div className="mt-3.5 flex items-center gap-2">
              {downloaded ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 py-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Downloaded to your device!</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{isDownloading ? 'Downloading...' : 'Yes, Download'}</span>
                  </button>

                  <button
                    onClick={handleLater}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Later</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
