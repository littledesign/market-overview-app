import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { MarketStripComponent } from '../market-strip/market-strip.component';
import { NewsRowComponent } from '../../modules/news/news-row.component';
import { QuizRowComponent } from '../../modules/quiz/quiz-row.component';
import { KnowledgeRowComponent } from '../../modules/knowledge/knowledge-row.component';
import { CritsRowComponent } from '../../modules/crits/crits-row.component';
import { SkillsRowComponent } from '../../modules/skills/skills-row.component';
import { ClocksRowComponent } from '../../modules/clocks/clocks-row.component';
import { WeatherRowComponent } from '../../modules/weather/weather-row.component';
import { PomodoroRowComponent } from '../../modules/pomodoro/pomodoro-row.component';

@Component({
  selector: 'app-hub-page',
  standalone: true,
  imports: [
    NavbarComponent,
    SectionHeaderComponent,
    MarketStripComponent,
    NewsRowComponent,
    QuizRowComponent,
    KnowledgeRowComponent,
    CritsRowComponent,
    SkillsRowComponent,
    ClocksRowComponent,
    WeatherRowComponent,
    PomodoroRowComponent,
  ],
  templateUrl: './hub-page.component.html',
  styleUrl: './hub-page.component.css',
})
export class HubPageComponent {}
