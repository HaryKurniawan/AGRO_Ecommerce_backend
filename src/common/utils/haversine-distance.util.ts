/**
 * Utility Function: Haversine Distance Calculator
 *
 * Fungsi ini digunakan untuk menghitung jarak lurus (orthodromic distance) antara dua titik koordinat
 * (Latitude dan Longitude) di permukaan bumi menggunakan rumus Haversine.
 *
 * Kegunaan Bisnis:
 * 1. Menentukan jarak antara lokasi Petani ke Gudang terdekat (Geo-Matching).
 * 2. Menghitung jarak pengiriman dari Toko ke alamat Customer untuk penentuan Ongkos Kirim (Logistics).
 *
 * @param lat1 Lintang titik pertama
 * @param lon1 Bujur titik pertama
 * @param lat2 Lintang titik kedua
 * @param lon2 Bujur titik kedua
 * @returns Jarak dalam satuan Kilometer (KM)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius rata-rata bumi dalam Kilometer
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  // const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - Math.sqrt(a)));
  // Catatan: Math.sqrt(1 - a) digunakan untuk stabilitas numerik
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distance;
}

/**
 * Konversi derajat ke radian
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
