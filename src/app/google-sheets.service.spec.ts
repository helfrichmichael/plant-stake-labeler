import { TestBed } from '@angular/core/testing';

import { GooglesheetsService } from './google-sheets.service';

describe('GooglesheetsService', () => {
  let service: GooglesheetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GooglesheetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
