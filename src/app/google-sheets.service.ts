import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, catchError } from 'rxjs';
import { SettingsService, AppSettings } from './settings.service';

export interface SheetData {
  headers: string[];
  rows: Record<string, string>[];
}

// Backwards-compatible interface for existing components / specs
export interface PlantEntry {
  name: string;
  url: string;
  [key: string]: string;
}

interface SheetsApiResponse {
  values: string[][];
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);

  /**
   * Fetch sheet data dynamically, returning detected headers and rows as key-value maps.
   */
  fetchSheetData(customSettings?: AppSettings): Observable<SheetData> {
    const settings = customSettings || this.settingsService.currentSettings;
    const rawId = settings.spreadsheetId || settings.spreadsheetUrl;
    const spreadsheetId = this.settingsService.extractSpreadsheetId(rawId);
    const sheetName = settings.sheetName || 'Sheet1';

    if (!spreadsheetId) {
      return of({ headers: [], rows: [] });
    }

    // If API Key is present and user chose Google API or has a key configured
    if (settings.apiKey && (settings.dataSourceType === 'googleApi' || !settings.dataSourceType)) {
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:ZZ?key=${settings.apiKey}`;
      return this.http.get<SheetsApiResponse>(apiUrl).pipe(
        map(res => this.transformGridToSheetData(res.values || [])),
        catchError(err => {
          console.warn('Google Sheets API request failed, trying CSV export fallback:', err);
          return this.fetchViaCsv(spreadsheetId, sheetName);
        })
      );
    }

    // Otherwise, fetch via zero-key Google Sheets CSV export
    return this.fetchViaCsv(spreadsheetId, sheetName);
  }

  /**
   * Fetch sheet data via public CSV export URL (no API key required)
   */
  private fetchViaCsv(spreadsheetId: string, sheetName: string): Observable<SheetData> {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    return this.http.get(csvUrl, { responseType: 'text' }).pipe(
      map(csvText => {
        const grid = this.parseCsv(csvText);
        return this.transformGridToSheetData(grid);
      }),
      catchError(err => {
        console.error('Failed to fetch Google Sheet via CSV:', err);
        return of({ headers: [], rows: [] });
      })
    );
  }

  /**
   * Legacy method for backward compatibility with PlantEntry[]
   */
  getValues(customSettings?: AppSettings): Observable<PlantEntry[]> {
    return this.fetchSheetData(customSettings).pipe(
      map(data => {
        const settings = customSettings || this.settingsService.currentSettings;
        const searchCol = settings.searchColumn || (data.headers[0] ?? 'Plant Name');
        
        return data.rows.map(row => {
          const entry: PlantEntry = {
            name: row[searchCol] ?? row[data.headers[0]] ?? 'Unknown Plant',
            url: row['URL'] ?? row['url'] ?? row[data.headers[1]] ?? '',
            ...row
          };
          return entry;
        });
      })
    );
  }

  /**
   * Transforms a 2D string grid (row 0 = headers) into { headers, rows }
   */
  private transformGridToSheetData(grid: string[][]): SheetData {
    if (!grid || grid.length === 0) {
      return { headers: [], rows: [] };
    }

    // Row 0 is the headers
    const rawHeaders = grid[0] || [];
    const headers = rawHeaders.map((h, idx) => (h && h.trim()) ? h.trim() : `Column_${idx + 1}`);

    const rows: Record<string, string>[] = [];
    for (let r = 1; r < grid.length; r++) {
      const rowVals = grid[r];
      if (!rowVals || rowVals.length === 0 || rowVals.every(cell => !cell || cell.trim() === '')) {
        continue; // skip empty rows
      }

      const rowObj: Record<string, string> = {};
      headers.forEach((header, colIdx) => {
        rowObj[header] = rowVals[colIdx] !== undefined && rowVals[colIdx] !== null ? String(rowVals[colIdx]).trim() : '';
      });
      rows.push(rowObj);
    }

    return { headers, rows };
  }

  /**
   * RFC 4180 compliant CSV parser
   */
  parseCsv(text: string): string[][] {
    if (!text) return [];
    const result: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell);
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // handle CRLF
        }
        row.push(cell);
        result.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      result.push(row);
    }

    return result;
  }
}