import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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

  getValues(): Observable<PlantEntry[]> {
    const url = `${this.baseUrl}/${environment.spreadsheetId}/values/Sheet1!A:B?key=${environment.apiKey}`;

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
  }
}