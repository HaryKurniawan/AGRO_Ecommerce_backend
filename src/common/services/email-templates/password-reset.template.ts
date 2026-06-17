export const getPasswordResetTemplate = (nama: string, resetUrl: string) => {
  const mainStyle =
    "font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;";
  const headerStyle = "color: #16a34a;";
  const buttonStyle =
    "display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;";
  const hintStyle = "color:#6b7280;font-size:13px;";

  return {
    subject: "Reset Password — Agro Jabar Market",
    html: `
      <div style="${mainStyle}">
        <h2 style="${headerStyle}">Reset Password</h2>
        <p>Halo ${nama}, kami menerima permintaan reset kataSandi untuk akun Anda.</p>
        <a href="${resetUrl}" style="${buttonStyle}">
          Reset Password Sekarang
        </a>
        <p style="${hintStyle}">Link ini berlaku selama <b>1 jam</b>. Jika Anda tidak meminta reset, abaikan email ini.</p>
      </div>
    `,
  };
};
