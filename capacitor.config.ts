import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrmedicinemanager.app',
  appName: 'MR Medicine Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
