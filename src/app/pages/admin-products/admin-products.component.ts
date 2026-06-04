import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.css']
})
export class AdminProductsComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  productDetails: any[] = [];
  selectedCategoryId: number | null = null;
  expandedProductId: number | null = null;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadProductDetails();
  }

  loadCategories() {
    this.loadingService.start();
    this.categoryService.getCategories().subscribe({
      next: res => { this.categories = res; this.loadingService.stop(); },
      error: () => this.loadingService.stop()
    });
  }

  loadProducts() {
    this.loadingService.start();
    this.productService.getProducts().subscribe({
      next: res => { this.products = res; this.loadingService.stop(); },
      error: () => this.loadingService.stop()
    });
  }

  loadProductDetails() {
    this.loadingService.start();
    this.productService.getProductDetails().subscribe({
      next: res => { this.productDetails = res; this.loadingService.stop(); },
      error: () => this.loadingService.stop()
    });
  }

  get filteredProducts() {
    if (!this.selectedCategoryId) return this.products;
    return this.products.filter(p => p.categoryid === this.selectedCategoryId);
  }

  selectCategory(id: number | null) {
    this.selectedCategoryId = id;
    this.expandedProductId = null;
  }

  getCategoryName(categoryId: number): string {
    const cat = this.categories.find(c => c.id === categoryId);
    return cat ? cat.name : '—';
  }

  getVariants(productId: number): any[] {
    return this.productDetails.filter(d => d.productId === productId);
  }

  toggleExpand(productId: number) {
    this.expandedProductId = this.expandedProductId === productId ? null : productId;
  }
}
