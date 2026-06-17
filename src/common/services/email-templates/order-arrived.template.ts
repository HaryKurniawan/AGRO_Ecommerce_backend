export const getOrderArrivedTemplate = (
  nama: string,
  orderId: string,
  orderUrl: string,
) => {
  const mainStyle =
    "font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);";
  const headerStyle =
    "color: #0f172a; font-size: 20px; font-weight: 800; text-align: center; margin: 16px 0;";
  const buttonStyle =
    "display:inline-block; background:#16a34a; color:#ffffff; padding:12px 28px; border-radius:12px; text-decoration:none; font-weight:bold; margin:20px 0; text-align:center; font-size:14px;";
  const textStyle = "color: #475569; font-size: 14px; line-height: 1.6;";
  const boxStyle =
    "background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px 20px; border-radius: 16px; margin: 20px 0;";
  const hintStyle =
    "color:#94a3b8; font-size:11px; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px;";

  return {
    subject: `📦 Pesanan Telah Sampai Tujuan! — AGJ${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="${mainStyle}">
        <div style="text-align: center;">
          <span style="font-size: 48px;">🎉</span>
        </div>
        <h2 style="${headerStyle}">Pesanan Anda Telah Sampai!</h2>
        <p style="${textStyle}">Halo <strong>${nama}</strong>,</p>
        <p style="${textStyle}">Kami ingin mengabarkan bahwa pesanan Anda telah berhasil diantarkan oleh kurir ke alamat tujuan pengiriman.</p>
        
        <div style="${boxStyle}">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 4px 0;">NOMOR PESANAN</td>
              <td style="color: #0f172a; font-weight: 800; font-family: monospace; text-align: right; padding: 4px 0;">AGJ${orderId.slice(0, 8).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 4px 0;">STATUS</td>
              <td style="color: #16a34a; font-weight: 800; text-align: right; padding: 4px 0;">SAMPAI TUJUAN</td>
            </tr>
          </table>
        </div>

        <p style="${textStyle}">Mohon periksa kondisi fisik barang Anda terlebih dahulu. Jika semuanya sudah sesuai, silakan konfirmasi pesanan dengan mengklik tombol di bawah ini:</p>
        
        <div style="text-align: center;">
          <a href="${orderUrl}" style="${buttonStyle}">
            Konfirmasi Terima Pesanan
          </a>
        </div>

        <p style="${textStyle}">Terima kasih telah berbelanja di Agro Jabar Market!</p>
        
        <div style="${hintStyle}">
          Email ini dikirim secara otomatis oleh platform Agro Jabar E-Commerce. Jangan membalas email ini secara langsung.
        </div>
      </div>
    `,
  };
};
