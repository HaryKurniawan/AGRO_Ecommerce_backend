export const getEmailVerificationTemplate = (
  nama: string,
  verifyUrl: string,
) => {
  const mainStyle =
    "font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;";
  const headerStyle = "color: #16a34a;";
  const buttonStyle =
    "display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;";
  const hintStyle = "color:#6b7280;font-size:13px;";
  const linkStyle = "color:#9ca3af;font-size:11px;";

  return {
    subject: "Verifikasi Email Akun Anda — Agro Jabar Market",
    html: `
      <div style="${mainStyle}">
        <h2 style="${headerStyle}">Selamat Datang, ${nama}!</h2>
        <p>Terima kasih telah mendaftar. Klik tombol di bawah untuk verifikasi email Anda.</p>
        <a href="${verifyUrl}" style="${buttonStyle}">
          Verifikasi Email
        </a>
        <p style="${hintStyle}">Link ini berlaku selama <b>24 jam</b>. Jika Anda tidak mendaftar, abaikan email ini.</p>
        <p style="${linkStyle}">Link: ${verifyUrl}</p>
      </div>
    `,
  };
};
