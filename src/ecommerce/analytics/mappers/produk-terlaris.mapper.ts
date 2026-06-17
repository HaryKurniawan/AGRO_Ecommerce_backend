import { SortByEnum } from "../dto/produk-terlaris-filter.dto";

export function mapProdukTerlarisData(
  aggregasi: any[],
  produks: any[],
  limit: number,
  sortBy: SortByEnum,
  dateRangeGte: string,
  dateRangeLte: string,
  dateRangeLabel: string,
) {
  const mergedMap = new Map<
    string,
    {
      produk: any;
      jumlahTerjual: number;
      totalRevenue: number;
      jumlahTransaksi: number;
    }
  >();

  for (const agg of aggregasi) {
    const produk = produks.find((p) => p.id === agg.produkId);
    if (!produk) continue;

    mergedMap.set(agg.produkId, {
      produk,
      jumlahTerjual: agg._sum.jumlahTerjual ?? 0,
      totalRevenue: agg._sum.totalHargaJual ?? 0,
      jumlahTransaksi: agg._count.id,
    });
  }

  const kategoriMap = new Map<
    string,
    {
      kategori: { id: string; nama: string; icon: string | null };
      items: Array<{
        produk: any;
        jumlahTerjual: number;
        totalRevenue: number;
        jumlahTransaksi: number;
      }>;
    }
  >();

  for (const [, item] of mergedMap) {
    const kat = item.produk.kategori;
    if (!kategoriMap.has(kat.id)) {
      kategoriMap.set(kat.id, { kategori: kat, items: [] });
    }
    kategoriMap.get(kat.id)!.items.push(item);
  }

  const sortFn = (
    a: typeof mergedMap extends Map<string, infer V> ? V : never,
    b: typeof mergedMap extends Map<string, infer V> ? V : never,
  ) => {
    if (sortBy === SortByEnum.REVENUE) return b.totalRevenue - a.totalRevenue;
    if (sortBy === SortByEnum.TRANSAKSI)
      return b.jumlahTransaksi - a.jumlahTransaksi;
    return b.jumlahTerjual - a.jumlahTerjual;
  };

  const result = Array.from(kategoriMap.values()).map((kat) => {
    const sorted = [...kat.items].sort(sortFn);
    const topProduk = sorted.slice(0, limit);
    const totalKategoriTerjual = kat.items.reduce(
      (s, i) => s + i.jumlahTerjual,
      0,
    );
    const totalKategoriRevenue = kat.items.reduce(
      (s, i) => s + i.totalRevenue,
      0,
    );

    return {
      kategori: kat.kategori,
      topProduk: topProduk.map((item, idx) => ({
        rank: idx + 1,
        produk: {
          id: item.produk.id,
          nama: item.produk.namaEtalase || item.produk.nama,
          gambarUrl: item.produk.gambarUrl,
          harga: item.produk.harga,
          satuan: item.produk.satuan,
        },
        toko: item.produk.toko,
        jumlahTerjual: item.jumlahTerjual,
        totalRevenue: item.totalRevenue,
        jumlahTransaksi: item.jumlahTransaksi,
        persenDariKategori:
          totalKategoriTerjual > 0
            ? parseFloat(
                ((item.jumlahTerjual / totalKategoriTerjual) * 100).toFixed(1),
              )
            : 0,
      })),
      totalKategoriTerjual: parseFloat(totalKategoriTerjual.toFixed(2)),
      totalKategoriRevenue: parseFloat(totalKategoriRevenue.toFixed(0)),
    };
  });

  result.sort((a, b) => b.totalKategoriTerjual - a.totalKategoriTerjual);

  return {
    period: {
      label: dateRangeLabel,
      startDate: dateRangeGte,
      endDate: dateRangeLte,
    },
    totalKategori: result.length,
    data: result,
  };
}
