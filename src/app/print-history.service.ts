import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';

export interface PrintHistoryItem {
  id: string;
  timestamp: string;
  plantName: string;
  url: string;
  copies: number;
  variables: Record<string, string>;
}

const HISTORY_STORAGE_KEY = 'plant_stake_labeler_history';

@Injectable({
  providedIn: 'root'
})
export class PrintHistoryService {
  private readonly http = inject(HttpClient);
  private readonly historySubject = new BehaviorSubject<PrintHistoryItem[]>(this.loadLocalHistory());
  readonly history$: Observable<PrintHistoryItem[]> = this.historySubject.asObservable();

  get currentHistory(): PrintHistoryItem[] {
    return this.historySubject.value;
  }

  loadLocalHistory(): PrintHistoryItem[] {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveLocalHistory(items: PrintHistoryItem[]): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage limit errors
    }
  }

  syncFromServer(): void {
    this.http.get<PrintHistoryItem[]>('/api/history').pipe(
      tap(items => {
        if (Array.isArray(items)) {
          this.historySubject.next(items);
          this.saveLocalHistory(items);
        }
      }),
      catchError(() => of(this.loadLocalHistory()))
    ).subscribe();
  }

  addEntry(entry: Omit<PrintHistoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): void {
    const fullEntry: PrintHistoryItem = {
      id: entry.id || Date.now().toString(),
      timestamp: entry.timestamp || new Date().toISOString(),
      plantName: entry.plantName,
      url: entry.url,
      copies: entry.copies || 1,
      variables: entry.variables || {}
    };

    const current = this.currentHistory.filter(h => h.id !== fullEntry.id);
    const updated = [fullEntry, ...current].slice(0, 50);

    this.historySubject.next(updated);
    this.saveLocalHistory(updated);

    // Sync to central backend if available
    this.http.post('/api/history', fullEntry).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  clearHistory(): void {
    this.historySubject.next([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {}

    this.http.delete('/api/history').pipe(
      catchError(() => of(null))
    ).subscribe();
  }
}
