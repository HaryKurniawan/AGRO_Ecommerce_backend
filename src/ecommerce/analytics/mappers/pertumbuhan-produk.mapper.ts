export type LabelPertumbuhan = "NAIK_PESAT" | "STABIL" | "TURUN";

export function getLabelPertumbuhan(growth: number): LabelPertumbuhan {
  if (growth > 20) return "NAIK_PESAT";
  if (growth < -5) return "TURUN";
  return "STABIL";
}

export function mapPertumbuhanProdukData(
  aggA: any[],
  aggB: any[],
  produks: any[],
  labelFormatHelper: (s: Date, e: Date) => string,
  periodeAStart: Date,
  periodeAEnd: Date,
  periodeBStart: Date,
  periodeBEnd: Date,
  tokoId?: string,
) {
  const mapA = new Map(aggA.map((a) => [a.produkId, a._sum]));
  const mapB = new Map(aggB.map((b) => [b.produkId, b._sum]));

  const result = produks.map((produk) => {
    const sumA = mapA.get(produk.id) as any;
    const sumB = mapB.get(produk.id) as any;

    const revenueA = sumA?.totalHargaJual ?? 0;
    const revenueB = sumB?.totalHargaJual ?? 0;
    const qtyA = sumA?.jumlahTerjual ?? 0;
    const qtyB = sumB?.jumlahTerjual ?? 0;

    const growthPersen =
      revenueB > 0
        ? parseFloat((((revenueA - revenueB) / revenueB) * 100).toFixed(1))
        : revenueA > 0
          ? 100
          : 0;

    return {
      produk: {
        id: produk.id,
        nama: produk.namaEtalase || produk.nama,
        gambarUrl: produk.gambarUrl,
        satuan: produk.satuan,
        kategori: produk.kategori,
      },
      periodeA: {
        label: labelFormatHelper(periodeAStart, periodeAEnd),
        revenue: parseFloat(revenueA.toFixed(0)),
        qty: parseFloat(qtyA.toFixed(2)),
      },
      periodeB: {
        label: labelFormatHelper(periodeBStart, periodeBEnd),
        revenue: parseFloat(revenueB.toFixed(0)),
        qty: parseFloat(qtyB.toFixed(2)),
      },
      growthPersen,
      label: getLabelPertumbuhan(growthPersen),
    };
  });

  const orderMap: Record<LabelPertumbuhan, number> = {
    NAIK_PESAT: 0,
    STABIL: 1,
    TURUN: 2,
  };
  result.sort((a, b) => {
    const o = orderMap[a.label] - orderMap[b.label];
    return o !== 0 ? o : b.growthPersen - a.growthPersen;
  });

  return {
    tokoId: tokoId,
    periodeA: { label: labelFormatHelper(periodeAStart, periodeAEnd) },
    periodeB: { label: labelFormatHelper(periodeBStart, periodeBEnd) },
    totalProduk: result.length,
    summary: {
      naikPesat: result.filter((r) => r.label === "NAIK_PESAT").length,
      stabil: result.filter((r) => r.label === "STABIL").length,
      turun: result.filter((r) => r.label === "TURUN").length,
    },
    data: result,
  };
}
