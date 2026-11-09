import Image from "next/image";
import { Fragment } from "react";
import type { Question, QuestionImage } from "@/types";

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

/** Merender penanda **tebal** dan *miring* hasil ekstraksi PDF. */
export function RichLine({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE).map((part, i) => {
        if (part.startsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Gambar soal bergaris hitam, jadi selalu tampil di atas kartu putih meski mode gelap. */
export function FigureImage({ image, className }: { image: QuestionImage; className?: string }) {
  return (
    <span className={`inline-block max-w-full rounded-lg bg-white p-1.5 ${className ?? ""}`}>
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        unoptimized
        loading="lazy"
        className="h-auto max-w-full"
        style={{ width: Math.round(image.width / 2) }}
      />
    </span>
  );
}

export function QuestionContent({ question }: { question: Question }) {
  return (
    <div className="space-y-4 text-[0.95rem] leading-relaxed sm:text-base">
      {question.blocks.map((block, i) => {
        if (block.type === "text") {
          return (
            <div key={i} className="space-y-2">
              {block.text.split("\n").map((line, j) => (
                <p key={j}>
                  <RichLine text={line} />
                </p>
              ))}
            </div>
          );
        }
        if (block.type === "image") return <FigureImage key={i} image={block} />;
        return (
          <div key={i} className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead className="bg-muted">
                <tr>
                  {block.headers.map((header, j) => (
                    <th key={j} scope="col" className="px-4 py-2 text-center font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, j) => (
                  <tr key={j} className="border-t">
                    {row.map((cell, k) => (
                      <td key={k} className="px-4 py-2 text-center tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
