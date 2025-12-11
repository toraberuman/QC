import { Product, QCLog, AppSettings, Inspector } from '../types';
import { SheetsService, DEFAULT_SHEET_ID } from './sheetsService';

// Simulating the "Source Spreadsheet" (Fallback)
const INITIAL_PRODUCTS: Product[] = [
  { id: 'P-1001', name: 'Titanium Widget A', category: 'Components', standardPrice: 45.00 },
  { id: 'P-1002', name: 'Carbon Fiber Plate', category: 'Materials', standardPrice: 120.50 },
  { id: 'P-1003', name: 'Display Module X1', category: 'Electronics', standardPrice: 89.99 },
  { id: 'P-1004', name: 'Power Unit 500W', category: 'Electronics', standardPrice: 55.00 },
];

const INITIAL_INSPECTORS: Inspector[] = [
  { id: 'U-001', name: '王小明' },
  { id: 'U-002', name: '陳美麗' },
  { id: 'U-003', name: '張志豪' },
];

const STORAGE_KEY_LOGS = 'qc_logs_v1';
const STORAGE_KEY_SETTINGS = 'qc_app_settings_v1';

// Helper to get settings
export const getSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading settings", e);
  }
  return { sheetId: DEFAULT_SHEET_ID, googleAccessToken: '' };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
};

export const getProducts = async (): Promise<Product[]> => {
  const settings = getSettings();
  
  if (settings.googleAccessToken) {
    try {
      const sheetsService = new SheetsService(settings.googleAccessToken, settings.sheetId);
      const products = await sheetsService.fetchProducts();
      if (products.length > 0) return products;
    } catch (error) {
      console.error("Failed to fetch products from sheets, falling back to mock", error);
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(INITIAL_PRODUCTS), 300);
  });
};

export const getInspectors = async (): Promise<Inspector[]> => {
  const settings = getSettings();
  
  if (settings.googleAccessToken) {
    try {
      const sheetsService = new SheetsService(settings.googleAccessToken, settings.sheetId);
      const inspectors = await sheetsService.fetchInspectors();
      if (inspectors.length > 0) return inspectors;
    } catch (error) {
      console.error("Failed to fetch inspectors from sheets, falling back to mock", error);
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(INITIAL_INSPECTORS), 300);
  });
};

export const saveQCLog = async (log: Omit<QCLog, 'id' | 'timestamp'>): Promise<QCLog> => {
  const newLog: QCLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  
  // 1. Always save to LocalStorage (as backup/cache)
  const existingLogs = getQCLogsSync();
  const updatedLogs = [newLog, ...existingLogs];
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updatedLogs));

  // 2. Try to save to Google Sheets
  const settings = getSettings();
  if (settings.googleAccessToken) {
    try {
      const sheetsService = new SheetsService(settings.googleAccessToken, settings.sheetId);
      await sheetsService.appendLog(newLog);
      console.log("Saved to Google Sheet successfully");
    } catch (error) {
      console.error("Failed to save to Google Sheet", error);
    }
  }

  return newLog;
};

export const getQCLogs = async (): Promise<QCLog[]> => {
  const settings = getSettings();
  
  // If connected to sheets, try to load the "Real" database
  if (settings.googleAccessToken) {
    try {
      const sheetsService = new SheetsService(settings.googleAccessToken, settings.sheetId);
      const sheetLogs = await sheetsService.fetchLogs();
      // If we successfully got logs, return them. 
      // Note: This replaces local storage view if successful.
      if (sheetLogs) return sheetLogs;
    } catch (error) {
      console.error("Failed to fetch logs from sheet, falling back to local", error);
    }
  }

  // Fallback to local storage
  return new Promise((resolve) => {
    setTimeout(() => resolve(getQCLogsSync()), 300);
  });
};

// Synchronous helper for internal use
const getQCLogsSync = (): QCLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse logs", e);
    return [];
  }
};

export const clearLogs = (): void => {
  localStorage.removeItem(STORAGE_KEY_LOGS);
};