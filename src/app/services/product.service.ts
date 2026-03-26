import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = 'https://your-api-url/products'; // change to your Railway API

  constructor(private http: HttpClient) {}

  // Get all products
  getProducts(): Observable<any> {
    return this.http.get("https://siphoriabackend-production.up.railway.app/products");
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

}