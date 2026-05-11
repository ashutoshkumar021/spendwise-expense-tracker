import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IncomeService {
  private apiUrl = `${environment.apiUrl}/income`;

  constructor(private http: HttpClient) {}

  getIncome(filters?: any): Observable<any> {
    return this.http.get(this.apiUrl, { params: filters });
  }

  addIncome(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateIncome(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteIncome(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary`);
  }
}
