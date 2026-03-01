import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { SupabaseService } from '../../services/supabase.service';
import { Subscription } from 'rxjs';

interface NavLink {
  label: string;
  fragment: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  showAuthModal = false;
  userEmail: string | null = null;
  isLoggedIn = false;

  // Auth form state
  authMode: 'login' | 'signup' = 'login';
  authEmail = '';
  authPassword = '';
  authError = '';
  authLoading = false;

  private authSub!: Subscription;

  navLinks: NavLink[] = [
    { label: 'Markets',   fragment: 'markets' },
    { label: 'News',      fragment: 'news' },
    { label: 'Quiz',      fragment: 'quiz' },
    { label: 'Knowledge', fragment: 'knowledge' },
    { label: 'Clocks',    fragment: 'clocks' },
    { label: 'Weather',   fragment: 'weather' },
    { label: 'Doro',      fragment: 'pomodoro' },
  ];

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.authSub = this.supabase.session$.subscribe(session => {
      this.isLoggedIn = !!session;
      this.userEmail = session?.user?.email ?? null;
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  scrollTo(fragment: string) {
    const el = document.getElementById(fragment);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  openAuthModal() {
    this.showAuthModal = true;
    this.authError = '';
  }

  closeAuthModal() {
    this.showAuthModal = false;
    this.authEmail = '';
    this.authPassword = '';
    this.authError = '';
  }

  async handleAuth() {
    this.authLoading = true;
    this.authError = '';

    try {
      const result = this.authMode === 'login'
        ? await this.supabase.signIn(this.authEmail, this.authPassword)
        : await this.supabase.signUp(this.authEmail, this.authPassword);

      if (result.error) {
        this.authError = result.error.message;
      } else {
        this.closeAuthModal();
      }
    } catch (e: any) {
      this.authError = e.message || 'Something went wrong';
    } finally {
      this.authLoading = false;
    }
  }

  async handleSignOut() {
    await this.supabase.signOut();
  }

  onAuthEmailInput(event: Event) {
    this.authEmail = (event.target as HTMLInputElement).value;
  }

  onAuthPasswordInput(event: Event) {
    this.authPassword = (event.target as HTMLInputElement).value;
  }
}
