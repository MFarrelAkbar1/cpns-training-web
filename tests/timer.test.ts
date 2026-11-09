import { describe, expect, it } from "vitest";
import { computeDeadline, dueWarnings, EXAM_DURATION_MS, formatCountdown, isExpired, remainingMs } from "@/lib/timer";

const MIN = 60000;

describe("timer berbasis timestamp", () => {
  it("durasi 100 menit dari waktu mulai", () => {
    expect(computeDeadline(1000)).toBe(1000 + 100 * MIN);
    expect(EXAM_DURATION_MS).toBe(6_000_000);
  });

  it("sisa waktu hanya bergantung pada jam, tidak pada render atau refresh", () => {
    const deadline = computeDeadline(0);
    expect(remainingMs(deadline, 30 * MIN)).toBe(70 * MIN);
    expect(remainingMs(deadline, 200 * MIN)).toBe(0);
    expect(isExpired(deadline, deadline - 1)).toBe(false);
    expect(isExpired(deadline, deadline)).toBe(true);
  });

  it("format hitung mundur", () => {
    expect(formatCountdown(100 * MIN)).toBe("01:40:00");
    expect(formatCountdown(5 * MIN)).toBe("05:00");
    expect(formatCountdown(1)).toBe("00:01");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});

describe("dueWarnings", () => {
  it("tampil tepat di ambang 15, 5, dan 1 menit", () => {
    expect(dueWarnings(15 * MIN + 1, [])).toEqual({ show: null, markShown: [] });
    expect(dueWarnings(15 * MIN, [])).toEqual({ show: 15, markShown: [15] });
    expect(dueWarnings(5 * MIN, [15])).toEqual({ show: 5, markShown: [5] });
    expect(dueWarnings(1 * MIN, [15, 5])).toEqual({ show: 1, markShown: [1] });
  });

  it("tidak mengulang peringatan setelah refresh", () => {
    expect(dueWarnings(14 * MIN, [15])).toEqual({ show: null, markShown: [] });
  });

  it("melewati beberapa ambang: hanya yang terkecil ditampilkan", () => {
    expect(dueWarnings(3 * MIN, [])).toEqual({ show: 5, markShown: [15, 5] });
  });

  it("tidak memperingatkan bila waktu sudah habis", () => {
    expect(dueWarnings(0, []).show).toBeNull();
  });
});
