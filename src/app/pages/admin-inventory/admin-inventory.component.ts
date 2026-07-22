import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-inventory.component.html',
  styleUrls: ['./admin-inventory.component.css']
})
export class AdminInventoryComponent implements OnInit {
  items: any[] = [];
  filter: 'all' | 'low' = 'all';

  showAddModal = false;
  submitting = false;
  newItem: { name: string; unit: string; quantity: number | null; reorder_level: number | null } =
    { name: '', unit: 'pcs', quantity: null, reorder_level: null };

  editingItem: any = null;
  editForm: { name: string; unit: string; reorder_level: number | null } = { name: '', unit: 'pcs', reorder_level: null };
  savingEdit = false;

  restockingId: number | null = null;
  restockValue: number | null = null;
  savingRestock = false;

  constructor(
    private inventoryService: InventoryService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory() {
    this.loadingService.start();
    this.inventoryService.getInventory().subscribe({
      next: res => { this.items = res; this.loadingService.stop(); },
      error: () => this.loadingService.stop()
    });
  }

  get filteredItems() {
    if (this.filter === 'low') {
      return this.items.filter(i => this.isLowStock(i));
    }
    return this.items;
  }

  get lowStockCount(): number {
    return this.items.filter(i => this.isLowStock(i)).length;
  }

  isLowStock(item: any): boolean {
    return item.reorder_level != null && item.quantity_remaining <= item.reorder_level;
  }

  setFilter(f: 'all' | 'low') {
    this.filter = f;
  }

  openAddModal() {
    this.newItem = { name: '', unit: 'pcs', quantity: null, reorder_level: null };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  get canSubmit(): boolean {
    return !!this.newItem.name.trim();
  }

  submitNewItem() {
    if (!this.canSubmit || this.submitting) return;
    this.submitting = true;

    this.inventoryService.createInventory({
      name: this.newItem.name.trim(),
      unit: this.newItem.unit || 'pcs',
      quantity: this.newItem.quantity ?? undefined,
      reorder_level: this.newItem.reorder_level ?? undefined
    }).subscribe({
      next: () => {
        this.loadInventory();
        this.submitting = false;
        this.showAddModal = false;
      },
      error: () => { this.submitting = false; }
    });
  }

  openEditItem(item: any) {
    this.editingItem = item;
    this.editForm = { name: item.name, unit: item.unit, reorder_level: item.reorder_level };
  }

  cancelEditItem() {
    this.editingItem = null;
    this.editForm = { name: '', unit: 'pcs', reorder_level: null };
  }

  get canSubmitEdit(): boolean {
    return !!this.editForm.name.trim();
  }

  saveEditItem() {
    if (!this.canSubmitEdit || this.savingEdit || !this.editingItem) return;
    this.savingEdit = true;

    this.inventoryService.updateInventory(this.editingItem.id, {
      name: this.editForm.name.trim(),
      unit: this.editForm.unit || 'pcs',
      reorder_level: this.editForm.reorder_level ?? undefined
    }).subscribe({
      next: () => {
        this.loadInventory();
        this.savingEdit = false;
        this.editingItem = null;
      },
      error: () => { this.savingEdit = false; }
    });
  }

  startRestock(item: any) {
    this.restockingId = item.id;
    this.restockValue = item.quantity;
  }

  cancelRestock() {
    this.restockingId = null;
    this.restockValue = null;
  }

  saveRestock(item: any) {
    if (this.savingRestock || this.restockValue === null) return;
    this.savingRestock = true;

    this.inventoryService.updateInventoryQuantity(item.id, this.restockValue).subscribe({
      next: () => {
        this.loadInventory();
        this.savingRestock = false;
        this.restockingId = null;
        this.restockValue = null;
      },
      error: () => { this.savingRestock = false; }
    });
  }
}
