import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Clock,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileJson,
  Sparkles,
  Info,
  Layers,
  Activity,
  History,
  Cloud,
  Database,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';
import { backupService } from '../../services/backupService';
import { backupDb } from '../../lib/backupDb';
import {
  BackupConfig,
  BackupRecord,
  FullBackupFile,
  RestoreResult,
} from '../../types/backup';

export const BackupRestoreManager: React.FC = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [config, setConfig] = useState<BackupConfig>(() => backupService.getConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Form states
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(config.autoBackupEnabled);
  const [scheduledTime, setScheduledTime] = useState(config.scheduledTime || '00:00');
  const [autoDownloadJson, setAutoDownloadJson] = useState(config.autoDownloadJson);
  const [retentionDays, setRetentionDays] = useState(config.retentionDays || 30);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<
    BackupRecord | FullBackupFile | null
  >(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      // Loads merged backups from both device IndexedDB and remote Supabase database
      const records = await backupService.getAllBackups();
      setBackups(records);
    } catch (err) {
      console.error('Failed to load backup vault history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();

    const handleBackupCompleted = () => {
      loadBackups();
      setConfig(backupService.getConfig());
    };

    window.addEventListener('mr_backup_completed', handleBackupCompleted);
    return () => {
      window.removeEventListener('mr_backup_completed', handleBackupCompleted);
    };
  }, []);

  const handleInstantBackup = async (
    type: 'manual' | 'emergency' = 'manual',
    customLabel?: string
  ) => {
    setIsBackingUp(true);
    try {
      const record = await backupService.captureFullBackup(type, customLabel, false);
      await loadBackups();
      setConfig(backupService.getConfig());
    } catch (err: any) {
      console.error('Instant backup failed:', err);
      alert(`Backup failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = backupService.saveConfig({
      autoBackupEnabled,
      scheduledTime,
      autoDownloadJson,
      retentionDays,
    });
    setConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await backupService.parseBackupFile(file);
      setSelectedBackupForRestore(parsed);
      setRestoreResult(null);
      setRestoreError(null);
      setRestoreModalOpen(true);
    } catch (err: any) {
      alert(`Could not parse backup file: ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRestoreFromSnapshot = (snapshot: BackupRecord) => {
    setSelectedBackupForRestore(snapshot);
    setRestoreResult(null);
    setRestoreError(null);
    setRestoreModalOpen(true);
  };

  const executeRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const result = await backupService.restoreFromBackup(selectedBackupForRestore);
      setRestoreResult(result);
    } catch (err: any) {
      console.error('Restoration error:', err);
      setRestoreError(err.message || 'Failed to restore database from backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this backup snapshot from both device and database?')) {
      return;
    }
    await backupService.deleteBackup(id);
    await loadBackups();
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const copySqlToClipboard = () => {
    const sql = `-- Run this in Supabase SQL Editor to enable DB storage for backups:
CREATE TABLE IF NOT EXISTS public.system_backups (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    label TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    metadata JSONB NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their backups" ON public.system_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their backups" ON public.system_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their backups" ON public.system_backups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their backups" ON public.system_backups FOR DELETE USING (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for JSON Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Automated Protection Active</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/30">
                <Database className="h-3.5 w-3.5" />
                <span>Saved to Device & Cloud DB</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/20">
                <Clock className="h-3.5 w-3.5" />
                <span>12:00 AM Midnight Engine</span>
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Automated Backup & Disaster Recovery System
            </h2>
            <p className="text-xs md:text-sm text-indigo-200 max-w-2xl leading-relaxed">
              Every night at 12:00 AM, your medical orders, doctors, and medicines are automatically
              exported into a JSON file, saved directly on your device, and backed up into the remote database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleInstantBackup('manual', 'Manual Instant Backup')}
              disabled={isBackingUp}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download className={`h-4 w-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
              <span>{isBackingUp ? 'Backing Up to Device & DB...' : 'Backup Now (Export JSON)'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-all border border-white/10 active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Restore from JSON File</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 12:00 AM Engine */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Daily Scheduler
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900">
              {config.autoBackupEnabled ? '12:00 AM Midnight' : 'Disabled'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                config.autoBackupEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {config.autoBackupEnabled ? 'Active' : 'Off'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Nightly snapshot secured in vault & cloud; prompts to download JSON or choose later.
          </p>
        </div>

        {/* Card 2: Last Backup */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Last Backup Captured
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {formatDateTime(config.lastBackupTimestamp)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {config.lastBackupMessage || 'Daily scheduled backups run every night automatically.'}
          </p>
        </div>

        {/* Card 3: Vault Capacity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Disaster Vault
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900">{backups.length} Snapshots</span>
            <span className="text-xs text-slate-400">({config.retentionDays} days retention)</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Stored locally on your device for fast offline recovery in case of accidental deletions.
          </p>
        </div>
      </div>

      {/* Action / Accidental Loss Protection Helper */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Accidental Data Loss Protection (Emergency Guard)
            </h3>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
              Accidentally deleted an order or modified wrong medicine prices? Don’t panic! You can
              instantly rollback using any snapshot below, or click{' '}
              <button
                onClick={() => handleInstantBackup('emergency', 'Pre-Action Safety Snapshot')}
                className="font-bold underline hover:text-amber-950"
              >
                "Create Pre-Action Safety Point"
              </button>{' '}
              before making major bulk changes.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Scheduler Configuration & Backup Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduled Auto-Backup Settings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Automated Schedule Settings</h3>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Backup schedule settings saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Auto backup toggle */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/70">
              <div>
                <label className="font-bold text-slate-800 block">Automatic Nightly Backup</label>
                <span className="text-[11px] text-slate-400">
                  Captures database snapshot daily
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Scheduled Execution Time (Default: 12:00 AM)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Set to 00:00 for midnight backup. Also runs on first morning launch if machine was off.
              </p>
            </div>

            {/* Download Prompt Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/70">
              <div>
                <label className="font-bold text-slate-800 block">Prompt to Download JSON</label>
                <span className="text-[11px] text-slate-400">
                  When backup is ready, ask whether to download JSON now or continue later
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoDownloadJson}
                onChange={(e) => setAutoDownloadJson(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Retention Limit */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Local Vault Retention Days
              </label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value={15}>Keep last 15 days of snapshots</option>
                <option value={30}>Keep last 30 days of snapshots (Recommended)</option>
                <option value={60}>Keep last 60 days of snapshots</option>
                <option value={90}>Keep last 90 days of snapshots</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Save Schedule Settings
            </button>
          </form>
        </div>

        {/* Right Column: Backup History Vault */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Backup Vault & Snapshot History</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {backups.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSqlModal(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="View SQL table definition for Supabase DB storage"
              >
                <Database className="h-3 w-3 text-sky-600" />
                <span>DB Schema SQL</span>
              </button>

              <button
                onClick={loadBackups}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Vault</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading backup snapshots...</div>
          ) : backups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <FileJson className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No backup snapshots yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  The automated 12:00 AM midnight scheduler will save snapshots here, or click below to create your first backup immediately.
                </p>
              </div>
              <button
                onClick={() => handleInstantBackup('manual', 'Initial Master Snapshot')}
                disabled={isBackingUp}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Create First Snapshot</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto pr-1">
              {backups.map((item) => {
                const isAuto = item.type === 'auto_midnight';
                const isEmergency = item.type === 'emergency';
                return (
                  <div
                    key={item.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2.5 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{item.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                            isAuto
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isEmergency
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isAuto ? '12:00 AM Auto' : isEmergency ? 'Emergency Point' : 'Manual'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatBytes(item.sizeBytes)}
                        </span>

                        {/* Dual Storage Location Indicator */}
                        {item.savedToDb && item.savedToDevice ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Device & DB Synced</span>
                          </span>
                        ) : item.savedToDb ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700 border border-sky-200">
                            <Cloud className="h-2.5 w-2.5" />
                            <span>In Cloud DB</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700 border border-purple-200">
                            <Smartphone className="h-2.5 w-2.5" />
                            <span>In Device</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>{formatDateTime(item.timestamp)}</span>
                        <span>•</span>
                        <span>
                          {item.metadata.summary.ordersCount} Orders,{' '}
                          {item.metadata.summary.medicinesCount} Medicines,{' '}
                          {item.metadata.summary.doctorsCount} Doctors
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => backupService.downloadBackupJson(item)}
                        title="Download JSON File"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>JSON</span>
                      </button>

                      <button
                        onClick={() => handleRestoreFromSnapshot(item)}
                        title="Restore this Snapshot to Live Database"
                        className="flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Restore</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSnapshot(item.id)}
                        title="Delete snapshot"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation & Preview Modal */}
      {restoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Restore Database Snapshot</h3>
                  <p className="text-xs text-slate-500">
                    Review backup contents before restoring live records
                  </p>
                </div>
              </div>
            </div>

            {restoreResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{restoreResult.message}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="block text-base font-extrabold text-slate-900">
                      {restoreResult.restoredCounts.orders}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Orders Restored</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="block text-base font-extrabold text-slate-900">
                      {restoreResult.restoredCounts.medicines}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Medicines Restored</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="block text-base font-extrabold text-slate-900">
                      {restoreResult.restoredCounts.doctors}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Doctors Restored</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setRestoreModalOpen(false);
                      window.location.reload(); // Refresh app to load restored database items cleanly
                    }}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Done & Refresh App
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {restoreError && (
                  <div className="rounded-xl bg-rose-50 p-3 border border-rose-200 text-rose-700 font-semibold">
                    {restoreError}
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">Snapshot Source:</span>
                    <span className="font-bold text-slate-900">{selectedBackupForRestore.label}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">Snapshot Timestamp:</span>
                    <span className="text-slate-800">
                      {formatDateTime(selectedBackupForRestore.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold">Exported By:</span>
                    <span className="text-slate-800">
                      {selectedBackupForRestore.metadata?.userEmail || 'Apex Representative'}
                    </span>
                  </div>
                </div>

                {/* Items to be restored */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 block">Records to be synced & restored:</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div className="rounded-lg bg-indigo-50/50 p-2.5 border border-indigo-100 flex items-center justify-between">
                      <span>Doctor Contacts:</span>
                      <strong className="text-indigo-900">
                        {selectedBackupForRestore.data.doctors?.length || 0}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-indigo-50/50 p-2.5 border border-indigo-100 flex items-center justify-between">
                      <span>Medicines Master:</span>
                      <strong className="text-indigo-900">
                        {selectedBackupForRestore.data.medicines?.length || 0}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-indigo-50/50 p-2.5 border border-indigo-100 flex items-center justify-between">
                      <span>Order Invoices:</span>
                      <strong className="text-indigo-900">
                        {selectedBackupForRestore.data.orders?.length || 0}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-indigo-50/50 p-2.5 border border-indigo-100 flex items-center justify-between">
                      <span>Order Line Items:</span>
                      <strong className="text-indigo-900">
                        {selectedBackupForRestore.data.orderItems?.length || 0}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  <strong>Safe Restoration Mode:</strong> Records from this snapshot will be upserted
                  into your database using their unique IDs. Any missing or accidentally deleted doctors,
                  medicines, and orders will be recovered immediately.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setRestoreModalOpen(false)}
                    disabled={isRestoring}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeRestore}
                    disabled={isRestoring}
                    className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-700 shadow-md transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>{isRestoring ? 'Restoring System...' : 'Confirm & Restore'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supabase DB Table SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Supabase DB Backup Schema</h3>
                  <p className="text-xs text-slate-500">
                    SQL query to enable remote cloud DB storage for your backup snapshots
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Run this SQL script once in your <strong>Supabase Dashboard → SQL Editor</strong> to
              enable the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">public.system_backups</code> table:
            </p>

            <div className="relative">
              <pre className="rounded-xl bg-slate-950 p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60 leading-relaxed">
{`CREATE TABLE IF NOT EXISTS public.system_backups (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    label TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    metadata JSONB NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their backups" ON public.system_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their backups" ON public.system_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their backups" ON public.system_backups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their backups" ON public.system_backups FOR DELETE USING (auth.uid() = user_id);`}
              </pre>

              <button
                onClick={copySqlToClipboard}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSqlModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
