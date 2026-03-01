import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  PomodoroService,
  PomodoroTask,
  TimerMode,
  PomodoroState,
  DayStats,
} from './pomodoro.service';

// Small array of motivational quotes shown at the bottom of the Timer tab
const QUOTES = [
  'The magic happens when you stay present.',
  'One focused session at a time.',
  'Deep work is the superpower of our era.',
  'Small steps, consistently taken, create great things.',
  'Your best work comes from your best attention.',
  'Distraction is the enemy of mastery.',
  'Start. The rest will follow.',
  'Progress over perfection.',
];

type ActiveTab = 'timer' | 'tasks' | 'stats';

@Component({
  selector: 'app-pomodoro-row',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="doro-wrap">

      <!-- ── Tab bar ── -->
      <div class="doro-tabs">
        <button class="doro-tab" [class.active]="tab === 'timer'" (click)="tab = 'timer'">Timer</button>
        <button class="doro-tab" [class.active]="tab === 'tasks'" (click)="tab = 'tasks'">
          Tasks
          @if (activeTasks.length > 0) {
            <span class="tab-badge">{{ activeTasks.length }}</span>
          }
        </button>
        <button class="doro-tab" [class.active]="tab === 'stats'" (click)="tab = 'stats'">Stats</button>
      </div>

      <!-- ══════════════════════════════════════ TIMER TAB ══════════════════════════════════════ -->
      @if (tab === 'timer') {
        <div class="timer-tab">

          <!-- Mode segmented control -->
          <div class="mode-seg">
            <button class="mode-btn" [class.mode-active]="state.mode === 'focus'"  (click)="svc.switchMode('focus')">Focus</button>
            <button class="mode-btn" [class.mode-active]="state.mode === 'short'"  (click)="svc.switchMode('short')">Short break</button>
            <button class="mode-btn" [class.mode-active]="state.mode === 'long'"   (click)="svc.switchMode('long')">Long break</button>
          </div>

          <!-- Mode label -->
          <p class="timer-label">{{ modeLabel }}</p>

          <!-- SVG progress ring + time display -->
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 200 200" aria-hidden="true">
              <!-- Background track -->
              <circle
                class="ring-track"
                cx="100" cy="100" r="88"
                fill="none" stroke-width="6"
              />
              <!-- Progress arc (starts at top, runs clockwise) -->
              <circle
                class="ring-progress"
                cx="100" cy="100" r="88"
                fill="none" stroke-width="6"
                stroke-linecap="round"
                [style.stroke-dasharray]="ringCircumference"
                [style.stroke-dashoffset]="ringOffset"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <!-- Time digits centred inside the ring -->
            <div class="ring-time">{{ display }}</div>
          </div>

          <!-- Pomodoro-round dot indicators -->
          <div class="round-dots">
            @for (i of roundDots; track i) {
              <span class="dot" [class.dot-filled]="i < state.sessionsThisRound"></span>
            }
            <span class="round-label">{{ state.sessionsThisRound }} of {{ svc.sessionsPerRound }}</span>
          </div>

          <!-- Controls -->
          <div class="timer-controls">
            @if (!state.running) {
              <button class="ctrl-btn ctrl-play" (click)="svc.start()">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
                Play
              </button>
            } @else {
              <button class="ctrl-btn ctrl-pause" (click)="svc.pause()">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                Pause
              </button>
            }
            <button class="ctrl-btn ctrl-reset" (click)="svc.reset()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
          </div>

          <!-- Quote -->
          <p class="timer-quote">"{{ quote }}"</p>
        </div>
      }

      <!-- ══════════════════════════════════════ TASKS TAB ══════════════════════════════════════ -->
      @if (tab === 'tasks') {
        <div class="tasks-tab">
          <div class="tasks-header">
            <div class="tasks-counts">
              <span>Active <strong>{{ activeTasks.length }}</strong></span>
              <span>Done <strong>{{ completedTasks.length }}</strong></span>
            </div>
            <button class="new-task-btn" (click)="toggleNewTaskForm()">
              @if (!showNewTask) { + New Task } @else { Cancel }
            </button>
          </div>

          <!-- New task inline form -->
          @if (showNewTask) {
            <div class="task-form">
              <input
                class="task-input"
                type="text"
                placeholder="What are you working on? *"
                [(ngModel)]="newTitle"
                (keydown.enter)="submitNewTask()"
                autofocus
              />
              <input
                class="task-input"
                type="text"
                placeholder="Project (optional)"
                [(ngModel)]="newProject"
              />
              <div class="task-form-row">
                <label class="task-form-label">
                  Estimated sessions
                  <input class="task-num" type="number" [(ngModel)]="newEstimate" min="1" max="20" />
                </label>
                <div class="task-form-actions">
                  <button class="ctrl-btn ctrl-play" [disabled]="!newTitle.trim()" (click)="submitNewTask()">Start task</button>
                  <button class="ctrl-btn ctrl-reset" (click)="toggleNewTaskForm()">Cancel</button>
                </div>
              </div>
            </div>
          }

          <!-- Active tasks -->
          @if (activeTasks.length > 0) {
            <ul class="task-list">
              @for (task of activeTasks; track task.id) {
                <li class="task-item">
                  <button class="task-check" (click)="svc.completeTask(task.id)" title="Mark done">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>
                  </button>
                  <div class="task-info">
                    <span class="task-title">{{ task.title }}</span>
                    @if (task.project) {
                      <span class="task-project">{{ task.project }}</span>
                    }
                  </div>
                  <span class="task-est">{{ task.completedPomodoros }}/{{ task.estimatedPomodoros }}</span>
                  <button class="task-delete" (click)="svc.deleteTask(task.id)" title="Delete">×</button>
                </li>
              }
            </ul>
          } @else if (!showNewTask) {
            <p class="tasks-empty">No active tasks. Hit "+ New Task" to add one.</p>
          }

          <!-- Completed tasks -->
          @if (completedTasks.length > 0) {
            <div class="completed-section">
              <p class="completed-heading">Completed</p>
              <ul class="task-list task-list-done">
                @for (task of completedTasks; track task.id) {
                  <li class="task-item task-item-done">
                    <svg class="done-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="task-title-done">{{ task.title }}</span>
                    <button class="task-delete" (click)="svc.deleteTask(task.id)" title="Remove">×</button>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }

      <!-- ══════════════════════════════════════ STATS TAB ══════════════════════════════════════ -->
      @if (tab === 'stats') {
        <div class="stats-tab">
          <!-- Top highlights -->
          <div class="stat-highlights">
            <div class="stat-hl">
              <span class="hl-value">{{ svc.dayStreak }}</span>
              <span class="hl-label">Day streak</span>
            </div>
            <div class="stat-hl">
              <span class="hl-value">{{ todayStats.sessions }}</span>
              <span class="hl-label">Today</span>
            </div>
            <div class="stat-hl">
              <span class="hl-value">{{ state.totalSessions }}</span>
              <span class="hl-label">All sessions</span>
            </div>
          </div>

          <!-- This week mini bar chart (last 5 days) -->
          <div class="week-chart">
            <p class="chart-heading">This week</p>
            <div class="chart-bars">
              @for (day of weekStats; track day.date) {
                <div class="bar-col">
                  <div class="bar-track">
                    <div
                      class="bar-fill"
                      [style.height.%]="barHeight(day.sessions)"
                    ></div>
                  </div>
                  <span class="bar-count">{{ day.sessions }}</span>
                  <span class="bar-day">{{ shortDay(day.date) }}</span>
                </div>
              }
            </div>
          </div>

          <!-- All-time totals -->
          <div class="alltime">
            <p class="alltime-heading">All time</p>
            <div class="alltime-grid">
              <div class="alltime-item">
                <span class="alltime-val">{{ svc.totalAllTimeSessions }}</span>
                <span class="alltime-label">Sessions</span>
              </div>
              <div class="alltime-item">
                <span class="alltime-val">{{ focusHours }}</span>
                <span class="alltime-label">Focus hours</span>
              </div>
              <div class="alltime-item">
                <span class="alltime-val">{{ completedTasks.length }}</span>
                <span class="alltime-label">Tasks done</span>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    /* ── Wrapper ── */
    .doro-wrap {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ── Tab bar ── */
    .doro-tabs {
      display: flex;
      gap: 0;
      background: var(--bg-tertiary);
      border-radius: 10px;
      padding: 0.25rem;
      margin-bottom: 1rem;
    }

    .doro-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.4rem 0;
      border: none;
      border-radius: 7px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      color: var(--text-secondary);
      transition: background 0.15s, color 0.15s;
    }

    .doro-tab.active {
      background: var(--bg-primary);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px; height: 18px;
      font-size: 0.65rem;
      font-weight: 700;
      border-radius: 50%;
      background: var(--accent-blue);
      color: #fff;
    }

    /* ── TIMER TAB ── */
    .timer-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    /* Mode segmented control */
    .mode-seg {
      display: flex;
      gap: 0.25rem;
      background: var(--bg-tertiary);
      padding: 0.25rem;
      border-radius: 8px;
      width: 100%;
    }

    .mode-btn {
      flex: 1;
      padding: 0.3rem 0.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      color: var(--text-secondary);
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }

    .mode-btn.mode-active {
      background: var(--bg-primary);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
    }

    .timer-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0;
    }

    /* SVG ring */
    .ring-wrap {
      position: relative;
      width: 180px;
      height: 180px;
      flex-shrink: 0;
    }

    .ring-svg {
      width: 100%;
      height: 100%;
    }

    .ring-track {
      stroke: var(--border-primary);
    }

    .ring-progress {
      stroke: var(--accent-blue);
      transition: stroke-dashoffset 0.5s ease;
    }

    .ring-time {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.25rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    /* Round-progress dots */
    .round-dots {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .dot {
      display: inline-block;
      width: 10px; height: 10px;
      border-radius: 50%;
      background: var(--border-primary);
      border: 2px solid var(--border-primary);
      transition: background 0.2s;
    }

    .dot-filled { background: var(--accent-blue); border-color: var(--accent-blue); }

    .round-label {
      font-size: 0.72rem;
      color: var(--text-tertiary);
      margin-left: 0.25rem;
    }

    /* Controls */
    .timer-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .ctrl-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.15s;
    }

    .ctrl-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .ctrl-play  { background: var(--accent-blue); color: #fff; }
    .ctrl-play:hover:not(:disabled)  { filter: brightness(1.1); }
    .ctrl-pause { background: #f59e0b; color: #fff; }
    .ctrl-pause:hover { filter: brightness(1.1); }
    .ctrl-reset {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border-primary);
    }
    .ctrl-reset:hover { background: var(--border-primary); }

    /* Quote */
    .timer-quote {
      font-size: 0.78rem;
      color: var(--text-tertiary);
      font-style: italic;
      text-align: center;
      margin: 0;
      max-width: 280px;
    }

    /* ── TASKS TAB ── */
    .tasks-tab {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .tasks-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tasks-counts {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .tasks-counts strong { color: var(--text-primary); }

    .new-task-btn {
      padding: 0.35rem 0.875rem;
      background: var(--accent-blue);
      color: #fff;
      border: none;
      border-radius: 7px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .new-task-btn:hover { filter: brightness(1.1); }

    /* Inline task form */
    .task-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.875rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
    }

    .task-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-primary);
      border-radius: 7px;
      font-size: 0.85rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      outline: none;
    }

    .task-input:focus { border-color: var(--accent-blue); }

    .task-form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .task-form-label {
      font-size: 0.78rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .task-num {
      width: 56px;
      padding: 0.3rem 0.5rem;
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      font-size: 0.85rem;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .task-form-actions { display: flex; gap: 0.375rem; }

    /* Task lists */
    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .task-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
    }

    .task-check {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 0;
      flex-shrink: 0;
      display: flex;
    }

    .task-check:hover { color: var(--accent-blue); }

    .task-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .task-title {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-project {
      font-size: 0.72rem;
      color: var(--text-tertiary);
    }

    .task-est {
      font-size: 0.72rem;
      color: var(--text-tertiary);
      flex-shrink: 0;
    }

    .task-delete {
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 0 0.25rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .task-delete:hover { color: var(--negative-red); }

    .tasks-empty {
      font-size: 0.82rem;
      color: var(--text-tertiary);
      text-align: center;
      padding: 1.5rem 0;
      margin: 0;
    }

    .completed-section { margin-top: 0.25rem; }

    .completed-heading {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-tertiary);
      margin: 0 0 0.375rem;
    }

    .task-item-done { opacity: 0.6; }

    .done-icon {
      color: var(--positive-green);
      flex-shrink: 0;
    }

    .task-title-done {
      flex: 1;
      font-size: 0.83rem;
      text-decoration: line-through;
      color: var(--text-secondary);
    }

    /* ── STATS TAB ── */
    .stats-tab {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stat-highlights {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .stat-hl {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem 0.5rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
    }

    .hl-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .hl-label {
      font-size: 0.7rem;
      color: var(--text-tertiary);
      margin-top: 0.25rem;
      font-weight: 500;
    }

    /* Week bar chart */
    .week-chart {
      padding: 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
    }

    .chart-heading {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 0.75rem;
    }

    .chart-bars {
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
      height: 72px;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      height: 100%;
    }

    .bar-track {
      flex: 1;
      width: 100%;
      background: var(--bg-tertiary);
      border-radius: 4px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }

    .bar-fill {
      width: 100%;
      background: var(--accent-blue);
      border-radius: 4px;
      min-height: 4px;
      transition: height 0.3s ease;
    }

    .bar-count { font-size: 0.68rem; color: var(--text-secondary); font-weight: 600; }
    .bar-day   { font-size: 0.65rem; color: var(--text-tertiary); }

    /* All-time grid */
    .alltime {
      padding: 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
    }

    .alltime-heading {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 0.75rem;
    }

    .alltime-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .alltime-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .alltime-val   { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
    .alltime-label { font-size: 0.7rem; color: var(--text-tertiary); text-align: center; }
  `],
})
export class PomodoroRowComponent implements OnInit, OnDestroy {
  tab: ActiveTab = 'timer';

  state!: PomodoroState;
  todayStats!: DayStats;
  weekStats!: DayStats[];
  activeTasks: PomodoroTask[] = [];
  completedTasks: PomodoroTask[] = [];

  showNewTask = false;
  newTitle = '';
  newProject = '';
  newEstimate = 1;

  readonly quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // SVG ring constants — r=88 matches viewBox="0 0 200 200" with r="88"
  readonly ringCircumference = 2 * Math.PI * 88;

  private subs = new Subscription();

  constructor(readonly svc: PomodoroService) {}

  ngOnInit(): void {
    this.subs.add(
      this.svc.state$.subscribe(s => {
        this.state = s;
      }),
    );
    this.subs.add(
      this.svc.tasks$.subscribe(tasks => {
        this.activeTasks = tasks.filter(t => !t.done);
        this.completedTasks = tasks.filter(t => t.done);
      }),
    );
    this.subs.add(
      this.svc.stats$.subscribe(() => {
        this.todayStats = this.svc.todayStats;
        this.weekStats = this.svc.weekStats;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Timer display ──────────────────────────────────────────────────────────

  get display(): string {
    const m = Math.floor(this.state.secondsLeft / 60);
    const s = this.state.secondsLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  get modeLabel(): string {
    return { focus: 'Time to focus', short: 'Short break', long: 'Long break' }[this.state.mode];
  }

  /** Stroke-dashoffset for the SVG progress ring (0 = full, circumference = empty) */
  get ringOffset(): number {
    const total = this.svc.durationFor(this.state.mode);
    const progress = total > 0 ? this.state.secondsLeft / total : 0;
    return this.ringCircumference * progress;
  }

  /** Array [0, 1, 2, 3] used to render 4 session-indicator dots */
  get roundDots(): number[] {
    return Array.from({ length: this.svc.sessionsPerRound }, (_, i) => i);
  }

  // ── Stats display ──────────────────────────────────────────────────────────

  /** Total focus time in hours (rounded to 1 decimal) */
  get focusHours(): string {
    const mins = this.svc.totalAllTimeSessions * 25;
    return (mins / 60).toFixed(1);
  }

  /** Height % for a bar (max = highest session count, min bar = 5%) */
  barHeight(sessions: number): number {
    const max = Math.max(...this.weekStats.map(d => d.sessions), 1);
    return sessions === 0 ? 5 : Math.round((sessions / max) * 100);
  }

  /** Short weekday name from a YYYY-MM-DD string */
  shortDay(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  }

  // ── Task form ──────────────────────────────────────────────────────────────

  toggleNewTaskForm(): void {
    this.showNewTask = !this.showNewTask;
    if (!this.showNewTask) {
      this.newTitle = '';
      this.newProject = '';
      this.newEstimate = 1;
    }
  }

  submitNewTask(): void {
    if (!this.newTitle.trim()) return;
    this.svc.addTask({
      title: this.newTitle.trim(),
      project: this.newProject.trim(),
      estimatedPomodoros: Math.max(1, this.newEstimate),
    });
    this.toggleNewTaskForm();
  }
}
