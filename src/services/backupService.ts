import { supabase } from '../lib/supabase';
import { authService } from './authService';
import { backupDb } from '../lib/backupDb';
import {
  BackupConfig,
  BackupRecord,
  BackupType,
  FullBackupFile,
  RestoreResult,
} from '../types/backup';

const CONFIG_STORAGE_KEY = 'apex_mr_backup_config';

const DEFAULT_CONFIG: BackupConfig = {
  autoBackupEnabled: true,
  scheduledTime: '00:00', // 12:00 AM midnight
  autoDownloadJson: false, // Automatic background download is removed; user will be prompted to download or choose later
  promptDownloadOnBackup: true,
  retentionDays: 30,
  lastBackupDate: undefined,
  lastBackupTimestamp: undefined,
  lastBackupStatus: 'idle',
  lastBackupMessage: undefined,
};

export const backupService = {
  /**
   * Get current backup configuration
   */
  getConfig(): BackupConfig {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  },

  /**
   * Save backup configuration
   */
  saveConfig(partial: Partial<BackupConfig>): BackupConfig {
    const current = this.getConfig();
    const updated: BackupConfig = { ...current, ...partial };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mr_backup_config_changed', { detail: updated }));
    return updated;
  },

  /**
   * Download a backup object as a formatted JSON file
   */
  downloadBackupJson(backup: BackupRecord | FullBackupFile) {
    try {
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Create readable timestamp for filename: YYYY-MM-DD_HH-mm
      const dateObj = new Date(backup.timestamp);
      const datePart = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const hoursPart = String(dateObj.getHours()).padStart(2, '0');
      const minsPart = String(dateObj.getMinutes()).padStart(2, '0');

      const prefix = backup.type === 'auto_midnight' ? 'ApexMR_AutoBackup_12AM' : 'ApexMR_Backup';
      const filename = `${prefix}_${datePart}_${hoursPart}-${minsPart}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to trigger JSON download:', err);
    }
  },

  /**
   * Download a backup by its ID from local vault or remote database
   */
  async downloadBackupById(id: string): Promise<boolean> {
    try {
      // 1. Check local IndexedDB vault first
      const local = await backupDb.getBackupById(id);
      if (local) {
        this.downloadBackupJson(local);
        return true;
      }

      // 2. Fall back to Supabase remote backup table
      const { data, error } = await supabase
        .from('system_backups')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const rec: BackupRecord = {
          id: data.id,
          timestamp: data.created_at || new Date().toISOString(),
          type: data.type || 'manual',
          label: data.label || 'Backup',
          sizeBytes: Number(data.size_bytes) || 0,
          metadata: data.metadata,
          data: data.data,
        };
        this.downloadBackupJson(rec);
        return true;
      }
    } catch (err) {
      console.warn('Failed to download backup by ID:', err);
    }
    return false;
  },

  /**
   * Capture a full backup snapshot of the system
   */
  async captureFullBackup(
    type: BackupType = 'manual',
    label?: string,
    triggerDownload: boolean = false
  ): Promise<BackupRecord> {
    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be logged in to create a backup.');
    }

    // 1. Fetch live Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Fetch all Doctors
    const { data: doctorsData, error: docErr } = await supabase
      .from('doctors')
      .select('*')
      .order('created_at', { ascending: true });
    if (docErr) throw docErr;

    // 3. Fetch Doctor Medicine Custom Rates
    const { data: ratesData, error: ratesErr } = await supabase
      .from('doctor_medicine_rates')
      .select('*');
    if (ratesErr) console.warn('Rates fetch warning:', ratesErr);

    // 4. Fetch all Medicines
    const { data: medicinesData, error: medErr } = await supabase
      .from('medicines')
      .select('*')
      .order('created_at', { ascending: true });
    if (medErr) throw medErr;

    // 5. Fetch Medicine Price History
    const { data: priceHistoryData, error: histErr } = await supabase
      .from('medicine_price_history')
      .select('*');
    if (histErr) console.warn('Price history fetch warning:', histErr);

    // 6. Fetch Orders & Order Items
    const { data: ordersWithItems, error: ordersErr } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('order_date', { ascending: false });
    if (ordersErr) throw ordersErr;

    // Unpack orders and order_items cleanly
    const ordersList = (ordersWithItems || []).map((ord) => {
      const copy = { ...ord };
      delete copy.order_items;
      return copy;
    });

    const orderItemsList = (ordersWithItems || []).flatMap((ord) => {
      return (ord.order_items || []) as any[];
    });

    // Local system settings snapshot
    const localSettings: Record<string, unknown> = {
      whatsapp_dispatch_number: localStorage.getItem('mr_whatsapp_dispatch_number') || '',
      whatsapp_target_type: localStorage.getItem('mr_whatsapp_target_type') || 'configured',
    };

    const totalRevenue = ordersList.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    const backupId = `mr_backup_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const summary = {
      doctorsCount: doctorsData?.length || 0,
      medicinesCount: medicinesData?.length || 0,
      ordersCount: ordersList.length,
      orderItemsCount: orderItemsList.length,
      doctorRatesCount: ratesData?.length || 0,
      priceHistoryCount: priceHistoryData?.length || 0,
      totalRevenue,
    };

    const defaultLabel =
      type === 'auto_midnight'
        ? 'Automated 12:00 AM Daily Backup'
        : type === 'emergency'
        ? 'Accidental Emergency Restore Point'
        : 'Manual Instant System Backup';

    const backupPayload: BackupRecord = {
      id: backupId,
      timestamp: nowIso,
      type,
      label: label || defaultLabel,
      sizeBytes: 0,
      metadata: {
        appVersion: '2.0.0',
        appName: 'Apex MR Management System',
        exportedAt: nowIso,
        userEmail: user.email,
        companyName: profileData?.company_name || 'Fluent Health Care',
        summary,
      },
      data: {
        profile: profileData || null,
        doctors: doctorsData || [],
        doctorRates: ratesData || [],
        medicines: medicinesData || [],
        priceHistory: priceHistoryData || [],
        orders: ordersList,
        orderItems: orderItemsList,
        settings: localSettings,
      },
    };

    // Calculate approximate size in bytes
    const jsonString = JSON.stringify(backupPayload);
    backupPayload.sizeBytes = new Blob([jsonString]).size;
    backupPayload.savedToDevice = true;

    // 1. SAVE TO DEVICE: IndexedDB snapshot vault
    await backupDb.saveBackup(backupPayload);

    // Prune old snapshots beyond configured retention days
    const config = this.getConfig();
    await backupDb.pruneOldBackups(config.retentionDays || 30);

    // 2. SAVE TO DEVICE: Export & download JSON file to device disk/downloads
    if (triggerDownload) {
      this.downloadBackupJson(backupPayload);
    }

    // 3. SAVE TO DATABASE: Store snapshot in Supabase 'system_backups' table
    let savedToCloudDb = false;
    try {
      const { error: dbErr } = await supabase
        .from('system_backups')
        .upsert([
          {
            id: backupPayload.id,
            user_id: user.id,
            type: backupPayload.type,
            label: backupPayload.label,
            size_bytes: backupPayload.sizeBytes,
            metadata: backupPayload.metadata,
            data: backupPayload.data,
            created_at: backupPayload.timestamp,
          },
        ]);

      if (dbErr) {
        console.warn('Note: Could not save to Supabase system_backups table (run schema migration if table not created):', dbErr.message);
        backupPayload.savedToDb = false;
        backupPayload.dbSyncStatus = 'local_only';
      } else {
        savedToCloudDb = true;
        backupPayload.savedToDb = true;
        backupPayload.dbSyncStatus = 'synced';
      }
    } catch (err: any) {
      console.warn('Supabase DB backup save error:', err);
      backupPayload.savedToDb = false;
      backupPayload.dbSyncStatus = 'local_only';
    }

    // Update config status
    const todayDateStr = new Date().toLocaleDateString('en-CA');
    const storageNotice = savedToCloudDb
      ? 'Saved in Device storage & Supabase Cloud DB.'
      : 'Saved in Device storage & exported JSON.';

    this.saveConfig({
      lastBackupDate: todayDateStr,
      lastBackupTimestamp: nowIso,
      lastBackupStatus: 'success',
      lastBackupMessage: `Backup captured successfully (${summary.doctorsCount} doctors, ${summary.medicinesCount} medicines, ${summary.ordersCount} orders). ${storageNotice}`,
    });

    window.dispatchEvent(
      new CustomEvent('mr_backup_completed', {
        detail: {
          id: backupId,
          backupId,
          type,
          label: backupPayload.label,
          summary,
          timestamp: nowIso,
          savedToDevice: true,
          savedToDb: savedToCloudDb,
          backupRecord: backupPayload,
        },
      })
    );

    return backupPayload;
  },

  /**
   * Fetch all backups from both local device vault and remote Supabase database
   */
  async getAllBackups(): Promise<BackupRecord[]> {
    const localRecords = await backupDb.getAllBackups();
    const map = new Map<string, BackupRecord>();

    for (const rec of localRecords) {
      map.set(rec.id, {
        ...rec,
        savedToDevice: true,
        savedToDb: rec.savedToDb || false,
        dbSyncStatus: rec.savedToDb ? 'synced' : 'local_only',
      });
    }

    // Fetch from Supabase DB
    try {
      const { data: remoteRows, error } = await supabase
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && remoteRows && Array.isArray(remoteRows)) {
        for (const row of remoteRows) {
          const existing = map.get(row.id);
          if (existing) {
            existing.savedToDb = true;
            existing.dbSyncStatus = 'synced';
          } else {
            const remoteRec: BackupRecord = {
              id: row.id,
              timestamp: row.created_at || new Date().toISOString(),
              type: row.type || 'manual',
              label: row.label || 'Cloud DB Backup',
              sizeBytes: Number(row.size_bytes) || 0,
              metadata: row.metadata,
              data: row.data,
              savedToDevice: false,
              savedToDb: true,
              dbSyncStatus: 'synced',
            };
            map.set(row.id, remoteRec);
            // Cache to local IndexedDB for instant offline access
            await backupDb.saveBackup(remoteRec).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Could not query remote backups from Supabase:', e);
    }

    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return merged;
  },

  /**
   * Delete backup from both device IndexedDB and Supabase DB
   */
  async deleteBackup(id: string): Promise<void> {
    await backupDb.deleteBackup(id);
    try {
      await supabase.from('system_backups').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete backup from Supabase DB:', err);
    }
  },

  /**
   * Restore database from a BackupRecord or imported FullBackupFile
   */
  async restoreFromBackup(payload: FullBackupFile | BackupRecord): Promise<RestoreResult> {
    if (!payload || !payload.data) {
      throw new Error('Invalid backup file structure: missing data payload.');
    }

    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be logged in to restore database records.');
    }

    const { data } = payload;
    const restoredCounts = {
      doctors: 0,
      medicines: 0,
      doctorRates: 0,
      orders: 0,
      orderItems: 0,
    };

    // 1. Restore Profile if available
    if (data.profile) {
      try {
        await supabase
          .from('profiles')
          .upsert([{
            id: user.id,
            email: user.email,
            full_name: data.profile.full_name,
            company_name: data.profile.company_name,
            phone: data.profile.phone,
            distributor_address: data.profile.distributor_address,
            gstin: data.profile.gstin,
            updated_at: new Date().toISOString(),
          }]);
      } catch (err) {
        console.warn('Profile restore skipped/failed:', err);
      }
    }

    // 2. Restore Medicines (Ensure user_id matches active user)
    if (data.medicines && data.medicines.length > 0) {
      const cleanMedicines = data.medicines.map((m) => ({
        ...m,
        user_id: user.id,
      }));

      // Chunk upserts in batches of 50 for safety
      const chunkSize = 50;
      for (let i = 0; i < cleanMedicines.length; i += chunkSize) {
        const chunk = cleanMedicines.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('medicines')
          .upsert(chunk);
        if (error) {
          console.error('Error restoring medicines chunk:', error);
          throw new Error(`Medicines restoration failed: ${error.message}`);
        }
      }
      restoredCounts.medicines = cleanMedicines.length;
    }

    // 3. Restore Doctors
    if (data.doctors && data.doctors.length > 0) {
      const cleanDoctors = data.doctors.map((d) => ({
        ...d,
        user_id: user.id,
      }));

      const chunkSize = 50;
      for (let i = 0; i < cleanDoctors.length; i += chunkSize) {
        const chunk = cleanDoctors.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('doctors')
          .upsert(chunk);
        if (error) {
          console.error('Error restoring doctors chunk:', error);
          throw new Error(`Doctors restoration failed: ${error.message}`);
        }
      }
      restoredCounts.doctors = cleanDoctors.length;
    }

    // 4. Restore Doctor Custom Rates
    if (data.doctorRates && data.doctorRates.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < data.doctorRates.length; i += chunkSize) {
        const chunk = data.doctorRates.slice(i, i + chunkSize).map((rate) => {
          const r = { ...rate };
          delete (r as any).medicine; // remove joined relation if present
          return r;
        });
        const { error } = await supabase
          .from('doctor_medicine_rates')
          .upsert(chunk);
        if (error) console.warn('Doctor rates restore warning:', error);
      }
      restoredCounts.doctorRates = data.doctorRates.length;
    }

    // 5. Restore Orders
    if (data.orders && data.orders.length > 0) {
      const cleanOrders = data.orders.map((o) => {
        const copy = { ...o };
        copy.user_id = user.id;
        delete (copy as any).doctor;
        delete (copy as any).order_items;
        return copy;
      });

      const chunkSize = 50;
      for (let i = 0; i < cleanOrders.length; i += chunkSize) {
        const chunk = cleanOrders.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('orders')
          .upsert(chunk);
        if (error) {
          console.error('Error restoring orders chunk:', error);
          throw new Error(`Orders restoration failed: ${error.message}`);
        }
      }
      restoredCounts.orders = cleanOrders.length;
    }

    // 6. Restore Order Items
    if (data.orderItems && data.orderItems.length > 0) {
      const cleanItems = data.orderItems.map((item) => {
        const copy = { ...item };
        delete (copy as any).medicine;
        return copy;
      });

      const chunkSize = 50;
      for (let i = 0; i < cleanItems.length; i += chunkSize) {
        const chunk = cleanItems.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('order_items')
          .upsert(chunk);
        if (error) {
          console.warn('Order items restore warning:', error);
        }
      }
      restoredCounts.orderItems = cleanItems.length;
    }

    // 7. Restore local settings
    if (data.settings) {
      if (typeof data.settings.whatsapp_dispatch_number === 'string') {
        localStorage.setItem('mr_whatsapp_dispatch_number', data.settings.whatsapp_dispatch_number);
      }
      if (typeof data.settings.whatsapp_target_type === 'string') {
        localStorage.setItem('mr_whatsapp_target_type', data.settings.whatsapp_target_type);
      }
    }

    return {
      success: true,
      message: `System restored successfully! Restored ${restoredCounts.orders} orders, ${restoredCounts.medicines} medicines, and ${restoredCounts.doctors} doctors.`,
      restoredCounts,
    };
  },

  /**
   * Parse an uploaded JSON backup file
   */
  async parseBackupFile(file: File): Promise<FullBackupFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = e.target?.result as string;
          const parsed = JSON.parse(raw);

          // Verify essentials
          if (!parsed || (!parsed.data && !parsed.doctors && !parsed.medicines)) {
            return reject(new Error('Invalid backup file: Not a recognized Apex MR backup JSON structure.'));
          }

          // If file is structured with top-level data, normalize to FullBackupFile
          if (parsed.data) {
            resolve(parsed as FullBackupFile);
          } else {
            // Older or flat export format normalization
            const normalized: FullBackupFile = {
              schemaVersion: '1.0',
              id: `imported_${Date.now()}`,
              type: 'manual',
              label: file.name.replace('.json', ''),
              timestamp: parsed.timestamp || new Date().toISOString(),
              metadata: parsed.metadata || {
                appName: 'Apex MR Management System',
                appVersion: '2.0.0',
                exportedAt: new Date().toISOString(),
                summary: {
                  doctorsCount: parsed.doctors?.length || 0,
                  medicinesCount: parsed.medicines?.length || 0,
                  ordersCount: parsed.orders?.length || 0,
                  orderItemsCount: parsed.orderItems?.length || 0,
                  doctorRatesCount: parsed.doctorRates?.length || 0,
                  priceHistoryCount: parsed.priceHistory?.length || 0,
                  totalRevenue: 0,
                },
              },
              data: {
                profile: parsed.profile || null,
                doctors: parsed.doctors || [],
                doctorRates: parsed.doctorRates || [],
                medicines: parsed.medicines || [],
                priceHistory: parsed.priceHistory || [],
                orders: parsed.orders || [],
                orderItems: parsed.orderItems || [],
                settings: parsed.settings || {},
              },
            };
            resolve(normalized);
          }
        } catch (err: any) {
          reject(new Error(`Failed to read JSON backup file: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed.'));
      reader.readAsText(file);
    });
  },

  /**
   * Checks if today's 12:00 AM midnight backup needs to run, and executes it if due.
   */
  async checkAndRunScheduledBackup(): Promise<boolean> {
    try {
      const config = this.getConfig();
      if (!config.autoBackupEnabled) return false;

      // Ensure user session exists
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const todayDateStr = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"

      // If already backed up today, do not re-run
      if (config.lastBackupDate === todayDateStr) {
        return false;
      }

      // Check current local time against scheduled time
      // Default scheduledTime is "00:00" (12:00 AM Midnight)
      const [schedHours, schedMins] = (config.scheduledTime || '00:00')
        .split(':')
        .map((num) => parseInt(num, 10) || 0);

      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();

      // Check if current time is at or after scheduled time
      const isPastOrAtSchedule =
        currentHours > schedHours ||
        (currentHours === schedHours && currentMins >= schedMins);

      if (isPastOrAtSchedule) {
        console.log(`[Backup System] Triggering scheduled 12:00 AM Daily Backup for date: ${todayDateStr}`);
        await this.captureFullBackup(
          'auto_midnight',
          `Automated 12:00 AM Daily Backup (${todayDateStr})`,
          false // Never auto-download file silently; prompt user to download or choose later
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('[Backup System] Scheduled backup check failed:', err);
      return false;
    }
  },
};
