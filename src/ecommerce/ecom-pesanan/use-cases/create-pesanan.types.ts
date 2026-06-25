// ============================================================
// Types & DTOs untuk CreateOrderUseCase
// Dipisah agar file use-case utama tetap ringkas.
// ============================================================

export interface CreateOrderItemInput {
  produkId: string;
  jumlah: number;
  harga: number;
  varianKemasanId?: string;
}

export interface CreateOrderStoreInput {
  tokoId: string;
  ongkir: number;
  catatan?: string;
  metodeKirim?: string;
  item: CreateOrderItemInput[];
}

export interface CreateOrderInput {
  metodeBayar: string;
  alamatKirim: string;
  jadwalKirim?: string;
  /** Nomor HP untuk e-wallet yang memerlukan push notif (misal OVO) */
  mobileNumber?: string;
  pesanan: CreateOrderStoreInput[];
}

export interface XenditItemLine {
  name: string;
  quantity: number;
  price: number;
  category: string;
}
