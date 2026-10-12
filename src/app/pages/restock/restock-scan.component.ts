import { AfterViewInit, Component, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';

// In-app camera scanner for inventory QR labels (/restock). A match opens /restock/:id.
@Component({
  selector: 'app-restock-scan',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="restock-page">
      <header class="restock-header">
        <a routerLink="/admin/inventory" class="back-link">← Inventory</a>
        <span class="page-tag">Scan</span>
      </header>

      <div class="card scan-card">
        <div id="qr-reader" class="reader"></div>
        <p class="hint" *ngIf="!errorMessage && !detectedId">Point the camera at an inventory QR label.</p>
        <p class="detected" *ngIf="detectedId">Label #{{ detectedId }} detected — opening…</p>
        <p class="error-text" *ngIf="errorMessage">{{ errorMessage }}</p>
        <button class="btn-primary btn-block" *ngIf="errorMessage" (click)="start()">Try again</button>
      </div>
    </div>
  `,
  styleUrls: ['./restock.component.css'],
  styles: [`
    .reader { width: 100%; border-radius: 8px; overflow: hidden; background: #2c1810; min-height: 260px; }
    .hint { margin: 14px 0 0; text-align: center; color: #8a7565; font-size: 0.88rem; }
    .detected { margin: 14px 0 0; text-align: center; color: #2e7d32; font-weight: 600; font-size: 0.95rem; }
    .scan-card .error-text { margin-top: 14px; text-align: center; }
  `]
})
export class RestockScanComponent implements AfterViewInit, OnDestroy {
  errorMessage: string | null = null;
  private scanner?: Html5Qrcode;
  private handled = false;
  detectedId: number | null = null;
  private navigateTimer?: ReturnType<typeof setTimeout>;

  // Hold on the detected frame so the user sees what was scanned before moving on
  private readonly holdMs = 3000;

  constructor(private router: Router, private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.start();
  }

  ngOnDestroy(): void {
    clearTimeout(this.navigateTimer);
    this.stop();
  }

  async start() {
    clearTimeout(this.navigateTimer);
    this.errorMessage = null;
    this.detectedId = null;
    this.handled = false;
    await this.stop();

    this.scanner = new Html5Qrcode('qr-reader');
    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        text => this.zone.run(() => this.onScan(text)),
        () => {} // per-frame "no code found" — ignore
      );
    } catch (err: any) {
      this.zone.run(() => {
        this.errorMessage = this.describeError(err);
      });
    }
  }

  private async stop() {
    if (!this.scanner) return;
    try {
      if (this.scanner.isScanning) await this.scanner.stop();
      this.scanner.clear();
    } catch { /* already stopped */ }
    this.scanner = undefined;
  }

  private onScan(text: string) {
    if (this.handled) return;
    const id = this.parseInventoryId(text);
    if (!id) {
      this.errorMessage = 'That code is not an inventory label.';
      return;
    }
    this.handled = true;
    this.errorMessage = null;
    this.detectedId = id;
    try { this.scanner?.pause(true); } catch { /* not scanning */ }
    this.navigateTimer = setTimeout(() => {
      this.stop().finally(() => this.router.navigate(['/restock', id]));
    }, this.holdMs);
  }

  // Labels hold a link like https://<site>/restock/16; a bare id also works
  private parseInventoryId(text: string): number | null {
    const match = text.trim().match(/\/restock\/(\d+)(?:[/?#]|$)/) || text.trim().match(/^(\d+)$/);
    return match ? Number(match[1]) : null;
  }

  private describeError(err: any): string {
    const msg = String(err?.name || err?.message || err || '');
    if (/NotAllowed|Permission/i.test(msg)) {
      return 'Camera access was blocked. Allow camera permission for this site in your browser settings, then try again.';
    }
    if (/NotFound|Overconstrained/i.test(msg)) {
      return 'No camera was found on this device.';
    }
    if (!window.isSecureContext) {
      return 'The camera only works on an https:// address.';
    }
    return 'Could not start the camera. You can also scan the label with your phone camera app.';
  }
}
