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

export async function sendEventCancelledEmail(
  email: string,
  eventTitle: string,
  eventDate: string,
  organizerName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">❌ Event Cancelled</h2>
          <p><strong>${eventTitle}</strong> has been cancelled by the organizer.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <p style="margin: 0;"><strong>📅 Was scheduled for:</strong> ${eventDate}</p>
            <p style="margin: 10px 0 0 0;"><strong>👤 Organizer:</strong> ${organizerName}</p>
          </div>
          <p style="color: #666; font-size: 14px;">We're sorry for any inconvenience. Check out other events happening near you!</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Event Cancelled: ${eventTitle}`,
    html,
  });
}

export async function sendEventUpdatedEmail(
  email: string,
  eventTitle: string,
  eventUrl: string,
  changes: { field: string; oldValue: string; newValue: string }[]
): Promise<boolean> {
  const changesHtml = changes.map(c => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 600;">${c.field}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-decoration: line-through; color: #999;">${c.oldValue}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; color: #22c55e; font-weight: 500;">${c.newValue}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">📝 Event Updated</h2>
          <p><strong>${eventTitle}</strong> has been updated. Here's what changed:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f9f9f9;">
                <th style="padding: 10px; text-align: left;">Field</th>
                <th style="padding: 10px; text-align: left;">Before</th>
                <th style="padding: 10px; text-align: left;">After</th>
              </tr>
            </thead>
            <tbody>
              ${changesHtml}
            </tbody>
          </table>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Updated Event
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Event Updated: ${eventTitle}`,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;">
              <div style="color: white; font-size: 36px; font-weight: bold;">🔐</div>
            </div>
            
            <h1 style="color: #1e293b; margin: 0 0 16px; font-size: 28px; font-weight: 700;">
              Reset Your Password
            </h1>
            
            <p style="color: #64748b; margin: 0 0 30px; font-size: 16px;">
              We received a request to reset your password for your ${APP_NAME} account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.39);">
                Reset Password
              </a>
            </div>
            
            <p style="color: #64748b; margin: 30px 0 0; font-size: 14px;">
              This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
            </p>
            
            <hr style="border: none; height: 1px; background: #e2e8f0; margin: 30px 0;">
            
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Reset Your ${APP_NAME} Password`,
    html,
  });
}
