import { Product, QCLog, QCStatus, Inspector } from '../types';

// The ID provided by the user
export const DEFAULT_SHEET_ID = '1z8dRzmp_0y5wTADV_9eufGYZ_k4ly87l1k91OPoTZ28';
const PRODUCT_GID = 0; 
const USER_GID = 1687857950; // New User tab GID

interface SheetTab {
  properties: {
    sheetId: number;
    title: string;
  };
}

export class SheetsService {
  private accessToken: string;
  private sheetId: string;
  private productSheetTitle: string | null = null;
  private userSheetTitle: string | null = null;
  private logSheetTitle: string = 'Log'; // Default expectation

  constructor(accessToken: string, sheetId: string = DEFAULT_SHEET_ID) {
    this.accessToken = accessToken;
    this.sheetId = sheetId;
  }

  private async getHeaders(): Promise<Headers> {
    return new Headers({
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    });
  }

  // Helper to find the actual title of the sheet using the GID
  private async resolveSheetNames() {
    if (this.productSheetTitle && this.userSheetTitle) return;

    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}`, {
        headers: await this.getHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch spreadsheet metadata');
      
      const data = await response.json();
      const sheets = data.sheets as SheetTab[];
      
      // 1. Resolve Product Sheet
      const productSheet = sheets.find(s => s.properties.sheetId === PRODUCT_GID);
      this.productSheetTitle = productSheet ? productSheet.properties.title : (sheets[0]?.properties.title || 'Sheet1');

      // 2. Resolve User Sheet
      const userSheet = sheets.find(s => s.properties.sheetId === USER_GID);
      // Fallback logic if User sheet isn't found by GID (though it should be)
      this.userSheetTitle = userSheet ? userSheet.properties.title : 'User';

      // 3. Resolve Log Sheet
      const logSheet = sheets.find(s => s.properties.title.toLowerCase() === 'log');
      if (logSheet) {
        this.logSheetTitle = logSheet.properties.title;
      }
    } catch (e) {
      console.warn("Could not resolve sheet names, using defaults", e);
      this.productSheetTitle = 'Sheet1';
      this.userSheetTitle = 'User';
    }
  }

  async fetchProducts(): Promise<Product[]> {
    await this.resolveSheetNames();
    const range = `${this.productSheetTitle}!A2:D`; // Assuming header is row 1
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}`,
        { headers: await this.getHeaders() }
      );

      if (!response.ok) {
        console.error('Sheet API Error:', await response.text());
        throw new Error('Failed to fetch products from sheet');
      }

      const data = await response.json();
      const rows = data.values;
      
      if (!rows || rows.length === 0) return [];

      return rows.map((row: string[]) => ({
        id: row[0] || 'UNKNOWN',
        name: row[1] || 'Unknown Product',
        category: row[2] || 'Uncategorized',
        standardPrice: parseFloat(row[3]?.replace('$', '') || '0')
      })).filter((p: Product) => p.id && p.id !== 'UNKNOWN'); // Filter out empty rows
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async fetchInspectors(): Promise<Inspector[]> {
    await this.resolveSheetNames();
    const range = `${this.userSheetTitle}!A2:B`; // Assuming A=ID, B=Name
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}`,
        { headers: await this.getHeaders() }
      );

      if (!response.ok) throw new Error('Failed to fetch inspectors');

      const data = await response.json();
      const rows = data.values;
      
      if (!rows || rows.length === 0) return [];

      return rows.map((row: string[]) => ({
        id: row[0] || 'UNKNOWN',
        name: row[1] || row[0] || 'Unknown User', // Fallback to ID if name missing
      })).filter((i: Inspector) => i.id && i.id !== 'UNKNOWN');
    } catch (error) {
      console.error('Error fetching inspectors:', error);
      return [];
    }
  }

  async fetchLogs(): Promise<QCLog[]> {
    await this.resolveSheetNames();
    // Assuming data starts at A2. 
    // Columns based on appendLog: 
    // A: ID, B: CheckDate, C: ShippingOrderNo, D: ProductID, E: ProductName, F: Inspector, G: Status, H: Notes, I: AI Analysis
    const range = `${this.logSheetTitle}!A2:I`; 

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}`,
        { headers: await this.getHeaders() }
      );

      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      const rows = data.values;

      if (!rows || rows.length === 0) return [];

      return rows.map((row: string[]) => {
        // Safe access to indices
        const id = row[0] || crypto.randomUUID();
        const checkDate = row[1] || new Date().toISOString().split('T')[0];
        const shippingOrderNo = row[2] || '';
        const productId = row[3] || '';
        const productName = row[4] || '';
        const inspector = row[5] || '';
        // Map status string back to Enum, fallback to PASS
        let status = QCStatus.PASS;
        if (row[6] === 'FAIL') status = QCStatus.FAIL;
        if (row[6] === 'WARNING') status = QCStatus.WARNING;
        
        const notes = row[7] || '';
        const aiAnalysis = row[8] || '';

        return {
          id,
          checkDate,
          shippingOrderNo,
          productId,
          productName,
          inspector,
          status,
          notes,
          aiAnalysis,
          timestamp: new Date(checkDate).getTime() // Approximation
        };
      }).reverse(); // Show newest first usually, depending on append order.
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  async appendLog(log: QCLog): Promise<void> {
    await this.resolveSheetNames();
    
    // Map QCLog to columns: ID, Date, ShippingOrderNo, ProductID, ProductName, Inspector, Status, Notes, AI Analysis
    const values = [
      [
        log.id,
        log.checkDate,
        log.shippingOrderNo || '', // New field
        log.productId,
        log.productName,
        log.inspector,
        log.status,
        log.notes,
        log.aiAnalysis || ''
      ]
    ];

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.logSheetTitle}!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({ values })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('Failed to append log:', err);
        throw new Error('Failed to save to Google Sheet');
      }
    } catch (error) {
      console.error('Error appending log:', error);
      throw error;
    }
  }
}