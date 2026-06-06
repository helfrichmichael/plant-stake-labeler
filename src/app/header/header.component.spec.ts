import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { By } from '@angular/platform-browser';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the correct title in h1 element', () => {
    const headingEl = fixture.debugElement.query(By.css('h1'));
    expect(headingEl).toBeTruthy();
    expect(headingEl.nativeElement.textContent).toContain('Plant Stake Labeler');
  });

  it('should render the logo image with correct attributes', () => {
    const imgEl = fixture.debugElement.query(By.css('.header-image'));
    expect(imgEl).toBeTruthy();
    expect(imgEl.nativeElement.getAttribute('src')).toBe('./assets/logo.png');
    expect(imgEl.nativeElement.getAttribute('alt')).toBe('Logo for Plant Stake Maker');
  });
});
