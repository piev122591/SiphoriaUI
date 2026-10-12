import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { OrderService } from '../../services/order.service';
import { DiscountService } from '../../services/discount.service';
import { LoadingService } from '../../services/loading.service';
import { PrinterService } from '../../services/printer.service';
import { ProductModalComponent } from './product-modal/product-modal.component';
import { ProductListComponent } from './product-list/product-list.component';
import { SizeLabelPipe } from '../../pipes/size-label.pipe';
import { availableServings } from '../../utils/stock';

@Component({
  selector: 'app-self-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductModalComponent, ProductListComponent, SizeLabelPipe],
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

  discounts: any[] = [];
  discountEnabled = false;
  selectedDiscountId: number | null = null;
  discountPercent: number | null = null;

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
    private discountService: DiscountService,
    private loadingService: LoadingService,
    private printerService: PrinterService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadProductDetails();
    this.loadDiscounts();
  }

  loadDiscounts() {
    this.discountService.getDiscounts().subscribe({
      next: res => { this.discounts = res; },
      error: () => {}
    });
  }

  onDiscountChange() {
    if (this.selectedDiscountId === null) {
      this.discountPercent = null;
      return;
    }
    this.discountPercent = this.isVatExemptDiscount ? 20 : null;
  }

  toggleDiscountEnabled() {
    if (this.discountEnabled) {
      const promo = this.discounts.find(d => (d.name ?? '').toLowerCase().includes('promotion'));
      this.selectedDiscountId = promo ? promo.id : (this.discounts[0]?.id ?? null);
      this.onDiscountChange();
    } else {
      this.selectedDiscountId = null;
      this.discountPercent = null;
    }
  }

  get isDiscountInvalid(): boolean {
    return this.discountEnabled && (!this.selectedDiscountId || !this.discountPercent);
  }

  get selectedDiscount() {
    return this.discounts.find(d => d.id === this.selectedDiscountId) ?? null;
  }

  get isVatExemptDiscount(): boolean {
    const name = (this.selectedDiscount?.name ?? '').toLowerCase();
    return name.includes('senior') || name.includes('pwd');
  }

  discountLabel(): string | undefined {
    if (!this.selectedDiscount) return undefined;
    return this.discountPercent
      ? `${this.selectedDiscount.name} ${this.discountPercent}%`
      : this.selectedDiscount.name;
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

  // Servings the recipe can still make for this size (latest stock, not the copy in the cart)
  stockOf(item: any): number {
    const latest = this.productDetails.find((d: any) => d.id === item.id) ?? item;
    return availableServings(latest);
  }

  canIncrease(item: any): boolean {
    const inCart = this.cart.find(x => x.id === item.id)?.qty || 0;
    return inCart < this.stockOf(item);
  }

  addToCart(product: any) {
    const exist = this.cart.find(i => i.id === product.id);
    const max = this.stockOf(product);
    if (exist) {
      exist.qty = Math.min(exist.qty + product.qty, max);
    } else {
      this.cart.push({ ...product, qty: Math.min(product.qty, max) });
    }
  }

  placeOrder() {
    if (this.isPlacingOrder) return;
    if (this.isDiscountInvalid) {
      alert('Please select a discount and enter a valid percentage, or uncheck Discount to continue without one.');
      return;
    }
    this.isPlacingOrder = true;

    const payload = {
      name: this.customerName,
      payment_type_id: this.paymentTypeId,
      status_id: this.statusId,
      remarks: this.remarks,
      discount_id: this.selectedDiscountId,
      discount: this.selectedDiscountId ? this.discountPercent : null,
      order_details: this.cart.map(item => ({
        product_details_id: item.id,
        qty: item.qty,
        price: this.getDiscountedUnitPrice(item),
        fc: item.fc ?? null
      }))
    };

    this.orderService.placeOrder(payload).subscribe({
      next: (response) => {
        this.isPlacingOrder = false;
        this.printReceipt(response);
        this.cart = [];
        this.remarks = '';
        this.discountEnabled = false;
        this.selectedDiscountId = null;
        this.discountPercent = null;
        this.step = 1;
        this.loadProductDetails(); // refresh stock / sold-out state
      },
      error: (err) => {
        this.isPlacingOrder = false;
        if (err?.status === 409) {
          // Backend rejected the order: not enough stock for one or more items
          this.loadProductDetails();
          alert(err?.error?.message || 'Some items just sold out or have fewer servings left. Please review the order.');
          return;
        }
        alert('Failed to place order. Please try again.');
      }
    });
  }

  private printReceipt(orderResponse: any) {
    const paymentType = this.paymentTypes.find(p => p.id === this.paymentTypeId)?.label ?? 'Cash';

    this.printerService.printReceiptWithKitchenCopy({
      orderId: orderResponse?.id ?? orderResponse?.order_id ?? orderResponse?.orderId,
      customerName: this.customerName,
      paymentType,
      items: this.cart.map(item => ({
        name: item.name,
        size: item.size,
        qty: item.qty,
        price: item.price
      })),
      total: this.getFinalTotal(),
      subtotal: this.getCartTotal(),
      vatAmount: this.isVatExemptDiscount ? this.getVatAmount() : undefined,
      discountLabel: this.discountEnabled ? this.discountLabel() : undefined,
      discountAmount: this.getDiscountAmount() || undefined
    }).catch((err) => {
      // Order is already placed successfully; a print failure (e.g. QZ Tray
      // not running) shouldn't block the customer/cashier flow.
      const reason = err?.message ?? String(err);
      alert(`Order placed, but the receipt could not be printed.\nReason: ${reason}`);
    });
  }

  increaseQty(product: any) {
    if (!this.canIncrease(product)) return;
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

  // Senior Citizen / PWD orders are VAT-exempt: the 12% VAT baked into the
  // gross price is stripped out first, and the discount is computed on
  // what's left (per PH BIR rules), instead of on the VAT-inclusive total.
  getVatExemptSubtotal() {
    return this.isVatExemptDiscount ? this.getCartTotal() / 1.12 : this.getCartTotal();
  }

  getVatAmount() {
    return this.getCartTotal() - this.getVatExemptSubtotal();
  }

  getDiscountAmount() {
    if (!this.selectedDiscountId || !this.discountPercent) return 0;
    return this.getVatExemptSubtotal() * (this.discountPercent / 100);
  }

  // Per-item price actually charged, so the stored order_details.price already
  // reflects the deduction (backend just sums price * qty, no discount math there).
  // The report re-derives the pre-discount gross price from discount_id/discount,
  // since this transformation is exactly invertible.
  private getDiscountedUnitPrice(item: any): number {
    if (!this.selectedDiscountId || !this.discountPercent) return item.price;
    const vatExemptUnit = this.isVatExemptDiscount ? item.price / 1.12 : item.price;
    const discountedUnit = vatExemptUnit * (1 - this.discountPercent / 100);
    return Math.round(discountedUnit * 100) / 100;
  }

  getFinalTotal() {
    return this.getVatExemptSubtotal() - this.getDiscountAmount();
  }

  goBack() {
    if (this.step === 3 || this.step === 4 || this.step === 5) {
      this.step = this.step === 3 ? 2 : 3;
    }
  }
}
