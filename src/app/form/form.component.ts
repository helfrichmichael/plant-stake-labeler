import { Component } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { API_URL, DESIGN_NAME, PRINTER_ID } from '../app.config';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [MatGridListModule, ReactiveFormsModule, MatSelectModule, MatInputModule, MatFormFieldModule, HttpClientModule, MatButtonModule,],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent {
  plantLabelForm = new FormGroup({
    copies: new FormControl(1, [Validators.required, Validators.pattern('^[0-9]*$')]),
    plantName: new FormControl(`Monstera Deliciosa 'Thai Constellation'`, [Validators.required]),
    url: new FormControl('https://mikescarnivores.com', [Validators.required]),
  });

  get previewImage() {
    const plantName = `${this.plantLabelForm.get('plantName')?.value}`;
    const url = this.plantLabelForm.get('url')?.value
    return API_URL + `print?design=MC_Label&variables=%7B%22PLANT_NAME%22%3A%22%3Cb%3E${plantName}%3C%2Fb%3E%22%2C%22URL%22%3A%22${url}%22%7D`
  }

  constructor(private readonly http: HttpClient) { }

  printLabel() {
    const copies = this.plantLabelForm.get('copies')?.value;
    const plantName = `<b>${this.plantLabelForm.get('plantName')?.value}</b>`;
    const url = this.plantLabelForm.get('url')?.value
    this.http.post(`http://10.0.0.20:11180/api/v1/print?design=${DESIGN_NAME}&variables={"PLANT_NAME":"${plantName}","URL":"${url}"}&printer=${PRINTER_ID}&window=show&copies=${copies}`, {}).subscribe(result => {
      console.info('Response from Label.live local API: ', result);

    })
  }
}
