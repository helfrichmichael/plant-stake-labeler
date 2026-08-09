import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GoogleSheetsService } from './google-sheets.service';
import { environment } from './environment';

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(GoogleSheetsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getValues', () => {
    it('should query correct Google Sheets URL and map response correctly', () => {
      const mockResponse = {
        values: [
          ['Name', 'URL'],
          ['Monstera Deliciosa', 'https://mikescarnivores.com'],
          ['Pothos', 'https://pothos.com']
        ]
      };

      service.getValues().subscribe(plants => {
        expect(plants.length).toBe(2);
        
        expect(plants[0]).toEqual({
          name: 'Monstera Deliciosa',
          url: 'https://mikescarnivores.com'
        });

        expect(plants[1]).toEqual({
          name: 'Pothos',
          url: 'https://pothos.com'
        });
      });

      // Flush config request first
      const configReq = httpTestingController.expectOne('assets/config.json');
      configReq.flush({});

      const expectedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values/Sheet1!A:B?key=${environment.apiKey}`;
      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should slice the header row and map empty columns to default values', () => {
      const mockResponse = {
        values: [
          ['HeaderCol1', 'HeaderCol2'],
          [null as any, null as any],
          ['Fern']
        ]
      };

      service.getValues().subscribe(plants => {
        expect(plants.length).toBe(2);

        expect(plants[0]).toEqual({
          name: 'Unknown Plant',
          url: ''
        });

        expect(plants[1]).toEqual({
          name: 'Fern',
          url: ''
        });
      });

      // Flush config request first
      const configReq = httpTestingController.expectOne('assets/config.json');
      configReq.flush({});

      const expectedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values/Sheet1!A:B?key=${environment.apiKey}`;
      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(mockResponse);
    });

    it('should return empty array if values list is empty or undefined', () => {
      const mockResponse = {
        values: null as any
      };

      service.getValues().subscribe(plants => {
        expect(plants).toEqual([]);
      });

      // Flush config request first
      const configReq = httpTestingController.expectOne('assets/config.json');
      configReq.flush({});

      const expectedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values/Sheet1!A:B?key=${environment.apiKey}`;
      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(mockResponse);
    });
  });
});
