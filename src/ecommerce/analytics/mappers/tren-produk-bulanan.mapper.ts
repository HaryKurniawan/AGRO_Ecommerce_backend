export function mapTrenProdukBulananData(
  aggCurrent: any[],
  aggPrev: any[],
  produks: any[],
  limit: number,
  tokoId: string | undefined,
  currentRangeLabel: string,
  prevRangeLabel: string,
  month: number | undefined,
  year: number | undefined,
) {
  const prevMap = new Map(
    aggPrev.map((p) => [p.produkId, p._sum.jumlahTerjual ?? 0]),
  );

  const data = aggCurrent.map((agg, idx) => {
    const produk = produks.find((p) => p.id === agg.produkId);
    const curr = agg._sum.jumlahTerjual ?? 0;
    const prev = (prevMap.get(agg.produkId) as number) ?? 0;
    const trendPersen =
      prev > 0
        ? parseFloat((((curr - prev) / prev) * 100).toFixed(1))
        : curr > 0
          ? 100
          : 0;

    return {
      rank: idx + 1,
      produk: {
        id: agg.produkId,
        nama: produk?.namaEtalase || produk?.nama || "Unknown",
        gambarUrl: produk?.gambarUrl,
        satuan: produk?.satuan,
        kategori: produk?.kategori,
      },
      jumlahTerjual: parseFloat(curr.toFixed(2)),
      prevJumlahTerjual: parseFloat(prev.toFixed(2)),
      totalRevenue: parseFloat((agg._sum.totalHargaJual ?? 0).toFixed(0)),
      jumlahTransaksi: agg._count.id,
      trendPersen,
      trendArah: trendPersen > 5 ? "UP" : trendPersen < -5 ? "DOWN" : "STABLE",
    };
  });

  return {
    period: { month, year, label: currentRangeLabel },
    prevPeriod: { label: prevRangeLabel },
    tokoId: tokoId,
    data,
  };
}
