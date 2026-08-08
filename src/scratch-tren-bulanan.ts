import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { GetTrenBulananQuery } from "./ecommerce/analytics/queries/get-tren-bulanan.query";

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const query = app.get(GetTrenBulananQuery);
  try {
    const res = await query.execute({
      tokoId: "2c9f97e2-522c-4b81-9943-8403b67a6cc2",
      bulanKe: 6,
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
  await app.close();
}

run();
