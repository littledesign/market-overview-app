import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuizSummary, QuizDetail } from './quiz.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private baseUrl = `${environment.apiBaseUrl}/quiz`;

  constructor(private http: HttpClient) {}

  getQuizzes(): Observable<QuizSummary[]> {
    return this.http
      .get<QuizSummary[]>(this.baseUrl)
      .pipe(catchError(() => of([])));
  }

  getQuiz(id: string): Observable<QuizDetail | null> {
    return this.http
      .get<QuizDetail>(`${this.baseUrl}/${id}`)
      .pipe(catchError(() => of(null)));
  }
}
