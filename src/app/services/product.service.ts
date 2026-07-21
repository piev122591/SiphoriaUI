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

  updateProductDetailPrice(id: number, price: number): Observable<any> {
    return this.http.patch(`https://siphoriabackend-production.up.railway.app/productDetails/${id}/price`, { price });
  }

  createProduct(data: { name: string; categoryid: number }): Observable<any> {
    return this.http.post('https://siphoriabackend-production.up.railway.app/products', data);
  }

  createProductDetail(data: { productid: number; sizeid: number; price: number; image_url?: string }): Observable<any> {
    return this.http.post('https://siphoriabackend-production.up.railway.app/productDetails', data);
  }

  updateProductDetail(id: number, data: { productid: number; sizeid: number; price: number; image_url?: string }): Observable<any> {
    return this.http.put(`https://siphoriabackend-production.up.railway.app/productDetails/${id}`, data);
  }

  getSizes(): Observable<any> {
    return this.http.get('https://siphoriabackend-production.up.railway.app/products/size');
  }

}