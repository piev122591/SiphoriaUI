import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { from, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { LoadingService } from '../../services/loading.service';

Chart.register(...registerables);

interface StatusCount {
  id: number;
  label: string;
  count: number;
  color: string;
}

interface PaymentCount {
  id: number;
  label: string;
  count: number;
}

interface ProductTotal {
  name: string;
  qty: number;
  revenue: number;
}

interface RevenuePoint {
  date: string;
  total: number;
}

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.css']
})
export class AdminReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueCanvas') revenueCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas') statusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentCanvas') paymentCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsCanvas') productsCanvas!: ElementRef<HTMLCanvasElement>;

  readonly paymentColors = ['#c9a96e', '#4f8ef7', '#2ec4b6'];

  private readonly statusMap: Record<number, string> = { 1: 'Pending', 2: 'Completed', 3: 'Cancelled' };
  private readonly statusColors: Record<number, string> = { 1: '#e8b339', 2: '#2e7d4f', 3: '#c0392b' };
  private readonly paymentMap: Record<number, string> = { 1: 'Cash', 2: 'GCash', 3: 'Maya' };

  orders: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  endDate = new Date().toISOString().split('T')[0];
  startDate = this.daysAgo(29);

  totalRevenue = 0;
  totalOrders = 0;
  avgOrderValue = 0;

  statusCounts: StatusCount[] = [];
  paymentCounts: PaymentCount[] = [];
  productTotals: ProductTotal[] = [];
  revenueByDay: RevenuePoint[] = [];

  get topFiveProducts(): ProductTotal[] {
    return this.productTotals.slice(0, 5);
  }

  private viewReady = false;
  private revenueChart?: Chart;
  private statusChart?: Chart;
  private paymentChart?: Chart;
  private productsChart?: Chart;

  constructor(private orderService: OrderService, private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.statusChart?.destroy();
    this.paymentChart?.destroy();
    this.productsChart?.destroy();
  }

  loadReport(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = null;
    this.loadingService.start();

    this.orderService.getOrdersByDate(this.startDate, this.endDate).subscribe({
      next: orders => {
        this.orders = orders.map(o => ({ ...o, status_id: +o.status_id, payment_type_id: +o.payment_type_id }));
        this.computeKpis();
        this.loadProductBreakdown();
      },
      error: () => {
        this.errorMessage = 'Failed to load report data. Please try again.';
        this.isLoading = false;
        this.loadingService.stop();
      }
    });
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  private parsePrice(value: any): number {
    const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  private computeKpis(): void {
    const nonCancelled = this.orders.filter(o => o.status_id !== 3);

    this.totalOrders = this.orders.length;
    this.totalRevenue = nonCancelled.reduce((sum, o) => sum + this.parsePrice(o.total), 0);
    this.avgOrderValue = nonCancelled.length ? this.totalRevenue / nonCancelled.length : 0;

    this.statusCounts = [1, 2, 3].map(id => ({
      id,
      label: this.statusMap[id],
      count: this.orders.filter(o => o.status_id === id).length,
      color: this.statusColors[id]
    }));

    this.paymentCounts = [1, 2, 3].map(id => ({
      id,
      label: this.paymentMap[id],
      count: this.orders.filter(o => o.payment_type_id === id).length
    }));

    this.revenueByDay = this.buildRevenueSeries(nonCancelled);
  }

  private buildRevenueSeries(orders: any[]): RevenuePoint[] {
    const totalsByDay = new Map<string, number>();
    orders.forEach(o => {
      const date = String(o.order_date || '').slice(0, 10);
      if (!date) return;
      totalsByDay.set(date, (totalsByDay.get(date) || 0) + this.parsePrice(o.total));
    });

    const [sy, sm, sd] = this.startDate.split('-').map(Number);
    const [ey, em, ed] = this.endDate.split('-').map(Number);
    const start = Date.UTC(sy, sm - 1, sd);
    const end = Date.UTC(ey, em - 1, ed);
    const DAY = 24 * 60 * 60 * 1000;

    const days: RevenuePoint[] = [];
    for (let t = start; t <= end; t += DAY) {
      const key = new Date(t).toISOString().slice(0, 10);
      days.push({ date: key, total: totalsByDay.get(key) || 0 });
    }
    return days;
  }

  private loadProductBreakdown(): void {
    const relevantOrders = this.orders.filter(o => o.status_id !== 3);

    if (relevantOrders.length === 0) {
      this.productTotals = [];
      this.finishLoading();
      return;
    }

    from(relevantOrders).pipe(
      mergeMap(
        order => this.orderService.getOrderDetails(order.id).pipe(catchError(() => of([]))),
        5
      ),
      toArray()
    ).subscribe(detailGroups => {
      const totals = new Map<string, ProductTotal>();

      detailGroups.flat().forEach((d: any) => {
        const name = d.product_name || 'Unknown';
        const qty = +d.qty || 0;
        const price = this.parsePrice(d.price);
        const entry = totals.get(name) || { name, qty: 0, revenue: 0 };
        entry.qty += qty;
        entry.revenue += qty * price;
        totals.set(name, entry);
      });

      this.productTotals = Array.from(totals.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8);

      this.finishLoading();
    });
  }

  private finishLoading(): void {
    this.isLoading = false;
    this.loadingService.stop();
    this.renderCharts();
  }

  private formatShortDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }

  private renderCharts(): void {
    if (!this.viewReady) return;
    this.renderRevenueChart();
    this.renderStatusChart();
    this.renderPaymentChart();
    this.renderProductsChart();
  }

  private renderRevenueChart(): void {
    const ctx = this.revenueCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.revenueChart?.destroy();

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.revenueByDay.map(d => this.formatShortDate(d.date)),
        datasets: [{
          label: 'Revenue',
          data: this.revenueByDay.map(d => d.total),
          borderColor: '#c9a96e',
          backgroundColor: 'rgba(201, 169, 110, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointBackgroundColor: '#c9a96e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#b0a090', font: { family: 'Poppins', size: 10 } } },
          y: {
            grid: { color: '#f0e8de' },
            ticks: { color: '#b0a090', font: { family: 'Poppins', size: 10 }, callback: v => '₱' + v }
          }
        }
      }
    });
  }

  private renderStatusChart(): void {
    const ctx = this.statusCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.statusChart?.destroy();

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.statusCounts.map(s => s.label),
        datasets: [{
          data: this.statusCounts.map(s => s.count),
          backgroundColor: this.statusCounts.map(s => s.color),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } }
      }
    });
  }

  private renderPaymentChart(): void {
    const ctx = this.paymentCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.paymentChart?.destroy();

    this.paymentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.paymentCounts.map(p => p.label),
        datasets: [{
          data: this.paymentCounts.map(p => p.count),
          backgroundColor: this.paymentColors,
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } }
      }
    });
  }

  private renderProductsChart(): void {
    const ctx = this.productsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.productsChart?.destroy();

    this.productsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.productTotals.map(p => p.name),
        datasets: [{
          label: 'Units Sold',
          data: this.productTotals.map(p => p.qty),
          backgroundColor: '#c9a96e',
          borderRadius: 4,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#f0e8de' }, ticks: { color: '#b0a090', font: { family: 'Poppins', size: 10 } } },
          y: { grid: { display: false }, ticks: { color: '#3a2418', font: { family: 'Poppins', size: 11 } } }
        }
      }
    });
  }
}
