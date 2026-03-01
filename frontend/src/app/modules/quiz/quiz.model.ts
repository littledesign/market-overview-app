export interface QuizSummary {
  id: string;
  title: string;
  topic: string;
  questionCount: number;
  estimatedMinutes: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface QuizDetail {
  id: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  quiz_id: string;
  score: number;
  answers_json: Record<string, number>;
  created_at?: string;
}
