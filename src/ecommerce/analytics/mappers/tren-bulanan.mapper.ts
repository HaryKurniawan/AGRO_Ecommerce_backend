export function mapTrenBulananData(
  aggregasiByMonth: {
    bulan: string;
    labelBulan: string;
    totalRevenue: number;
    totalQty: number;
    jumlahTransaksi: number;
  }[],
  bulanKe: number,
  tokoId: string,
) {
  const data = aggregasiByMonth.map((item, idx) => {
    let growthRevenuePersen: number | null = null;
    let growthQtyPersen: number | null = null;

    if (idx > 0) {
      const prev = aggregasiByMonth[idx - 1];
      if (prev.totalRevenue > 0) {
        growthRevenuePersen = parseFloat(
          (
            ((item.totalRevenue - prev.totalRevenue) / prev.totalRevenue) *
            100
          ).toFixed(1),
        );
      } else if (item.totalRevenue > 0) {
        growthRevenuePersen = 100;
      }

      if (prev.totalQty > 0) {
        growthQtyPersen = parseFloat(
          (
            ((item.totalQty - prev.totalQty) / prev.totalQty) *
            100
          ).toFixed(1),
        );
      } else if (item.totalQty > 0) {
        growthQtyPersen = 100;
      }
    }

    return {
      bulan: item.bulan,
      labelBulan: item.labelBulan,
      totalRevenue: item.totalRevenue,
      totalQty: item.totalQty,
      jumlahTransaksi: item.jumlahTransaksi,
      growthRevenuePersen,
      growthQtyPersen,
    };
  });

  const validMonths = data.filter((d) => d.totalRevenue > 0);
  const bulanTerbaik = validMonths.length > 0 ? validMonths.reduce((a, b) => (a.totalRevenue > b.totalRevenue ? a : b)) : null;
  const bulanTerakhir = data.length > 0 ? data[data.length - 1] : null;

  return {
    tokoId,
    bulanKe,
    data,
    summary: {
      bulanTerbaik,
      bulanTerakhir,
      growthVsBulanLalu: bulanTerakhir?.growthRevenuePersen ?? null,
    }
  };
}
