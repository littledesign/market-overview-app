import { Router, Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- assert syntax not needed; esbuild handles JSON imports automatically
import quizzes from '../data/quizzes.json';

const router = Router();

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

interface Quiz {
  id: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

const quizList: Quiz[] = Array.isArray(quizzes) ? (quizzes as Quiz[]) : [];

/**
 * GET /api/quiz
 * Returns all quizzes (titles, topics, question counts — no answers).
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const summaries = quizList.map(q => ({
      id: q.id,
      title: q.title,
      topic: q.topic,
      questionCount: (q.questions || []).length,
      estimatedMinutes: q.estimatedMinutes ?? 0,
    }));
    res.json(summaries);
  } catch (error: any) {
    console.error('Error fetching quiz list:', error.message);
    res.json([]);
  }
});

/**
 * GET /api/quiz/:id
 * Returns a single quiz with full detail including answers.
 * The frontend handles client-side grading.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const quiz = quizList.find(q => q.id === req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error: any) {
    console.error('Error fetching quiz:', error.message);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

export default router;
