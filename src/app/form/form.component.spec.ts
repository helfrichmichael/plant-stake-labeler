import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormComponent, ConfirmationDialog } from './form.component';
import { GoogleSheetsService, PlantEntry } from '../google-sheets.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, take } from 'rxjs';
import { API_URL, REMOTE_API_URL, DESIGN_NAME, PRINTER_ID } from '../app.config';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

describe('FormComponent and ConfirmationDialog', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;
  let httpTestingController: HttpTestingController;
  let mockGoogleSheetsService: jasmine.SpyObj<GoogleSheetsService>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;
  let mockMatDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmationDialog>>;

  const mockPlantList: PlantEntry[] = [
    { name: 'Pothos', url: 'https://pothos.com' },
    { name: 'Monstera Deliciosa', url: 'https://monstera.com' },
    { name: 'Alocasia', url: 'https://alocasia.com' }
  ];

  beforeEach(async () => {
    mockGoogleSheetsService = jasmine.createSpyObj('GoogleSheetsService', ['getValues']);
    mockGoogleSheetsService.getValues.and.returnValue(of(mockPlantList));

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
        { provide: GoogleSheetsService, useValue: mockGoogleSheetsService },
        { provide: MatDialog, useValue: mockMatDialog }
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization and Default Values', () => {
    it('should initialize the form with default values', () => {
      expect(component.plantLabelForm.get('copies')?.value).toBe(1);
      expect(component.plantLabelForm.get('plantName')?.value).toBe(`Monstera Deliciosa 'Thai Constellation'`);
      expect(component.plantLabelForm.get('url')?.value).toBe('https://mikescarnivores.com');
    });

    it('should validate form controls', () => {
      const copiesControl = component.plantLabelForm.get('copies');
      const plantNameControl = component.plantLabelForm.get('plantName');
      const urlControl = component.plantLabelForm.get('url');

      // Test required validation
      copiesControl?.setValue(null);
      plantNameControl?.setValue('');
      urlControl?.setValue('');
      expect(copiesControl?.valid).toBeFalse();
      expect(plantNameControl?.valid).toBeFalse();
      expect(urlControl?.valid).toBeFalse();

      // Test pattern validation on copies (only numeric)
      copiesControl?.setValue('abc' as any);
      expect(copiesControl?.valid).toBeFalse();

      copiesControl?.setValue(2.5); // pattern requires only digits
      expect(copiesControl?.valid).toBeFalse();

      copiesControl?.setValue(5);
      expect(copiesControl?.valid).toBeTrue();
    });

    it('should fetch and sort plant list on init', () => {
      expect(mockGoogleSheetsService.getValues).toHaveBeenCalled();
      // Should sort alphabetically: Alocasia, Monstera Deliciosa, Pothos
      expect(component.plantList).toEqual([
        { name: 'Alocasia', url: 'https://alocasia.com' },
        { name: 'Monstera Deliciosa', url: 'https://monstera.com' },
        { name: 'Pothos', url: 'https://pothos.com' }
      ]);
    });

    it('should default apiUrlToUse to API_URL when hostname is not a domain', () => {
      spyOnProperty(component, 'hostname', 'get').and.returnValue('127.0.0.1');
      component.apiUrlToUse = API_URL;

      component.ngOnInit();
      expect(component.apiUrlToUse).toBe(API_URL);
    });

    it('should set apiUrlToUse to REMOTE_API_URL when hostname is a domain name', () => {
      spyOnProperty(component, 'hostname', 'get').and.returnValue('mikescarnivores.com');

      component.ngOnInit();
      expect(component.apiUrlToUse).toBe(REMOTE_API_URL);
    });

    it('should default apiUrlToUse to API_URL when hostname is "localhost"', () => {
      spyOnProperty(component, 'hostname', 'get').and.returnValue('localhost');
      component.apiUrlToUse = API_URL;

      component.ngOnInit();
      expect(component.apiUrlToUse).toBe(API_URL);
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
          // 'Pothos' contains 'th' (case-insensitive)
          expect(filtered.length).toBe(1);
          expect(filtered[0].name).toBe('Pothos');
          done();
        }
      });

      component.autocompleteFormControl.setValue('th');
    });

    it('should return empty list if plantList is not loaded', (done: DoneFn) => {
      fixture.detectChanges();
      component.plantList = undefined;

      component.filteredOptions?.pipe(take(1)).subscribe(filtered => {
        expect(filtered).toEqual([]);
        done();
      });

      component.autocompleteFormControl.setValue('any');
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

    it('should not patch form values if option name is not found in plantList', () => {
      fixture.detectChanges();
      const mockEvent = {
        option: {
          value: 'Non-existent Plant'
        }
      } as MatAutocompleteSelectedEvent;

      const oldName = component.plantLabelForm.get('plantName')?.value;
      const oldUrl = component.plantLabelForm.get('url')?.value;

      component.onOptionSelected(mockEvent);

      expect(component.plantLabelForm.get('plantName')?.value).toBe(oldName);
      expect(component.plantLabelForm.get('url')?.value).toBe(oldUrl);
    });
  });

  describe('Preview Image', () => {
    it('should return correct URL for preview image', () => {
      fixture.detectChanges();
      component.apiUrlToUse = 'http://test-api/';
      component.plantLabelForm.patchValue({
        plantName: 'Test Plant',
        url: 'http://test-url'
      });

      const variables = {
        PLANT_NAME: 'Test Plant',
        URL: 'http://test-url'
      };
      const expectedUrl = `http://test-api/print?design=MC_Label&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      expect(component.previewImage).toBe(expectedUrl);
    });
  });

  describe('Printing Labels', () => {
    it('should make POST request with correct parameters when printLabel is called', () => {
      fixture.detectChanges();
      component.apiUrlToUse = 'http://test-api/';
      component.plantLabelForm.patchValue({
        copies: 3,
        plantName: 'Orchid',
        url: 'https://orchid.org'
      });

      component.printLabel();

      const variables = {
        PLANT_NAME: 'Orchid',
        URL: 'https://orchid.org'
      };
      const expectedUrl = `http://test-api/print?design=${encodeURIComponent(DESIGN_NAME)}&variables=${encodeURIComponent(JSON.stringify(variables))}&printer=${encodeURIComponent(PRINTER_ID)}&window=show&copies=3`;
      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });
    });
  });

  describe('Dialog Interaction', () => {
    it('should open confirmation dialog and print if user confirms', () => {
      fixture.detectChanges();
      spyOn(component, 'printLabel');
      mockMatDialogRef.afterClosed.and.returnValue(of('print'));

      component.openDialog();

      expect(mockMatDialog.open).toHaveBeenCalledWith(ConfirmationDialog, {
        width: '450px',
        data: {
          previewImage: component.previewImage,
          copies: component.plantLabelForm.get('copies')?.value,
          plantName: component.plantLabelForm.get('plantName')?.value,
          url: component.plantLabelForm.get('url')?.value
        }
      });
      expect(component.printLabel).toHaveBeenCalled();
    });

    it('should not print if user cancels dialog', () => {
      fixture.detectChanges();
      spyOn(component, 'printLabel');
      mockMatDialogRef.afterClosed.and.returnValue(of(undefined));

      component.openDialog();

      expect(mockMatDialog.open).toHaveBeenCalled();
      expect(component.printLabel).not.toHaveBeenCalled();
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
    url: 'https://fern.com'
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

  it('should create and assign data properties', () => {
    expect(component).toBeTruthy();
    expect(component.copies).toBe(5);
    expect(component.previewImage).toBe('http://preview-img');
    expect(component.plantName).toBe('Fern');
    expect(component.url).toBe('https://fern.com');
  });

  it('should close dialog with "print" when print() is called', () => {
    component.print();
    expect(mockMatDialogRef.close).toHaveBeenCalledWith('print');
  });
});
