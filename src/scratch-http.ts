import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { JwtService } from "@nestjs/jwt";

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  
  // Generate token for the user who owns the token (Admin or Seller)
  const token = jwtService.sign({
    sub: "test-user-id",
    email: "test@example.com",
    peran: "PENJUAL"
  });

  console.log("Generated Token:", token);

  try {
    const res = await fetch("http://localhost:4000/api/ecom-pesanan/0a8e29d7-f804-4c6f-b7d7-c01fe05e8d5c/pengiriman/next", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-API-KEY": "YOUR_SECURE_API_KEY_HERE"
      },
      body: JSON.stringify({
        note: "Testing from script",
        sendEmailNotification: false,
        kurirPenggunaId: "some-kurir-id",
        kurirName: "Test Kurir",
        kurirPhone: "08123456789"
      })
    });
    const text = await res.text();
    console.log("HTTP STATUS:", res.status);
    console.log("RESPONSE:", text);
  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
  await app.close();
}

run();
