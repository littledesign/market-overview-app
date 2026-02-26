import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NewsItem } from './news.model';
import { environment } from '../../../environments/environment';

export interface ArticleMetadata {
  imageUrl: string | null;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private baseUrl = `${environment.apiBaseUrl}/news`;

  constructor(private http: HttpClient) {}

  getItems(aiOnly = false, source?: string): Observable<NewsItem[]> {
    let params = new HttpParams();
    if (aiOnly) params = params.set('aiOnly', 'true');
    if (source) params = params.set('source', source);

    return this.http
      .get<NewsItem[]>(`${this.baseUrl}/items`, { params })
      .pipe(catchError(() => of([])));
  }

  getSources(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}/sources`)
      .pipe(catchError(() => of([])));
  }

  getMetadata(url: string): Observable<ArticleMetadata> {
    const params = new HttpParams().set('url', url);
    return this.http
      .get<ArticleMetadata>(`${this.baseUrl}/metadata`, { params })
      .pipe(catchError(() => of({ imageUrl: null, description: null })));
  }

  summarize(url: string, title: string, description?: string, content?: string): Observable<{ summary: string }> {
    return this.http.post<{ summary: string }>(`${this.baseUrl}/summarize`, {
      url,
      title,
      description: description || '',
      content: content || '',
    });
  }
}
