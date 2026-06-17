import { PrismaClient } from '@prisma/client';

/**
 * Bersihkan SEMUA data ecommerce sebelum seeding ulang.
 * Urutan penghapusan mengikuti dependensi foreign key (child → parent).
 * Setiap deleteMany dibungkus agar aman bila tabel/model belum ada di skema.
 */
export async function cleanup(prisma: PrismaClient) {
  console.log('🧹 Membersihkan seluruh data lama...');

  const safeDelete = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err: any) {
      // Abaikan jika model tidak ada / tabel kosong, tapi log untuk transparansi
      console.warn(`   • skip ${label}: ${err?.message?.split('\n')[0] ?? err}`);
    }
  };

  // ── Chat ────────────────────────────────────────────────────────────────
  await safeDelete('pesanChat', () => prisma.pesanChat.deleteMany());
  await safeDelete('percakapanChat', () => prisma.percakapanChat.deleteMany());

  // ── Keuntungan & stok masuk (FIFO) ───────────────────────────────────────
  await safeDelete('transaksiKeuntunganBatch', () => (prisma as any).transaksiKeuntunganBatch?.deleteMany());
  await safeDelete('transaksiKeuntungan', () => (prisma as any).transaksiKeuntungan?.deleteMany());
  await safeDelete('stokMasukProduk', () => (prisma as any).stokMasukProduk?.deleteMany());

  // ── Pesanan & Batch Pengiriman ────────────────────────────────────────────
  await safeDelete('itemBatchPengiriman', () => (prisma as any).itemBatchPengiriman?.deleteMany());
  await safeDelete('batchPengiriman', () => (prisma as any).batchPengiriman?.deleteMany());
  await safeDelete('pengirimanPesananEcom', () => prisma.pengirimanPesananEcom.deleteMany());
  await safeDelete('itemPesananEcom', () => prisma.itemPesananEcom.deleteMany());
  await safeDelete('pesananEcom', () => prisma.pesananEcom.deleteMany());

  // ── Keranjang ───────────────────────────────────────────────────────────
  await safeDelete('itemKeranjangEcom', () => prisma.itemKeranjangEcom.deleteMany());
  await safeDelete('keranjangEcom', () => prisma.keranjangEcom.deleteMany());

  // ── Produk-terkait ────────────────────────────────────────────────────────
  await safeDelete('riwayatStokProduk', () => prisma.riwayatStokProduk.deleteMany());
  await safeDelete('ulasanProdukEcom', () => prisma.ulasanProdukEcom.deleteMany());
  await safeDelete('inventarisToko', () => prisma.inventarisToko.deleteMany());
  await safeDelete('varianKemasan', () => (prisma as any).varianKemasan?.deleteMany());

  // ── Pengajuan stok (item & kemasan) ──────────────────────────────────────
  await safeDelete('itemPengajuanStokKemasan', () => (prisma as any).itemPengajuanStokKemasan?.deleteMany());
  await safeDelete('itemPengajuanStok', () => (prisma as any).itemPengajuanStok?.deleteMany());
  await safeDelete('pengajuanStokToko', () => prisma.pengajuanStokToko.deleteMany());

  // ── Margin & harga ───────────────────────────────────────────────────────
  await safeDelete('riwayatMargin', () => prisma.riwayatMargin.deleteMany());
  await safeDelete('konfigurasiHargaToko', () => prisma.konfigurasiHargaToko.deleteMany());

  // ── Produk & mapping ─────────────────────────────────────────────────────
  await safeDelete('produkEcom', () => prisma.produkEcom.deleteMany());
  await safeDelete('mappingProdukGudang', () => (prisma as any).mappingProdukGudang?.deleteMany());
  await safeDelete('masterProduk', () => prisma.masterProduk.deleteMany());

  // ── Kategori & toko ──────────────────────────────────────────────────────
  await safeDelete('kategoriToko', () => prisma.kategoriToko.deleteMany());
  await safeDelete('toko', () => prisma.toko.deleteMany());
  await safeDelete('profilPenjual', () => prisma.profilPenjual.deleteMany());

  // ── Konfigurasi pengiriman ───────────────────────────────────────────────
  await safeDelete('konfigurasiPengiriman', () => (prisma as any).konfigurasiPengiriman?.deleteMany());

  // ── Alamat, notifikasi, pengguna ─────────────────────────────────────────
  await safeDelete('alamatKonsumen', () => prisma.alamatKonsumen.deleteMany());
  await safeDelete('notifikasi', () => prisma.notifikasi.deleteMany());
  
  // Hapus semua user KECUALI admin dan cs
  await safeDelete('pengguna (non-admin)', () => prisma.pengguna.deleteMany({
    where: {
      peran: {
        notIn: ['SUPER_ADMIN', 'ADMIN_CS']
      }
    }
  }));

  console.log('✅ Semua data lama dibersihkan (kecuali akun admin & cs).');
}
