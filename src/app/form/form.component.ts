import { Component, Input, OnInit, inject, Inject } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { API_URL, REMOTE_API_URL, DESIGN_NAME, PRINTER_ID } from '../app.config';
import { HttpClient } from '@angular/common/http';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, startWith, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { GoogleSheetsService, PlantEntry } from '../google-sheets.service';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-form',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent implements OnInit {
  plantList?: PlantEntry[];
  plantLabelForm = new FormGroup({
    copies: new FormControl(1, [Validators.required, Validators.pattern('^[0-9]*$')]),
    plantName: new FormControl(`Monstera Deliciosa 'Thai Constellation'`, [Validators.required]),
    url: new FormControl('https://mikescarnivores.com', [Validators.required]),
  });
  autocompleteFormControl = new FormControl();
  filteredOptions?: Observable<PlantEntry[]>
  readonly dialog = inject(MatDialog);
  readonly googleSheets = inject(GoogleSheetsService)
  apiUrlToUse = API_URL;

  previewImageError = false;
  previewTimeoutId: any;

  get hostname() {
    return window.location.hostname;
  }

  ngOnInit() {
    this.filteredOptions = this.autocompleteFormControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterValues(value || '')),
    );
    // If the requested address is in the format of a domain name (not an IP and not localhost),
    // change the API URL to the REMOTE_API_URL specified in the config file.
    if (this.hostname.match(/[a-z]/i) && this.hostname !== 'localhost') {
      this.apiUrlToUse = REMOTE_API_URL;
    }
    this.googleSheets.getValues().subscribe(plants => this.plantList = plants.sort((a, b) => a.name.localeCompare(b.name)));

    // Reset preview error timeout when user modifies form
    this.plantLabelForm.valueChanges.subscribe(() => {
      this.resetPreviewTimeout();
    });

    // Start initial timeout
    this.resetPreviewTimeout();
  }

  resetPreviewTimeout() {
    this.previewImageError = false;
    if (this.previewTimeoutId) {
      clearTimeout(this.previewTimeoutId);
    }
    this.previewTimeoutId = setTimeout(() => {
      this.previewImageError = true;
    }, 5000); // 5 seconds timeout
  }

  onPreviewLoad() {
    this.previewImageError = false;
    if (this.previewTimeoutId) {
      clearTimeout(this.previewTimeoutId);
      this.previewTimeoutId = null;
    }
  }

  onPreviewError() {
    this.previewImageError = true;
    if (this.previewTimeoutId) {
      clearTimeout(this.previewTimeoutId);
      this.previewTimeoutId = null;
    }
  }

  private filterValues(value: string): PlantEntry[] {
    const filterValue = value.toLowerCase();
    if (!this.plantList) {
      return [];
    }
    const filtered = this.plantList.filter(option => option.name.toLowerCase().includes(filterValue));
    return filtered?.sort((a, b) => a.name.localeCompare(b.name)) || [];

  }

  get previewImage() {
    const plantName = `${this.plantLabelForm.get('plantName')?.value}`;
    const url = this.plantLabelForm.get('url')?.value || '';
    const variables = {
      PLANT_NAME: plantName,
      URL: url
    };
    return this.apiUrlToUse + `print?design=MC_Label&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  }

  constructor(private readonly http: HttpClient) { }

  printLabel() {
    const copies = this.plantLabelForm.get('copies')?.value;
    const plantName = `${this.plantLabelForm.get('plantName')?.value}`;
    const url = this.plantLabelForm.get('url')?.value || '';
    const variables = {
      PLANT_NAME: plantName,
      URL: url
    };
    this.http.post(`${this.apiUrlToUse}print?design=${encodeURIComponent(DESIGN_NAME)}&variables=${encodeURIComponent(JSON.stringify(variables))}&printer=${encodeURIComponent(PRINTER_ID)}&window=show&copies=${copies}`, {}).subscribe(result => {
      console.info('Response from Label LIVE local API: ', result);
    })
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedOptionValue = event.option.value;

    const matchedOption = this.plantList?.find(option => option.name === selectedOptionValue);

    if (matchedOption) {
      this.plantLabelForm.patchValue({
        'plantName': matchedOption.name,
        'url': matchedOption.url,
      });
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '450px',
      data: {
        previewImage: this.previewImage,
        copies: this.plantLabelForm.get('copies')?.value,
        plantName: this.plantLabelForm.get('plantName')?.value,
        url: this.plantLabelForm.get('url')?.value
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
  imports: [MatButtonModule, MatDialogModule, MatIconModule]
})
export class ConfirmationDialog implements OnInit {
  copies?: number;
  previewImage?: string;
  plantName?: string;
  url?: string;
  imageError = false;
  dialogTimeoutId: any;
  readonly dialogRef = inject(MatDialogRef<ConfirmationDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { previewImage: string, copies: number, plantName: string, url: string }) {
    this.copies = data.copies;
    this.previewImage = data.previewImage;
    this.plantName = data.plantName;
    this.url = data.url;
  }

  ngOnInit() {
    this.resetDialogTimeout();
  }

  resetDialogTimeout() {
    this.imageError = false;
    this.dialogTimeoutId = setTimeout(() => {
      this.imageError = true;
    }, 5000); // 5 seconds timeout
  }

  onImageLoad() {
    this.imageError = false;
    if (this.dialogTimeoutId) {
      clearTimeout(this.dialogTimeoutId);
      this.dialogTimeoutId = null;
    }
  }

  onImageError() {
    this.imageError = true;
    if (this.dialogTimeoutId) {
      clearTimeout(this.dialogTimeoutId);
      this.dialogTimeoutId = null;
    }
  }

  print() {
    this.dialogRef.close('print');
  }
}
