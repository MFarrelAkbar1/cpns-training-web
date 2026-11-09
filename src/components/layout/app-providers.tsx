"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { loadPackage } from "@/lib/question-loader";
import { setStorageErrorHandler, STORAGE_KEY } from "@/lib/storage";
import { isExpired } from "@/lib/timer";
import { useProgressStore } from "@/stores/progress-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <StoreLifecycle />
        {children}
        <Toaster position="top-center" richColors />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function StoreLifecycle() {
  const hydrated = useHydrated();
  const pathname = usePathname();

  useEffect(() => {
    useProgressStore.persist.rehydrate();
    setStorageErrorHandler(() => {
      toast.error("Progres gagal disimpan. Penyimpanan browser penuh atau dinonaktifkan.", { id: "storage-error" });
    });
    // Simulasi yang sama terbuka di dua tab: tab lain langsung memakai data terbaru.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) useProgressStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      setStorageErrorHandler(null);
    };
  }, []);

  // Simulasi yang waktunya habis saat aplikasi tertutup diselesaikan dengan jawaban yang tersimpan.
  // Halaman ujian paket itu sendiri mengurus penutupannya agar bisa langsung ke halaman hasil.
  useEffect(() => {
    if (!hydrated) return;
    const { active, finishAttempt } = useProgressStore.getState();
    for (const [key, attempt] of Object.entries(active)) {
      if (attempt.deadlineAt === null || !isExpired(attempt.deadlineAt, Date.now())) continue;
      if (pathname === `/exam/${attempt.packageId}`) continue;
      loadPackage(attempt.packageId).then(
        (pkg) => {
          const done = finishAttempt(key, pkg.questions, pkg.thresholds, "timeout");
          if (done) toast.info(`Waktu simulasi ${pkg.name} telah habis. Jawaban tersimpan sudah dinilai.`);
        },
        () => {},
      );
    }
  }, [hydrated, pathname]);

  return null;
}
