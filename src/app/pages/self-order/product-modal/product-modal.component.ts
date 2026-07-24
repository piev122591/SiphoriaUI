import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SizeLabelPipe } from '../../../pipes/size-label.pipe';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, SizeLabelPipe],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.css'],
})
export class ProductModalComponent implements  OnChanges  {


  @Input() product: any;
  @Input() productsWithSizes: any[] = [];
  @Output() close = new EventEmitter();
  @Output() add = new EventEmitter();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] || changes['productsWithSizes']) {
      this.selectedProductWithSize = null;
      this.selectedSize = null;
      this.qty = 1;
    }
  }


  onClose() {
    this.close.emit();
  }

 qty: number = 1;

increase() {
  this.qty++;
}

decrease() {
  if (this.qty > 1) {
    this.qty--;
  }
}

isAdding = false;

onAdd() {
  if (this.isAdding) return;
  this.isAdding = true;
  setTimeout(() => {
    this.add.emit({ ...this.selectedProductWithSize, qty: this.qty });
    this.isAdding = false;
  }, 700);
}
selectedProductWithSize: any;
selectedSize: number | null = null;

onSelectSize(p: any) {
  this.selectedProductWithSize = p;
  this.selectedSize = p.size;

  console.log('Selected:', p);
}
getPrice(): number {
  return this.selectedProductWithSize?.price || 0;
}
}
