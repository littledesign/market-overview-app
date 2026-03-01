import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-section-header',
  standalone: true,
  template: `
    <div class="section-header">
      <h2 class="section-title">{{ title }}</h2>
      @if (description) {
        <p class="section-desc">{{ description }}</p>
      }
    </div>
  `,
  styles: [`
    .section-header {
      margin-bottom: 1rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.25rem;
    }
    .section-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin: 0;
    }
  `],
  imports: [],
})
export class SectionHeaderComponent {
  @Input() title = '';
  @Input() description = '';
}
