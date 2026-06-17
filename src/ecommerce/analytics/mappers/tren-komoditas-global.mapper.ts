import { TrenKomoditasGlobalItem } from "../dto/tren-komoditas-global.dto";

export function mapTrenKomoditasGlobalData(
  aggCurrent: any[],
  aggPrev: any[],
  produks: any[],
  periodeKey: string,
  prevPeriodeKey: string,
  filterKode?: string,
) {
  const produkMap = new Map(produks.map((p) => [p.id, p]));

  type AggEntry = {
    kodeKomoditasGlobal: string;
    komoditasNama: string;
    currentKg: number;
    prevKg: number;
    currentRevenue: number;
    tokoIds: Set<string>;
  };

  const komoditasMap = new Map<string, AggEntry>();

  for (const agg of aggCurrent) {
    const produk = produkMap.get(agg.produkId) as any;
    if (!produk?.masterProduk?.kodeKomoditasGlobal) continue;

    const kode = produk.masterProduk.kodeKomoditasGlobal;

    if (!komoditasMap.has(kode)) {
      komoditasMap.set(kode, {
        kodeKomoditasGlobal: kode,
        komoditasNama: produk.masterProduk.nama,
        currentKg: 0,
        prevKg: 0,
        currentRevenue: 0,
        tokoIds: new Set(),
      });
    }

    const entry = komoditasMap.get(kode)!;
    entry.currentKg += agg._sum.jumlahTerjual ?? 0;
    entry.currentRevenue += agg._sum.totalHargaJual ?? 0;
    entry.tokoIds.add(produk.tokoId);
  }

  for (const agg of aggPrev) {
    const produk = produkMap.get(agg.produkId) as any;
    if (!produk?.masterProduk?.kodeKomoditasGlobal) continue;

    const kode = produk.masterProduk.kodeKomoditasGlobal;

    if (!komoditasMap.has(kode)) {
      komoditasMap.set(kode, {
        kodeKomoditasGlobal: kode,
        komoditasNama: produk.masterProduk.nama,
        currentKg: 0,
        prevKg: 0,
        currentRevenue: 0,
        tokoIds: new Set(),
      });
    }

    const entry = komoditasMap.get(kode)!;
    entry.prevKg += agg._sum.jumlahTerjual ?? 0;
  }

  let entries = [...komoditasMap.values()];
  if (filterKode) {
    entries = entries.filter((e) => e.kodeKomoditasGlobal === filterKode);
  }

  const data: TrenKomoditasGlobalItem[] = entries
    .sort((a, b) => b.currentKg - a.currentKg)
    .map((entry) => {
      let trendArah: "UP" | "DOWN" | "STABLE";
      let trendPersen: number | null;

      if (entry.prevKg === 0 && entry.currentKg > 0) {
        trendArah = "UP";
        trendPersen = null;
      } else if (entry.prevKg === 0 && entry.currentKg === 0) {
        trendArah = "STABLE";
        trendPersen = 0;
      } else if (entry.currentKg === entry.prevKg) {
        trendArah = "STABLE";
        trendPersen = 0;
      } else {
        const persen = parseFloat(
          (((entry.currentKg - entry.prevKg) / entry.prevKg) * 100).toFixed(1),
        );
        trendArah = persen > 0 ? "UP" : "DOWN";
        trendPersen = persen;
      }

      const hargaJualRataRataPerKg =
        entry.currentKg > 0
          ? parseFloat((entry.currentRevenue / entry.currentKg).toFixed(0))
          : 0;

      return {
        kodeKomoditasGlobal: entry.kodeKomoditasGlobal,
        komoditasNama: entry.komoditasNama,
        jumlahTerjualKgBulanIni: parseFloat(entry.currentKg.toFixed(2)),
        jumlahTerjualKgBulanLalu: parseFloat(entry.prevKg.toFixed(2)),
        trendArah,
        trendPersen,
        hargaJualRataRataPerKg,
        jumlahSellerMenjual: entry.tokoIds.size,
      };
    });

  return {
    periode: periodeKey,
    periodeSebelumnya: prevPeriodeKey,
    generatedAt: new Date().toISOString(),
    data,
  };
}
