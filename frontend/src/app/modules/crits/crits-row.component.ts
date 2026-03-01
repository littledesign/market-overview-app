import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CritSession {
  title: string;
  date: string;
  time: string;
  facilitator: string;
}

@Component({
  selector: 'app-crits-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="crits-layout">
      <div class="sessions-list">
        <h4 class="list-heading">Upcoming Sessions</h4>
        @for (session of sessions; track session.title) {
          <div class="session-card">
            <div class="session-info">
              <span class="session-title">{{ session.title }}</span>
              <span class="session-meta">{{ session.date }} &middot; {{ session.time }}</span>
            </div>
            <span class="session-facilitator">{{ session.facilitator }}</span>
          </div>
        }
      </div>
      <button class="book-btn" (click)="showModal = true">Book a Crit</button>
    </div>

    @if (showModal) {
      <div class="modal-backdrop" (click)="showModal = false">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showModal = false">&times;</button>
          <h3 class="modal-heading">Book a Crit</h3>
          <p class="modal-text">This feature is coming soon. Stay tuned!</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .crits-layout { max-width: 600px; }
    .list-heading {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .session-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
    }
    .session-info { display: flex; flex-direction: column; gap: 0.125rem; }
    .session-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
    .session-meta { font-size: 0.75rem; color: var(--text-tertiary); }
    .session-facilitator { font-size: 0.8rem; color: var(--text-secondary); }
    .book-btn {
      padding: 0.5rem 1.25rem;
      background: var(--accent-blue);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .book-btn:hover { background: var(--accent-blue-hover); }

    .modal-backdrop {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .modal-box {
      background: var(--modal-bg);
      border: 1px solid var(--modal-border);
      border-radius: 12px;
      padding: 2rem;
      max-width: 360px;
      width: 100%;
      position: relative;
      text-align: center;
    }
    .modal-close {
      position: absolute; top: 0.75rem; right: 1rem;
      background: none; border: none;
      font-size: 1.5rem; color: var(--text-tertiary); cursor: pointer;
    }
    .modal-heading { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem; }
    .modal-text { font-size: 0.9rem; color: var(--text-secondary); margin: 0; }
  `],
})
export class CritsRowComponent {
  showModal = false;

  sessions: CritSession[] = [
    { title: 'Mobile App Redesign Review',    date: 'Mar 3, 2026', time: '2:00 PM',  facilitator: 'Sarah K.' },
    { title: 'Dashboard UX Critique',         date: 'Mar 5, 2026', time: '10:00 AM', facilitator: 'James L.' },
    { title: 'Onboarding Flow Walkthrough',   date: 'Mar 10, 2026', time: '3:30 PM', facilitator: 'Anika R.' },
  ];
}
