import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  private apiUrl = 'https://siphoriabackend-production.up.railway.app/inventory';

  constructor(private http: HttpClient) {}

  getInventory(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createInventory(data: { name: string; unit?: string; quantity?: number; reorder_level?: number }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getInventoryDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/details`);
  }

  addInventoryDetail(id: number, data: { quantity: number; note?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/details`, data);
  }

  updateInventoryDetail(id: number, detailId: number, data: { quantity?: number; note?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/details/${detailId}`, data);
  }

  deleteInventoryDetail(id: number, detailId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/details/${detailId}`);
  }

  updateInventory(id: number, data: { name: string; unit?: string; reorder_level?: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  getRecipe(productDetailsId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/product-details/${productDetailsId}`);
  }

  addRecipeItem(productDetailsId: number, data: { inventory_id: number; quantity_used?: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/product-details/${productDetailsId}`, data);
  }

  updateRecipeItem(productDetailsId: number, inventoryId: number, quantityUsed: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/product-details/${productDetailsId}/${inventoryId}`, { quantity_used: quantityUsed });
  }

  deleteRecipeItem(productDetailsId: number, inventoryId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/product-details/${productDetailsId}/${inventoryId}`);
  }
}
