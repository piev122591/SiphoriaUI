import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';

// Phone-friendly restock form opened by scanning an inventory QR label (/restock/:id)
@Component({
  selector: 'app-restock',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restock.component.html',
  styleUrls: ['./restock.component.css']
})
export class RestockComponent implements OnInit {
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;

  item: any = null;
  isLoading = false;
  errorMessage: string | null = null;

  quantity: number | null = null;
  note = '';
  saving = false;
  saveError: string | null = null;
  // Set after a successful save, to show the confirmation
  savedQty: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.loadItem(Number(params.get('id')));
    });
  }

  private loadItem(id: number) {
    this.resetForm();
    this.item = null;
    this.errorMessage = null;
    if (!id) {
      this.errorMessage = 'Invalid QR code.';
      return;
    }

    this.isLoading = true;
    this.inventoryService.getInventory().subscribe({
      next: (items: any[]) => {
        this.item = (items || []).find(i => +i.id === id) || null;
        this.isLoading = false;
        if (!this.item) {
          this.errorMessage = 'This inventory item no longer exists.';
          return;
        }
        setTimeout(() => this.qtyInput?.nativeElement.focus());
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load the item. Check your connection and try again.';
      }
    });
  }

  get isLowStock(): boolean {
    return this.item?.reorder_level != null && +this.item.quantity_remaining <= +this.item.reorder_level;
  }

  get canSave(): boolean {
    return this.quantity != null && this.quantity > 0 && !this.saving;
  }

  save() {
    if (!this.canSave || !this.item) return;
    this.saving = true;
    this.saveError = null;
    const qty = this.quantity!;

    this.inventoryService.addInventoryDetail(this.item.id, {
      quantity: qty,
      note: this.note.trim() || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.savedQty = qty;
        // Show the new remaining stock without another request
        this.item = { ...this.item, quantity_remaining: (+this.item.quantity_remaining || 0) + qty };
      },
      error: () => {
        this.saving = false;
        this.saveError = 'Failed to save. Please try again.';
      }
    });
  }

  addMore() {
    this.resetForm();
    setTimeout(() => this.qtyInput?.nativeElement.focus());
  }

  scanNext() {
    this.router.navigate(['/restock']);
  }

  private resetForm() {
    this.quantity = null;
    this.note = '';
    this.saving = false;
    this.saveError = null;
    this.savedQty = null;
  }
}
