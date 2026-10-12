import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SizeLabelPipe } from '../../../pipes/size-label.pipe';
import { availableServings, isLowStock, isSoldOut } from '../../../utils/stock';

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
  @Input() cart: any[] = [];
  @Output() close = new EventEmitter();
  @Output() add = new EventEmitter();

  readonly isSoldOut = isSoldOut;
  readonly isLowStock = isLowStock;

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

// How many more of this size can still be added (stock minus what's already in the cart)
remaining(p: any): number {
  const inCart = this.cart.find(i => i.id === p?.id)?.qty || 0;
  return availableServings(p) - inCart;
}

get maxQty(): number {
  return this.selectedProductWithSize ? this.remaining(this.selectedProductWithSize) : Infinity;
}

increase() {
  if (this.qty < this.maxQty) this.qty++;
}

decrease() {
  if (this.qty > 1) {
    this.qty--;
  }
}

isAdding = false;

onAdd() {
  if (this.isAdding || this.maxQty <= 0) return;
  this.isAdding = true;
  setTimeout(() => {
    this.add.emit({ ...this.selectedProductWithSize, qty: Math.min(this.qty, this.maxQty) });
    this.isAdding = false;
  }, 700);
}
selectedProductWithSize: any;
selectedSize: number | null = null;

onSelectSize(p: any) {
  if (this.remaining(p) <= 0) return;
  this.selectedProductWithSize = p;
  this.selectedSize = p.size;
  this.qty = Math.min(this.qty, this.remaining(p));
}
getPrice(): number {
  return this.selectedProductWithSize?.price || 0;
}
}
