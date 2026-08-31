import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SettingsDialogComponent } from './settings-dialog.component';
import { SettingsService, AppSettings } from '../settings.service';
import { GoogleSheetsService, SheetData } from '../google-sheets.service';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

describe('SettingsDialogComponent', () => {
  let component: SettingsDialogComponent;
  let fixture: ComponentFixture<SettingsDialogComponent>;
  let mockGoogleSheetsService: jasmine.SpyObj<GoogleSheetsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<SettingsDialogComponent>>;
  let settingsService: SettingsService;
  let httpTestingController: HttpTestingController;

  const mockSheetData: SheetData = {
    headers: ['Name', 'URL', 'Price', 'SKU'],
    rows: [
      { Name: 'Venus Flytrap', URL: 'https://mikescarnivores.com', Price: '$15', SKU: 'VFT-01' }
    ]
  };

  beforeEach(async () => {
    mockGoogleSheetsService = jasmine.createSpyObj('GoogleSheetsService', ['fetchSheetData']);
    mockGoogleSheetsService.fetchSheetData.and.returnValue(of(mockSheetData));

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [SettingsDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        SettingsService,
        { provide: GoogleSheetsService, useValue: mockGoogleSheetsService },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    settingsService = TestBed.inject(SettingsService);

    fixture = TestBed.createComponent(SettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    const reqs = httpTestingController.match('/api/config');
    reqs.forEach(r => r.flush({ success: true }));
    httpTestingController.verify();
  });

  it('should create and initialize form with current settings', () => {
    expect(component).toBeTruthy();
    expect(component.settingsForm).toBeTruthy();
    expect(component.settingsForm.get('hostPort')?.value).toBe(11180);
    expect(component.variableMappingsArray.length).toBeGreaterThanOrEqual(1);
  });

  it('should add and remove variable mappings', () => {
    const initialCount = component.variableMappingsArray.length;
    component.addMapping({ variableName: 'CARE_INFO', sheetColumn: 'Care', fallback: 'Full sun' });
    expect(component.variableMappingsArray.length).toBe(initialCount + 1);

    component.removeMapping(component.variableMappingsArray.length - 1);
    expect(component.variableMappingsArray.length).toBe(initialCount);
  });

  it('should fetch sheet columns and populate detectedHeaders', () => {
    component.fetchSheetColumns();
    expect(mockGoogleSheetsService.fetchSheetData).toHaveBeenCalled();
    expect(component.detectedHeaders).toEqual(['Name', 'URL', 'Price', 'SKU']);
    expect(component.fetchSuccess).toBeTrue();
    expect(component.isFetchingHeaders).toBeFalse();
  });

  it('should handle error when fetching sheet columns fails', () => {
    mockGoogleSheetsService.fetchSheetData.and.returnValue(throwError(() => new Error('Network error')));
    component.fetchSheetColumns();

    expect(component.fetchError).toBeTruthy();
    expect(component.fetchSuccess).toBeFalse();
    expect(component.isFetchingHeaders).toBeFalse();
  });

  it('should auto-match variables based on detected headers', () => {
    component.detectedHeaders = ['Plant Name', 'Item URL', 'Retail Price'];
    component.autoMatchVariables();

    expect(component.variableMappingsArray.length).toBe(3);
    const firstMapping = component.variableMappingsArray.at(0).value;
    expect(firstMapping.variableName).toBe('PLANT_NAME');
    expect(firstMapping.sheetColumn).toBe('Plant Name');
  });

  it('should save settings and close dialog on valid submission', () => {
    spyOn(settingsService, 'saveSettings');
    component.settingsForm.patchValue({
      sheetName: 'Greenhouse_A',
      hostIp: '10.0.0.50'
    });

    component.onSave();

    expect(settingsService.saveSettings).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should close dialog with false on onCancel()', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });
});
