export const getCourierTaskTemplate = (
  courierName: string,
  orderId: string,
  note?: string,
) => {
  const mainStyle =
    "font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);";
  const headerStyle =
    "color: #0f172a; font-size: 20px; font-weight: 800; text-align: center; margin: 0 0 16px 0;";
  const textStyle =
    "color: #475569; font-size: 14px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;";
  const boxStyle =
    "background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 24px;";
  const tableTextStyle = "color: #64748b; padding: 4px 0; font-weight: 600;";
  const valueStyle =
    "color: #0f172a; padding: 4px 0; font-weight: 800; font-family: monospace; text-align: right;";
  const labelStyle =
    "color: #64748b; padding: 8px 0 4px 0; font-weight: 600; vertical-align: top;";
  const noteValueStyle =
    "color: #0f172a; padding: 8px 0 4px 0; font-weight: 600; text-align: right; line-height: 1.4;";
  const bottomStyle =
    "color: #475569; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;";
  const footerStyle =
    "text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;";
  const footerTextStyle = "color: #94a3b8; font-size: 11px; margin: 0;";

  const subject = `🚚 Tugas Pengiriman Baru: AGJ${orderId.slice(0, 8).toUpperCase()}`;

  const html = `
    <div style="${mainStyle}">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 48px;">🚚</span>
      </div>
      <h2 style="${headerStyle}">Tugas Pengiriman Baru!</h2>
      <p style="${textStyle}">
        Halo <strong>${courierName}</strong>, Anda telah ditugaskan oleh Toko untuk melakukan pengantaran pesanan berikut.
      </p>
      <div style="${boxStyle}">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="${tableTextStyle}">NO. RESI</td>
            <td style="${valueStyle}">AGJ${orderId.slice(0, 8).toUpperCase()}</td>
          </tr>
          ${
            note
              ? `
          <tr>
            <td style="${labelStyle}">CATATAN TOKO</td>
            <td style="${noteValueStyle}">"${note}"</td>
          </tr>
          `
              : ""
          }
        </table>
      </div>
      <p style="${bottomStyle}">
        Silakan buka aplikasi operasional kurir Agro Jabar Anda untuk memproses tugas pengantaran ini secara real-time.
      </p>
      <div style="${footerStyle}">
        <p style="${footerTextStyle}">
          Email ini dikirim secara otomatis oleh platform Agro Jabar E-Commerce.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
};
