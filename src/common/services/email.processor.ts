import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
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

@Processor("email")
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.resend = new Resend(this.config.getOrThrow<string>("RESEND_API_KEY"));
    this.fromEmail =
      this.config.get<string>("EMAIL_FROM") || "noreply@agrojabar.id";
  }

  async process(job: Job) {
    switch (job.name) {
      case "sendAdminCreatedWelcomeEmail":
        await this.handleSendAdminCreatedWelcomeEmail(job);
        break;
      case "sendEmailVerification":
        await this.handleSendEmailVerification(job);
        break;
      case "sendPasswordReset":
        await this.handleSendPasswordReset(job);
        break;
      case "sendCourierTaskNotification":
        await this.handleSendCourierTaskNotification(job);
        break;
      case "sendOrderArrivedNotification":
        await this.handleSendOrderArrivedNotification(job);
        break;
      case "sendSellerActivatedEmail":
        await this.handleSendSellerActivatedEmail(job);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendAdminCreatedWelcomeEmail(job: Job) {
    const { email, nama, peran, kataSandiPlain, noTelepon, token, verifyUrl } = job.data;
    const template = getAdminWelcomeTemplate(
      nama,
      email,
      kataSandiPlain,
      noTelepon,
      peran,
      verifyUrl,
    );
    await this.sendEmail(email, template.subject, template.html);
  }

  private async handleSendEmailVerification(job: Job) {
    const { email, nama, verifyUrl } = job.data;
    const template = getEmailVerificationTemplate(nama, verifyUrl);
    await this.sendEmail(email, template.subject, template.html);
  }

  private async handleSendPasswordReset(job: Job) {
    const { email, nama, resetUrl } = job.data;
    const template = getPasswordResetTemplate(nama, resetUrl);
    await this.sendEmail(email, template.subject, template.html);
  }

  private async handleSendCourierTaskNotification(job: Job) {
    const { email, courierName, orderId, note } = job.data;
    const template = getCourierTaskTemplate(courierName, orderId, note);
    await this.sendEmail(email, template.subject, template.html);
  }

  private async handleSendOrderArrivedNotification(job: Job) {
    const { email, customerName, orderId, orderUrl } = job.data;
    const template = getOrderArrivedTemplate(customerName, orderId, orderUrl);
    await this.sendEmail(email, template.subject, template.html);
  }

  private async handleSendSellerActivatedEmail(job: Job) {
    const { email, nama, namaToko, alamatToko, loginUrl } = job.data;
    const template = getSellerActivatedTemplate(
      nama,
      email,
      namaToko,
      alamatToko,
      loginUrl,
    );
    await this.sendEmail(email, template.subject, template.html);
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
      throw err; // Trigger BullMQ retry
    }
  }
}
