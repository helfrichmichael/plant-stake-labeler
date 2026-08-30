import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { SettingsService, AppSettings, VariableMapping } from '../settings.service';
import { GoogleSheetsService } from '../google-sheets.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatRadioModule,
    MatDividerModule
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly googleSheetsService = inject(GoogleSheetsService);
  readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);

  settingsForm!: FormGroup;
  detectedHeaders: string[] = [];
  isFetchingHeaders = false;
  fetchError: string | null = null;
  fetchSuccess = false;

  get variableMappingsArray(): FormArray {
    return this.settingsForm.get('variableMappings') as FormArray;
  }

  ngOnInit(): void {
    const current = this.settingsService.currentSettings;

    this.settingsForm = this.fb.group({
      dataSourceType: [current.dataSourceType || 'csvUrl', Validators.required],
      spreadsheetUrl: [current.spreadsheetUrl || ''],
      spreadsheetId: [current.spreadsheetId || ''],
      apiKey: [current.apiKey || ''],
      sheetName: [current.sheetName || 'Sheet1', Validators.required],
      searchColumn: [current.searchColumn || 'Plant Name', Validators.required],
      hostIp: [current.hostIp || '127.0.0.1', Validators.required],
      hostPort: [current.hostPort || 11180, [Validators.required, Validators.min(1)]],
      remoteApiUrl: [current.remoteApiUrl || ''],
      designName: [current.designName || 'MC_Label', Validators.required],
      printerId: [current.printerId || '', Validators.required],
      variableMappings: this.fb.array([])
    });

    // Populate variable mappings
    if (current.variableMappings && current.variableMappings.length > 0) {
      current.variableMappings.forEach(mapping => this.addMappingControl(mapping));
    } else {
      this.addMappingControl({ variableName: 'PLANT_NAME', sheetColumn: 'Plant Name' });
      this.addMappingControl({ variableName: 'URL', sheetColumn: 'URL' });
    }

    // Auto-fetch headers on open if spreadsheet is configured
    if (current.spreadsheetId || current.spreadsheetUrl) {
      this.fetchSheetColumns();
    }
  }

  createMappingGroup(mapping?: VariableMapping): FormGroup {
    return this.fb.group({
      variableName: [mapping?.variableName || '', Validators.required],
      sheetColumn: [mapping?.sheetColumn || '', Validators.required],
      fallback: [mapping?.fallback || '']
    });
  }

  addMapping(mapping?: VariableMapping): void {
    this.variableMappingsArray.push(this.createMappingGroup(mapping));
  }

  private addMappingControl(mapping: VariableMapping): void {
    this.variableMappingsArray.push(this.createMappingGroup(mapping));
  }

  removeMapping(index: number): void {
    this.variableMappingsArray.removeAt(index);
  }

  fetchSheetColumns(): void {
    this.isFetchingHeaders = true;
    this.fetchError = null;
    this.fetchSuccess = false;

    const formValues = this.settingsForm.value;
    const tempSettings: AppSettings = {
      ...formValues,
      spreadsheetId: this.settingsService.extractSpreadsheetId(formValues.spreadsheetUrl || formValues.spreadsheetId)
    };

    this.googleSheetsService.fetchSheetData(tempSettings).subscribe({
      next: (data) => {
        this.isFetchingHeaders = false;
        this.detectedHeaders = data.headers;
        if (data.headers.length > 0) {
          this.fetchSuccess = true;
          // If current searchColumn isn't in detected headers, pick the first header
          const currentSearch = this.settingsForm.get('searchColumn')?.value;
          if (!data.headers.includes(currentSearch)) {
            this.settingsForm.patchValue({ searchColumn: data.headers[0] });
          }
        } else {
          this.fetchError = 'No columns detected. Please verify your Spreadsheet ID/URL and sharing permissions.';
        }
      },
      error: (err) => {
        this.isFetchingHeaders = false;
        this.fetchError = 'Failed to fetch spreadsheet columns. Check your connection or sharing settings.';
        console.error(err);
      }
    });
  }

  autoMatchVariables(): void {
    if (this.detectedHeaders.length === 0) {
      this.fetchSheetColumns();
      return;
    }

    // Clear existing mappings and create mappings for all detected headers
    while (this.variableMappingsArray.length !== 0) {
      this.variableMappingsArray.removeAt(0);
    }

    this.detectedHeaders.forEach(header => {
      // Normalize header name to uppercase variable name (e.g. "Plant Name" -> "PLANT_NAME")
      const varName = header.replace(/\s+/g, '_').toUpperCase();
      this.addMapping({
        variableName: varName,
        sheetColumn: header,
        fallback: ''
      });
    });
  }

  onSave(): void {
    if (this.settingsForm.invalid) {
      return;
    }

    const formVal = this.settingsForm.value;
    const extractedId = this.settingsService.extractSpreadsheetId(formVal.spreadsheetUrl || formVal.spreadsheetId);

    const updatedSettings: AppSettings = {
      ...formVal,
      spreadsheetId: extractedId,
      variableMappings: formVal.variableMappings || []
    };

    this.settingsService.saveSettings(updatedSettings);
    this.dialogRef.close(true);
  }

  onResetDefaults(): void {
    if (confirm('Reset all settings to default configuration?')) {
      this.settingsService.resetDefaults();
      this.dialogRef.close(true);
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
