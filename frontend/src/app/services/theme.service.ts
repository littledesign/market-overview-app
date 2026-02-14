import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Possible theme values — just 'light' or 'dark'.
 */
export type Theme = 'light' | 'dark';

/**
 * ThemeService manages the app's light/dark mode.
 *
 * How it works:
 * 1. On first load, it checks localStorage for a saved preference
 * 2. If nothing saved, it respects the user's system preference (macOS/Windows dark mode)
 * 3. It adds a CSS class to <html> (.light-theme or .dark-theme)
 * 4. All components read colors from CSS custom properties, so they update instantly
 * 5. The choice is saved to localStorage so it persists across page reloads
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'market-app-theme';
  private themeSubject: BehaviorSubject<Theme>;
  theme$: Observable<Theme>;

  constructor() {
    const savedTheme = this.getSavedTheme();
    this.themeSubject = new BehaviorSubject<Theme>(savedTheme);
    this.theme$ = this.themeSubject.asObservable();
    this.applyThemeClass(savedTheme);
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  toggleTheme(): void {
    const next: Theme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    this.applyThemeClass(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  private applyThemeClass(theme: Theme): void {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${theme}-theme`);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
    }
  }
}
