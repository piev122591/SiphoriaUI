import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { DiscountService } from '../../services/discount.service';
import { LoadingService } from '../../services/loading.service';
import { PrinterService } from '../../services/printer.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {

  orders: any[] = [];
  discounts: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  expandedOrderId: number | null = null;
  loadingDetailId: number | null = null;
  updatingStatusId: number | null = null;
  printingOrderId: number | null = null;
  isExporting = false;

  today = new Date().toISOString().split('T')[0];
  startDate = this.today;
  endDate = this.today;

  statuses = [
    { status_id: 1, name: 'Pending' },
    { status_id: 2, name: 'Completed' },
    { status_id: 3, name: 'Cancelled' }
  ];

  private statusMap: Record<number, string> = {
    1: 'Pending',
    2: 'Completed',
    3: 'Cancelled'
  };

  paymentTypes = [
    { id: 1, label: 'Cash', logo: null },
    { id: 2, label: 'GCash', logo: 'logos/gcash.svg' },
    { id: 3, label: 'Maya', logo: 'logos/maya.svg' }
  ];

  constructor(
    private orderService: OrderService,
    private discountService: DiscountService,
    private loadingService: LoadingService,
    private printerService: PrinterService
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.loadDiscounts();
  }

  loadDiscounts() {
    this.discountService.getDiscounts().subscribe({
      next: res => { this.discounts = res; },
      error: () => {}
    });
  }

  getDiscountName(discountId: number | null | undefined): string | null {
    if (discountId == null) return null;
    return this.discounts.find(d => d.id === discountId)?.name ?? `#${discountId}`;
  }

  getDiscountLabel(order: any): string {
    const name = this.getDiscountName(order.discount_id);
    if (!name) return '—';
    return order.discount != null ? `${name} (${this.toPrice(order.discount)}%)` : name;
  }

  loadOrders() {
    this.isLoading = true;
    this.errorMessage = null;
    this.loadingService.start();

    this.orderService.getOrdersByDate(this.startDate, this.endDate).subscribe({
      next: (data) => {
        this.orders = data
          .map(o => ({ ...o, status_id: +o.status_id, payment_type_id: +o.payment_type_id }))
          .sort((a, b) => b.id - a.id);
        this.isLoading = false;
        this.loadingService.stop();
      },
      error: () => {
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.isLoading = false;
        this.loadingService.stop();
      }
    });
  }

  getStatusLabel(statusId: number): string {
    return this.statusMap[statusId] ?? 'Unknown';
  }

  getPaymentType(paymentTypeId: number) {
    return this.paymentTypes.find(p => p.id === paymentTypeId) ?? null;
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1: return 'status-pending';
      case 2: return 'status-completed';
      case 3: return 'status-cancelled';
      default: return 'status-default';
    }
  }

  toPrice(value: any): string {
    const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '0.00' : n.toFixed(2);
  }

  getSubtotal(price: any, qty: number): string {
    const n = parseFloat(String(price ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '0.00' : (n * qty).toFixed(2);
  }

  updateStatus(order: any, newStatusId: number) {
    if (this.updatingStatusId === order.id || order.status_id === newStatusId) return;

    const prev = order.status_id;
    order.status_id = newStatusId;
    this.updatingStatusId = order.id;
    this.errorMessage = null;

    this.orderService.updateOrderStatus(order.id, newStatusId).subscribe({
      next: () => {
        this.updatingStatusId = null;
      },
      error: () => {
        order.status_id = prev;
        this.updatingStatusId = null;
        this.errorMessage = 'Failed to update order status. Please try again.';
      }
    });
  }

  toggleExpand(orderId: number) {
    if (this.expandedOrderId === orderId) {
      this.expandedOrderId = null;
      return;
    }

    const order = this.orders.find(o => o.id === orderId);

    // use cached enriched details (has product_name), otherwise fetch
    if (order?.order_details?.[0]?.product_name !== undefined) {
      this.expandedOrderId = orderId;
      return;
    }

    this.loadingDetailId = orderId;
    this.orderService.getOrderDetails(orderId).subscribe({
      next: (details) => {
        if (order) order.order_details = details;
        this.expandedOrderId = orderId;
        this.loadingDetailId = null;
      },
      error: () => {
        this.loadingDetailId = null;
      }
    });
  }

  printOrder(order: any) {
    if (this.printingOrderId === order.id) return;

    if (order.order_details?.[0]?.product_name !== undefined) {
      this.sendToPrinter(order);
      return;
    }

    this.printingOrderId = order.id;
    this.orderService.getOrderDetails(order.id).subscribe({
      next: (details) => {
        order.order_details = details;
        this.sendToPrinter(order);
      },
      error: () => {
        this.printingOrderId = null;
        this.errorMessage = 'Failed to load order details for printing.';
      }
    });
  }

  exportOrders() {
    if (!this.orders.length || this.isExporting) return;

    const missing = this.orders.filter(o => o.order_details?.[0]?.product_name === undefined);
    if (!missing.length) {
      this.buildAndDownloadCsv();
      return;
    }

    this.isExporting = true;
    forkJoin(missing.map(o => this.orderService.getOrderDetails(o.id))).subscribe({
      next: (results) => {
        results.forEach((details, i) => missing[i].order_details = details);
        this.isExporting = false;
        this.buildAndDownloadCsv();
      },
      error: () => {
        this.isExporting = false;
        this.errorMessage = 'Failed to load order details for export.';
      }
    });
  }

  private buildAndDownloadCsv() {
    const headers = ['Order #', 'Customer', 'Items', 'Total', 'Discount', 'Payment', 'Status', 'Remarks', 'Date'];
    const rows = this.orders.map(o => [
      o.id,
      o.name ?? '',
      this.formatItemsForExport(o.order_details),
      this.toPrice(o.total),
      this.getDiscountLabel(o),
      this.getPaymentType(o.payment_type_id)?.label ?? '',
      this.getStatusLabel(o.status_id),
      o.remarks ?? '',
      o.order_date ? new Date(o.order_date).toLocaleDateString() : ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(field => this.csvEscape(field)).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${this.startDate}_to_${this.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private formatItemsForExport(details: any[] | undefined): string {
    if (!details?.length) return '';
    return details
      .map(d => `${d.product_name}${d.size_name ? ' (' + d.size_name + ')' : ''} x${d.qty} @₱${this.toPrice(d.price)} = ₱${this.getSubtotal(d.price, d.qty)}`)
      .join('; ');
  }

  private csvEscape(value: any): string {
    const str = String(value ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  private sendToPrinter(order: any) {
    this.printingOrderId = order.id;
    const paymentType = this.getPaymentType(order.payment_type_id)?.label ?? 'Cash';

    this.printerService.printReceipt({
      orderId: order.id,
      customerName: order.name,
      paymentType,
      items: (order.order_details ?? []).map((d: any) => ({
        name: d.product_name,
        size: d.size_name,
        qty: d.qty,
        price: d.price
      })),
      total: parseFloat(this.toPrice(order.total)),
      createdAt: order.order_date ? new Date(order.order_date) : undefined
    }).catch((err: any) => {
      const reason = err?.message ?? String(err);
      this.errorMessage = `Order #${order.id}: receipt could not be printed. ${reason}`;
    }).finally(() => {
      this.printingOrderId = null;
    });
  }
}
