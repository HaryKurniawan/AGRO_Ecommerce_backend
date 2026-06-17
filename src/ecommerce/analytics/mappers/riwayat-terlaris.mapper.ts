export function mapRiwayatTerlarisData(
  aggCurrent: any[],
  aggPrev: any[],
  produks: any[],
  limit: number,
  month: number,
  year: number,
  currentRangeLabel: string,
  prevRangeLabel: string,
) {
  if (aggCurrent.length === 0) {
    return {
      period: { month, year, label: currentRangeLabel },
      prevPeriod: { label: prevRangeLabel },
      totalKategori: 0,
      data: [],
    };
  }

  const prevMap = new Map(
    aggPrev.map((p) => [p.produkId, p._sum.jumlahTerjual ?? 0]),
  );

  const kategoriMap = new Map<
    string,
    {
      kategori: { id: string; nama: string; icon: string | null };
      items: Array<{
        produkId: string;
        produk: any;
        jumlahTerjual: number;
        prevJumlahTerjual: number;
        totalRevenue: number;
        jumlahTransaksi: number;
      }>;
    }
  >();

  for (const agg of aggCurrent) {
    const produk = produks.find((p) => p.id === agg.produkId);
    if (!produk) continue;

    const curr = agg._sum.jumlahTerjual ?? 0;
    const prev = prevMap.get(agg.produkId) ?? 0;

    const kat = produk.kategori;
    if (!kategoriMap.has(kat.id)) {
      kategoriMap.set(kat.id, { kategori: kat, items: [] });
    }
    kategoriMap.get(kat.id)!.items.push({
      produkId: agg.produkId,
      produk,
      jumlahTerjual: curr,
      prevJumlahTerjual: prev as number,
      totalRevenue: agg._sum.totalHargaJual ?? 0,
      jumlahTransaksi: agg._count.id,
    });
  }

  const result = Array.from(kategoriMap.values()).map((kat) => {
    const sorted = [...kat.items].sort(
      (a, b) => b.jumlahTerjual - a.jumlahTerjual,
    );
    const top = sorted.slice(0, limit);

    return {
      kategori: kat.kategori,
      topProduk: top.map((item, idx) => {
        const trendPersen =
          item.prevJumlahTerjual > 0
            ? parseFloat(
                (
                  ((item.jumlahTerjual - item.prevJumlahTerjual) /
                    item.prevJumlahTerjual) *
                  100
                ).toFixed(1),
              )
            : item.jumlahTerjual > 0
              ? 100
              : 0;

        return {
          rank: idx + 1,
          produk: {
            id: item.produk.id,
            nama: item.produk.namaEtalase || item.produk.nama,
            gambarUrl: item.produk.gambarUrl,
            satuan: item.produk.satuan,
          },
          toko: item.produk.toko,
          jumlahTerjual: item.jumlahTerjual,
          prevJumlahTerjual: item.prevJumlahTerjual,
          totalRevenue: item.totalRevenue,
          jumlahTransaksi: item.jumlahTransaksi,
          trendPersen,
          trendArah:
            trendPersen > 5 ? "UP" : trendPersen < -5 ? "DOWN" : "STABLE",
        };
      }),
    };
  });

  result.sort(
    (a, b) =>
      b.topProduk.reduce((s, p) => s + p.jumlahTerjual, 0) -
      a.topProduk.reduce((s, p) => s + p.jumlahTerjual, 0),
  );

  return {
    period: { month, year, label: currentRangeLabel },
    prevPeriod: { label: prevRangeLabel },
    totalKategori: result.length,
    data: result,
  };
}
