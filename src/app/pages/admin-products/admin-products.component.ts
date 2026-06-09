import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.css']
})
export class AdminProductsComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  productDetails: any[] = [];
  sizes: any[] = [];
  selectedCategoryId: number | null = null;
  expandedProductId: number | null = null;
  editingVariantId: number | null = null;
  editingPrice: number | null = null;
  updatingVariantId: number | null = null;

  showAddModal = false;
  submitting = false;
  newProduct = { name: '', categoryid: null as number | null };

  addingVariantProductId: number | null = null;
  newVariant: { sizeid: number | null; price: number | null; image_url: string } = { sizeid: null, price: null, image_url: '' };
  savingVariant = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadProductDetails();
    this.loadSizes();
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

  loadSizes() {
    this.productService.getSizes().subscribe({
      next: res => { this.sizes = res; },
      error: () => {}
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

  startEditPrice(v: any) {
    this.editingVariantId = v.id;
    this.editingPrice = parseFloat(v.price);
  }

  cancelEditPrice() {
    this.editingVariantId = null;
    this.editingPrice = null;
  }

  savePrice(v: any) {
    if (this.updatingVariantId === v.id || this.editingPrice === null) return;
    this.updatingVariantId = v.id;

    this.productService.updateProductDetailPrice(v.id, this.editingPrice).subscribe({
      next: () => {
        v.price = this.editingPrice;
        this.editingVariantId = null;
        this.editingPrice = null;
        this.updatingVariantId = null;
      },
      error: () => {
        this.updatingVariantId = null;
      }
    });
  }

  getProductName(productId: number | null): string {
    if (!productId) return '';
    const p = this.products.find(x => x.id === productId);
    return p ? p.name : '';
  }

  getProductCategory(productId: number | null): string {
    if (!productId) return '';
    const p = this.products.find(x => x.id === productId);
    return p ? this.getCategoryName(p.categoryid) : '';
  }

  get canSubmitVariant(): boolean {
    return !!this.newVariant.sizeid && this.newVariant.price !== null;
  }

  openAddVariant(productId: number) {
    this.addingVariantProductId = productId;
    this.newVariant = { sizeid: null, price: null, image_url: '' };
  }

  cancelAddVariant() {
    this.addingVariantProductId = null;
    this.newVariant = { sizeid: null, price: null, image_url: '' };
  }

  saveNewVariant(productId: number) {
    if (this.savingVariant || !this.canSubmitVariant) return;
    this.savingVariant = true;

    this.productService.createProductDetail({
      productid: productId,
      sizeid: this.newVariant.sizeid!,
      price: this.newVariant.price!,
      image_url: this.newVariant.image_url
    }).subscribe({
      next: () => {
        this.loadProductDetails();
        this.savingVariant = false;
        this.addingVariantProductId = null;
        this.newVariant = { sizeid: null, price: null, image_url: '' };
      },
      error: () => { this.savingVariant = false; }
    });
  }

  openAddModal() {
    this.newProduct = { name: '', categoryid: null };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  get canSubmit(): boolean {
    return !!this.newProduct.name.trim() && !!this.newProduct.categoryid;
  }

  submitNewProduct() {
    if (!this.canSubmit || this.submitting) return;
    this.submitting = true;

    this.productService.createProduct({
      name: this.newProduct.name.trim(),
      categoryid: this.newProduct.categoryid!
    }).subscribe({
      next: () => {
        this.loadProducts();
        this.submitting = false;
        this.showAddModal = false;
      },
      error: () => { this.submitting = false; }
    });
  }
}
