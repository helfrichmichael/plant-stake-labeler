import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GoogleSheetsService } from './google-sheets.service';
import { SettingsService, AppSettings } from './settings.service';

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  let httpTestingController: HttpTestingController;
  let settingsService: SettingsService;

  const mockSettings: AppSettings = {
    dataSourceType: 'googleApi',
    spreadsheetUrl: '',
    spreadsheetId: 'test-sheet-id',
    apiKey: 'test-api-key',
    sheetName: 'Sheet1',
    searchColumn: 'Name',
    hostIp: '127.0.0.1',
    hostPort: 11180,
    remoteApiUrl: '',
    designName: 'MC_Label',
    printerId: 'TSC-TX310',
    variableMappings: [
      { variableName: 'PLANT_NAME', sheetColumn: 'Name' },
      { variableName: 'URL', sheetColumn: 'URL' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingsService
      ]
    });
    service = TestBed.inject(GoogleSheetsService);
    httpTestingController = TestBed.inject(HttpTestingController);
    settingsService = TestBed.inject(SettingsService);
    spyOnProperty(settingsService, 'currentSettings', 'get').and.returnValue(mockSettings);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchSheetData with Google API', () => {
    it('should query Google Sheets API and return headers and key-value rows', () => {
      const mockApiResponse = {
        values: [
          ['Name', 'URL', 'Price', 'SKU'],
          ['Monstera Deliciosa', 'https://mikescarnivores.com', '$25', 'MD-01'],
          ['Pothos', 'https://pothos.com', '$15', 'PO-02']
        ]
      };

      service.fetchSheetData(mockSettings).subscribe(data => {
        expect(data.headers).toEqual(['Name', 'URL', 'Price', 'SKU']);
        expect(data.rows.length).toBe(2);
        expect(data.rows[0]).toEqual({
          Name: 'Monstera Deliciosa',
          URL: 'https://mikescarnivores.com',
          Price: '$25',
          SKU: 'MD-01'
        });
        expect(data.rows[1]).toEqual({
          Name: 'Pothos',
          URL: 'https://pothos.com',
          Price: '$15',
          SKU: 'PO-02'
        });
      });

      const expectedUrl = `https://sheets.googleapis.com/v4/spreadsheets/test-sheet-id/values/Sheet1!A:ZZ?key=test-api-key`;
      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });
  });

  describe('fetchSheetData with CSV Export', () => {
    it('should fetch CSV and parse headers and rows correctly', () => {
      const csvSettings: AppSettings = {
        ...mockSettings,
        dataSourceType: 'csvUrl',
        apiKey: ''
      };

      const csvContent = `"Name","URL","SKU"\n"Sarracenia flava","https://mikescarnivores.com/flava","SF-01"\n"Nepenthes","https://mikescarnivores.com/nep","NP-02"`;

      service.fetchSheetData(csvSettings).subscribe(data => {
        expect(data.headers).toEqual(['Name', 'URL', 'SKU']);
        expect(data.rows.length).toBe(2);
        expect(data.rows[0]['Name']).toBe('Sarracenia flava');
        expect(data.rows[0]['SKU']).toBe('SF-01');
      });

      const expectedUrl = `https://docs.google.com/spreadsheets/d/test-sheet-id/gviz/tq?tqx=out:csv&sheet=Sheet1`;
      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(csvContent);
    });
  });

  describe('parseCsv', () => {
    it('should handle quoted cells with commas', () => {
      const input = '"Col 1","Col, with comma","Col 3"\n"Val 1","Val, with comma","Val 3"';
      const parsed = service.parseCsv(input);
      expect(parsed.length).toBe(2);
      expect(parsed[0]).toEqual(['Col 1', 'Col, with comma', 'Col 3']);
      expect(parsed[1]).toEqual(['Val 1', 'Val, with comma', 'Val 3']);
    });
  });

  describe('getValues (legacy method)', () => {
    it('should return PlantEntry objects mapping to searchColumn and URL', () => {
      const mockApiResponse = {
        values: [
          ['Name', 'URL'],
          ['Monstera', 'https://monstera.com'],
          ['Fern', 'https://fern.com']
        ]
      };

      service.getValues(mockSettings).subscribe(plants => {
        expect(plants.length).toBe(2);
        expect(plants[0].name).toBe('Monstera');
        expect(plants[0].url).toBe('https://monstera.com');
      });

      const expectedUrl = `https://sheets.googleapis.com/v4/spreadsheets/test-sheet-id/values/Sheet1!A:ZZ?key=test-api-key`;
      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(mockApiResponse);
    });
  });
});
