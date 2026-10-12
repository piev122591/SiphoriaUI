import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isSoldOut } from '../../../utils/stock';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent {
  @Input() products: any[] = [];
  // Loaded once by the menu page so stock can be refreshed after each order
  @Input() productDetails: any[] = [];
  @Output() productSelected = new EventEmitter<{ product: any; variants: any[] }>();

  private variantsOf(product: any): any[] {
    return this.productDetails.filter(p => p.productId === product.id);
  }

  // Sold out only when every size is sold out
  isProductSoldOut(product: any): boolean {
    const variants = this.variantsOf(product);
    return variants.length > 0 && variants.every(v => isSoldOut(v));
  }

  openProductModal(product: any) {
    if (this.isProductSoldOut(product)) return;
    this.productSelected.emit({ product, variants: this.variantsOf(product) });
  }
}
