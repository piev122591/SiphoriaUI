import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private apiUrl = 'https://siphoriabackend-production.up.railway.app/orders';

  constructor(private http: HttpClient) {}

  placeOrder(payload: {
    name: string;
    payment_type_id: number;
    status_id: number;
    remarks: string;
    order_details: { product_details_id: number; qty: number; price: number }[];
  }): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  getOrdersByDate(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/by-date`, { params });
  }

  getOrderDetails(orderId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/order-details/${orderId}`);
  }

  updateOrderStatus(orderId: number, statusId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${orderId}/status`, { status_id: statusId });
  }
}
