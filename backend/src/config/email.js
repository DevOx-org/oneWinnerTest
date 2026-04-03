'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Credential guard ─────────────────────────────────────────────────────────
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
    logger.error(
        '🚨 EMAIL SERVICE MISCONFIGURED: EMAIL_USER or EMAIL_PASS env var is missing. ' +
        'All emails will fail. Set these in your hosting environment variables.'
    );
}

// ─── Transport factory ────────────────────────────────────────────────────────
// We create a FRESH transporter for every email batch instead of reusing a
// pooled connection. This prevents the "dead connection after sleep" problem
// common on Render / Railway free tiers.
//
// Settings:
//   host: smtp.gmail.com        (explicit — avoids `service` shorthand quirks)
//   port: 587                   (STARTTLS — more reliable than 465 on cloud hosts)
//   secure: false               (STARTTLS upgrades the connection after connect)
//   tls.rejectUnauthorized: true
//   connectionTimeout: 10 000ms (fail fast instead of hanging)
//   greetingTimeout: 10 000ms
//   socketTimeout:   15 000ms

function createTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,          // STARTTLS (not SSL on port 465)
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        tls: {
            rejectUnauthorized: true,
        },
    });
}

// ─── Startup verification ─────────────────────────────────────────────────────
// Runs once when the module loads — confirms credentials work.
// Uses its own one-off transporter so we don't pollute the send path.
if (EMAIL_USER && EMAIL_PASS) {
    const verifyTransporter = createTransporter();
    verifyTransporter.verify((error) => {
        if (error) {
            logger.error(
                `❌ Gmail SMTP verification FAILED on startup: ${error.message} | ` +
                `code=${error.code} | responseCode=${error.responseCode}. ` +
                'Possible causes: (1) App Password revoked — regenerate at myaccount.google.com › Security › App Passwords. ' +
                '(2) 2-Step Verification disabled on the Gmail account. ' +
                '(3) Port 587 blocked by host firewall.'
            );
        } else {
            logger.info(`✅ Gmail SMTP ready — sending as: ${EMAIL_USER} (host:smtp.gmail.com port:587 STARTTLS)`);
        }
        verifyTransporter.close();
    });
}

// ─── Shared layout helpers ────────────────────────────────────────────────────

const APP_NAME = 'BattleXground';
const APP_URL  = process.env.FRONTEND_URL || 'http://localhost:5173';
const BRAND_COLOR = '#f97316';

const emailWrapper = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:30px 10px;">
      <table role="presentation" style="width:100%;max-width:580px;border-collapse:collapse;background:#141414;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
        <tr>
          <td style="padding:28px 36px 20px;background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🎮 ${APP_NAME}</h1>
            <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:2px;">India's Premier Gaming Platform</p>
          </td>
        </tr>
        <tr><td style="padding:32px 36px;">${bodyHtml}</td></tr>
        <tr>
          <td style="padding:20px 36px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;font-size:12px;color:#444;">© 2026 ${APP_NAME}. All rights reserved.</p>
            <p style="margin:6px 0 0;font-size:11px;color:#333;">This is an automated email — please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const heading = (text) =>
    `<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">${text}</h2>`;

const para = (text) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a3a3a3;">${text}</p>`;

const highlight = (label, value) => `
<tr>
  <td style="padding:10px 14px;font-size:13px;color:#737373;">${label}</td>
  <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#fff;">${value}</td>
</tr>`;

const infoTable = (rows) => `
<table role="presentation" style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:10px;margin:20px 0;">
  ${rows}
</table>`;

const ctaButton = (url, label) => `
<div style="text-align:center;margin:24px 0 8px;">
  <a href="${url}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;letter-spacing:0.5px;">
    ${label}
  </a>
</div>`;

const alertBox = (type, text) => {
    const styles = {
        success: { border: '#10b981', bg: 'rgba(16,185,129,0.07)', color: '#10b981', icon: '✅' },
        danger:  { border: '#ef4444', bg: 'rgba(239,68,68,0.07)',   color: '#ef4444', icon: '❌' },
        info:    { border: '#f97316', bg: 'rgba(249,115,22,0.07)',   color: '#f97316', icon: '📢' },
        otp:     { border: '#6366f1', bg: 'rgba(99,102,241,0.07)',   color: '#6366f1', icon: '🔐' },
    };
    const s = styles[type] || styles.info;
    return `
<div style="border-left:4px solid ${s.border};background:${s.bg};padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0;">
  <p style="margin:0;font-size:15px;color:${s.color};font-weight:600;">${s.icon} ${text}</p>
</div>`;
};

