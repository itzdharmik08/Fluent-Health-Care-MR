import { UserProfile } from './auth';
import { Doctor, DoctorMedicineRate } from './doctor';
import { Medicine, MedicinePriceHistory } from './medicine';
import { Order, OrderItem } from './order';

export type BackupType = 'auto_midnight' | 'manual' | 'emergency';

export interface BackupSummary {
  doctorsCount: number;
  medicinesCount: number;
  ordersCount: number;
  orderItemsCount: number;
  doctorRatesCount: number;
  priceHistoryCount: number;
  totalRevenue: number;
}

export interface BackupMetadata {
  appVersion: string;
  appName: string;
  exportedAt: string;
  userEmail?: string;
  companyName?: string;
  summary: BackupSummary;
}

export interface BackupDataPayload {
  profile?: UserProfile | null;
  doctors: Doctor[];
  doctorRates: DoctorMedicineRate[];
  medicines: Medicine[];
  priceHistory: MedicinePriceHistory[];
  orders: Order[];
  orderItems: OrderItem[];
  settings?: Record<string, unknown>;
}

export interface FullBackupFile {
  schemaVersion: '1.0';
  id: string;
  type: BackupType;
  label: string;
  timestamp: string;
  metadata: BackupMetadata;
  data: BackupDataPayload;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  type: BackupType;
  label: string;
  sizeBytes: number;
  metadata: BackupMetadata;
  data: BackupDataPayload;
  savedToDevice?: boolean;
  savedToDb?: boolean;
  dbSyncStatus?: 'synced' | 'local_only' | 'error';
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  scheduledTime: string; // e.g. "00:00" for 12:00 AM midnight
  autoDownloadJson: boolean;
  promptDownloadOnBackup?: boolean;
  retentionDays: number;
  lastBackupDate?: string; // "YYYY-MM-DD"
  lastBackupTimestamp?: string;
  lastBackupStatus?: 'success' | 'failed' | 'idle';
  lastBackupMessage?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCounts: {
    doctors: number;
    medicines: number;
    doctorRates: number;
    orders: number;
    orderItems: number;
  };
}
