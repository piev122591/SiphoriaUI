import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../services/product.service';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  @Input() products: any[] = [];
  @Output() productSelected = new EventEmitter<{ product: any; variants: any[] }>();

  private productDetails: any[] = [];

  constructor(
    private productService: ProductService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadProductDetails();
  }

  loadProductDetails() {
    this.loadingService.start();
    this.productService.getProductDetails().subscribe({
      next: res => { this.productDetails = res; this.loadingService.stop(); },
      error: () => this.loadingService.stop()
    });
  }

  openProductModal(product: any) {
    const variants = this.productDetails.filter(p => p.productId === product.id);
    this.productSelected.emit({ product, variants });
  }
}
