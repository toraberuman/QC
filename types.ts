export enum QCStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  standardPrice: number;
}

export interface Inspector {
  id: string;
  name: string;
}

export interface QCLog {
  id: string;
  productId: string;
  productName: string; // Denormalized for spreadsheet simplicity
  shippingOrderNo: string; // New field: Shipping Order Number
  checkDate: string;
  inspector: string;
  notes: string;
  status: QCStatus;
  aiAnalysis?: string; // Additional insights from Gemini
  timestamp: number;
}

export interface QCStats {
  total: number;
  pass: number;
  fail: number;
  warning: number;
}

export interface AppSettings {
  sheetId: string;
  googleClientId?: string; // New: For auto-login
  googleAccessToken: string;
}