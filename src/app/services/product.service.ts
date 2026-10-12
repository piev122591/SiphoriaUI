import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, shareReplay, throwError } from 'rxjs';

// How long the product list is reused before being fetched again
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = 'https://your-api-url/products'; // change to your Railway API

  private products$: Observable<any> | null = null;
  private productsCachedAt = 0;

  constructor(private http: HttpClient) {}

  // Get all products (cached; cleared on any product/variant change).
  // Product details are NOT cached: they carry live stock used by ordering.
  getProducts(): Observable<any> {
    if (!this.products$ || Date.now() - this.productsCachedAt > PRODUCTS_CACHE_TTL_MS) {
      this.productsCachedAt = Date.now();
      this.products$ = this.http.get("https://siphoriabackend-production.up.railway.app/products").pipe(
        catchError(err => {
          this.clearProductsCache(); // don't keep a failed request around
          return throwError(() => err);
        }),
        shareReplay(1)
      );
    }
    return this.products$;
  }

  clearProductsCache(): void {
    this.products$ = null;
  }

   getProductDetails(): Observable<any> {
    return this.http.get("https://siphoriabackend-production.up.railway.app/productDetails");
  }


  // Get product by category
  getProductsByCategory(categoryId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/category/${categoryId}`);
  }

  // Get single product
  getProduct(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateProductDetailPrice(id: number, price: number): Observable<any> {
    return this.http.patch(`https://siphoriabackend-production.up.railway.app/productDetails/${id}/price`, { price }).pipe(finalize(() => this.clearProductsCache()));
  }

  createProduct(data: { name: string; categoryid: number; station?: 'drinks' | 'kitchen' | null }): Observable<any> {
    return this.http.post('https://siphoriabackend-production.up.railway.app/products', data).pipe(finalize(() => this.clearProductsCache()));
  }

  updateProduct(id: number, data: { name: string; categoryid: number; station?: 'drinks' | 'kitchen' | null }): Observable<any> {
    return this.http.put(`https://siphoriabackend-production.up.railway.app/products/${id}`, data).pipe(finalize(() => this.clearProductsCache()));
  }

  createProductDetail(data: { productid: number; sizeid: number; price: number; fc?: number | null; image_url?: string }): Observable<any> {
    return this.http.post('https://siphoriabackend-production.up.railway.app/productDetails', data).pipe(finalize(() => this.clearProductsCache()));
  }

  updateProductDetail(id: number, data: { productid: number; sizeid: number; price: number; fc?: number | null; image_url?: string }): Observable<any> {
    return this.http.put(`https://siphoriabackend-production.up.railway.app/productDetails/${id}`, data).pipe(finalize(() => this.clearProductsCache()));
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`https://siphoriabackend-production.up.railway.app/products/${id}`).pipe(finalize(() => this.clearProductsCache()));
  }

  deleteProductDetail(id: number): Observable<any> {
    return this.http.delete(`https://siphoriabackend-production.up.railway.app/productDetails/${id}`).pipe(finalize(() => this.clearProductsCache()));
  }

  getSizes(): Observable<any> {
    return this.http.get('https://siphoriabackend-production.up.railway.app/products/size');
  }

}