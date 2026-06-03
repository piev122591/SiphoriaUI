import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {

  orders: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  expandedOrderId: number | null = null;
  loadingDetailId: number | null = null;

  today = new Date().toISOString().split('T')[0];
  startDate = this.today;
  endDate = this.today;

  private statusMap: Record<number, string> = {
    1: 'Pending',
    2: 'Completed',
    3: 'Cancelled'
  };

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.errorMessage = null;

    this.orderService.getOrdersByDate(this.startDate, this.endDate).subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.isLoading = false;
      }
    });
  }

  getStatusLabel(statusId: number): string {
    return this.statusMap[statusId] ?? 'Unknown';
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
}
