import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { LoadingService } from '../../services/loading.service';
import { InventoryService } from '../../services/inventory.service';
import { SizeLabelPipe } from '../../pipes/size-label.pipe';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, SizeLabelPipe],
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
  deletingProductId: number | null = null;
  deletingVariantId: number | null = null;

  showAddModal = false;
  submitting = false;
  newProduct = { name: '', categoryid: null as number | null };

  // Static catalogue of product image folders/files under public/products.
  // Update this map when images are added to/removed from those folders.
  readonly productImageMap: Record<string, string[]> = {
    signatureCoffee: ['RaspberryLatte.jpg', 'ThaiTeaLatte.jpg', 'UbeLatte.jpg'],
    classicCoffee: ['CaramelMacchiato.jpg', 'SpanishLatte.jpg', 'WhiteChocolateMocha.jpg'],
    matchaSeries: ['DirtyMatcha.jpg', 'MatchaLatte.jpg', 'StrawberryMatcha.jpg'],
    milkBased: ['ChocoOverload.jpg', 'CocoaTaroMilk.jpg', 'MochaStrawberryMilk.jpg', 'StrawberryBiscoffLatte.jpg']
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

  formatFolderLabel(folder: string): string {
    return folder.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  }

  formatFileLabel(file: string): string {
    return file.replace(/\.[^.]+$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
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

  // RECIPE (inventory usage per size-SKU)
  inventoryItems: any[] = [];
  recipeVariant: any = null;
  recipeLines: any[] = [];
  loadingRecipe = false;
  newRecipeInventoryId: number | null = null;
  newRecipeQty: number | null = 1;
  savingRecipeLine = false;
  editingRecipeInventoryId: number | null = null;
  editingRecipeQty: number | null = null;
  updatingRecipeInventoryId: number | null = null;
  removingRecipeInventoryId: number | null = null;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private loadingService: LoadingService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadProductDetails();
    this.loadSizes();
    this.loadInventoryItems();
  }

  loadInventoryItems() {
    this.inventoryService.getInventory().subscribe({
      next: res => { this.inventoryItems = res; },
      error: () => {}
    });
  }

  getInventoryName(inventoryId: number): string {
    const item = this.inventoryItems.find(i => i.id === inventoryId);
    return item ? item.name : '—';
  }

  get availableInventoryItems(): any[] {
    const usedIds = new Set(this.recipeLines.map(l => l.inventory_id));
    return this.inventoryItems.filter(i => !usedIds.has(i.id));
  }

  openRecipeModal(v: any) {
    this.recipeVariant = v;
    this.recipeLines = [];
    this.newRecipeInventoryId = null;
    this.newRecipeQty = 1;
    this.loadRecipe(v.id);
  }

  closeRecipeModal() {
    this.recipeVariant = null;
    this.recipeLines = [];
    this.editingRecipeInventoryId = null;
    this.editingRecipeQty = null;
  }

  loadRecipe(productDetailsId: number) {
    this.loadingRecipe = true;
    this.inventoryService.getRecipe(productDetailsId).subscribe({
      next: res => { this.recipeLines = res; this.loadingRecipe = false; },
      error: () => { this.loadingRecipe = false; }
    });
  }

  get canAddRecipeLine(): boolean {
    return !!this.newRecipeInventoryId && !!this.newRecipeQty && this.newRecipeQty > 0;
  }

  addRecipeLine() {
    if (!this.canAddRecipeLine || this.savingRecipeLine || !this.recipeVariant) return;
    this.savingRecipeLine = true;

    this.inventoryService.addRecipeItem(this.recipeVariant.id, {
      inventory_id: this.newRecipeInventoryId!,
      quantity_used: this.newRecipeQty!
    }).subscribe({
      next: () => {
        this.loadRecipe(this.recipeVariant.id);
        this.savingRecipeLine = false;
        this.newRecipeInventoryId = null;
        this.newRecipeQty = 1;
      },
      error: () => { this.savingRecipeLine = false; }
    });
  }

  startEditRecipeQty(line: any) {
    this.editingRecipeInventoryId = line.inventory_id;
    this.editingRecipeQty = line.quantity_used;
  }

  cancelEditRecipeQty() {
    this.editingRecipeInventoryId = null;
    this.editingRecipeQty = null;
  }

  saveRecipeQty(line: any) {
    if (this.updatingRecipeInventoryId === line.inventory_id || this.editingRecipeQty === null || !this.recipeVariant) return;
    this.updatingRecipeInventoryId = line.inventory_id;

    this.inventoryService.updateRecipeItem(this.recipeVariant.id, line.inventory_id, this.editingRecipeQty).subscribe({
      next: () => {
        line.quantity_used = this.editingRecipeQty;
        this.editingRecipeInventoryId = null;
        this.editingRecipeQty = null;
        this.updatingRecipeInventoryId = null;
      },
      error: () => { this.updatingRecipeInventoryId = null; }
    });
  }

  removeRecipeLine(line: any) {
    if (this.removingRecipeInventoryId === line.inventory_id || !this.recipeVariant) return;
    this.removingRecipeInventoryId = line.inventory_id;

    this.inventoryService.deleteRecipeItem(this.recipeVariant.id, line.inventory_id).subscribe({
      next: () => {
        this.recipeLines = this.recipeLines.filter(l => l.inventory_id !== line.inventory_id);
        this.removingRecipeInventoryId = null;
      },
      error: () => { this.removingRecipeInventoryId = null; }
    });
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

  deleteProduct(p: any) {
    if (this.deletingProductId === p.id) return;
    if (this.getVariants(p.id).length > 0) {
      alert('This product still has variants — remove those first.');
      return;
    }
    if (!confirm(`Delete "${p.name}"? This will permanently remove the product. This cannot be undone.`)) return;

    this.deletingProductId = p.id;
    this.productService.deleteProduct(p.id).subscribe({
      next: () => {
        this.products = this.products.filter(x => x.id !== p.id);
        this.productDetails = this.productDetails.filter(d => d.productId !== p.id);
        if (this.expandedProductId === p.id) this.expandedProductId = null;
        this.deletingProductId = null;
      },
      error: (err: HttpErrorResponse) => {
        this.deletingProductId = null;
        if (err.status === 404) {
          this.products = this.products.filter(x => x.id !== p.id);
          alert('This product was already removed.');
        } else if (err.status === 409) {
          alert('Cannot delete this product — it still has variants or existing orders linked to it. Remove those first.');
        } else {
          alert('Failed to delete product. Please try again.');
        }
      }
    });
  }

  deleteVariant(v: any) {
    if (this.deletingVariantId === v.id) return;
    if (!confirm('Delete this variant? This will permanently remove this size/price option. This cannot be undone.')) return;

    this.deletingVariantId = v.id;
    this.productService.deleteProductDetail(v.id).subscribe({
      next: () => {
        this.productDetails = this.productDetails.filter(d => d.id !== v.id);
        this.deletingVariantId = null;
      },
      error: (err: HttpErrorResponse) => {
        this.deletingVariantId = null;
        if (err.status === 404) {
          this.productDetails = this.productDetails.filter(d => d.id !== v.id);
          alert('This variant was already removed.');
        } else if (err.status === 409) {
          alert('Cannot delete this variant — it still has recipe ingredients or existing orders linked to it. Remove those first.');
        } else {
          alert('Failed to delete variant. Please try again.');
        }
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
