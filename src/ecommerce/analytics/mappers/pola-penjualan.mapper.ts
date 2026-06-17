export type Sesi = "PAGI" | "SIANG" | "SORE" | "MALAM";

export const HARI_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
export const HARI_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function jamToSesi(hour: number): Sesi {
  if (hour >= 6 && hour < 12) return "PAGI";
  if (hour >= 12 && hour < 17) return "SIANG";
  if (hour >= 17 && hour < 21) return "SORE";
  return "MALAM";
}

export function mapPolaPenjualanData(
  pesanans: any[],
  year: number,
  tokoId?: string,
  startDate?: Date,
  endDate?: Date,
) {
  if (!startDate || !endDate) return null;

  type MatrixEntry = { count: number };
  const matrix: Record<number, Record<Sesi, MatrixEntry>> = {};
  for (let d = 0; d <= 6; d++) {
    matrix[d] = {
      PAGI: { count: 0 },
      SIANG: { count: 0 },
      SORE: { count: 0 },
      MALAM: { count: 0 },
    };
  }

  for (const p of pesanans) {
    const hari = p.createdAt.getDay();
    const sesi = jamToSesi(p.createdAt.getHours());
    matrix[hari][sesi].count += 1;
  }

  const dailyMap: Record<string, number> = {};
  for (const p of pesanans) {
    const y = p.createdAt.getFullYear();
    const m = String(p.createdAt.getMonth() + 1).padStart(2, "0");
    const d = String(p.createdAt.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
  }

  let maxDaily = 0;
  for (const count of Object.values(dailyMap)) {
    maxDaily = Math.max(maxDaily, count as number);
  }

  const kalender: { date: string; count: number; intensitas: number }[] = [];
  const iterDate = new Date(startDate);
  while (iterDate <= endDate) {
    const y = iterDate.getFullYear();
    const m = String(iterDate.getMonth() + 1).padStart(2, "0");
    const d = String(iterDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const count = dailyMap[dateStr] || 0;
    kalender.push({
      date: dateStr,
      count,
      intensitas: maxDaily > 0 ? Math.round((count / maxDaily) * 100) : 0,
    });
    iterDate.setDate(iterDate.getDate() + 1);
  }

  let maxCount = 0;
  for (let d = 0; d <= 6; d++) {
    for (const sesi of ["PAGI", "SIANG", "SORE", "MALAM"] as Sesi[]) {
      maxCount = Math.max(maxCount, matrix[d][sesi].count);
    }
  }

  const heatmapData: Array<{
    hariMinggu: number;
    hariLabel: string;
    hariShort: string;
    sesi: Sesi;
    jumlahPesanan: number;
    intensitas: number;
  }> = [];

  for (let d = 0; d <= 6; d++) {
    for (const sesi of ["PAGI", "SIANG", "SORE", "MALAM"] as Sesi[]) {
      const count = matrix[d][sesi].count;
      heatmapData.push({
        hariMinggu: d,
        hariLabel: HARI_ID[d],
        hariShort: HARI_SHORT[d],
        sesi,
        jumlahPesanan: count,
        intensitas: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
      });
    }
  }

  const hariBySales = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    hari: d,
    hariLabel: HARI_ID[d],
    total: Object.values(matrix[d]).reduce((s, e) => s + e.count, 0),
  }));
  hariBySales.sort((a, b) => b.total - a.total);

  const sesiTotal: Record<Sesi, number> = {
    PAGI: 0,
    SIANG: 0,
    SORE: 0,
    MALAM: 0,
  };
  for (let d = 0; d <= 6; d++) {
    for (const sesi of ["PAGI", "SIANG", "SORE", "MALAM"] as Sesi[]) {
      sesiTotal[sesi] += matrix[d][sesi].count;
    }
  }
  const sesiTerbaik = (Object.entries(sesiTotal) as [Sesi, number][]).sort(
    ([, a], [, b]) => b - a,
  )[0][0];

  return {
    tahun: year,
    tokoId: tokoId,
    totalPesanan: pesanans.length,
    heatmap: heatmapData,
    kalender,
    insights: {
      hariTerlaris: hariBySales[0],
      hariTersepi: hariBySales[hariBySales.length - 1],
      sesiTerbaik,
      hariBySales,
    },
  };
}
