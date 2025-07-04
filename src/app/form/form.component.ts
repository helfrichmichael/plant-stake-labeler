import { Component } from '@angular/core';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatButtonModule} from '@angular/material/button';
import {FormGroup, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { API_URL, DESIGN_NAME } from '../app.config';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [MatGridListModule, ReactiveFormsModule, MatSelectModule, MatInputModule,MatFormFieldModule, HttpClientModule, MatButtonModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent {
  plantLabelForm = new FormGroup({
    copies: new FormControl(0, [Validators.required, Validators.pattern('^[0-9]*$')]),
    plantName: new FormControl(`Monstera Deliciosa 'Thai Constellation'`,[Validators.required]),
    url: new FormControl('https://mikescarnivores.com',[Validators.required]),
  });

  get previewImage() {
    console.info('Rendering');
    return API_URL + `print?design=${DESIGN_NAME}&variables=%7B%22PLANT_NAME%22%3A%22%3Cb%3E${this.plantLabelForm.get('plantName')?.value}%3C%2Fb%3E%22%7D`
  }

  constructor(private readonly http: HttpClient) {}

  printLabel() {
    const request = {
      'design': DESIGN_NAME,
      'variables': {
        'PLANT_NAME': `<b>${this.plantLabelForm.get('plantName')?.value}</b>`,
        'URL': `${this.plantLabelForm.get('url')?.value}`
      },
      'printer': 'Microsoft Print to PDF',
      'window': 'show',
      'copies': this.plantLabelForm.get('copies')?.value,
    }
    this.http.post(`print?design=${DESIGN_NAME}`, request).subscribe(result => {
      console.info('Response from Label.live local API: ', result);
    })
  }
}
