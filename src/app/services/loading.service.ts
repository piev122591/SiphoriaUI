import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this._loading$.asObservable();

  start() {
    this.count++;
    this._loading$.next(true);
  }

  stop() {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) this._loading$.next(false);
  }
}
