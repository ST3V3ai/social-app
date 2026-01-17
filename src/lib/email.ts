import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Lazy initialize Resend to avoid errors during build without API key
let resendInstance: Resend | null = null;
function getResend(): Resend | null {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Lazy initialize nodemailer transporter for SMTP (Gmail, etc.)
let smtpTransporter: nodemailer.Transporter | null = null;
function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!smtpTransporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@gather.app';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Gather';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // Priority 1: Use SMTP (Gmail, etc.) if configured
  const smtpTransport = getSmtpTransporter();
  if (smtpTransport) {
    try {
      await smtpTransport.sendMail({
        from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log('[Email] Sent via SMTP to:', options.to);
      return true;
    } catch (error) {
      console.error('[Email] SMTP send failed:', error);
      return false;
    }
  }

  // Priority 2: Use Resend if API key is set
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = getResend();
      if (!resend) {
        console.error('[Email] Resend not initialized');
        return false;
      }
      await resend.emails.send({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log('[Email] Sent via Resend to:', options.to);
      return true;
    } catch (error) {
      console.error('[Email] Resend send failed:', error);
      return false;
    }
  }

  // Fallback: Log to console (development mode)
  console.log('[Email] Would send email:', {
    to: options.to,
    subject: options.subject,
  });
  console.log('[Email] Content:', options.html);
  return true;
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<boolean> {
  const magicLink = `${APP_URL}/join/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to ${APP_NAME}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">Sign in to your account</h2>
          <p>Click the button below to sign in to ${APP_NAME}. This link will expire in 15 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Sign In to ${APP_NAME}
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #666;">
            ${magicLink}
          </p>
          <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; margin-bottom: 0;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Sign in to ${APP_NAME}

Click the link below to sign in:
${magicLink}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.
  `;

  return sendEmail({
    to: email,
    subject: `Sign in to ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendEventReminderEmail(
  email: string,
  eventTitle: string,
  eventDate: string,
  eventUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">🎉 Event Reminder</h2>
          <p>Don't forget! <strong>${eventTitle}</strong> is coming up.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📅 ${eventDate}</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Event Details
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Reminder: ${eventTitle}`,
    html,
  });
}

export async function sendInviteEmail(
  email: string,
  inviterName: string,
  eventTitle: string,
  eventDate: string,
  inviteUrl: string,
  message?: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">You're Invited! 🎉</h2>
          <p><strong>${inviterName}</strong> has invited you to <strong>${eventTitle}</strong></p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📅 ${eventDate}</strong></p>
          </div>
          ${message ? `<div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">"${message}"</div>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Invite & RSVP
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${eventTitle}`,
    html,
  });
}

export async function sendRsvpConfirmationEmail(
  email: string,
  eventTitle: string,
  eventDate: string,
  eventUrl: string,
  status: string
): Promise<boolean> {
  const statusEmoji = status === 'GOING' ? '✅' : status === 'MAYBE' ? '🤔' : '❌';
  const statusText = status === 'GOING' ? "You're going!" : status === 'MAYBE' ? "You might be going" : "You're not going";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">${statusEmoji} ${statusText}</h2>
          <p>Your RSVP for <strong>${eventTitle}</strong> has been confirmed.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📅 ${eventDate}</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Event
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">You can change your RSVP anytime before the event.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `RSVP Confirmed: ${eventTitle}`,
    html,
  });
}
