// src/config/index.ts

interface AppConfigType {
  appName: string;
  defaultPageSize: number | string; // Allows both number and string
  fallbackImage: string;
  hideCredentialsInUrl: boolean; // Show or hide credentials in URL client-side
}

// Use the defined type for AppConfig
export const appConfig: AppConfigType = {
  appName: 'Guttihub Stream',
  defaultPageSize: 60,
  fallbackImage: '/fallback.png',
  hideCredentialsInUrl: true, // Set to true to hide credentials in URL client-side
};