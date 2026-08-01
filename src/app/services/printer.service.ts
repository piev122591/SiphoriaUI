import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as qz from 'qz-tray';
import { KEYUTIL, KJUR, hextorstr, stob64 } from 'jsrsasign';
import { QZ_CERTIFICATE, QZ_PRIVATE_KEY } from './qz-tray-security';

export interface ReceiptItem {
  name: string;
  size?: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  orderId?: string | number;
  customerName: string;
  paymentType: string;
  items: ReceiptItem[];
  total: number;
  createdAt?: Date;
}

export type PrinterConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Sends ESC/POS receipts to a thermal printer via QZ Tray
 * (https://qz.io), a small local agent that must be installed and
 * running on the laptop. QZ Tray is what gives the browser silent,
 * driver-level access to the USB printer without a system print dialog.
 */
@Injectable({
  providedIn: 'root'
})
export class PrinterService {

  /** Exact Windows printer/queue name (Control Panel > Printers & scanners).
   *  Leave blank to just use whatever is set as the system default printer. */
  private readonly PRINTER_NAME = '';

  /** Characters per line: 32 for 58mm paper, 42-48 for 80mm paper. */
  private readonly LINE_WIDTH = 32;

  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';

  private connectPromise: Promise<void> | null = null;

  private readonly statusSubject = new BehaviorSubject<PrinterConnectionStatus>('disconnected');
  readonly status$ = this.statusSubject.asObservable();

  private readonly lastErrorSubject = new BehaviorSubject<string | null>(null);
  readonly lastError$ = this.lastErrorSubject.asObservable();

  private readonly printerNameSubject = new BehaviorSubject<string | null>(null);
  readonly printerName$ = this.printerNameSubject.asObservable();

  private readonly qzVersionSubject = new BehaviorSubject<string | null>(null);
  readonly qzVersion$ = this.qzVersionSubject.asObservable();

  constructor() {
    const lib = this.qz();

    // Identify this app to QZ Tray with a signed certificate so the
    // "Action Required" dialog shows "Siphoria" (Valid signature/certificate)
    // instead of an anonymous, untrusted request. See qz-tray-security.ts.
    lib.security.setCertificatePromise((resolve: (cert: string) => void) => {
      resolve(QZ_CERTIFICATE);
    });
    lib.security.setSignatureAlgorithm('SHA512');
    lib.security.setSignaturePromise((toSign: string) => {
      return (resolve: (sig: string) => void, reject: (err: unknown) => void) => {
        try {
          const privateKey = KEYUTIL.getKey(QZ_PRIVATE_KEY);
          const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
          sig.init(privateKey as any);
          sig.updateString(toSign);
          const hex = sig.sign();
          resolve(stob64(hextorstr(hex)));
        } catch (err) {
          reject(err);
        }
      };
    });

    lib.websocket.setClosedCallbacks(() => {
      this.connectPromise = null;
      this.printerNameSubject.next(null);
      this.qzVersionSubject.next(null);
      this.statusSubject.next('disconnected');
    });
    lib.websocket.setErrorCallbacks((err: any) => {
      this.connectPromise = null;
      this.lastErrorSubject.next(err?.message ?? String(err));
      this.statusSubject.next('error');
    });
  }

  get status(): PrinterConnectionStatus {
    return this.statusSubject.value;
  }

  private qz(): any {
    return (qz as any).default ?? qz;
  }

  isConnected(): boolean {
    return this.qz().websocket.isActive();
  }

  /** Connects to QZ Tray (idempotent) and refreshes printer/version info. */
  async connect(): Promise<void> {
    const lib = this.qz();

    if (lib.websocket.isActive()) {
      this.statusSubject.next('connected');
      await this.refreshConnectionInfo();
      return;
    }

    if (!this.connectPromise) {
      this.statusSubject.next('connecting');
      this.lastErrorSubject.next(null);

      this.connectPromise = lib.websocket.connect()
        .then(() => {
          this.statusSubject.next('connected');
        })
        .catch((err: any) => {
          this.connectPromise = null;
          this.statusSubject.next('error');
          this.lastErrorSubject.next(err?.message ?? String(err));
          throw err;
        });
    }

    await this.connectPromise;
    await this.refreshConnectionInfo();
  }

  /** Drops the QZ Tray connection so it can be cleanly re-established. */
  disconnect(): void {
    const lib = this.qz();
    if (lib.websocket.isActive()) {
      lib.websocket.disconnect();
    }
    this.connectPromise = null;
    this.printerNameSubject.next(null);
    this.qzVersionSubject.next(null);
    this.statusSubject.next('disconnected');
  }

  /** Disconnects then reconnects — useful after QZ Tray was restarted or the printer was replugged. */
  async restartConnection(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  /** Lists every printer QZ Tray can see on this machine — useful to find the exact queue name for PRINTER_NAME. */
  async listPrinters(): Promise<string[]> {
    await this.connect();
    const names = await this.qz().printers.find();
    return Array.isArray(names) ? names : [names];
  }

  /** Sends a short sample receipt so a cashier can confirm the printer actually works. */
  async printTestReceipt(): Promise<void> {
    await this.printReceipt({
      orderId: 'TEST',
      customerName: 'Test Customer',
      paymentType: 'Cash',
      items: [{ name: 'Sample Espresso', size: '12', qty: 1, price: 99 }],
      total: 99
    });
  }

  private async refreshConnectionInfo(): Promise<void> {
    const lib = this.qz();
    try {
      const name = this.PRINTER_NAME
        ? await lib.printers.find(this.PRINTER_NAME)
        : await lib.printers.getDefault();
      this.printerNameSubject.next(name ?? null);
    } catch {
      this.printerNameSubject.next(null);
    }

    try {
      const version = await lib.api.getVersion();
      this.qzVersionSubject.next(version ?? null);
    } catch {
      this.qzVersionSubject.next(null);
    }
  }

  private async resolvePrinterConfig(): Promise<any> {
    const lib = this.qz();
    const printerName = this.printerNameSubject.value ?? (this.PRINTER_NAME
      ? await lib.printers.find(this.PRINTER_NAME)
      : await lib.printers.getDefault());
    return lib.configs.create(printerName);
  }

  /** Builds the receipt and sends it straight to the thermal printer. */
  async printReceipt(receipt: ReceiptData): Promise<void> {
    const lib = this.qz();
    try {
      await this.connect();
      const config = await this.resolvePrinterConfig();
      const data = [{ type: 'raw', format: 'plain', data: this.buildReceiptText(receipt) }];
      await lib.print(config, data);
    } catch (err) {
      console.error('Receipt print failed:', err);
      throw err;
    }
  }

  async printReceiptWithKitchenCopy(receipt: ReceiptData): Promise<void> {
    const lib = this.qz();
    try {
      await this.connect();
      const config = await this.resolvePrinterConfig();
      const customerText = this.buildReceiptText(receipt, { copyLabel: 'Customer Copy' });
      const kitchenText = this.buildReceiptText(receipt, { copyLabel: 'Kitchen Copy', hidePrices: true });
      const data = [{ type: 'raw', format: 'plain', data: customerText + this.cutDivider() + kitchenText }];
      await lib.print(config, data);
    } catch (err) {
      console.error('Receipt print failed:', err);
      throw err;
    }
  }

  /** Plain-text separator between the two copies — a manual cut/tear guide for printers without an auto-cutter. */
  private cutDivider(): string {
    const ALIGN_CENTER = this.ESC + 'a' + '\x01';
    const ALIGN_LEFT = this.ESC + 'a' + '\x00';
    const BOLD_ON = this.ESC + 'E' + '\x01';
    const BOLD_OFF = this.ESC + 'E' + '\x00';
    return '\n' + ALIGN_CENTER + BOLD_ON + '- - - - CUT HERE - - - -' + BOLD_OFF + '\n\n' + ALIGN_LEFT;
  }

  private buildReceiptText(r: ReceiptData, opts: { copyLabel?: string; hidePrices?: boolean } = {}): string {
    const copyLabel = opts.copyLabel ?? 'Official Receipt';
    const hidePrices = opts.hidePrices ?? false;
    const ESC = this.ESC, GS = this.GS;
    const INIT = ESC + '@';
    const ALIGN_CENTER = ESC + 'a' + '\x01';
    const ALIGN_LEFT = ESC + 'a' + '\x00';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const DOUBLE_ON = GS + '!' + '\x11';
    const DOUBLE_OFF = GS + '!' + '\x00';
    const CUT = '\n\n\n' + GS + 'V' + '\x01';

    const when = r.createdAt ?? new Date();
    const dateStr = when.toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' });

    let out = INIT;
    out += ALIGN_CENTER + DOUBLE_ON + 'SIPHORIA' + DOUBLE_OFF + '\n';
    out += copyLabel + '\n';
    out += this.divider();

    out += ALIGN_LEFT;
    out += this.twoCol('Order #:', r.orderId != null ? String(r.orderId) : '-');
    out += this.twoCol('Date:', dateStr);
    out += this.twoCol('Customer:', r.customerName || 'Guest');
    if (!hidePrices) {
      out += this.twoCol('Payment:', r.paymentType);
    }
    out += this.divider();

    for (const item of r.items) {
      const label = item.size ? `${item.name} (${item.size}oz)` : item.name;
      if (hidePrices) {
        out += this.truncate(`${item.qty}x  ${label}`) + '\n';
      } else {
        out += this.truncate(label) + '\n';
        const price = this.toNum(item.price);
        const qtyPrice = `  ${item.qty} x ${price.toFixed(2)}`;
        const lineTotal = (item.qty * price).toFixed(2);
        out += this.twoCol(qtyPrice, lineTotal);
      }
    }

    out += this.divider();
    if (!hidePrices) {
      out += BOLD_ON + this.twoCol('TOTAL', 'P' + this.toNum(r.total).toFixed(2)) + BOLD_OFF;
      out += this.divider();
      out += ALIGN_CENTER + 'Thank you! Please come again.\n';
    } else {
      out += ALIGN_CENTER + BOLD_ON + 'Prepare items above' + BOLD_OFF + '\n';
    }
    out += CUT;

    return out;
  }

  private divider(): string {
    return '-'.repeat(this.LINE_WIDTH) + '\n';
  }

  /** Backend prices sometimes arrive as currency-formatted strings (e.g. "$180.00"). */
  private toNum(value: unknown): number {
    if (typeof value === 'number' && !isNaN(value)) return value;
    const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  private truncate(text: string): string {
    return text.length > this.LINE_WIDTH ? text.slice(0, this.LINE_WIDTH) : text;
  }

  private twoCol(left: string, right: string): string {
    const gap = this.LINE_WIDTH - left.length - right.length;
    const spacer = gap > 0 ? ' '.repeat(gap) : ' ';
    return left + spacer + right + '\n';
  }
}
