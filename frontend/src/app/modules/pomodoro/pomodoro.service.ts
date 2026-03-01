import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerMode = 'focus' | 'short' | 'long';

export interface PomodoroTask {
  id: string;
  title: string;
  project: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  done: boolean;
  createdAt: string;
}

export interface DayStats {
  date: string;       // YYYY-MM-DD
  sessions: number;   // completed focus sessions that day
}

export interface PomodoroState {
  mode: TimerMode;
  secondsLeft: number;
  running: boolean;
  // How many focus sessions have been completed in this "round" (resets after long break)
  sessionsThisRound: number;
  totalSessions: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

/** Number of focus sessions before a long break is suggested */
const SESSIONS_PER_ROUND = 4;

const LS_STATE = 'pomodoro_state';
const LS_TASKS = 'pomodoro_tasks';
const LS_STATS = 'pomodoro_stats';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PomodoroService implements OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Reactive state so the component always gets fresh values
  readonly state$ = new BehaviorSubject<PomodoroState>(this.loadState());
  readonly tasks$ = new BehaviorSubject<PomodoroTask[]>(this.loadTasks());
  readonly stats$ = new BehaviorSubject<DayStats[]>(this.loadStats());

  ngOnDestroy(): void {
    this.clearInterval();
  }

  // ── Timer controls ──────────────────────────────────────────────────────────

  start(): void {
    if (this.state$.value.running) return;
    this.patch({ running: true });
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause(): void {
    this.clearInterval();
    this.patch({ running: false });
    this.saveState();
  }

  reset(): void {
    this.pause();
    this.patch({ secondsLeft: DURATIONS[this.state$.value.mode] });
    this.saveState();
  }

  switchMode(mode: TimerMode): void {
    this.pause();
    this.patch({ mode, secondsLeft: DURATIONS[mode] });
    this.saveState();
  }

  // ── Task management ─────────────────────────────────────────────────────────

  addTask(task: Omit<PomodoroTask, 'id' | 'completedPomodoros' | 'done' | 'createdAt'>): void {
    const newTask: PomodoroTask = {
      ...task,
      id: Date.now().toString(36),
      completedPomodoros: 0,
      done: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTask, ...this.tasks$.value];
    this.tasks$.next(updated);
    this.saveTasks(updated);
  }

  completeTask(id: string): void {
    const updated = this.tasks$.value.map(t => t.id === id ? { ...t, done: true } : t);
    this.tasks$.next(updated);
    this.saveTasks(updated);
  }

  deleteTask(id: string): void {
    const updated = this.tasks$.value.filter(t => t.id !== id);
    this.tasks$.next(updated);
    this.saveTasks(updated);
  }

  // ── Derived getters ─────────────────────────────────────────────────────────

  get activeTasks(): PomodoroTask[] {
    return this.tasks$.value.filter(t => !t.done);
  }

  get completedTasks(): PomodoroTask[] {
    return this.tasks$.value.filter(t => t.done);
  }

  /** Duration for the current mode in seconds */
  durationFor(mode: TimerMode): number {
    return DURATIONS[mode];
  }

  get sessionsPerRound(): number {
    return SESSIONS_PER_ROUND;
  }

  // ── Stats helpers ───────────────────────────────────────────────────────────

  get todayStats(): DayStats {
    const today = todayDate();
    return this.stats$.value.find(s => s.date === today) ?? { date: today, sessions: 0 };
  }

  get weekStats(): DayStats[] {
    const all = this.stats$.value;
    const result: DayStats[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = offsetDate(i);
      result.push(all.find(s => s.date === d) ?? { date: d, sessions: 0 });
    }
    return result;
  }

  get totalAllTimeSessions(): number {
    return this.stats$.value.reduce((sum, d) => sum + d.sessions, 0);
  }

  get dayStreak(): number {
    const all = this.stats$.value;
    const daysWithSessions = new Set(all.filter(s => s.sessions > 0).map(s => s.date));
    let streak = 0;
    let i = 0;
    while (true) {
      const d = offsetDate(i);
      if (daysWithSessions.has(d)) { streak++; i++; } else break;
    }
    return streak;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private tick(): void {
    const s = this.state$.value;
    if (s.secondsLeft > 0) {
      this.patch({ secondsLeft: s.secondsLeft - 1 });
    } else {
      // Timer finished
      this.clearInterval();
      if (s.mode === 'focus') {
        this.recordFocusSession();
        const newRound = (s.sessionsThisRound + 1) % SESSIONS_PER_ROUND;
        this.patch({
          running: false,
          sessionsThisRound: newRound,
          totalSessions: s.totalSessions + 1,
          // Auto-suggest next mode
          mode: newRound === 0 ? 'long' : 'short',
          secondsLeft: newRound === 0 ? DURATIONS.long : DURATIONS.short,
        });
      } else {
        this.patch({ running: false, mode: 'focus', secondsLeft: DURATIONS.focus });
      }
      this.saveState();
    }
    this.saveState();
  }

  private recordFocusSession(): void {
    const today = todayDate();
    const existing = this.stats$.value;
    const idx = existing.findIndex(s => s.date === today);
    let updated: DayStats[];
    if (idx >= 0) {
      updated = existing.map((s, i) => i === idx ? { ...s, sessions: s.sessions + 1 } : s);
    } else {
      updated = [{ date: today, sessions: 1 }, ...existing].slice(0, 90); // keep 90 days
    }
    this.stats$.next(updated);
    this.saveStats(updated);
  }

  private patch(partial: Partial<PomodoroState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ── Persistence (localStorage) ───────────────────────────────────────────────

  private loadState(): PomodoroState {
    const defaults: PomodoroState = {
      mode: 'focus',
      secondsLeft: DURATIONS.focus,
      running: false,
      sessionsThisRound: 0,
      totalSessions: 0,
    };
    try {
      const raw = localStorage.getItem(LS_STATE);
      if (!raw) return defaults;
      const s = JSON.parse(raw);
      return { ...defaults, ...s, running: false }; // never restore running state
    } catch { return defaults; }
  }

  private saveState(): void {
    localStorage.setItem(LS_STATE, JSON.stringify(this.state$.value));
  }

  private loadTasks(): PomodoroTask[] {
    try {
      const raw = localStorage.getItem(LS_TASKS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveTasks(tasks: PomodoroTask[]): void {
    localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
  }

  private loadStats(): DayStats[] {
    try {
      const raw = localStorage.getItem(LS_STATS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveStats(stats: DayStats[]): void {
    localStorage.setItem(LS_STATS, JSON.stringify(stats));
  }
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().substring(0, 10);
}

/** Returns a YYYY-MM-DD string for `daysAgo` days before today (0 = today) */
function offsetDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().substring(0, 10);
}
