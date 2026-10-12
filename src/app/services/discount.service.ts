import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiscountService {

  private apiUrl = 'https://siphoriabackend-production.up.railway.app/discount';

  constructor(private http: HttpClient) {}

  getDiscounts(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createDiscount(payload: { name: string; description?: string }): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }
}
