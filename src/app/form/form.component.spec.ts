import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormComponent, ConfirmationDialog } from './form.component';
import { GoogleSheetsService, SheetData } from '../google-sheets.service';
import { SettingsService, AppSettings } from '../settings.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, take } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

describe('FormComponent and ConfirmationDialog', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;
  let httpTestingController: HttpTestingController;
  let mockGoogleSheetsService: jasmine.SpyObj<GoogleSheetsService>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;
  let mockMatDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmationDialog>>;
  let settingsService: SettingsService;

  const mockSettings: AppSettings = {
    dataSourceType: 'csvUrl',
    spreadsheetUrl: '',
    spreadsheetId: 'test-sheet',
    apiKey: '',
    sheetName: 'Sheet1',
    searchColumn: 'Plant Name',
    hostIp: '127.0.0.1',
    hostPort: 11180,
    remoteApiUrl: '',
    designName: 'MC_Label',
    printerId: 'System-TSC TX310',
    variableMappings: [
      { variableName: 'PLANT_NAME', sheetColumn: 'Plant Name', fallback: "Monstera Deliciosa 'Thai Constellation'" },
      { variableName: 'URL', sheetColumn: 'URL', fallback: 'https://mikescarnivores.com' }
    ]
  };

  const mockSheetData: SheetData = {
    headers: ['Plant Name', 'URL', 'SKU'],
    rows: [
      { 'Plant Name': 'Pothos', 'URL': 'https://pothos.com', 'SKU': 'PO-01' },
      { 'Plant Name': 'Monstera Deliciosa', 'URL': 'https://monstera.com', 'SKU': 'MD-02' },
      { 'Plant Name': 'Alocasia', 'URL': 'https://alocasia.com', 'SKU': 'AL-03' }
    ]
  };

  beforeEach(async () => {
    mockGoogleSheetsService = jasmine.createSpyObj('GoogleSheetsService', ['fetchSheetData', 'getValues']);
    mockGoogleSheetsService.fetchSheetData.and.returnValue(of(mockSheetData));

    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockMatDialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'afterClosed']);
    mockMatDialog.open.and.returnValue(mockMatDialogRef);
    mockMatDialogRef.afterClosed.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [FormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        SettingsService,
        { provide: GoogleSheetsService, useValue: mockGoogleSheetsService },
        { provide: MatDialog, useValue: mockMatDialog }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    settingsService = TestBed.inject(SettingsService);
    settingsService.saveSettings(mockSettings, false);

    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    const historyReqs = httpTestingController.match('/api/history');
    historyReqs.forEach(r => r.flush({ success: true }));
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization and Default Values', () => {
    it('should initialize the form with controls from variable mappings', () => {
      expect(component.plantLabelForm.get('copies')?.value).toBe(1);
      expect(component.plantLabelForm.get('plantName')?.value).toBe(`Monstera Deliciosa 'Thai Constellation'`);
      expect(component.plantLabelForm.get('url')?.value).toBe('https://mikescarnivores.com');
    });

    it('should validate form controls', () => {
      const copiesControl = component.plantLabelForm.get('copies');
      const plantNameControl = component.plantLabelForm.get('plantName');
      const urlControl = component.plantLabelForm.get('url');

      copiesControl?.setValue(null);
      plantNameControl?.setValue('');
      urlControl?.setValue('');
      expect(copiesControl?.valid).toBeFalse();
      expect(plantNameControl?.valid).toBeFalse();
      expect(urlControl?.valid).toBeFalse();

      copiesControl?.setValue(5);
      expect(copiesControl?.valid).toBeTrue();
    });

    it('should fetch plant rows on init', () => {
      expect(mockGoogleSheetsService.fetchSheetData).toHaveBeenCalled();
      expect(component.plantList?.length).toBe(3);
    });

    it('should configure apiUrlToUse using hostIp and hostPort for local access', () => {
      spyOnProperty(component, 'hostname', 'get').and.returnValue('127.0.0.1');
      component.updateApiUrl();
      expect(component.apiUrlToUse).toBe('http://127.0.0.1:11180/api/v1/');
    });
  });

  describe('Autocomplete Filtering', () => {
    it('should filter plant list based on search term', (done: DoneFn) => {
      fixture.detectChanges();

      let emissionCount = 0;
      component.filteredOptions?.subscribe(filtered => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(filtered.length).toBe(3);
        } else if (emissionCount === 2) {
          // 'Pothos' contains 'th'
          expect(filtered.length).toBe(1);
          expect(filtered[0]['Plant Name']).toBe('Pothos');
          done();
        }
      });

      component.autocompleteFormControl.setValue('th');
    });
  });

  describe('Option Selection', () => {
    it('should patch form values when onOptionSelected is triggered', () => {
      fixture.detectChanges();
      const mockEvent = {
        option: {
          value: 'Pothos'
        }
      } as MatAutocompleteSelectedEvent;

      component.onOptionSelected(mockEvent);

      expect(component.plantLabelForm.get('plantName')?.value).toBe('Pothos');
      expect(component.plantLabelForm.get('url')?.value).toBe('https://pothos.com');
    });
  });

  describe('Preview Image', () => {
    it('should generate correct URL for preview image with dynamic variables', () => {
      fixture.detectChanges();
      component.apiUrlToUse = 'http://127.0.0.1:11180/api/v1/';
      component.plantLabelForm.patchValue({
        plantName: 'Test Plant',
        url: 'http://test-url'
      });

      const variables = {
        PLANT_NAME: 'Test Plant',
        URL: 'http://test-url'
      };
      const expectedUrl = `http://127.0.0.1:11180/api/v1/print?design=MC_Label&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      expect(component.previewImage).toBe(expectedUrl);
    });
  });

  describe('Printing Labels', () => {
    it('should make POST request with correct dynamic parameters when printLabel is called', () => {
      fixture.detectChanges();
      component.apiUrlToUse = 'http://127.0.0.1:11180/api/v1/';
      component.plantLabelForm.patchValue({
        copies: 3,
        plantName: 'Orchid',
        url: 'https://orchid.org'
      });

      const fetchSpy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response()));

      component.printLabel();

      const variables = {
        PLANT_NAME: 'Orchid',
        URL: 'https://orchid.org'
      };
      const expectedUrl = `http://127.0.0.1:11180/api/v1/print?design=MC_Label&variables=${encodeURIComponent(JSON.stringify(variables))}&printer=${encodeURIComponent('System-TSC TX310')}&window=show&copies=3`;
      
      expect(fetchSpy).toHaveBeenCalledWith(expectedUrl, {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'include'
      });
    });
  });

  describe('Dialog Interaction', () => {
    it('should open confirmation dialog and print if user confirms', () => {
      fixture.detectChanges();
      spyOn(component, 'printLabel');
      mockMatDialogRef.afterClosed.and.returnValue(of('print'));

      component.openDialog();

      expect(mockMatDialog.open).toHaveBeenCalledWith(ConfirmationDialog, {
        width: '460px',
        data: {
          previewImage: component.previewImage,
          copies: component.plantLabelForm.get('copies')?.value,
          plantName: component.plantLabelForm.get('plantName')?.value,
          url: component.plantLabelForm.get('url')?.value,
          variables: jasmine.any(Object)
        }
      });
      expect(component.printLabel).toHaveBeenCalled();
    });
  });

  describe('Recent Prints History', () => {
    it('should apply a recent print item to the form', () => {
      fixture.detectChanges();
      const mockItem = {
        id: '123',
        timestamp: new Date().toISOString(),
        plantName: 'Nepenthes Rajah',
        url: 'https://carnivores.org',
        copies: 3,
        variables: {
          PLANT_NAME: 'Nepenthes Rajah',
          URL: 'https://carnivores.org'
        }
      };

      component.applyRecentPrint(mockItem);

      expect(component.plantLabelForm.get('plantName')?.value).toBe('Nepenthes Rajah');
      expect(component.plantLabelForm.get('url')?.value).toBe('https://carnivores.org');
      expect(component.plantLabelForm.get('copies')?.value).toBe(3);
    });

    it('should format relative timestamps correctly', () => {
      expect(component.formatTime(new Date().toISOString())).toBe('Just now');
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(component.formatTime(pastDate)).toBe('10m ago');
    });
  });
});

describe('ConfirmationDialog', () => {
  let component: ConfirmationDialog;
  let fixture: ComponentFixture<ConfirmationDialog>;
  let mockMatDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmationDialog>>;

  const mockDialogData = {
    previewImage: 'http://preview-img',
    copies: 5,
    plantName: 'Fern',
    url: 'https://fern.com',
    variables: {
      PLANT_NAME: 'Fern',
      URL: 'https://fern.com',
      PRICE: '$12'
    }
  };

  beforeEach(async () => {
    mockMatDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ConfirmationDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockMatDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and assign data properties and variable entries', () => {
    expect(component).toBeTruthy();
    expect(component.copies).toBe(5);
    expect(component.previewImage).toBe('http://preview-img');
    expect(component.variableEntries.length).toBe(3);
    expect(component.variableEntries[0]).toEqual({ key: 'PLANT_NAME', value: 'Fern' });
    expect(component.variableEntries[2]).toEqual({ key: 'PRICE', value: '$12' });
  });

  it('should close dialog with "print" when print() is called', () => {
    component.print();
    expect(mockMatDialogRef.close).toHaveBeenCalledWith('print');
  });
});