// ─── Core send function ───────────────────────────────────────────────────────
// Creates a fresh connection for every call → immune to stale-pool issues.

async function _send(to, subject, html) {
    if (!EMAIL_USER || !EMAIL_PASS) {
        logger.error(`📭 Email skipped [${subject}] → ${to}: credentials not configured`);
        return { success: false, error: 'Email credentials not configured' };
    }

    const transporter = createTransporter();
    try {
        const info = await transporter.sendMail({
            from: { name: `${APP_NAME} Gaming`, address: EMAIL_USER },
            to,
            subject,
            html,
        });
        logger.info(`✉️  Email sent [${subject}] → ${to}  messageId:${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        // Log full error details so Render logs reveal the exact cause
        logger.error(
            `❌ Email FAILED [${subject}] → ${to} | ` +
            `message="${err.message}" | code=${err.code} | responseCode=${err.responseCode}`
        );
        return { success: false, error: err.message, code: err.code };
    } finally {
        transporter.close();
    }
}

// Non-blocking wrapper — never throws, won't delay the caller
function sendAsync(to, subject, html) {
    _send(to, subject, html).catch(() => {});
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────

const sendWelcomeEmail = (userEmail, userName) => {
    const html = emailWrapper(`
        ${heading(`Welcome to the Arena, ${userName}! 🏆`)}
        ${para(`You've joined <strong style="color:${BRAND_COLOR};">${APP_NAME}</strong> — India's most exciting competitive gaming platform.`)}
        ${alertBox('info', 'Your account is ready. Add money to your wallet and join your first tournament!')}
        ${ctaButton(`${APP_URL}/tournaments`, 'Browse Tournaments →')}
    `);
    return _send(userEmail, `🎮 Welcome to ${APP_NAME} — Your Gaming Journey Begins!`, html);
};

// ─── 2. OTP / Email Verification ─────────────────────────────────────────────

const sendOtpEmail = (userEmail, userName, otp, expiresInMinutes = 10) => {
    const html = emailWrapper(`
        ${heading('Verify Your Email Address 🔐')}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, please use the code below to verify your email. It expires in <strong style="color:${BRAND_COLOR};">${expiresInMinutes} minutes</strong>.`)}
        <div style="text-align:center;margin:28px 0;">
          <div style="display:inline-block;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05));border:2px solid rgba(99,102,241,0.35);border-radius:14px;padding:20px 40px;">
            <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:12px;color:#6366f1;font-family:monospace;">${otp}</p>
          </div>
        </div>
        ${alertBox('otp', 'Never share this OTP with anyone, including our support team.')}
        ${para(`If you didn't request this, you can safely ignore this email.`)}
    `);
    return _send(userEmail, `🔐 Your ${APP_NAME} Verification Code: ${otp}`, html);
};

// ─── 3. Login Notification ────────────────────────────────────────────────────

const sendLoginEmail = (userEmail, userName) => {
    const now = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata',
    });
    const html = emailWrapper(`
        ${heading('New Login Detected 🔔')}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, we noticed a new sign-in to your ${APP_NAME} account.`)}
        ${infoTable(`
            ${highlight('Time', `${now} IST`)}
            ${highlight('Account', userEmail)}
        `)}
        ${alertBox('info', 'If this was you, no action is needed. If you did not sign in, please change your password immediately.')}
        ${ctaButton(`${APP_URL}/dashboard`, 'Go to Dashboard →')}
    `);
    sendAsync(userEmail, `🔔 New Sign-in to Your ${APP_NAME} Account`, html);
};

// ─── 4. Withdrawal Approved ───────────────────────────────────────────────────

const sendWithdrawalApprovedEmail = (userEmail, userName, { amount, upiId, requestId, processedAt }) => {
    const dateStr = processedAt
        ? new Date(processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleDateString('en-IN');
    const html = emailWrapper(`
        ${heading('Withdrawal Approved ✅')}
        ${alertBox('success', `₹${amount.toLocaleString('en-IN')} will be credited to your UPI ID within 1–3 business days.`)}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, your withdrawal request has been approved:`)}
        ${infoTable(`
            ${highlight('Amount', `₹${amount.toLocaleString('en-IN')}`)}
            ${highlight('UPI ID', upiId || '—')}
            ${highlight('Approved On', dateStr)}
            ${highlight('Reference ID', `#${requestId}`)}
        `)}
        ${ctaButton(`${APP_URL}/dashboard`, 'View Wallet →')}
    `);
    sendAsync(userEmail, `✅ Withdrawal of ₹${amount} Approved — ${APP_NAME}`, html);
};

// ─── 5. Withdrawal Rejected ───────────────────────────────────────────────────

const sendWithdrawalRejectedEmail = (userEmail, userName, { amount, reason, requestId, processedAt }) => {
    const dateStr = processedAt
        ? new Date(processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN');
    const html = emailWrapper(`
        ${heading('Withdrawal Request Rejected ❌')}
        ${alertBox('danger', `₹${amount.toLocaleString('en-IN')} has been automatically restored to your wallet.`)}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, your withdrawal request has been rejected. Your balance has been fully refunded.`)}
        ${infoTable(`
            ${highlight('Amount', `₹${amount.toLocaleString('en-IN')}`)}
            ${highlight('Reason', reason)}
            ${highlight('Rejected On', dateStr)}
            ${highlight('Request ID', `#${requestId}`)}
        `)}
        ${ctaButton(`${APP_URL}/dashboard`, 'Check Wallet Balance →')}
    `);
    sendAsync(userEmail, `❌ Withdrawal of ₹${amount} Rejected — ${APP_NAME}`, html);
};

// ─── 6. Tournament Goes Live ──────────────────────────────────────────────────

const sendTournamentLiveEmail = (userEmail, userName, { tournamentTitle, game, startTime, prizePool, tournamentId }) => {
    const dateStr = startTime
        ? new Date(startTime).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
    const html = emailWrapper(`
        ${heading('Your Tournament Is LIVE! 🔥')}
        ${alertBox('info', `${tournamentTitle} has started — join immediately!`)}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, the tournament you registered for is now live.`)}
        ${infoTable(`
            ${highlight('Tournament', tournamentTitle)}
            ${highlight('Game', game)}
            ${highlight('Start Time', dateStr)}
            ${highlight('Prize Pool', prizePool ? `₹${Number(prizePool).toLocaleString('en-IN')}` : '—')}
        `)}
        ${ctaButton(`${APP_URL}/tournaments/${tournamentId}`, '🎮 Join Tournament Now →')}
        ${para('<strong style="color:#ef4444;">Don\'t be late</strong> — missing the start may result in disqualification.')}
    `);
    sendAsync(userEmail, `🔥 LIVE NOW: ${tournamentTitle} — ${APP_NAME}`, html);
};

const notifyTournamentLive = async (tournament, participants) => {
    if (!participants || participants.length === 0) return;
    const meta = {
        tournamentTitle: tournament.title,
        game:            tournament.game,
        startTime:       tournament.startDate,
        prizePool:       tournament.prizePool,
        tournamentId:    tournament._id?.toString() ?? '',
    };
    participants.forEach((p) => {
        if (p?.email && p?.name) sendTournamentLiveEmail(p.email, p.name, meta);
    });
    logger.info(`📢 Tournament-live emails queued for ${participants.length} participants: ${tournament.title}`);
};

// ─── 7. Email Diagnostic ─────────────────────────────────────────────────────
// Hit POST /api/admin/email-diagnostic?to=your@email.com to test on production.

const sendEmailDiagnostic = async (toEmail) => {
    const html = emailWrapper(`
        ${heading('📬 Email Diagnostic Test')}
        ${para('This test email confirms the email service is operational on the production server.')}
        ${infoTable(`
            ${highlight('EMAIL_USER', EMAIL_USER || '⚠️ NOT SET')}
            ${highlight('SMTP Host', 'smtp.gmail.com:587 (STARTTLS)')}
            ${highlight('FRONTEND_URL', APP_URL)}
            ${highlight('Sent At', new Date().toISOString())}
        `)}
        ${alertBox('success', 'If you received this, email delivery is working ✅')}
    `);
    return _send(toEmail, `📬 ${APP_NAME} Email Diagnostic`, html);
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    sendWelcomeEmail,
    sendOtpEmail,
    sendLoginEmail,
    sendWithdrawalApprovedEmail,
    sendWithdrawalRejectedEmail,
    sendTournamentLiveEmail,
    notifyTournamentLive,
    sendEmailDiagnostic,
};
