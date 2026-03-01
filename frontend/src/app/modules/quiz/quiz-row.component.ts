import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from './quiz.service';
import { QuizSummary, QuizDetail } from './quiz.model';
import { SupabaseService } from '../../services/supabase.service';
import { PreferencesService } from '../../services/preferences.service';

type ViewMode = 'list' | 'taking' | 'results';

@Component({
  selector: 'app-quiz-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-row.component.html',
  styleUrl: './quiz-row.component.css',
})
export class QuizRowComponent implements OnInit {
  quizzes: QuizSummary[] = [];
  loading = true;
  error = false;

  // Quiz-taking state
  viewMode: ViewMode = 'list';
  activeQuiz: QuizDetail | null = null;
  currentQuestionIndex = 0;
  answers: Record<string, number> = {};
  score = 0;

  constructor(
    private quizService: QuizService,
    private supabase: SupabaseService,
    private prefs: PreferencesService,
  ) {}

  ngOnInit() {
    this.quizService.getQuizzes().subscribe({
      next: (q) => { this.quizzes = q; this.loading = false; },
      error: () => { this.error = true; this.loading = false; },
    });
  }

  startQuiz(quizId: string) {
    this.quizService.getQuiz(quizId).subscribe(detail => {
      if (!detail) return;
      this.activeQuiz = detail;
      this.currentQuestionIndex = 0;
      this.answers = {};
      this.score = 0;
      this.viewMode = 'taking';
    });
  }

  get currentQuestion() {
    return this.activeQuiz?.questions[this.currentQuestionIndex] ?? null;
  }

  get totalQuestions(): number {
    return this.activeQuiz?.questions.length ?? 0;
  }

  selectAnswer(optionIndex: number) {
    if (!this.currentQuestion) return;
    this.answers[this.currentQuestion.id] = optionIndex;
  }

  isSelected(optionIndex: number): boolean {
    if (!this.currentQuestion) return false;
    return this.answers[this.currentQuestion.id] === optionIndex;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.currentQuestionIndex++;
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  async submitQuiz() {
    if (!this.activeQuiz) return;

    this.score = this.activeQuiz.questions.reduce((total, q) => {
      return total + (this.answers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);

    this.viewMode = 'results';

    if (this.supabase.isLoggedIn) {
      await this.prefs.saveQuizAttempt(this.activeQuiz.id, this.score, this.answers);
    }
  }

  isCorrect(questionId: string): boolean {
    if (!this.activeQuiz) return false;
    const q = this.activeQuiz.questions.find(q => q.id === questionId);
    return !!q && this.answers[questionId] === q.correctIndex;
  }

  backToList() {
    this.viewMode = 'list';
    this.activeQuiz = null;
  }
}
