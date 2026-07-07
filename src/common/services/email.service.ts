import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getOrderArrivedTemplate,
  getCourierTaskTemplate,
  getAdminWelcomeTemplate,
  getSellerActivatedTemplate,
} from "./email-templates";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly frontendOperasionalUrl: string;
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    this.frontendOperasionalUrl = this.config.getOrThrow<string>(
      "FRONTEND_OPERASIONAL_URL",
    );
    this.resend = new Resend(this.config.getOrThrow<string>("RESEND_API_KEY"));
    this.fromEmail =
      this.config.get<string>("EMAIL_FROM") || "noreply@agrojabar.id";
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
    }
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
      const template = getAdminWelcomeTemplate(
        nama,
        email,
        kataSandiPlain,
        noTelepon,
        peran,
        verifyUrl,
      );
      this.sendEmail(email, template.subject, template.html);
      this.logger.log(`Welcome email triggered for ${email}`);
    } catch (err) {
      this.logger.error("Failed to trigger sendAdminCreatedWelcomeEmail", err);
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
      const template = getEmailVerificationTemplate(nama, verifyUrl);
      this.sendEmail(email, template.subject, template.html);
      this.logger.log(`Verification email triggered for ${email}`);
    } catch (err) {
      this.logger.error("Failed to trigger sendEmailVerification", err);
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
      const template = getPasswordResetTemplate(nama, resetUrl);
      this.sendEmail(email, template.subject, template.html);
      this.logger.log(`Password reset email triggered for ${email}`);
    } catch (err) {
      this.logger.error("Failed to trigger sendPasswordReset", err);
    }
  }

  async sendCourierTaskNotification(
    email: string,
    courierName: string,
    orderId: string,
    note?: string,
  ): Promise<void> {
    try {
      const template = getCourierTaskTemplate(courierName, orderId, note);
      this.sendEmail(email, template.subject, template.html);
      this.logger.log(`Courier task notification triggered for ${email}`);
    } catch (err) {
      this.logger.error("Failed to trigger sendCourierTaskNotification", err);
    }
  }

  async sendOrderArrivedNotification(
    email: string,
    customerName: string,
    orderId: string,
  ): Promise<void> {
    const orderUrl = `${this.frontendUrl}/dashboard/transaksi/${orderId}`;
    try {
      const template = getOrderArrivedTemplate(customerName, orderId, orderUrl);
      this.sendEmail(email, template.subject, template.html);
      this.logger.log(`Order arrived notification triggered for ${email}`);
    } catch (err) {
      this.logger.error("Failed to trigger sendOrderArrivedNotification", err);
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
      const template = getSellerActivatedTemplate(
        nama,
        email,
        namaToko,
        alamatToko,
        loginUrl,
      );
      this.sendEmail(email, template.subject, template.html);
      this.logger.log(`Seller activated email triggered for ${email}`);
    } catch (err) {
      this.logger.error("Failed to trigger sendSellerActivatedEmail", err);
    }
  }
}
