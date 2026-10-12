import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ReportService, ReportStation } from '../../services/report.service';

interface SalesRow {
  report_date: string;
  total_serving: number;
  gross_sales: number;
  food_cost: number;
  vat: number;
  discount: number;
  gross_profit: number;
}

interface StationReport {
  station: ReportStation | 'all';
  label: string;
  rows: SalesRow[];
}

@Component({
  selector: 'app-admin-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-export.component.html',
  styleUrls: ['./admin-export.component.css']
})
export class AdminExportComponent implements OnInit {

  // true when rendered inside the Reports page "Detailed Report" tab
  @Input() embedded = false;

  sections: StationReport[] = [
    { station: 'drinks', label: 'Counter — Drinks', rows: [] },
    { station: 'kitchen', label: 'Kitchen', rows: [] }
  ];
  isLoading = false;
  errorMessage: string | null = null;

  today = new Date().toISOString().split('T')[0];
  startDate = this.today;
  endDate = this.today;

  constructor(private reportService: ReportService) {}

  ngOnInit() {
    // Standalone Export page: one combined table, like before the station split
    if (!this.embedded) {
      this.sections = [{ station: 'all', label: '', rows: [] }];
    }
    this.loadReport();
  }

  get hasRows(): boolean {
    return this.sections.some(s => s.rows.length > 0);
  }

  loadReport() {
    if (!this.startDate || !this.endDate) return;
    this.isLoading = true;
    this.errorMessage = null;

    if (!this.embedded) {
      this.reportService.getDailySales(this.startDate, this.endDate).subscribe({
        next: res => {
          this.sections = [{ station: 'all', label: '', rows: this.mapRows(res) }];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load daily sales report.';
        }
      });
      return;
    }

    forkJoin({
      drinks: this.reportService.getDailySalesByStation(this.startDate, this.endDate, 'drinks'),
      kitchen: this.reportService.getDailySalesByStation(this.startDate, this.endDate, 'kitchen')
    }).subscribe({
      next: res => {
        this.sections = this.sections.map(s => ({ ...s, rows: this.mapRows(res[s.station as ReportStation]) }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load daily sales report.';
      }
    });
  }

  private mapRows(res: any[]): SalesRow[] {
    return (res || []).map(r => ({
      report_date: r.report_date,
      total_serving: parseFloat(r.total_serving) || 0,
      gross_sales: parseFloat(r.gross_sales) || 0,
      food_cost: parseFloat(r.food_cost) || 0,
      vat: parseFloat(r.vat) || 0,
      discount: parseFloat(r.discount ?? r.discount_amount) || 0,
      gross_profit: parseFloat(r.gross_profit) || 0
    }));
  }

  totalsOf(rows: SalesRow[]) {
    return rows.reduce((acc, r) => ({
      total_serving: acc.total_serving + r.total_serving,
      gross_sales: acc.gross_sales + r.gross_sales,
      food_cost: acc.food_cost + r.food_cost,
      vat: acc.vat + r.vat,
      discount: acc.discount + r.discount,
      gross_profit: acc.gross_profit + r.gross_profit
    }), { total_serving: 0, gross_sales: 0, food_cost: 0, vat: 0, discount: 0, gross_profit: 0 });
  }

  get grandTotals() {
    return this.totalsOf(this.sections.flatMap(s => s.rows));
  }

  formatDate(dateStr: string): string {
    return dateStr ? new Date(dateStr).toLocaleDateString() : '';
  }

  formatPeso(value: number): string {
    return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportCsv() {
    if (!this.hasRows) return;

    const headers = ['Date', 'Total Serving', 'Gross Sales', 'Food Cost', '12% VAT', 'Discount', 'Gross Profit'];
    const lines: any[][] = [];

    this.sections.forEach((s, i) => {
      if (i > 0) lines.push([]);
      if (s.label) lines.push([s.label]);
      lines.push(headers);
      s.rows.forEach(r => lines.push([
        this.formatDate(r.report_date),
        r.total_serving,
        this.formatPeso(r.gross_sales),
        this.formatPeso(r.food_cost),
        this.formatPeso(r.vat),
        this.formatPeso(r.discount),
        this.formatPeso(r.gross_profit)
      ]));
      const t = this.totalsOf(s.rows);
      lines.push([
        'Total',
        t.total_serving,
        this.formatPeso(t.gross_sales),
        this.formatPeso(t.food_cost),
        this.formatPeso(t.vat),
        this.formatPeso(t.discount),
        this.formatPeso(t.gross_profit)
      ]);
    });

    if (this.embedded) {
      const g = this.grandTotals;
      lines.push([]);
      lines.push(['Grand Total — Drinks + Kitchen']);
      lines.push(headers);
      lines.push([
        'Grand Total',
        g.total_serving,
        this.formatPeso(g.gross_sales),
        this.formatPeso(g.food_cost),
        this.formatPeso(g.vat),
        this.formatPeso(g.discount),
        this.formatPeso(g.gross_profit)
      ]);
    }

    const csv = lines
      .map(row => row.map(field => this.csvEscape(field)).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.embedded ? 'detailed_report' : 'daily_sales'}_${this.startDate}_to_${this.endDate}.csv`;
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
