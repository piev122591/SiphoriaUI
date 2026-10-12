import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, from, of } from 'rxjs';
import { catchError, map, mergeMap, toArray } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

const VAT_RATE = 0.12;

interface SizeQty {
  size: string;
  qty: number;
}

interface Money {
  sales: number;
  foodCost: number;
  vat: number;
  discount: number;
  grossProfit: number;
}

interface ProductSold extends Money {
  name: string;
  qty: number;
  sizes: SizeQty[];
}

@Component({
  selector: 'app-admin-products-sold',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-products-sold.component.html',
  styleUrls: ['../admin-export/admin-export.component.css', './admin-products-sold.component.css']
})
export class AdminProductsSoldComponent implements OnInit {

  products: ProductSold[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  search = '';

  today = new Date().toISOString().split('T')[0];
  startDate = this.today;
  endDate = this.today;

  constructor(private orderService: OrderService, private productService: ProductService) {}

  ngOnInit() {
    this.loadReport();
  }

  get filteredProducts(): ProductSold[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.products.filter(p => p.name.toLowerCase().includes(q)) : this.products;
  }

  get totals(): Money & { qty: number } {
    return this.filteredProducts.reduce((acc, p) => ({
      qty: acc.qty + p.qty,
      sales: acc.sales + p.sales,
      foodCost: acc.foodCost + p.foodCost,
      vat: acc.vat + p.vat,
      discount: acc.discount + p.discount,
      grossProfit: acc.grossProfit + p.grossProfit
    }), { qty: 0, sales: 0, foodCost: 0, vat: 0, discount: 0, grossProfit: 0 });
  }

  loadReport() {
    if (!this.startDate || !this.endDate || this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = null;

    this.orderService.getOrdersByDate(this.startDate, this.endDate).subscribe({
      next: orders => {
        // Exclude cancelled orders, same as Analytics
        const relevant = orders.filter(o => +o.status_id !== 3);
        if (relevant.length === 0) {
          this.products = [];
          this.isLoading = false;
          return;
        }

        forkJoin({
          // Tag each detail line with its order's discount percentage
          lines: from(relevant).pipe(
            mergeMap(o => this.orderService.getOrderDetails(o.id).pipe(
              catchError(() => of([])),
              map(details => details.map(d => ({ ...d, discountPct: this.parsePrice(o.discount) })))
            ), 5),
            toArray(),
            map(groups => groups.flat())
          ),
          // Fallback FC source for order lines saved without fc
          productDetails: this.productService.getProductDetails().pipe(catchError(() => of([])))
        }).subscribe(({ lines, productDetails }) => {
          const fcById = new Map<number, number>();
          (productDetails as any[] || []).forEach(pd => {
            if (pd.fc !== null && pd.fc !== undefined) fcById.set(+pd.id, this.parsePrice(pd.fc));
          });
          this.products = this.groupDetails(lines, fcById);
          this.isLoading = false;
        });
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load products sold.';
      }
    });
  }

  private groupDetails(details: any[], fcById: Map<number, number>): ProductSold[] {
    const byProduct = new Map<string, { name: string; qty: number; sales: number; foodCost: number; discount: number; sizes: Map<string, number> }>();

    details.forEach(d => {
      const name = d.product_name || 'Unknown';
      const size = d.size_name || '';
      const qty = +d.qty || 0;
      const price = this.parsePrice(d.price);
      const fc = d.fc !== null && d.fc !== undefined
        ? this.parsePrice(d.fc)
        : fcById.get(+d.product_details_id) || 0;
      // Line prices are saved already discounted, so add the discount back to get gross sales
      // (same as the backend daily-sales report)
      const netSales = qty * price;
      const pct = d.discountPct || 0;
      const lineSales = pct > 0 && pct < 100 ? netSales / (1 - pct / 100) : netSales;

      const entry = byProduct.get(name) || { name, qty: 0, sales: 0, foodCost: 0, discount: 0, sizes: new Map<string, number>() };
      entry.qty += qty;
      entry.sales += lineSales;
      entry.foodCost += qty * fc;
      entry.discount += lineSales - netSales;
      if (size) entry.sizes.set(size, (entry.sizes.get(size) || 0) + qty);
      byProduct.set(name, entry);
    });

    // Same formulas as the Detailed Report:
    // VAT = (gross sales - discount) * 12%, gross profit = gross sales - food cost - VAT - discount
    return Array.from(byProduct.values())
      .map(p => {
        const vat = (p.sales - p.discount) * VAT_RATE;
        return {
          name: p.name,
          qty: p.qty,
          sales: p.sales,
          foodCost: p.foodCost,
          vat,
          discount: p.discount,
          grossProfit: p.sales - p.foodCost - vat - p.discount,
          sizes: Array.from(p.sizes, ([size, qty]) => ({ size, qty }))
        };
      })
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  }

  private parsePrice(value: any): number {
    const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  formatSizes(p: ProductSold): string {
    return p.sizes.map(s => `${s.size} × ${s.qty}`).join(', ');
  }

  formatPeso(value: number): string {
    return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportCsv() {
    const rows = this.filteredProducts;
    if (!rows.length) return;

    const money = (m: Money) => [
      this.formatPeso(m.sales),
      this.formatPeso(m.foodCost),
      this.formatPeso(m.vat),
      this.formatPeso(m.discount),
      this.formatPeso(m.grossProfit)
    ];

    const lines: any[][] = [['#', 'Product', 'Sizes', 'Quantity Sold', 'Gross Sales', 'Food Cost', '12% VAT', 'Discount', 'Gross Profit']];
    rows.forEach((p, i) => lines.push([i + 1, p.name, this.formatSizes(p), p.qty, ...money(p)]));
    const t = this.totals;
    lines.push(['', 'Total', '', t.qty, ...money(t)]);

    const csv = lines
      .map(row => row.map(field => this.csvEscape(field)).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_sold_${this.startDate}_to_${this.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private csvEscape(value: any): string {
    const str = String(value ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }
}
