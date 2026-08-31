import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { SettingsDialogComponent } from '../settings-dialog/settings-dialog.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockMatDialog.open.and.returnValue({} as any);

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MatDialog, useValue: mockMatDialog }
      ]
    })
    .overrideComponent(HeaderComponent, {
      set: {
        providers: [
          { provide: MatDialog, useValue: mockMatDialog }
        ]
      }
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the correct title in h1 element with sr-only class', () => {
    const headingEl = fixture.debugElement.query(By.css('h1'));
    expect(headingEl).toBeTruthy();
    expect(headingEl.nativeElement.textContent).toContain('Plant Stake Labeler');
    expect(headingEl.nativeElement.classList.contains('sr-only')).toBeTrue();
  });

  it('should render the logo image with correct attributes', () => {
    const imgEl = fixture.debugElement.query(By.css('.header-image'));
    expect(imgEl).toBeTruthy();
    expect(imgEl.nativeElement.getAttribute('src')).toBe('./assets/logo_banner.svg');
    expect(imgEl.nativeElement.getAttribute('alt')).toBe('Plant Stake Labeler');
  });

  it('should open settings dialog when openSettings() is called', () => {
    component.openSettings();

    expect(mockMatDialog.open).toHaveBeenCalledWith(SettingsDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      disableClose: false
    });
  });
});
