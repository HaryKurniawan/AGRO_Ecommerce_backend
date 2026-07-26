const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
      if (key && !key.startsWith('#')) {
        process.env[key] = value;
      }
    }
  });
}

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'noreply@agro-gudang.web.id';
const testRecipient = 'harykurniawan7723@gmail.com';

console.log('Using API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
console.log('Sending From:', fromEmail);
console.log('Sending To:', testRecipient);

if (!apiKey) {
  console.error('Error: RESEND_API_KEY is not defined in .env');
  process.exit(1);
}

const resend = new Resend(apiKey);

async function testSend() {
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: testRecipient,
      subject: 'Test Email Resend Local',
      html: '<p>Halo, ini adalah email uji coba dari server lokal.</p>',
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Send Error:', error);
  }
}

testSend();
