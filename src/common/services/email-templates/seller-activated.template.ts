export const getSellerActivatedTemplate = (
  nama: string,
  email: string,
  namaToko: string,
  alamatToko: string,
  loginUrl: string,
) => {
  const mainStyle =
    "font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); background-color: #ffffff;";
  const headerStyle =
    "color: #0f172a; font-size: 22px; font-weight: 800; text-align: center; margin: 0 0 8px 0;";
  const subHeaderStyle =
    "color: #059669; font-size: 14px; font-weight: 700; text-align: center; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 0.05em;";
  const textStyle =
    "color: #475569; font-size: 14px; line-height: 1.6; text-align: left; margin: 0 0 20px 0;";
  const sectionTitleStyle =
    "color: #0f172a; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;";
  const boxStyle =
    "background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 24px;";
  const tableTextStyle =
    "color: #64748b; padding: 6px 0; font-weight: 600; font-size: 13px;";
  const valueStyle =
    "color: #0f172a; padding: 6px 0; font-weight: 700; font-size: 13px; text-align: right;";
  const buttonStyle =
    "display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-align: center; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 24px auto; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); max-width: 240px;";
  const footerStyle =
    "text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;";
  const footerTextStyle = "color: #94a3b8; font-size: 11px; margin: 0;";

  const html = `
    <div style="${mainStyle}">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">🎉</span>
      </div>
      <h2 style="${headerStyle}">Akun Seller Anda Telah Aktif!</h2>
      <p style="${subHeaderStyle}">Selamat Bergabung di Agro Jabar Market</p>
      
      <p style="${textStyle}">
        Halo <strong>${nama}</strong>,<br/>
        Selamat! Email Anda telah berhasil diverifikasi dan akun seller Anda sekarang sudah <strong>aktif</strong>. Anda sudah bisa mulai berjualan di platform Agro Jabar Market.
      </p>

      <div style="${sectionTitleStyle}">INFORMASI AKUN ANDA</div>
      <div style="${boxStyle}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="${tableTextStyle}">EMAIL / USERNAME</td>
            <td style="${valueStyle}">${email}</td>
          </tr>
          <tr>
            <td style="${tableTextStyle}">NAMA TOKO</td>
            <td style="${valueStyle}">${namaToko}</td>
          </tr>
          <tr>
            <td style="${tableTextStyle}">ALAMAT TOKO</td>
            <td style="${valueStyle}">${alamatToko}</td>
          </tr>
        </table>
      </div>

      <p style="${textStyle}; text-align: center; font-weight: 500; font-size: 13.5px; color: #0f172a;">
        Gunakan email dan kata sandi yang Anda daftarkan sebelumnya untuk login.
      </p>

      <div style="${sectionTitleStyle}">LOGIN KE DASHBOARD SELLER</div>
      <p style="${textStyle}; text-align: center;">
        Untuk login ke dashboard seller, silakan kunjungi halaman berikut:
      </p>

      <a href="${loginUrl}" style="${buttonStyle}">
        Login Sekarang
      </a>

      <p style="${textStyle}; font-size: 12px; color: #64748b; text-align: center; margin-top: 8px;">
        Atau buka link: <a href="${loginUrl}" style="color: #059669;">${loginUrl}</a>
      </p>

      <div style="${footerStyle}">
        <p style="${footerTextStyle}">
          Email ini dikirim secara otomatis oleh platform Agro Jabar E-Commerce. Mohon tidak membalas email ini.
        </p>
      </div>
    </div>
  `;

  return {
    subject: "🎉 Akun Seller Anda Telah Aktif — Agro Jabar Market",
    html,
  };
};
