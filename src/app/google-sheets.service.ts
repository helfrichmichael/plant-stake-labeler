import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, catchError, of, shareReplay } from 'rxjs';
import { environment } from './environment';

export declare interface PlantEntry {
  name: string;
  url: string;
}

// Define the shape of the Google Sheets API response
interface SheetsResponse {
  values: string[][];
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private readonly http = inject(HttpClient);

  // Load config from assets/config.json, falling back to compile-time environment if missing/empty
  private readonly config$ = this.http.get<{ spreadsheetId?: string; apiKey?: string }>('assets/config.json').pipe(
    catchError(() => of({} as { spreadsheetId?: string; apiKey?: string })),
    map(config => ({
      spreadsheetId: config.spreadsheetId || environment.spreadsheetId,
      apiKey: config.apiKey || environment.apiKey
    })),
    shareReplay(1)
  );

  getValues(): Observable<PlantEntry[]> {
    return this.config$.pipe(
      switchMap(config => {
        const url = `${this.baseUrl}/${config.spreadsheetId}/values/Sheet1!A:B?key=${config.apiKey}`;
        return this.http.get<SheetsResponse>(url).pipe(
          map(res => {
            // 1. Safety check for empty sheets
            const rows = res.values || [];
            
            // 2. Slice(1) to skip headers and map to objects
            return rows.slice(1).map(row => ({
              name: row[0] ?? "Unknown Plant",
              url: row[1] ?? ""
            }));
          })
        );
      })
    );
  }
}