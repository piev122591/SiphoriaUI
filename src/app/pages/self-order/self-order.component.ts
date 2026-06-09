import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { OrderService } from '../../services/order.service';
import { LoadingService } from '../../services/loading.service';
import { ProductModalComponent } from './product-modal/product-modal.component';
import { ProductListComponent } from './product-list/product-list.component';

@Component({
  selector: 'app-self-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductModalComponent, ProductListComponent],
  templateUrl: './self-order.component.html',
  styleUrls: ['./self-order.component.css']
})
export class SelfOrderComponent implements OnInit {
  products: any[] = [];
  productDetails: any[] = [];
  categories: any[] = [];
  customerName = 'Guest';
  paymentTypeId = 1;

  paymentTypes = [
    { id: 1, label: 'Cash', logo: null },
    { id: 2, label: 'GCash', logo: 'logos/gcash.svg' },
    { id: 3, label: 'Maya', logo: 'logos/maya.svg' }
  ];
  statusId = 1;
  remarks = '';

  step = 2;
  selectedCategoryId: number | null = null;
  selectedCategory: string | null = null;
  selectedProduct: any = null;
  selectedProductListWithSizes: any[] = [];
  cart: any[] = [];
  isPlacingOrder = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private orderService: OrderService,
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
    this.productService.getProductDetails().subscribe({
      next: res => { this.productDetails = res; },
      error: () => {}
    });
  }

  get filteredProducts() {
    return this.products.filter(p =>
      p.categoryid === this.selectedCategoryId &&
      this.productDetails.some((d: any) => d.productId === p.id)
    );
  }

  selectCategory(category: any) {
    this.selectedCategory = category.name;
    this.selectedCategoryId = category.id;
    this.step = 3;
  }

  addToCart(product: any) {
    const exist = this.cart.find(i => i.id === product.id);
    if (exist) {
      exist.qty += product.qty;
    } else {
      this.cart.push(product);
    }
  }

  placeOrder() {
    if (this.isPlacingOrder) return;
    this.isPlacingOrder = true;

    const payload = {
      name: this.customerName,
      payment_type_id: this.paymentTypeId,
      status_id: this.statusId,
      remarks: this.remarks,
      order_details: this.cart.map(item => ({
        product_details_id: item.productId,
        qty: item.qty,
        price: item.price
      }))
    };

    this.orderService.placeOrder(payload).subscribe({
      next: (_) => {
        this.isPlacingOrder = false;
        this.cart = [];
        this.step = 1;
      },
      error: (_) => {
        this.isPlacingOrder = false;
        alert('Failed to place order. Please try again.');
      }
    });
  }

  increaseQty(product: any) {
    const item = this.cart.find(x => x.id === product.id);
    if (item) {
      item.qty++;
    } else {
      this.cart.push({ ...product, qty: 1 });
    }
  }

  decreaseQty(product: any) {
    const item = this.cart.find(x => x.id === product.id);
    if (!item) return;
    item.qty--;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(x => x.id !== product.id);
    }
  }

  onProductSelected(event: { product: any; variants: any[] }) {
    this.selectedProduct = event.product;
    this.selectedProductListWithSizes = event.variants;
  }

  closeModal() {
    this.selectedProduct = null;
  }

  getQty(product: any) {
    const item = this.cart.find(x => x.id === product.id);
    return item ? item.qty : 0;
  }

  getTotalItems() {
    return this.cart.reduce((total, item) => total + item.qty, 0);
  }

  removeItem(item: any) {
    this.cart = this.cart.filter(i => i !== item);
  }

  getCartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
  }

  goBack() {
    if (this.step === 3 || this.step === 4 || this.step === 5) {
      this.step = this.step === 3 ? 2 : 3;
    }
  }
}
