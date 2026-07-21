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

  // Static catalogue of product image folders/files under public/products.
  // Update this map when images are added to/removed from those folders.
  readonly productImageMap: Record<string, string[]> = {
    signatureCoffee: ['RaspberryLatte.jpg', 'ThaiTeaLatte.jpg', 'UbeLatte.jpg'],
    classicCoffee: ['SpanishLatte.jpg'],
    matchaSeries: ['DirtyMatcha.jpg', 'MatchaLatte.jpg', 'StrawberryMatcha.jpg']
  };

  get imageFolders(): string[] {
    return Object.keys(this.productImageMap);
  }

  getImageFiles(folder: string | null): string[] {
    return folder ? (this.productImageMap[folder] || []) : [];
  }

  composeImagePath(folder: string | null, file: string | null): string {
    return folder && file ? `products/${folder}/${file}` : '';
  }

  private parseImagePath(path: string | null | undefined): { folder: string | null; file: string | null } {
    if (!path) return { folder: null, file: null };
    const parts = path.split('/');
    if (parts.length !== 3 || parts[0] !== 'products') return { folder: null, file: null };
    return { folder: parts[1], file: parts[2] };
  }

  addingVariantProductId: number | null = null;
  newVariant: { sizeid: number | null; price: number | null; imageFolder: string | null; imageFile: string | null } =
    { sizeid: null, price: null, imageFolder: null, imageFile: null };
  savingVariant = false;

  editingVariant: any = null;
  editVariantForm: { sizeid: number | null; price: number | null; imageFolder: string | null; imageFile: string | null } =
    { sizeid: null, price: null, imageFolder: null, imageFile: null };
  savingEditVariant = false;

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
    this.newVariant = { sizeid: null, price: null, imageFolder: null, imageFile: null };
  }

  cancelAddVariant() {
    this.addingVariantProductId = null;
    this.newVariant = { sizeid: null, price: null, imageFolder: null, imageFile: null };
  }

  onNewVariantFolderChange(folder: string | null) {
    this.newVariant.imageFolder = folder;
    this.newVariant.imageFile = null;
  }

  saveNewVariant(productId: number) {
    if (this.savingVariant || !this.canSubmitVariant) return;
    this.savingVariant = true;

    this.productService.createProductDetail({
      productid: productId,
      sizeid: this.newVariant.sizeid!,
      price: this.newVariant.price!,
      image_url: this.composeImagePath(this.newVariant.imageFolder, this.newVariant.imageFile)
    }).subscribe({
      next: () => {
        this.loadProductDetails();
        this.savingVariant = false;
        this.addingVariantProductId = null;
        this.newVariant = { sizeid: null, price: null, imageFolder: null, imageFile: null };
      },
      error: () => { this.savingVariant = false; }
    });
  }

  get canSubmitEditVariant(): boolean {
    return !!this.editVariantForm.sizeid && this.editVariantForm.price !== null;
  }

  openEditVariant(v: any) {
    this.editingVariant = v;
    const matchedSize = this.sizes.find(s => s.name === v.size);
    const { folder, file } = this.parseImagePath(v.image_url);
    this.editVariantForm = {
      sizeid: matchedSize ? matchedSize.id : null,
      price: parseFloat(v.price),
      imageFolder: folder,
      imageFile: file
    };
  }

  cancelEditVariant() {
    this.editingVariant = null;
    this.editVariantForm = { sizeid: null, price: null, imageFolder: null, imageFile: null };
  }

  onEditVariantFolderChange(folder: string | null) {
    this.editVariantForm.imageFolder = folder;
    this.editVariantForm.imageFile = null;
  }

  saveEditVariant() {
    if (this.savingEditVariant || !this.canSubmitEditVariant || !this.editingVariant) return;
    this.savingEditVariant = true;

    this.productService.updateProductDetail(this.editingVariant.id, {
      productid: this.editingVariant.productId,
      sizeid: this.editVariantForm.sizeid!,
      price: this.editVariantForm.price!,
      image_url: this.composeImagePath(this.editVariantForm.imageFolder, this.editVariantForm.imageFile)
    }).subscribe({
      next: () => {
        this.loadProductDetails();
        this.savingEditVariant = false;
        this.editingVariant = null;
        this.editVariantForm = { sizeid: null, price: null, imageFolder: null, imageFile: null };
      },
      error: () => { this.savingEditVariant = false; }
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
