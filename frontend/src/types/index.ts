export interface User {
  userId: string;
  email: string;
  name: string;
  targetRole?: string;
  experienceLevel?: string;
}

export interface Question {
  id: string;
  text: string;
  topic: string;
  difficulty: string;
  type: string;
  userAnswer?: string;
  aiFeedback?: string; // Stringified JSON feedback from Gemini API evaluation
  score?: number;
}

export interface InterviewSession {
  id: string;
  type: string;
  role: string;
  difficulty: string;
  status: string; // ACTIVE, COMPLETED, CREATED
  startedAt: string;
  endedAt?: string;
  overallScore?: number;
  questions: Question[];
  questionsCount?: number;
}

export interface DashboardStats {
  overallAverageScore: number;
  totalSessions: number;
  currentStreak: number;
  categoryAverages: Record<string, number>;
  recentSessions: RecentSession[];
}

export interface RecentSession {
  id: string;
  type: string;
  role: string;
  difficulty: string;
  overallScore?: number;
  endedAt?: string;
}

export interface FeedbackReport {
  score: number;
  correctness: string;
  clarity: string;
  structure: string;
  communication: string;
  strengths: string[];
  weaknesses: string[];
  suggestedImprovements: string;
  modelAnswer: string;
}
