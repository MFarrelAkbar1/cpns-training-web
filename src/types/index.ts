export type Category = "TWK" | "TIU" | "TKP";
export type OptionId = "A" | "B" | "C" | "D" | "E";
export type AttemptMode = "practice" | "exam";

export interface QuestionImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Isi soal berurutan. Teks memakai penanda **tebal** dan *miring* dari PDF. */
export type QuestionBlock =
  | { type: "text"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | ({ type: "image" } & QuestionImage);

export interface QuestionOption {
  id: OptionId;
  /** Kosong bila pilihan berupa gambar. */
  text: string;
  image?: QuestionImage;
}

export interface Question {
  id: string;
  packageId: string;
  number: number;
  category: Category;
  topic: string | null;
  /** Teks soal tanpa penanda gaya; `blocks` adalah versi lengkap untuk ditampilkan. */
  question: string;
  blocks: QuestionBlock[];
  options: QuestionOption[];
  /** Kunci TWK/TIU; null untuk TKP. */
  correctAnswer: OptionId | null;
  explanation: string;
  /** Bobot TKP per opsi; null untuk TWK/TIU. */
  optionScores: Record<OptionId, number> | null;
  source: { questionPage: number; explanationPage: number | null };
  reviewFlags: string[];
}

export interface Thresholds {
  TWK: number;
  TIU: number;
  TKP: number;
  Total: number;
}

export interface QuestionPackage {
  id: string;
  name: string;
  sourceFile: string;
  durationMinutes: number;
  thresholds: Thresholds;
  questions: Question[];
}

export type Answers = Record<number, OptionId>;

export interface CategoryScore {
  score: number;
  max: number;
  total: number;
  answered: number;
  blank: number;
  /** Jawaban benar TWK/TIU; selalu 0 untuk TKP. */
  correct: number;
  /** Maksimum yang bisa diraih dari soal yang dijawab saja. */
  answeredMax: number;
}

export interface ScoreResult {
  total: number;
  max: number;
  answered: number;
  blank: number;
  correct: number;
  byCategory: Record<Category, CategoryScore>;
}

export type FinishReason = "user" | "timeout";

export interface Attempt {
  id: string;
  packageId: string;
  mode: AttemptMode;
  startedAt: number;
  /** Batas waktu absolut simulasi; null pada latihan. */
  deadlineAt: number | null;
  /** Nomor soal PDF dalam urutan pengerjaan. */
  order: number[];
  shuffled: boolean;
  currentIndex: number;
  answers: Answers;
  flagged: number[];
  timeSpentMs: Record<number, number>;
  warningsShown: number[];
}

export interface CompletedAttempt extends Attempt {
  finishedAt: number;
  finishReason: FinishReason;
  result: ScoreResult;
  passed: boolean;
}

export type PackageStatus = "not_started" | "in_progress" | "completed";
