import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly frontendOperasionalUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue("email") private readonly emailQueue: Queue,
  ) {
    this.frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    this.frontendOperasionalUrl = this.config.getOrThrow<string>(
      "FRONTEND_OPERASIONAL_URL",
    );
  }

  async sendAdminCreatedWelcomeEmail(
    email: string,
    nama: string,
    peran: string,
    kataSandiPlain: string,
    noTelepon: string | null | undefined,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.frontendOperasionalUrl}/register/verify-confirm?token=${token}`;

    try {
      await this.emailQueue.add("sendAdminCreatedWelcomeEmail", {
        email,
        nama,
        peran,
        kataSandiPlain,
        noTelepon,
        token,
        verifyUrl,
      });
      this.logger.log(
        `Job sendAdminCreatedWelcomeEmail added to queue for ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to add sendAdminCreatedWelcomeEmail to queue", err);
    }
  }

  async sendEmailVerification(
    email: string,
    token: string,
    nama: string,
    peran: string = "KONSUMEN",
  ): Promise<void> {
    const baseUrl =
      peran === "KONSUMEN" ? this.frontendUrl : this.frontendOperasionalUrl;
    const verifyUrl = `${baseUrl}/register/verify-confirm?token=${token}`;

    try {
      await this.emailQueue.add("sendEmailVerification", {
        email,
        nama,
        verifyUrl,
      });
      this.logger.log(`Job sendEmailVerification added to queue for ${email}`);
    } catch (err) {
      this.logger.error("Failed to add sendEmailVerification to queue", err);
    }
  }

  async sendPasswordReset(
    email: string,
    token: string,
    nama: string,
    peran: string = "KONSUMEN",
  ): Promise<void> {
    const baseUrl =
      peran === "KONSUMEN" ? this.frontendUrl : this.frontendOperasionalUrl;
    const resetUrl = `${baseUrl}/forgot-password/reset?token=${token}`;

    try {
      await this.emailQueue.add("sendPasswordReset", {
        email,
        nama,
        resetUrl,
      });
      this.logger.log(`Job sendPasswordReset added to queue for ${email}`);
    } catch (err) {
      this.logger.error("Failed to add sendPasswordReset to queue", err);
    }
  }

  async sendCourierTaskNotification(
    email: string,
    courierName: string,
    orderId: string,
    note?: string,
  ): Promise<void> {
    try {
      await this.emailQueue.add("sendCourierTaskNotification", {
        email,
        courierName,
        orderId,
        note,
      });
      this.logger.log(
        `Job sendCourierTaskNotification added to queue for ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to add sendCourierTaskNotification to queue", err);
    }
  }

  async sendOrderArrivedNotification(
    email: string,
    customerName: string,
    orderId: string,
  ): Promise<void> {
    const orderUrl = `${this.frontendUrl}/dashboard/transaksi/${orderId}`;

    try {
      await this.emailQueue.add("sendOrderArrivedNotification", {
        email,
        customerName,
        orderId,
        orderUrl,
      });
      this.logger.log(
        `Job sendOrderArrivedNotification added to queue for ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to add sendOrderArrivedNotification to queue", err);
    }
  }

  async sendSellerActivatedEmail(
    email: string,
    nama: string,
    namaToko: string,
    alamatToko: string,
    loginUrl: string,
  ): Promise<void> {
    try {
      await this.emailQueue.add("sendSellerActivatedEmail", {
        email,
        nama,
        namaToko,
        alamatToko,
        loginUrl,
      });
      this.logger.log(
        `Job sendSellerActivatedEmail added to queue for ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to add sendSellerActivatedEmail to queue", err);
    }
  }
}
