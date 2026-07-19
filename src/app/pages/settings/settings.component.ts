import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PrinterService, PrinterConnectionStatus } from '../../services/printer.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  status: PrinterConnectionStatus = 'disconnected';
  printerName: string | null = null;
  qzVersion: string | null = null;
  lastError: string | null = null;

  isBusy = false;
  testPrintState: 'idle' | 'sending' | 'sent' | 'failed' = 'idle';

  availablePrinters: string[] = [];
  loadingPrinters = false;
  printersLoaded = false;

  private subs: Subscription[] = [];

  constructor(private printerService: PrinterService) {}

  ngOnInit(): void {
    this.subs.push(
      this.printerService.status$.subscribe(s => this.status = s),
      this.printerService.printerName$.subscribe(n => this.printerName = n),
      this.printerService.qzVersion$.subscribe(v => this.qzVersion = v),
      this.printerService.lastError$.subscribe(e => this.lastError = e)
    );

    this.checkConnection();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  async checkConnection() {
    this.isBusy = true;
    try {
      await this.printerService.connect();
    } catch {
      // status$ / lastError$ already reflect the failure
    } finally {
      this.isBusy = false;
    }
  }

  async restartConnection() {
    this.isBusy = true;
    this.testPrintState = 'idle';
    try {
      await this.printerService.restartConnection();
    } catch {
      // status$ / lastError$ already reflect the failure
    } finally {
      this.isBusy = false;
    }
  }

  disconnect() {
    this.printerService.disconnect();
    this.testPrintState = 'idle';
  }

  async loadAvailablePrinters() {
    this.loadingPrinters = true;
    try {
      this.availablePrinters = await this.printerService.listPrinters();
    } catch {
      this.availablePrinters = [];
    } finally {
      this.loadingPrinters = false;
      this.printersLoaded = true;
    }
  }

  async sendTestPrint() {
    this.testPrintState = 'sending';
    try {
      await this.printerService.printTestReceipt();
      this.testPrintState = 'sent';
    } catch {
      this.testPrintState = 'failed';
    }
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting…';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  }
}
