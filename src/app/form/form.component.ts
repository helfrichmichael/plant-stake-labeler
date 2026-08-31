import { Component, OnInit, OnDestroy, inject, Inject } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpClient } from '@angular/common/http';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, startWith, map, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { GoogleSheetsService } from '../google-sheets.service';
import { SettingsService, AppSettings, VariableMapping } from '../settings.service';
import { SettingsDialogComponent } from '../settings-dialog/settings-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent implements OnInit, OnDestroy {
  plantList?: Record<string, string>[];
  plantLabelForm: FormGroup = new FormGroup({
    copies: new FormControl(1, [Validators.required, Validators.pattern('^[0-9]*$')]),
    plantName: new FormControl(`Monstera Deliciosa 'Thai Constellation'`, [Validators.required]),
    url: new FormControl('https://mikescarnivores.com', [Validators.required])
  });

  autocompleteFormControl = new FormControl();
  filteredOptions?: Observable<Record<string, string>[]>;
  readonly dialog = inject(MatDialog);
  readonly googleSheets = inject(GoogleSheetsService);
  readonly settingsService = inject(SettingsService);

  currentSettings: AppSettings = this.settingsService.currentSettings;
  detectedHeaders: string[] = [];
  apiUrlToUse = '';
  previewImageError = false;
  isPreviewLoading = false;
  private settingsSub?: Subscription;
  private formSub?: Subscription;

  constructor() {
    this.updateApiUrl();
  }

  get hostname(): string {
    return window.location.hostname;
  }

  get searchColumn(): string {
    const configured = this.currentSettings.searchColumn || 'Plant Name';
    if (this.detectedHeaders.length > 0 && !this.detectedHeaders.includes(configured)) {
      const match = this.detectedHeaders.find(h => h.toLowerCase() === configured.toLowerCase());
      return match || this.detectedHeaders[0];
    }
    return configured;
  }

  get variableMappings(): VariableMapping[] {
    return this.currentSettings.variableMappings || [];
  }

  ngOnInit(): void {
    this.updateApiUrl();
    this.settingsSub = this.settingsService.settings$.subscribe(settings => {
      this.currentSettings = settings;
      this.updateApiUrl();
      this.rebuildForm();
      this.loadPlantList();
    });
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
    this.formSub?.unsubscribe();
  }

  updateApiUrl(): void {
    const { hostIp, hostPort, remoteApiUrl } = this.currentSettings;
    const isDomain = this.hostname.match(/[a-z]/i) && this.hostname !== 'localhost' && !this.hostname.endsWith('.local');

    if (isDomain && remoteApiUrl) {
      this.apiUrlToUse = remoteApiUrl.endsWith('/') ? remoteApiUrl : `${remoteApiUrl}/`;
    } else {
      const ip = hostIp || '127.0.0.1';
      const port = hostPort || 11180;
      this.apiUrlToUse = `http://${ip}:${port}/api/v1/`;
    }

    if (window.location.protocol === 'https:' && this.apiUrlToUse.startsWith('http:')) {
      this.apiUrlToUse = this.apiUrlToUse.replace('http:', 'https:');
    }
  }

  rebuildForm(): void {
    const group: Record<string, FormControl> = {
      copies: new FormControl(1, [Validators.required, Validators.pattern('^[0-9]*$')])
    };

    this.variableMappings.forEach(mapping => {
      const fallbackVal = mapping.fallback || '';
      if (mapping.variableName === 'PLANT_NAME' && !group['plantName']) {
        group['plantName'] = new FormControl(fallbackVal || `Monstera Deliciosa 'Thai Constellation'`, [Validators.required]);
      } else if (mapping.variableName === 'URL' && !group['url']) {
        group['url'] = new FormControl(fallbackVal || 'https://mikescarnivores.com', [Validators.required]);
      } else {
        group[mapping.variableName] = new FormControl(fallbackVal, [Validators.required]);
      }
    });

    if (this.variableMappings.length === 0) {
      group['plantName'] = new FormControl(`Monstera Deliciosa 'Thai Constellation'`, [Validators.required]);
      group['url'] = new FormControl('https://mikescarnivores.com', [Validators.required]);
    }

    this.formSub?.unsubscribe();
    this.plantLabelForm = new FormGroup(group);

    this.formSub = this.plantLabelForm.valueChanges.subscribe(() => {
      this.previewImageError = false;
      this.isPreviewLoading = true;
    });

    this.previewImageError = false;
    this.isPreviewLoading = true;
  }

  loadPlantList(): void {
    this.googleSheets.fetchSheetData(this.currentSettings).subscribe({
      next: (data) => {
        this.detectedHeaders = data.headers;
        this.plantList = data.rows;
        this.setupAutocomplete();
      },
      error: (err) => {
        console.error('Failed to load plant list:', err);
        this.detectedHeaders = [];
        this.plantList = [];
        this.setupAutocomplete();
      }
    });
  }

  setupAutocomplete(): void {
    this.filteredOptions = this.autocompleteFormControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterValues(value || ''))
    );
  }

  onPreviewLoad(): void {
    this.previewImageError = false;
    this.isPreviewLoading = false;
  }

  onPreviewError(): void {
    this.previewImageError = true;
    this.isPreviewLoading = false;
  }

  private filterValues(value: string): Record<string, string>[] {
    const filterValue = value.toLowerCase();
    if (!this.plantList || this.plantList.length === 0) {
      return [];
    }

    const searchCol = this.searchColumn;
    const filtered = this.plantList.filter(row => {
      const cellVal = this.resolveRowValue(row, searchCol, 'PLANT_NAME', Object.values(row)[0] || '');
      return cellVal.toLowerCase().includes(filterValue);
    });

    return filtered.sort((a, b) => {
      const valA = this.resolveRowValue(a, searchCol, 'PLANT_NAME', Object.values(a)[0] || '');
      const valB = this.resolveRowValue(b, searchCol, 'PLANT_NAME', Object.values(b)[0] || '');
      return valA.localeCompare(valB);
    });
  }

  getDisplayValue(row: Record<string, string>): string {
    return this.resolveRowValue(row, this.searchColumn, 'PLANT_NAME', Object.values(row)[0] || '');
  }

  /**
   * Resilient row value resolver that handles exact, case-insensitive, and smart semantic column matches.
   */
  resolveRowValue(row: Record<string, string>, sheetColumnName: string, variableName: string, fallback: string = ''): string {
    if (!row) return fallback;

    // 1. Direct exact match
    if (row[sheetColumnName] !== undefined && row[sheetColumnName] !== '') {
      return row[sheetColumnName];
    }

    // 2. Case-insensitive / whitespace-trimmed match in row keys
    const normalizedTarget = (sheetColumnName || '').trim().toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.trim().toLowerCase() === normalizedTarget && row[key] !== '') {
        return row[key];
      }
    }

    // 3. Smart match for Plant Name / Title variables
    if (variableName === 'PLANT_NAME' || variableName.includes('NAME') || variableName.includes('TITLE')) {
      const searchCol = this.searchColumn;
      if (row[searchCol] !== undefined && row[searchCol] !== '') {
        return row[searchCol];
      }
      for (const candidate of ['Name', 'Plant Name', 'Plant', 'Title', 'Item', 'Item Name']) {
        for (const k of Object.keys(row)) {
          if (k.trim().toLowerCase() === candidate.toLowerCase() && row[k] !== '') {
            return row[k];
          }
        }
      }
    }

    // 4. Smart match for URL / Link variables
    if (variableName === 'URL' || variableName.includes('URL') || variableName.includes('LINK')) {
      for (const candidate of ['URL', 'Link', 'QR', 'Website', 'Web', 'Link URL']) {
        for (const k of Object.keys(row)) {
          if (k.trim().toLowerCase() === candidate.toLowerCase() && row[k] !== '') {
            return row[k];
          }
        }
      }
      for (const val of Object.values(row)) {
        if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('www.') || val.includes('.com') || val.includes('.org') || val.includes('.net'))) {
          return val;
        }
      }
    }

    // 5. Check if variable name itself matches a column in row
    for (const k of Object.keys(row)) {
      if (k.trim().toLowerCase() === variableName.trim().toLowerCase() && row[k] !== '') {
        return row[k];
      }
    }

    return fallback;
  }

  getVariablesPayload(): Record<string, string> {
    const variables: Record<string, string> = {};

    this.variableMappings.forEach(mapping => {
      let val = '';
      if (mapping.variableName === 'PLANT_NAME' && this.plantLabelForm.get('plantName')) {
        val = this.plantLabelForm.get('plantName')?.value;
      } else if (mapping.variableName === 'URL' && this.plantLabelForm.get('url')) {
        val = this.plantLabelForm.get('url')?.value;
      } else {
        val = this.plantLabelForm.get(mapping.variableName)?.value;
      }
      variables[mapping.variableName] = val !== null && val !== undefined ? String(val) : (mapping.fallback || '');
    });

    if (Object.keys(variables).length === 0 || this.variableMappings.length === 0) {
      variables['PLANT_NAME'] = `${this.plantLabelForm.get('plantName')?.value || 'Monstera Deliciosa'}`;
      variables['URL'] = `${this.plantLabelForm.get('url')?.value || 'https://mikescarnivores.com'}`;
    }

    return variables;
  }

  get previewImage(): string {
    if (!this.apiUrlToUse) {
      this.updateApiUrl();
    }
    const variables = this.getVariablesPayload();
    const design = this.currentSettings.designName || 'MC_Label';
    return `${this.apiUrlToUse}print?design=${encodeURIComponent(design)}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  }

  printLabel(): void {
    const copies = this.plantLabelForm.get('copies')?.value || 1;
    const variables = this.getVariablesPayload();
    const design = this.currentSettings.designName || 'MC_Label';
    const printer = this.currentSettings.printerId || 'System-TSC TX310';

    const printUrl = `${this.apiUrlToUse}print?design=${encodeURIComponent(design)}&variables=${encodeURIComponent(JSON.stringify(variables))}&printer=${encodeURIComponent(printer)}&window=show&copies=${copies}`;

    fetch(printUrl, {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'include'
    })
    .then(() => {
      console.info('Print command sent to Label LIVE API');
    })
    .catch(error => {
      console.error('Failed to send print command to Label LIVE API:', error);
    });
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const selectedTitle = event.option.value;

    const matchedRow = this.plantList?.find(row => {
      const cellVal = this.getDisplayValue(row);
      return cellVal === selectedTitle;
    });

    if (matchedRow) {
      const patchObj: Record<string, any> = {};

      this.variableMappings.forEach(mapping => {
        const rowVal = this.resolveRowValue(matchedRow, mapping.sheetColumn, mapping.variableName, mapping.fallback || '');
        if (mapping.variableName === 'PLANT_NAME' && this.plantLabelForm.get('plantName')) {
          patchObj['plantName'] = rowVal;
        } else if (mapping.variableName === 'URL' && this.plantLabelForm.get('url')) {
          patchObj['url'] = rowVal;
        } else if (this.plantLabelForm.get(mapping.variableName)) {
          patchObj[mapping.variableName] = rowVal;
        }
      });

      if (this.variableMappings.length === 0) {
        patchObj['plantName'] = this.resolveRowValue(matchedRow, 'Plant Name', 'PLANT_NAME', selectedTitle);
        patchObj['url'] = this.resolveRowValue(matchedRow, 'URL', 'URL', '');
      }

      this.plantLabelForm.patchValue(patchObj);
      this.previewImageError = false;
      this.isPreviewLoading = true;
    }
  }

  openSettings(): void {
    this.dialog.open(SettingsDialogComponent, {
      width: '680px',
      maxWidth: '95vw'
    });
  }

  openDialog(): void {
    const variables = this.getVariablesPayload();
    const copies = this.plantLabelForm.get('copies')?.value || 1;
    const primaryTitle = variables['PLANT_NAME'] || Object.values(variables)[0] || 'Plant Label';
    const primaryUrl = variables['URL'] || '';

    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '460px',
      data: {
        previewImage: this.previewImage,
        copies,
        plantName: primaryTitle,
        url: primaryUrl,
        variables
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'print') {
        this.printLabel();
      }
    });
  }
}

@Component({
  selector: 'confirmation-dialog',
  templateUrl: 'confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule]
})
export class ConfirmationDialog implements OnInit {
  copies?: number;
  previewImage?: string;
  plantName?: string;
  url?: string;
  variables: Record<string, string> = {};
  imageError = false;
  readonly dialogRef = inject(MatDialogRef<ConfirmationDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { previewImage: string, copies: number, plantName: string, url: string, variables?: Record<string, string> }) {
    this.copies = data.copies;
    this.previewImage = data.previewImage;
    this.plantName = data.plantName;
    this.url = data.url;
    this.variables = data.variables || {};
  }

  get variableEntries(): Array<{ key: string, value: string }> {
    return Object.entries(this.variables).map(([key, value]) => ({ key, value }));
  }

  ngOnInit(): void {
    this.imageError = false;
  }

  onImageLoad(): void {
    this.imageError = false;
  }

  onImageError(): void {
    this.imageError = true;
  }

  print(): void {
    this.dialogRef.close('print');
  }
}
