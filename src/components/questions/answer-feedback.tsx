import { CheckCircle2, CircleSlash, Scale, XCircle } from "lucide-react";
import { maxScoreOf, scoreQuestion } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { OptionId, Question } from "@/types";

/** Hasil jawaban & pembahasan, dipakai di latihan, review, dan bookmark. */
export function AnswerFeedback({
  question,
  answer,
  showVerdict = true,
}: {
  question: Question;
  answer: OptionId | undefined;
  showVerdict?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      {showVerdict && <Verdict question={question} answer={answer} />}
      <div>
        <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pembahasan</h3>
        <div className="space-y-2 text-sm leading-relaxed">
          {question.explanation.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Verdict({ question, answer }: { question: Question; answer: OptionId | undefined }) {
  const points = scoreQuestion(question, answer);

  if (!answer) {
    return (
      <VerdictRow icon={<CircleSlash className="size-5 text-muted-foreground" aria-hidden />} title="Tidak dijawab">
        {question.correctAnswer
          ? `Kunci jawaban: ${question.correctAnswer}. Skor 0.`
          : "Skor 0. Bobot setiap pilihan tertera pada opsi di atas."}
      </VerdictRow>
    );
  }

  if (question.category === "TKP") {
    return (
      <VerdictRow
        icon={<Scale className="size-5 text-primary" aria-hidden />}
        title={`Skor ${points} dari ${maxScoreOf(question)}`}
      >
        Anda memilih {answer}. TKP tidak mengenal benar atau salah; setiap pilihan memiliki bobot sendiri.
      </VerdictRow>
    );
  }

  const correct = answer === question.correctAnswer;
  return (
    <VerdictRow
      icon={
        correct ? (
          <CheckCircle2 className="size-5 text-answered" aria-hidden />
        ) : (
          <XCircle className="size-5 text-destructive" aria-hidden />
        )
      }
      title={correct ? "Benar, +5 poin" : "Salah, 0 poin"}
      titleClass={correct ? "text-answered" : "text-destructive"}
    >
      Jawaban Anda {answer}. Kunci jawaban: {question.correctAnswer}.
    </VerdictRow>
  );
}

function VerdictRow({
  icon,
  title,
  titleClass,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  titleClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className={cn("text-sm font-semibold", titleClass)}>{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
