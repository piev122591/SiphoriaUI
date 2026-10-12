import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ReportStation = 'drinks' | 'kitchen';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private apiUrl = 'https://siphoriabackend-production.up.railway.app/reports';

  constructor(private http: HttpClient) {}

  getDailySales(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    return this.http.get<any[]>(`${this.apiUrl}/daily-sales`, { params });
  }

  getDailySalesByStation(startDate: string, endDate: string, station: ReportStation): Observable<any[]> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('station', station);
    return this.http.get<any[]>(`${this.apiUrl}/daily-sales-by-station`, { params });
  }
}
