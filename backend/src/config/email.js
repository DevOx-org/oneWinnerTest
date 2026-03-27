'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Transporter ─────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool: true,          // reuse connections
    maxConnections: 5,
});

transporter.verify((error) => {
    if (error) {
        logger.error('Email service configuration error:', error.message);
    } else {
        logger.info('✅ Email service ready');
    }
});

// ─── Shared layout helpers ────────────────────────────────────────────────────

const APP_NAME = 'BattleXground';
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
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
        <!-- Header -->
        <tr>
          <td style="padding:28px 36px 20px;background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🎮 ${APP_NAME}</h1>
            <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:2px;">India's Premier Gaming Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">${bodyHtml}</td></tr>
        <!-- Footer -->
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
        danger: { border: '#ef4444', bg: 'rgba(239,68,68,0.07)', color: '#ef4444', icon: '❌' },
        info: { border: '#f97316', bg: 'rgba(249,115,22,0.07)', color: '#f97316', icon: '📢' },
        otp: { border: '#6366f1', bg: 'rgba(99,102,241,0.07)', color: '#6366f1', icon: '🔐' },
    };
    const s = styles[type] || styles.info;
    return `
<div style="border-left:4px solid ${s.border};background:${s.bg};padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0;">
  <p style="margin:0;font-size:15px;color:${s.color};font-weight:600;">${s.icon} ${text}</p>
</div>`;
};

// ─── Internal fire-and-forget helper ─────────────────────────────────────────

async function _send(to, subject, html) {
    try {
        const info = await transporter.sendMail({
            from: { name: `${APP_NAME} Gaming`, address: process.env.EMAIL_USER },
            to,
            subject,
            html,
        });
        logger.info(`✉️  Email sent [${subject}] → ${to}  id:${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        logger.error(`❌ Email failed [${subject}] → ${to}: ${err.message}`);
        return { success: false, error: err.message };
    }
}

// Non-blocking wrapper — call this when you don't need to await the result
function sendAsync(to, subject, html) {
    _send(to, subject, html).catch(() => { });
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────

const sendWelcomeEmail = (userEmail, userName) => {
    const html = emailWrapper(`
        ${heading(`Welcome to the Arena, ${userName}! 🏆`)}
        ${para(`You've joined <strong style="color:${BRAND_COLOR};">${APP_NAME}</strong> — India's most exciting competitive gaming platform. Compete in daily tournaments and win real cash prizes.`)}
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

// ─── 3. Withdrawal Approved ───────────────────────────────────────────────────

const sendWithdrawalApprovedEmail = (userEmail, userName, { amount, upiId, requestId, processedAt }) => {
    const dateStr = processedAt
        ? new Date(processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleDateString('en-IN');

    const html = emailWrapper(`
        ${heading('Withdrawal Approved ✅')}
        ${alertBox('success', `₹${amount.toLocaleString('en-IN')} will be credited to your UPI ID within 1–3 business days.`)}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, your withdrawal request has been approved. Here are the details:`)}
        ${infoTable(`
            ${highlight('Amount', `₹${amount.toLocaleString('en-IN')}`)}
            ${highlight('UPI ID', upiId || '—')}
            ${highlight('Approved On', dateStr)}
            ${highlight('Reference ID', `#${requestId}`)}
        `)}
        ${para('The amount will be transferred to your UPI ID. Processing times may vary on bank holidays.')}
        ${ctaButton(`${APP_URL}/dashboard`, 'View Wallet →')}
    `);
    sendAsync(userEmail, `✅ Withdrawal of ₹${amount} Approved — ${APP_NAME}`, html);
};

// ─── 4. Withdrawal Rejected ───────────────────────────────────────────────────

const sendWithdrawalRejectedEmail = (userEmail, userName, { amount, reason, requestId, processedAt }) => {
    const dateStr = processedAt
        ? new Date(processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN');

    const html = emailWrapper(`
        ${heading('Withdrawal Request Rejected ❌')}
        ${alertBox('danger', `₹${amount.toLocaleString('en-IN')} has been automatically restored to your wallet.`)}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, unfortunately your withdrawal request has been rejected. Your balance has been fully refunded.`)}
        ${infoTable(`
            ${highlight('Amount', `₹${amount.toLocaleString('en-IN')}`)}
            ${highlight('Reason', reason)}
            ${highlight('Rejected On', dateStr)}
            ${highlight('Request ID', `#${requestId}`)}
        `)}
        ${para('Please review the reason above, update your bank details if needed, and submit a new withdrawal request.')}
        ${ctaButton(`${APP_URL}/dashboard`, 'Check Wallet Balance →')}
        ${para(`If you believe this is a mistake, please contact support.`)}
    `);
    sendAsync(userEmail, `❌ Withdrawal of ₹${amount} Rejected — ${APP_NAME}`, html);
};

// ─── 5. Tournament Goes Live ──────────────────────────────────────────────────

/**
 * Send "tournament is live" notification to a single participant.
 * Call this in a loop (or Promise.allSettled) for each registered user.
 */
const sendTournamentLiveEmail = (userEmail, userName, { tournamentTitle, game, startTime, prizePool, tournamentId }) => {
    const dateStr = startTime
        ? new Date(startTime).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

    const html = emailWrapper(`
        ${heading(`Your Tournament Is LIVE! 🔥`)}
        ${alertBox('info', `${tournamentTitle} has started — join immediately!`)}
        ${para(`Hi <strong style="color:#fff;">${userName}</strong>, the tournament you registered for is now live. Time to show your skills!`)}
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

/**
 * Batch-send live notifications to all tournament participants.
 * Fetches participant emails, then fires sendTournamentLiveEmail for each.
 * Non-blocking — resolves immediately after queuing.
 */
const notifyTournamentLive = async (tournament, participants) => {
    if (!participants || participants.length === 0) return;
    const meta = {
        tournamentTitle: tournament.title,
        game: tournament.game,
        startTime: tournament.startDate,
        prizePool: tournament.prizePool,
        tournamentId: tournament._id?.toString() ?? '',
    };
    // Fire all in parallel — failures are caught inside sendAsync
    participants.forEach((p) => {
        if (p?.email && p?.name) {
            sendTournamentLiveEmail(p.email, p.name, meta);
        }
    });
    logger.info(`📢 Tournament-live emails queued for ${participants.length} participants: ${tournament.title}`);
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    transporter,
    sendWelcomeEmail,
    sendOtpEmail,
    sendWithdrawalApprovedEmail,
    sendWithdrawalRejectedEmail,
    sendTournamentLiveEmail,
    notifyTournamentLive,
};
