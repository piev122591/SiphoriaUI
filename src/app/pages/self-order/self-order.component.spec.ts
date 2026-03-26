import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelfOrderComponent } from './self-order.component';

describe('SelfOrderComponent', () => {
  let component: SelfOrderComponent;
  let fixture: ComponentFixture<SelfOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelfOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelfOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
