import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService, Theme } from '../../services/theme.service';

/**
 * ThemeToggleComponent — the light/dark mode switch.
 *
 * Displays a pill-shaped toggle with sun/moon icons.
 * Positioned in the top-right corner of the header by its parent.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.css',
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'light';
  private themeSub?: Subscription;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.theme$.subscribe((theme) => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isLight(): boolean {
    return this.currentTheme === 'light';
  }

  get isDark(): boolean {
    return this.currentTheme === 'dark';
  }
}
