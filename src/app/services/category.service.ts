import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

// How long the category list is reused before being fetched again
const CATEGORIES_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private apiUrl = 'https://your-api-url/category'; // change to your Railway API

  private categories$: Observable<any> | null = null;
  private categoriesCachedAt = 0;

  constructor(private http: HttpClient) {}

  // Get all categories (cached for a few minutes)
  getCategories(): Observable<any> {
    if (!this.categories$ || Date.now() - this.categoriesCachedAt > CATEGORIES_CACHE_TTL_MS) {
      this.categoriesCachedAt = Date.now();
      this.categories$ = this.http.get("https://siphoriabackend-production.up.railway.app/category").pipe(
        catchError(err => {
          this.categories$ = null; // don't keep a failed request around
          return throwError(() => err);
        }),
        shareReplay(1)
      );
    }
    return this.categories$;
  }

  // // Get product by category
  // getProductsByCategory(categoryId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/category/${categoryId}`);
  // }

  // // Get single product
  // getProduct(id: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/${id}`);
  // }

}