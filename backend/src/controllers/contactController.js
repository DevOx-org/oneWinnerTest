const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const nodemailer = require('nodemailer');

// ─── Contact form transporter ─────────────────────────────────────────────────
// Uses explicit smtp.gmail.com:587 STARTTLS — same settings as central email.js
// so both code paths use the same reliable transport config.
function createContactTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10_000,
        greetingTimeout:   10_000,
        socketTimeout:     15_000,
        tls: { rejectUnauthorized: true },
    });
}

// @desc    Handle contact form submission
// @route   POST /api/contact
// @access  Public
const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ApiError('All fields (name, email, subject, message) are required.', 400);
  }
  if (name.trim().length < 2) {
    throw new ApiError('Name must be at least 2 characters long.', 400);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Please provide a valid email address.', 400);
  }
  if (message.trim().length < 10) {
    throw new ApiError('Message must be at least 10 characters long.', 400);
  }
  if (message.trim().length > 2000) {
    throw new ApiError('Message must not exceed 2000 characters.', 400);
  }

  try {
    const transporter = createContactTransporter();

    const supportEmails = [
      'battlexgroundofficial@gmail.com',
      'meharshgautam@gmail.com',
    ].join(', ');

    // Notification email to support team
    await transporter.sendMail({
      from: `"BattleXGround Contact Form" <${process.env.EMAIL_USER}>`,
      to: supportEmails,
      replyTo: email,
      subject: `[BXG Support] ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF8C00,#FF5500);padding:20px 28px;">
            <h2 style="margin:0;font-size:18px;color:#fff;">New Contact Form Submission</h2>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.85;">BattleXGround Support Portal</p>
          </div>
          <div style="padding:28px;">
            <p><strong style="color:#FF8C00;">Name:</strong> ${name}</p>
            <p><strong style="color:#FF8C00;">Email:</strong> <a href="mailto:${email}" style="color:#FF8C00;">${email}</a></p>
            <p><strong style="color:#FF8C00;">Subject:</strong> ${subject}</p>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;" />
            <p style="color:#FF8C00;font-size:12px;font-weight:bold;margin:0 0 8px;">MESSAGE</p>
            <p style="color:#ccc;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
          </div>
          <div style="padding:12px 28px;font-size:11px;color:#555;">Received at ${new Date().toISOString()}</div>
        </div>
      `,
    });

    // Auto-reply to the user
    await transporter.sendMail({
      from: `"BattleXGround Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'We received your message \u2013 BattleXGround Support',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF8C00,#FF5500);padding:20px 28px;">
            <h2 style="margin:0;font-size:18px;color:#fff;">Message Received!</h2>
          </div>
          <div style="padding:28px;">
            <p style="color:#ccc;">Hi <strong style="color:#fff;">${name}</strong>,</p>
            <p style="color:#ccc;">Thank you for reaching out! We will get back to you within <strong style="color:#FF8C00;">24\u201348 hours</strong>.</p>
            <p style="color:#ccc;">For urgent payment or tournament issues, email us at <a href="mailto:battlexgroundofficial@gmail.com" style="color:#FF8C00;">battlexgroundofficial@gmail.com</a>.</p>
            <p style="color:#555;margin-top:24px;font-size:13px;">\u2014 The BattleXGround Team</p>
          </div>
        </div>
      `,
    });

    transporter.close();
    logger.info(`Contact form submitted by ${email} \u2014 subject: "${subject}"`);
  } catch (emailErr) {
    logger.error(`Contact form email error: ${emailErr.message} | code=${emailErr.code}`);
    throw new ApiError('Message could not be sent. Please try again after some time.', 503);
  }

  res.status(200).json({
    success: true,
    message: 'Your message has been received. Our support team will respond within 24\u201348 hours.',
  });
});

module.exports = { submitContactForm };
