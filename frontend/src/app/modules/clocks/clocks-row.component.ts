import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ClockZone {
  label: string;
  timezone: string;
  time: string;
  date: string;
}

@Component({
  selector: 'app-clocks-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="clocks-grid">
      @for (clock of clocks; track clock.timezone) {
        <div class="clock-card">
          <span class="clock-label">{{ clock.label }}</span>
          <span class="clock-time">{{ clock.time }}</span>
          <span class="clock-date">{{ clock.date }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .clocks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
    }
    .clock-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.25rem 0.75rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
    }
    .clock-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--text-secondary);
      margin-bottom: 0.375rem;
    }
    .clock-time {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .clock-date {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 0.25rem;
    }
  `],
})
export class ClocksRowComponent implements OnInit, OnDestroy {
  clocks: ClockZone[] = [];
  private intervalId: any;

  private zones = [
    { label: 'Dublin',        timezone: 'Europe/Dublin' },
    { label: 'Boston',        timezone: 'America/New_York' },
    { label: 'New York',      timezone: 'America/New_York' },
    { label: 'San Francisco', timezone: 'America/Los_Angeles' },
    { label: 'Bangalore',     timezone: 'Asia/Kolkata' },
  ];

  ngOnInit() {
    this.updateClocks();
    this.intervalId = setInterval(() => this.updateClocks(), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  private updateClocks() {
    const now = new Date();
    this.clocks = this.zones.map(z => ({
      label: z.label,
      timezone: z.timezone,
      time: now.toLocaleTimeString('en-US', {
        timeZone: z.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
      date: now.toLocaleDateString('en-US', {
        timeZone: z.timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    }));
  }
}
