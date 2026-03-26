import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.css'],
})
export class ProductModalComponent implements  OnChanges  {


  @Input() product: any;
  @Input() productsWithSizes: any[] = [];
  @Output() close = new EventEmitter();
  @Output() add = new EventEmitter();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product']) {
      console.log('Product:', this.product);
    }

    if (changes['productsWithSizes']) {
      console.log('Products with sizes:', this.productsWithSizes);
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

onAdd() {
  this.add.emit({
    ...this.selectedProductWithSize, // includes size + price
    qty: this.qty
  });
}
selectedProductWithSize: any;
selectedSize: number = 16;

onSelectSize(p: any) {
  this.selectedProductWithSize = p;
  this.selectedSize = p.size;

  console.log('Selected:', p);
}
getPrice(): number {
  return this.selectedProductWithSize?.price || 0;
}
}
