import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { QueryService, QueryResult } from '../../services/query.service';

const DESTRUCTIVE_PATTERN = /\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i;

@Component({
  selector: 'app-admin-devtool',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-devtool.component.html',
  styleUrls: ['./admin-devtool.component.css']
})
export class AdminDevtoolComponent {
  sql = '';
  running = false;
  errorMessage: string | null = null;
  result: QueryResult | null = null;
  columns: string[] = [];

  pendingConfirmSql: string | null = null;

  constructor(private queryService: QueryService) {}

  get isDestructive(): boolean {
    return DESTRUCTIVE_PATTERN.test(this.sql);
  }

  onRunClick() {
    if (this.running || !this.sql.trim()) return;
    if (this.isDestructive) {
      this.pendingConfirmSql = this.sql;
      return;
    }
    this.execute(false);
  }

  confirmDestructive() {
    this.pendingConfirmSql = null;
    this.execute(true);
  }

  cancelConfirm() {
    this.pendingConfirmSql = null;
  }

  clear() {
    this.sql = '';
    this.result = null;
    this.columns = [];
    this.errorMessage = null;
  }

  formatCell(value: any): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private execute(confirm: boolean) {
    this.running = true;
    this.errorMessage = null;
    this.result = null;
    this.columns = [];

    this.queryService.run(this.sql, confirm).subscribe({
      next: (res) => {
        this.result = res;
        this.columns = res.rows?.length ? Object.keys(res.rows[0]) : [];
        this.running = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.error || err.error?.message || err.message || 'Query failed.';
        this.running = false;
      }
    });
  }
}
