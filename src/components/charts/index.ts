import dynamic from "next/dynamic";

/** Recharts cukup besar, jadi hanya dimuat oleh halaman yang menampilkan grafik. */
const load = () => import("@/components/charts/score-charts");

export const CategoryScoreChart = dynamic(() => load().then((m) => m.CategoryScoreChart), { ssr: false });
export const ScoreTrendChart = dynamic(() => load().then((m) => m.ScoreTrendChart), { ssr: false });
export const CategoryPerformanceChart = dynamic(() => load().then((m) => m.CategoryPerformanceChart), { ssr: false });
