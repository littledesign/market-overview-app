import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgHeroiconsModule } from '@dimaslz/ng-heroicons';

interface KnowledgeCard {
  title: string;
  description: string;
  /** Heroicon name (e.g. document-duplicate, book-open) */
  icon: any;
  link: string;
}

@Component({
  selector: 'app-knowledge-row',
  standalone: true,
  imports: [CommonModule, NgHeroiconsModule],
  template: `
    <div class="knowledge-grid">
      @for (card of cards; track card.title) {
        <a class="knowledge-card" [href]="card.link" target="_blank" rel="noopener noreferrer">
          <span class="card-icon">
            <ng-heroicons [icon]="card.icon" outline [size]="28" />
          </span>
          <h3 class="card-title">{{ card.title }}</h3>
          <p class="card-desc">{{ card.description }}</p>
        </a>
      }
    </div>
  `,
  styles: [`
    .knowledge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .knowledge-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
      text-decoration: none;
      transition: box-shadow 0.2s, border-color 0.2s;
      cursor: pointer;
    }
    .knowledge-card:hover {
      box-shadow: var(--shadow-card);
      border-color: var(--accent-blue);
    }
    /* The SVG icon inherits the card's text colour and gets tinted on hover */
    .card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.625rem;
      color: var(--accent-blue);
    }
    .knowledge-card:hover .card-icon { color: var(--accent-blue); }
    .card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.25rem;
    }
    .card-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }
  `],
})
export class KnowledgeRowComponent {
  cards: KnowledgeCard[] = [
    { title: 'Templates',   description: 'Ready-to-use design and research templates.',  icon: 'document-duplicate', link: '#' },
    { title: 'Playbooks',   description: 'Step-by-step guides for common workflows.',    icon: 'book-open',           link: '#' },
    { title: 'Prompts',     description: 'Curated AI prompts for design tasks.',        icon: 'light-bulb',          link: '#' },
    { title: 'Demos',       description: 'Interactive prototypes and examples.',       icon: 'play-circle',          link: '#' },
    { title: 'Style Guide', description: 'Brand colors, typography, and components.',   icon: 'swatch',              link: '#' },
    { title: 'Onboarding',  description: 'New team member getting-started guides.',   icon: 'user-group',          link: '#' },
  ];
}
