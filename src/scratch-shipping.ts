import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UpdateShippingStatusUseCase } from "./ecommerce/ecom-pesanan/use-cases/update-shipping-status.usecase";

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const useCase = app.get(UpdateShippingStatusUseCase);
  try {
    const res = await useCase.execute("0a8e29d7-f804-4c6f-b7d7-c01fe05e8d5c", {
      note: "Test advance",
      sendEmailNotification: false,
    });
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
  await app.close();
}

run();
