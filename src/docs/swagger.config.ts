import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { INestApplication } from "@nestjs/common";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Agro Jabar API")
    .setDescription("Production-ready REST API for Agro Jabar Platform")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("Auth", "Authentication endpoints")
    .addTag("Pengguna", "Pengguna management")
    .addTag("Health", "Health check and metrics")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
    },
  });
}
