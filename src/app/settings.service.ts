import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';
import { environment } from './environment';
import { HOST_IP, HOST_PORT, REMOTE_API_URL, DESIGN_NAME, PRINTER_ID } from './app.config';

export interface VariableMapping {
  variableName: string;
  sheetColumn: string;
  fallback?: string;
}

export interface AppSettings {
  dataSourceType: 'csvUrl' | 'googleApi';
  spreadsheetUrl: string;
  spreadsheetId: string;
  apiKey: string;
  sheetName: string;
  searchColumn: string;
  hostIp: string;
  hostPort: number;
  remoteApiUrl: string;
  designName: string;
  printerId: string;
  variableMappings: VariableMapping[];
}

const SETTINGS_STORAGE_KEY = 'plant_stake_labeler_settings';

export const DEFAULT_VARIABLE_MAPPINGS: VariableMapping[] = [
  { variableName: 'PLANT_NAME', sheetColumn: 'Name', fallback: "Monstera Deliciosa 'Thai Constellation'" },
  { variableName: 'URL', sheetColumn: 'URL', fallback: 'https://mikescarnivores.com' }
];

export const DEFAULT_SETTINGS: AppSettings = {
  dataSourceType: environment.apiKey ? 'googleApi' : 'csvUrl',
  spreadsheetUrl: environment.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${environment.spreadsheetId}/edit` : '',
  spreadsheetId: environment.spreadsheetId || '',
  apiKey: environment.apiKey || '',
  sheetName: 'Sheet1',
  searchColumn: 'Name',
  hostIp: HOST_IP,
  hostPort: HOST_PORT,
  remoteApiUrl: REMOTE_API_URL,
  designName: DESIGN_NAME,
  printerId: PRINTER_ID,
  variableMappings: DEFAULT_VARIABLE_MAPPINGS
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly http = inject(HttpClient, { optional: true });
  private settingsSubject = new BehaviorSubject<AppSettings>(this.loadFromLocalStorage());
  settings$: Observable<AppSettings> = this.settingsSubject.asObservable();

  get currentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  /**
   * Syncs configuration from central server (/api/config or /config.json)
   */
  syncFromServer(): void {
    if (!this.http) return;

    this.http.get<AppSettings>('/api/config').pipe(
      catchError(() => this.http ? this.http.get<AppSettings>('/config.json') : of(null)),
      catchError(err => {
        console.info('Using local/cached settings (server config endpoint not reached).', err);
        return of(null);
      })
    ).subscribe(serverConfig => {
      if (serverConfig) {
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...serverConfig,
          variableMappings: serverConfig.variableMappings && serverConfig.variableMappings.length > 0
            ? serverConfig.variableMappings
            : DEFAULT_VARIABLE_MAPPINGS
        };
        this.saveToLocalStorage(merged);
        this.settingsSubject.next(merged);
      }
    });
  }

  private loadFromLocalStorage(): AppSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          variableMappings: parsed.variableMappings && parsed.variableMappings.length > 0 
            ? parsed.variableMappings 
            : DEFAULT_VARIABLE_MAPPINGS
        };
      }
    } catch (e) {
      console.warn('Could not parse saved settings from localStorage, using defaults.', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveToLocalStorage(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  }

  saveSettings(settings: AppSettings, syncRemote: boolean = true): void {
    this.saveToLocalStorage(settings);
    this.settingsSubject.next({ ...settings });

    if (this.http && syncRemote) {
      this.http.post('/api/config', settings).pipe(
        catchError(err => {
          console.warn('Could not persist settings to server /api/config:', err);
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          console.info('Settings successfully synchronized to central server.');
        }
      });
    }
  }

  resetDefaults(): AppSettings {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear settings from localStorage:', e);
    }
    const defaults = { ...DEFAULT_SETTINGS };
    this.saveSettings(defaults);
    return defaults;
  }

  extractSpreadsheetId(urlOrId: string): string {
    if (!urlOrId) return '';
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return urlOrId.trim();
  }
}
