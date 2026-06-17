export const getAdminWelcomeTemplate = (
  nama: string,
  email: string,
  kataSandi: string,
  noTelepon: string | null | undefined,
  peran: string,
  verifyUrl: string,
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
  const listStyle =
    "padding-left: 20px; margin: 0 0 24px 0; color: #475569; font-size: 13.5px; line-height: 1.7;";
  const footerStyle =
    "text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;";
  const footerTextStyle = "color: #94a3b8; font-size: 11px; margin: 0;";

  let roleEmoji = "✉️";
  let roleTitle = "Staf Operasional";
  let tasksHtml = "";
  let subject = "Pendaftaran Akun Berhasil — Agro Jabar Market";

  switch (peran.toUpperCase()) {
    case "KURIR":
      roleEmoji = "🚚";
      roleTitle = "Kurir Mitra";
      subject = "🚚 Selamat Bergabung! Akun Kurir Agro Jabar Anda Telah Siap";
      tasksHtml = `
        <ul style="${listStyle}">
          <li><strong>Menerima & Mengirim Pesanan:</strong> Melakukan pengantaran pesanan konsumen secara cepat, aman, dan tepat waktu.</li>
          <li><strong>Pembaruan Status Real-time:</strong> Mengupdate status perjalanan barang secara real-time pada aplikasi operasional kurir.</li>
          <li><strong>Pelayanan Konsumen:</strong> Menjaga komunikasi yang baik dan ramah saat bertransaksi dengan konsumen di lokasi tujuan.</li>
          <li><strong>Laporan Operasional:</strong> Melaporkan kendala di lapangan kepada admin gudang atau tim CS untuk penanganan cepat.</li>
        </ul>
      `;
      break;

    case "PENJUAL":
      roleEmoji = "🏪";
      roleTitle = "Penjual (Merchant/Seller)";
      subject = "🏪 Selamat Bergabung! Akun Penjual Agro Jabar Anda Telah Siap";
      tasksHtml = `
        <ul style="${listStyle}">
          <li><strong>Manajemen Produk Toko:</strong> Mengelola deskripsi, harga, diskon, dan stok produk unggulan Anda di platform ecommerce.</li>
          <li><strong>Proses Pesanan Konsumen:</strong> Melakukan validasi, pengemasan, dan persiapan pengiriman pesanan yang masuk dengan responsif.</li>
          <li><strong>Manajemen Stok & Afiliasi Gudang:</strong> Memastikan sinkronisasi inventaris berjalan lancar dengan sistem gudang penyimpanan mitra.</li>
          <li><strong>Analisis Penjualan:</strong> Memantau performa penjualan toko Anda guna mengoptimalkan keuntungan.</li>
        </ul>
      `;
      break;

    case "ADMIN_CS":
      roleEmoji = "💬";
      roleTitle = "Admin Customer Service";
      subject =
        "💬 Selamat Bergabung! Akun Admin CS Agro Jabar Anda Telah Siap";
      tasksHtml = `
        <ul style="${listStyle}">
          <li><strong>Pelayanan Obrolan Konsumen:</strong> Membantu merespons dan menyelesaikan berbagai pertanyaan dari konsumen secara ramah dan profesional.</li>
          <li><strong>Verifikasi Komplain & Masalah:</strong> Membantu menyelidiki kendala transaksi, kendala pengiriman, atau komplain pengembalian dana/barang.</li>
          <li><strong>Pemberian Bantuan Mitra Seller:</strong> Memandu seller baru yang memerlukan edukasi fitur merchant.</li>
          <li><strong>Pemantauan Kepuasan Pengguna:</strong> Memastikan tingkat kepuasan interaksi di platform selalu terjaga dengan baik.</li>
        </ul>
      `;
      break;

    default:
      roleEmoji = "⚙️";
      roleTitle = peran;
      subject = "⚙️ Akun Operasional Agro Jabar Anda Telah Berhasil Dibuat";
      tasksHtml = `
        <ul style="${listStyle}">
          <li><strong>Kelola Tugas Operasional:</strong> Melakukan pengelolaan data dan proses sesuai dengan peran yang ditugaskan kepada Anda.</li>
          <li><strong>Kolaborasi Tim:</strong> Berkoordinasi dengan divisi lain guna kelancaran alur rantai pasok Agro Jabar.</li>
          <li><strong>Keamanan Akun:</strong> Menjaga kerahasiaan kata sandi demi keamanan data bersama di ekosistem digital Agro Jabar.</li>
        </ul>
      `;
  }

  const html = `
    <div style="${mainStyle}">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">${roleEmoji}</span>
      </div>
      <h2 style="${headerStyle}">Selamat Datang di Agro Jabar!</h2>
      <p style="${subHeaderStyle}">Akun Anda Sebagai ${roleTitle} Telah Dibuat</p>
      
      <p style="${textStyle}">
        Halo <strong>${nama}</strong>,<br/>
        Admin telah mendaftarkan akun Anda pada platform operasional Agro Jabar Market. Berikut ini adalah rincian tugas dan tanggung jawab utama Anda:
      </p>

      <div style="${sectionTitleStyle}">TUGAS & TANGGUNG JAWAB UTAMA</div>
      ${tasksHtml}

      <div style="${sectionTitleStyle}">KREDENSIAL LOGIN ANDA</div>
      <div style="${boxStyle}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="${tableTextStyle}">EMAIL</td>
            <td style="${valueStyle}">${email}</td>
          </tr>
          <tr>
            <td style="${tableTextStyle}">KATA SANDI</td>
            <td style="${valueStyle}; font-family: monospace;">${kataSandi}</td>
          </tr>
          <tr>
            <td style="${tableTextStyle}">NO. TELEPON</td>
            <td style="${valueStyle}">${noTelepon || "—"}</td>
          </tr>
        </table>
      </div>

      <p style="${textStyle}; text-align: center; font-weight: 500; font-size: 13.5px; color: #0f172a;">
        PENTING: Anda wajib melakukan verifikasi akun sebelum dapat login pertama kali. Silakan klik tombol di bawah untuk menyelesaikan proses verifikasi.
      </p>

      <a href="${verifyUrl}" style="${buttonStyle}">
        Verifikasi Akun Saya
      </a>

      <p style="${textStyle}; font-size: 12px; color: #64748b; text-align: center; margin-top: 16px;">
        Link verifikasi ini berlaku selama <strong>24 jam</strong>.
      </p>

      <div style="${footerStyle}">
        <p style="${footerTextStyle}">
          Email ini dikirim secara otomatis oleh platform Agro Jabar E-Commerce. Mohon tidak membalas email ini.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
};
