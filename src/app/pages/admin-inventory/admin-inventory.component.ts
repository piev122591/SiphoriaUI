import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { LoadingService } from '../../services/loading.service';
import { RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';

// Public address of the deployed app (Firebase Hosting), used in printed QR labels
const PUBLIC_APP_URL = 'https://siphoria-ui.web.app';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

  stockingItem: any = null;
  stockForm: { quantity: number | null; note: string } = { quantity: null, note: '' };
  savingStock = false;

  historyItem: any = null;
  historyEntries: any[] = [];
  loadingHistory = false;

  editingDetailId: number | null = null;
  editDetailForm: { quantity: number | null; note: string } = { quantity: null, note: '' };
  savingDetailEdit = false;
  deletingDetailId: number | null = null;

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

  openStockModal(item: any) {
    this.stockingItem = item;
    this.stockForm = { quantity: null, note: '' };
  }

  closeStockModal() {
    this.stockingItem = null;
    this.stockForm = { quantity: null, note: '' };
  }

  get canSubmitStock(): boolean {
    return this.stockForm.quantity != null && this.stockForm.quantity > 0;
  }

  submitStock() {
    if (!this.canSubmitStock || this.savingStock || !this.stockingItem) return;
    this.savingStock = true;

    this.inventoryService.addInventoryDetail(this.stockingItem.id, {
      quantity: this.stockForm.quantity!,
      note: this.stockForm.note.trim() || undefined
    }).subscribe({
      next: () => {
        this.loadInventory();
        this.savingStock = false;
        this.closeStockModal();
      },
      error: () => { this.savingStock = false; }
    });
  }

  openHistory(item: any) {
    this.historyItem = item;
    this.historyEntries = [];
    this.loadingHistory = true;

    this.inventoryService.getInventoryDetails(item.id).subscribe({
      next: res => { this.historyEntries = res; this.loadingHistory = false; },
      error: () => { this.loadingHistory = false; }
    });
  }

  closeHistory() {
    this.historyItem = null;
    this.historyEntries = [];
    this.cancelEditDetail();
    this.deletingDetailId = null;
  }

  startEditDetail(entry: any) {
    this.editingDetailId = entry.id;
    this.editDetailForm = { quantity: entry.quantity, note: entry.note || '' };
  }

  cancelEditDetail() {
    this.editingDetailId = null;
    this.editDetailForm = { quantity: null, note: '' };
  }

  get canSubmitDetailEdit(): boolean {
    return this.editDetailForm.quantity != null && this.editDetailForm.quantity > 0;
  }

  saveEditDetail(entry: any) {
    if (!this.canSubmitDetailEdit || this.savingDetailEdit || !this.historyItem) return;
    this.savingDetailEdit = true;

    this.inventoryService.updateInventoryDetail(this.historyItem.id, entry.id, {
      quantity: this.editDetailForm.quantity!,
      note: this.editDetailForm.note.trim()
    }).subscribe({
      next: updated => {
        const idx = this.historyEntries.findIndex(e => e.id === entry.id);
        if (idx !== -1) this.historyEntries[idx] = updated;
        this.savingDetailEdit = false;
        this.cancelEditDetail();
        this.loadInventory();
      },
      error: () => { this.savingDetailEdit = false; }
    });
  }

  deleteDetail(entry: any) {
    if (this.deletingDetailId !== null || !this.historyItem) return;
    this.deletingDetailId = entry.id;

    this.inventoryService.deleteInventoryDetail(this.historyItem.id, entry.id).subscribe({
      next: () => {
        this.historyEntries = this.historyEntries.filter(e => e.id !== entry.id);
        this.deletingDetailId = null;
        this.loadInventory();
      },
      error: () => { this.deletingDetailId = null; }
    });
  }

  // ===== QR LABELS =====
  printingLabels = false;

  // Each label links to /restock/:id, so the phone camera app opens the restock form directly.
  // Labels are generated on the fly from the item id — nothing is stored.
  async printLabels() {
    const items = this.filteredItems;
    if (!items.length || this.printingLabels) return;

    // Open the window synchronously (inside the click) so popup blockers allow it
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups for this site to print labels.');
      return;
    }
    win.document.write('<p style="font-family:sans-serif;padding:20px">Generating labels…</p>');

    this.printingLabels = true;
    try {
      const labels = await Promise.all(items.map(async item => ({
        item,
        qr: await QRCode.toDataURL(`${this.labelBaseUrl()}/restock/${item.id}`, { width: 320, margin: 1 })
      })));
      win.document.open();
      win.document.write(this.buildLabelSheet(labels));
      win.document.close();
    } catch {
      win.close();
      alert('Failed to generate QR labels.');
    } finally {
      this.printingLabels = false;
    }
  }

  // Labels must link to the live site so any phone camera can open them.
  // When printing from a local dev server (localhost / LAN IP), use the public URL instead.
  private labelBaseUrl(): string {
    const { protocol, hostname, origin } = window.location;
    const isLocal = protocol !== 'https:' ||
      /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
    return isLocal ? PUBLIC_APP_URL : origin;
  }

  private buildLabelSheet(labels: { item: any; qr: string }[]): string {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    const esc = (v: any) => String(v ?? '').replace(/[&<>"]/g, c => entities[c]);
    const cards = labels.map(({ item, qr }) => `
      <div class="label">
        <img src="${qr}" alt="" />
        <div class="name">${esc(item.name)}</div>
        <div class="meta">${esc(item.unit)} · #${esc(item.id)}</div>
        <div class="cta">Scan to restock</div>
      </div>`).join('');

    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Inventory QR Labels</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; color: #2c1810; }
  .toolbar { padding: 12px; text-align: center; }
  .toolbar button { padding: 10px 24px; font-size: 15px; cursor: pointer; }
  .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; padding: 6mm; }
  .label { border: 1px dashed #bbb; border-radius: 3mm; padding: 4mm; text-align: center; break-inside: avoid; }
  .label img { width: 38mm; height: 38mm; display: block; margin: 0 auto 2mm; }
  .name { font-weight: 700; font-size: 13pt; line-height: 1.2; word-break: break-word; }
  .meta { font-size: 9pt; color: #777; margin-top: 1mm; }
  .cta { font-size: 8pt; color: #999; margin-top: 1mm; text-transform: uppercase; letter-spacing: 1px; }
  @media print { .toolbar { display: none; } }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print ${labels.length} label${labels.length === 1 ? '' : 's'}</button></div>
  <div class="sheet">${cards}</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`;
  }
}
