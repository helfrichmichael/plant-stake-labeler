import { Component, Input, OnInit, inject, Inject } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { API_URL, REMOTE_API_URL, DESIGN_NAME, PRINTER_ID, PLANT_LIST, PlantList } from '../app.config';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, startWith, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, MatGridListModule, ReactiveFormsModule, MatSelectModule, MatInputModule, MatFormFieldModule, HttpClientModule, MatButtonModule, MatAutocompleteModule, MatCardModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent implements OnInit {
  plantList = PLANT_LIST;
  plantLabelForm = new FormGroup({
    copies: new FormControl(1, [Validators.required, Validators.pattern('^[0-9]*$')]),
    plantName: new FormControl(`Monstera Deliciosa 'Thai Constellation'`, [Validators.required]),
    url: new FormControl('https://mikescarnivores.com', [Validators.required]),
  });
  autocompleteFormControl = new FormControl();
  filteredOptions?: Observable<PlantList[]>
  readonly dialog = inject(MatDialog);
  apiUrlToUse = API_URL;

  ngOnInit() {
    this.filteredOptions = this.autocompleteFormControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterValues(value || '')),
    );
    // If the requested address is in the format of a domain name (not an IP), change the
    // API URL to the REMOTE_API_URL specified in the config file.
    if (window.location.hostname.match(/[a-z]/i)) {
      this.apiUrlToUse = REMOTE_API_URL;
    }
  }

  private filterValues(value: string): PlantList[] {
    const filterValue = value.toLowerCase();
    const filtered = this.plantList.filter(option => option.plantName.toLowerCase().includes(filterValue));
    return filtered.sort((a, b) => a.plantName.localeCompare(b.plantName));
  }

  get previewImage() {
    const plantName = `${this.plantLabelForm.get('plantName')?.value}`;
    const url = this.plantLabelForm.get('url')?.value
    return this.apiUrlToUse + `print?design=MC_Label&variables=%7B%22PLANT_NAME%22%3A%22%3Cb%3E${plantName}%3C%2Fb%3E%22%2C%22URL%22%3A%22${url}%22%7D`
  }

  constructor(private readonly http: HttpClient) { }

  printLabel() {
    const copies = this.plantLabelForm.get('copies')?.value;
    const plantName = `<b>${this.plantLabelForm.get('plantName')?.value}</b>`;
    const url = this.plantLabelForm.get('url')?.value
    this.http.post(`apiUrlToUse/api/v1/print?design=${DESIGN_NAME}&variables={"PLANT_NAME":"${plantName}","URL":"${url}"}&printer=${PRINTER_ID}&window=show&copies=${copies}`, {}).subscribe(result => {
      console.info('Response from Label.live local API: ', result);

    })
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedOptionValue = event.option.value;

    const matchedOption = this.plantList.find(option => option.plantName === selectedOptionValue);

    if (matchedOption) {
      this.plantLabelForm.patchValue({
        'plantName': matchedOption.plantName,
        'url': matchedOption.url,
      });
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '250px',
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
  standalone: true,
  selector: 'confirmation-dialog',
  templateUrl: 'confirmation-dialog.html',
  imports: [MatButtonModule, MatDialogModule],
})
export class ConfirmationDialog {
  copies?: number;
  previewImage?: string;
  plantName?: string;
  url?: string;
  readonly dialogRef = inject(MatDialogRef<ConfirmationDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { previewImage: string, copies: number, plantName: string, url: string }) {
    this.copies = data.copies;
    this.previewImage = data.previewImage;
    this.plantName = data.plantName;
    this.url = data.url;
  }

  print() {
    this.dialogRef.close('print');
  }
}
