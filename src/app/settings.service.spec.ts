import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SettingsService, AppSettings, DEFAULT_SETTINGS } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpTestingController: HttpTestingController;

  const mockCustomSettings: AppSettings = {
    dataSourceType: 'csvUrl',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/abc123xyz/edit',
    spreadsheetId: 'abc123xyz',
    apiKey: '',
    sheetName: 'Plants',
    searchColumn: 'Common Name',
    hostIp: '10.0.0.20',
    hostPort: 11180,
    remoteApiUrl: '',
    designName: 'Custom_Label',
    printerId: 'System-TSC TX310',
    variableMappings: [
      { variableName: 'PLANT_NAME', sheetColumn: 'Common Name', fallback: 'Default Plant' },
      { variableName: 'URL', sheetColumn: 'Link', fallback: 'https://example.com' }
    ]
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SettingsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should be created and return initial settings', () => {
    expect(service).toBeTruthy();
    expect(service.currentSettings).toBeTruthy();
    expect(service.currentSettings.hostPort).toBe(11180);
  });

  it('should save settings locally and notify subscribers', (done) => {
    service.saveSettings(mockCustomSettings, false);

    expect(service.currentSettings.hostIp).toBe('10.0.0.20');
    expect(service.currentSettings.sheetName).toBe('Plants');

    service.settings$.subscribe(settings => {
      expect(settings.hostIp).toBe('10.0.0.20');
      expect(settings.variableMappings.length).toBe(2);
      done();
    });
  });

  it('should sync settings to backend when syncRemote is true', () => {
    service.saveSettings(mockCustomSettings, true);

    const req = httpTestingController.expectOne('/api/config');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCustomSettings);
    req.flush({ success: true });
  });

  it('should sync settings from server on syncFromServer()', () => {
    service.syncFromServer();

    const req = httpTestingController.expectOne('/api/config');
    expect(req.request.method).toBe('GET');
    req.flush(mockCustomSettings);

    expect(service.currentSettings.hostIp).toBe('10.0.0.20');
    expect(service.currentSettings.designName).toBe('Custom_Label');
  });

  it('should reset settings to default on resetDefaults()', () => {
    service.saveSettings(mockCustomSettings, false);
    expect(service.currentSettings.designName).toBe('Custom_Label');

    service.resetDefaults();
    const req = httpTestingController.expectOne('/api/config');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });

    expect(service.currentSettings.designName).toBe(DEFAULT_SETTINGS.designName);
    expect(service.currentSettings.searchColumn).toBe(DEFAULT_SETTINGS.searchColumn);
  });
});
