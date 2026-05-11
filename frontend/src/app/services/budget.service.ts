import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private apiUrl = `${environment.apiUrl}/budget`;

  constructor(private http: HttpClient) {}

  getBudgets(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  setBudget(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getBudgetStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status`);
  }
}
