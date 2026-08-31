import { Component, OnInit, inject } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { FormComponent } from './form/form.component';
import { SettingsService } from './settings.service';
import { PrintHistoryService } from './print-history.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FormComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly historyService = inject(PrintHistoryService);

  ngOnInit(): void {
    this.settingsService.syncFromServer();
    this.historyService.syncFromServer();
  }
}
