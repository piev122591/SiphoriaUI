import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueryResult {
  command: string;
  rowCount: number;
  rows: any[];
}

@Injectable({
  providedIn: 'root'
})
export class QueryService {

  private apiUrl = 'https://siphoriabackend-production.up.railway.app/query';

  constructor(private http: HttpClient) {}

  run(sql: string, confirm = false): Observable<QueryResult> {
    return this.http.post<QueryResult>(this.apiUrl, { sql, confirm });
  }
}
