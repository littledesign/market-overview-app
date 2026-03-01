import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface SavedNewsItem {
  id?: string;
  url: string;
  title: string;
  source: string;
  published_at: string;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  constructor(private supabase: SupabaseService) {}

  // ── User Preferences (jsonb) ──

  async getPreferences(): Promise<Record<string, any>> {
    const user = this.supabase.currentUser;
    if (!user) return {};

    const { data } = await this.supabase.client
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    return data?.preferences ?? {};
  }

  async savePreferences(prefs: Record<string, any>): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) return;

    await this.supabase.client
      .from('user_preferences')
      .upsert(
        { user_id: user.id, preferences: prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  }

  // ── Saved News ──

  async getSavedNews(): Promise<SavedNewsItem[]> {
    const user = this.supabase.currentUser;
    if (!user) return [];

    const { data } = await this.supabase.client
      .from('saved_news')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return (data ?? []) as SavedNewsItem[];
  }

  async saveNewsItem(item: SavedNewsItem): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) return;

    await this.supabase.client
      .from('saved_news')
      .insert({ user_id: user.id, ...item });
  }

  async unsaveNewsItem(url: string): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) return;

    await this.supabase.client
      .from('saved_news')
      .delete()
      .eq('user_id', user.id)
      .eq('url', url);
  }

  // ── Quiz Attempts ──

  async getQuizAttempts(): Promise<any[]> {
    const user = this.supabase.currentUser;
    if (!user) return [];

    const { data } = await this.supabase.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return data ?? [];
  }

  async saveQuizAttempt(quizId: string, score: number, answers: Record<string, number>): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) return;

    await this.supabase.client
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        answers_json: answers,
      });
  }
}
