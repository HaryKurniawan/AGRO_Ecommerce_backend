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
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly frontendOperasionalUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>("RESEND_API_KEY"));
    this.fromEmail =
      this.config.get<string>("EMAIL_FROM") || "noreply@agrojabar.id";
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
    const template = getAdminWelcomeTemplate(
      nama,
      email,
      kataSandiPlain,
      noTelepon,
      peran,
      verifyUrl,
    );

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      this.logger.log(
        `Admin-created welcome email sent successfully to ${email} as role ${peran}`,
      );
    } catch (err) {
      this.logger.error("Failed to send admin-created welcome email", err);
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
    const template = getEmailVerificationTemplate(nama, verifyUrl);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (err) {
      this.logger.error("Failed to send verification email", err);
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
    const template = getPasswordResetTemplate(nama, resetUrl);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (err) {
      this.logger.error("Failed to send password reset email", err);
    }
  }

  async sendCourierTaskNotification(
    email: string,
    courierName: string,
    orderId: string,
    note?: string,
  ): Promise<void> {
    const template = getCourierTaskTemplate(courierName, orderId, note);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      this.logger.log(
        `Task notification email sent successfully to courier: ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to send courier task notification email", err);
    }
  }

  async sendOrderArrivedNotification(
    email: string,
    customerName: string,
    orderId: string,
  ): Promise<void> {
    const orderUrl = `${this.frontendUrl}/dashboard/transaksi/${orderId}`;
    const template = getOrderArrivedTemplate(customerName, orderId, orderUrl);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      this.logger.log(
        `Order arrived notification email sent successfully to customer: ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to send order arrived notification email", err);
    }
  }

  async sendSellerActivatedEmail(
    email: string,
    nama: string,
    namaToko: string,
    alamatToko: string,
    loginUrl: string,
  ): Promise<void> {
    const template = getSellerActivatedTemplate(
      nama,
      email,
      namaToko,
      alamatToko,
      loginUrl,
    );

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      this.logger.log(
        `Seller activated email sent successfully to: ${email}`,
      );
    } catch (err) {
      this.logger.error("Failed to send seller activated email", err);
    }
  }
}
