import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/models';

export const API_BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private params(query?: Record<string, any>): HttpParams {
    let p = new HttpParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
      }
    }
    return p;
  }

  get<T>(url: string, query?: Record<string, any>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${API_BASE}${url}`, { params: this.params(query) });
  }
  post<T>(url: string, body: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${API_BASE}${url}`, body);
  }
  put<T>(url: string, body: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${API_BASE}${url}`, body);
  }
  patch<T>(url: string, body: any): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${API_BASE}${url}`, body);
  }
  delete<T>(url: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${API_BASE}${url}`);
  }
}
