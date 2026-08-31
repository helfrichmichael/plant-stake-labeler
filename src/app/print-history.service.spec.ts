import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PrintHistoryService, PrintHistoryItem } from './print-history.service';

describe('PrintHistoryService', () => {
  let service: PrintHistoryService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        PrintHistoryService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(PrintHistoryService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.currentHistory).toEqual([]);
  });

  it('should add history entry and prepend to list', () => {
    service.addEntry({
      plantName: 'Dionaea Muscipula',
      url: 'https://mikescarnivores.com',
      copies: 2,
      variables: { PLANT_NAME: 'Dionaea Muscipula', URL: 'https://mikescarnivores.com' }
    });

    const req = httpTestingController.expectOne('/api/history');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });

    expect(service.currentHistory.length).toBe(1);
    expect(service.currentHistory[0].plantName).toBe('Dionaea Muscipula');
    expect(service.currentHistory[0].copies).toBe(2);
  });

  it('should clear history', () => {
    service.addEntry({
      plantName: 'Dionaea Muscipula',
      url: 'https://mikescarnivores.com',
      copies: 1,
      variables: {}
    });
    const postReq = httpTestingController.expectOne('/api/history');
    postReq.flush({ success: true });

    expect(service.currentHistory.length).toBe(1);

    service.clearHistory();
    const deleteReq = httpTestingController.expectOne('/api/history');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({ success: true });

    expect(service.currentHistory.length).toBe(0);
  });

  it('should sync history from server', () => {
    const mockHistory: PrintHistoryItem[] = [
      {
        id: '1',
        timestamp: '2026-08-30T20:00:00.000Z',
        plantName: 'Sarracenia Flava',
        url: 'https://mikescarnivores.com',
        copies: 3,
        variables: {}
      }
    ];

    service.syncFromServer();
    const req = httpTestingController.expectOne('/api/history');
    expect(req.request.method).toBe('GET');
    req.flush(mockHistory);

    expect(service.currentHistory.length).toBe(1);
    expect(service.currentHistory[0].plantName).toBe('Sarracenia Flava');
  });
});
