import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TeamMember {
  name: string;
  role: string;
  skills: string[];
}

@Component({
  selector: 'app-skills-row',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="skills-layout">
      <input
        type="text"
        class="search-input"
        placeholder="Search by name or skill..."
        [(ngModel)]="searchTerm"
      />

      <div class="members-list">
        @for (member of filteredMembers; track member.name) {
          <div class="member-card">
            <div class="member-info">
              <span class="member-name">{{ member.name }}</span>
              <span class="member-role">{{ member.role }}</span>
            </div>
            <div class="skill-tags">
              @for (skill of member.skills; track skill) {
                <span class="skill-tag">{{ skill }}</span>
              }
            </div>
          </div>
        }
        @if (filteredMembers.length === 0) {
          <p class="no-results">No matches found.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .skills-layout { max-width: 600px; }
    .search-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      font-size: 0.9rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      margin-bottom: 1rem;
      outline: none;
      box-sizing: border-box;
    }
    .search-input:focus { border-color: var(--accent-blue); }
    .members-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .member-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .member-info { display: flex; flex-direction: column; gap: 0.125rem; }
    .member-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
    .member-role { font-size: 0.75rem; color: var(--text-tertiary); }
    .skill-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }
    .skill-tag {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border-radius: 999px;
      font-weight: 500;
    }
    .no-results { text-align: center; color: var(--text-tertiary); font-size: 0.9rem; }
  `],
})
export class SkillsRowComponent {
  searchTerm = '';

  members: TeamMember[] = [
    { name: 'Sarah Kim',     role: 'Senior UX Designer',    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'] },
    { name: 'James Lee',     role: 'Frontend Developer',    skills: ['Angular', 'React', 'TypeScript', 'CSS'] },
    { name: 'Anika Rao',     role: 'UX Researcher',         skills: ['Interviews', 'Surveys', 'Usability Testing', 'Analytics'] },
    { name: 'Marcus Chen',   role: 'Product Designer',      skills: ['Figma', 'Motion Design', 'Illustration', 'AI Prompting'] },
    { name: 'Fiona O\'Brien', role: 'Design Lead',          skills: ['Strategy', 'Mentoring', 'Design Crits', 'Accessibility'] },
  ];

  get filteredMembers(): TeamMember[] {
    if (!this.searchTerm.trim()) return this.members;
    const term = this.searchTerm.toLowerCase();
    return this.members.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.role.toLowerCase().includes(term) ||
      m.skills.some(s => s.toLowerCase().includes(term))
    );
  }
}
