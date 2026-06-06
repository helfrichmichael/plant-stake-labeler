import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { GoogleSheetsService } from './google-sheets.service';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('AppComponent', () => {
  let mockGoogleSheetsService: any;

  beforeEach(async () => {
    mockGoogleSheetsService = {
      getValues: jasmine.createSpy('getValues').and.returnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: GoogleSheetsService, useValue: mockGoogleSheetsService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render header and form components in layout', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const mainContentEl = fixture.debugElement.query(By.css('.main-content'));
    expect(mainContentEl).toBeTruthy();

    const headerEl = fixture.debugElement.query(By.css('app-header'));
    expect(headerEl).toBeTruthy();

    const formEl = fixture.debugElement.query(By.css('app-form'));
    expect(formEl).toBeTruthy();
  });
});
