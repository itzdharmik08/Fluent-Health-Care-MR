import { useEffect, useState, useCallback, useRef } from 'react';
import { backupService } from '../services/backupService';
import { BackupConfig, BackupRecord } from '../types/backup';

export interface BackupNotification {
  id?: string;
  backupId?: string;
  type: string;
  label?: string;
  timestamp: string;
  summary?: any;
  savedToDevice?: boolean;
  savedToDb?: boolean;
  backupRecord?: BackupRecord;
}

export function useAutoBackup() {
  const [config, setConfig] = useState<BackupConfig>(() => backupService.getConfig());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastNotification, setLastNotification] = useState<BackupNotification | null>(null);

  const isRunningRef = useRef(false);

  const checkSchedule = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    try {
      await backupService.checkAndRunScheduledBackup();
      setConfig(backupService.getConfig());
    } finally {
      isRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkSchedule();

    // Check every 30 seconds for midnight transition
    const intervalId = window.setInterval(() => {
      checkSchedule();
    }, 30000);

    // Listen for config changes
    const handleConfigChange = (e: any) => {
      setConfig(e.detail);
    };

    // Listen for backup completion notifications
    const handleBackupCompleted = (e: any) => {
      setLastNotification(e.detail);
      setConfig(backupService.getConfig());
    };

    window.addEventListener('mr_backup_config_changed', handleConfigChange);
    window.addEventListener('mr_backup_completed', handleBackupCompleted);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mr_backup_config_changed', handleConfigChange);
      window.removeEventListener('mr_backup_completed', handleBackupCompleted);
    };
  }, [checkSchedule]);

  const triggerInstantBackup = async (label?: string, download: boolean = false): Promise<BackupRecord> => {
    setIsBackingUp(true);
    try {
      const record = await backupService.captureFullBackup('manual', label, download);
      setConfig(backupService.getConfig());
      return record;
    } finally {
      setIsBackingUp(false);
    }
  };

  const dismissNotification = () => {
    setLastNotification(null);
  };

  return {
    config,
    isBackingUp,
    lastNotification,
    triggerInstantBackup,
    dismissNotification,
    refreshConfig: () => setConfig(backupService.getConfig()),
  };
}
