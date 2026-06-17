export function mapTrenBulananData(
  aggregasiByMonth: {
    periode: string;
    totalRevenue: number;
    jumlahTerjual: number;
  }[],
  bulanKe: number,
  tokoId: string,
) {
  const data = aggregasiByMonth.map((item, idx) => {
    let growthPersen = 0;
    let trendArah: "UP" | "DOWN" | "STABLE" = "STABLE";

    if (idx > 0) {
      const prev = aggregasiByMonth[idx - 1];
      if (prev.totalRevenue > 0) {
        growthPersen = parseFloat(
          (
            ((item.totalRevenue - prev.totalRevenue) / prev.totalRevenue) *
            100
          ).toFixed(1),
        );
      } else if (item.totalRevenue > 0) {
        growthPersen = 100;
      }

      if (growthPersen > 0) trendArah = "UP";
      else if (growthPersen < 0) trendArah = "DOWN";
    }

    return {
      periode: item.periode,
      totalRevenue: item.totalRevenue,
      jumlahTerjual: item.jumlahTerjual,
      growthPersen,
      trendArah,
    };
  });

  return {
    tokoId,
    periode: `${bulanKe} Bulan Terakhir`,
    data,
  };
}
