export function mapPesananHarianData(
  pesanans: any[],
  year: number,
  month: number,
  tokoId?: string,
) {
  const harianMap = new Map<
    number,
    {
      tanggal: number;
      jumlahPesanan: number;
      totalRevenue: number;
      pesanan: any[];
    }
  >();

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    harianMap.set(i, {
      tanggal: i,
      jumlahPesanan: 0,
      totalRevenue: 0,
      pesanan: [],
    });
  }

  for (const p of pesanans) {
    const tanggal = p.createdAt.getDate();
    const mapVal = harianMap.get(tanggal);
    if (mapVal) {
      mapVal.jumlahPesanan += 1;
      mapVal.totalRevenue += p.totalBelanja;
      mapVal.pesanan.push({
        id: p.id,
        nomorPesanan: p.nomorPesanan,
        totalBelanja: p.totalBelanja,
        status: p.status,
        createdAt: p.createdAt,
      });
    }
  }

  const result = Array.from(harianMap.values());
  const maxPesanan = Math.max(...result.map((r) => r.jumlahPesanan));

  const totalBulanIni = result.reduce((s, r) => s + r.jumlahPesanan, 0);
  const revenueBulanIni = result.reduce((s, r) => s + r.totalRevenue, 0);

  return {
    tokoId,
    periode: { month, year },
    totalPesananBulanIni: totalBulanIni,
    totalRevenueBulanIni: revenueBulanIni,
    rataRataPesananPerHari: parseFloat(
      (totalBulanIni / daysInMonth).toFixed(1),
    ),
    data: result.map((r) => ({
      ...r,
      intensitas:
        maxPesanan > 0 ? Math.round((r.jumlahPesanan / maxPesanan) * 100) : 0,
    })),
  };
}
