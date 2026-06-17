import { DemandSignalItem } from "../use-cases/get-demand-signal-gudang.usecase";

export function mapDemandSignalData(
  aggCurrent: any[],
  aggPrev: any[],
  produks: any[],
  mappings: any[],
  tokoIdsLength: number,
  gudangId: string,
  limit: number,
  month: number,
  year: number,
  currentRangeLabel: string,
  prevRangeLabel: string,
) {
  if (aggCurrent.length === 0) {
    return {
      gudangId,
      period: { month, year, label: currentRangeLabel },
      prevPeriod: { label: prevRangeLabel },
      totalTokoAfiliasi: tokoIdsLength,
      data: [],
    };
  }

  const prevMap = new Map(
    aggPrev.map((p) => [p.produkId, p._sum.jumlahTerjual ?? 0]),
  );

  const produkMap = new Map(produks.map((p) => [p.id, p]));

  const masterMap = new Map<
    string,
    {
      kunci: string;
      komoditasNama: string;
      masterProdukId: string | null;
      kodeKomoditasGlobal: string | null;
      jumlahTerjualKg: number;
      prevJumlahTerjualKg: number;
      totalRevenue: number;
      jumlahTransaksi: number;
      tokoIds: Set<string>;
    }
  >();

  for (const agg of aggCurrent) {
    const produk = produkMap.get(agg.produkId) as any;
    if (!produk) continue;

    const kunci = produk.masterProdukId
      ? `master:${produk.masterProdukId}`
      : `nama:${(produk.namaEtalase || produk.nama).toLowerCase().trim()}`;

    const curr = agg._sum.jumlahTerjual ?? 0;
    const prev = prevMap.get(agg.produkId) ?? 0;

    if (!masterMap.has(kunci)) {
      masterMap.set(kunci, {
        kunci,
        komoditasNama:
          produk.masterProduk?.nama || produk.namaEtalase || produk.nama,
        masterProdukId: produk.masterProdukId ?? null,
        kodeKomoditasGlobal: null,
        jumlahTerjualKg: 0,
        prevJumlahTerjualKg: 0,
        totalRevenue: 0,
        jumlahTransaksi: 0,
        tokoIds: new Set(),
      });
    }

    const entry = masterMap.get(kunci)!;
    entry.jumlahTerjualKg += curr;
    entry.prevJumlahTerjualKg += prev;
    entry.totalRevenue += agg._sum.totalHargaJual ?? 0;
    entry.jumlahTransaksi += agg._count.id;
    entry.tokoIds.add(produk.tokoId);
  }

  for (const mapping of mappings) {
    const kunci = `master:${mapping.masterProdukId}`;
    const entry = masterMap.get(kunci);
    if (entry) {
      entry.kodeKomoditasGlobal = mapping.produkGudangId;
    }
  }

  const sorted = [...masterMap.values()]
    .sort((a, b) => b.jumlahTerjualKg - a.jumlahTerjualKg)
    .slice(0, limit);

  const data: DemandSignalItem[] = sorted.map((item) => {
    const trendPersen =
      item.prevJumlahTerjualKg > 0
        ? parseFloat(
            (
              ((item.jumlahTerjualKg - item.prevJumlahTerjualKg) /
                item.prevJumlahTerjualKg) *
              100
            ).toFixed(1),
          )
        : item.jumlahTerjualKg > 0
          ? 100
          : 0;

    return {
      kodeKomoditasGlobal: item.kodeKomoditasGlobal,
      komoditasNama: item.komoditasNama,
      masterProdukId: item.masterProdukId,
      jumlahTerjualKg: parseFloat(item.jumlahTerjualKg.toFixed(2)),
      prevJumlahTerjualKg: parseFloat(item.prevJumlahTerjualKg.toFixed(2)),
      totalRevenue: parseFloat(item.totalRevenue.toFixed(0)),
      jumlahTransaksi: item.jumlahTransaksi,
      trendPersen,
      trendArah: trendPersen > 5 ? "UP" : trendPersen < -5 ? "DOWN" : "STABLE",
      jumlahSeller: item.tokoIds.size,
    };
  });

  return {
    gudangId,
    period: { month, year, label: currentRangeLabel },
    prevPeriod: { label: prevRangeLabel },
    totalTokoAfiliasi: tokoIdsLength,
    data,
  };
}
