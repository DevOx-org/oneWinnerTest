import React, { useState } from 'react';
import PolicyPageLayout from '../components/layout/PolicyPageLayout';
import SEOHead from '../components/seo/SEOHead';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const INITIAL_FORM: FormState = { name: '', email: '', subject: '', message: '' };

const SUBJECTS = [
  'General Inquiry',
  'Payment / Wallet Issue',
  'Tournament Issue',
  'Account & Login Help',
  'Refund Request',
  'Bug Report',
  'Partnership Inquiry',
  'Other',
];

const ContactPage: React.FC = () => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const isSubmitting = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;   // block rapid double-clicks
    isSubmitting.current = true;
    setStatus('loading');
    setErrorMsg('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message.');
      setStatus('success');
      setForm(INITIAL_FORM);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      isSubmitting.current = false;   // always unlock after request completes
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all duration-200 focus:ring-2';
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <PolicyPageLayout
      title="Contact Us"
      subtitle="Have a question or issue? We're here to help 24/7."
    >
      <SEOHead
        title="Contact Us"
        description="Get in touch with BattleXGround support. Reach out for tournament issues, payment & wallet help, account support, refund requests, or partnership inquiries."
        path="/contact"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact BattleXGround',
          url: 'https://battlexground.com/contact',
          mainEntity: {
            '@type': 'Organization',
            name: 'BattleXGround',
            email: 'battlexgroundofficial@gmail.com',
          },
        }}
      />
      {/* Support Channels */}
      <section className="mb-12">
        <h2 className="text-white font-bold text-xl mb-6" style={{ color: '#fff' }}>
          📬 Reach Our Support Team
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'General Support',
              email: 'battlexgroundofficial@gmail.com',
              desc: 'Platform queries, account help, tournament issues',
              icon: '🎮',
            },
            {
              label: 'Developer / Tech Lead',
              email: 'medeepanshukashyap@gmail.com',
              desc: 'Technical issues, bugs, integrations',
              icon: '⚙️',
            },
            {
              label: 'Partnership / Growth',
              email: 'meharshgautam@gmail.com',
              desc: 'Business partnership, influencer & marketing',
              icon: '🤝',
            },
          ].map((channel) => (
            <div
              key={channel.email}
              className="rounded-xl p-5 flex flex-col gap-2 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <span className="text-2xl">{channel.icon}</span>
              <p className="text-white font-semibold text-sm">{channel.label}</p>
              <a
                href={`mailto:${channel.email}`}
                className="text-xs font-mono break-all transition-colors duration-200 hover:text-white"
                style={{ color: '#FF8C00' }}
              >
                {channel.email}
              </a>
              <p className="text-gray-600 text-xs leading-relaxed">{channel.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Response Time Info */}
      <section className="mb-12">
        <div
          className="rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: 'rgba(0,240,255,0.04)',
            border: '1px solid rgba(0,240,255,0.1)',
          }}
        >
          <div className="text-3xl">⏱</div>
          <div>
            <p className="text-white font-semibold text-sm mb-1">Expected Response Times</p>
            <ul className="text-gray-500 text-xs space-y-1">
              <li>• <span className="text-gray-300">Payment / Wallet Issues:</span> Within <strong className="text-white">4–12 hours</strong></li>
              <li>• <span className="text-gray-300">Tournament Disputes:</span> Within <strong className="text-white">24 hours</strong></li>
              <li>• <span className="text-gray-300">General Queries:</span> Within <strong className="text-white">24–48 hours</strong></li>
              <li>• <span className="text-gray-300">Partnership Inquiries:</span> Within <strong className="text-white">2–5 business days</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section>
        <h2 className="text-white font-bold text-xl mb-6">📝 Send Us a Message</h2>

        {status === 'success' ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-white font-bold text-lg mb-2">Message Sent!</h3>
            <p className="text-gray-400 text-sm mb-4">
              We've received your message and sent a confirmation to your email. Our team will
              respond within 24–48 hours.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Your Name <span style={{ color: '#FF8C00' }}>*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    boxShadow: undefined,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.border = '1px solid rgba(255,140,0,0.5)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                  }
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Email Address <span style={{ color: '#FF8C00' }}>*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.currentTarget.style.border = '1px solid rgba(255,140,0,0.5)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                  }
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Subject <span style={{ color: '#FF8C00' }}>*</span>
              </label>
              <select
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                className={inputClass}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,140,0,0.5)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                }
              >
                <option value="" disabled style={{ background: '#111' }}>
                  Select a subject…
                </option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s} style={{ background: '#111' }}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Message <span style={{ color: '#FF8C00' }}>*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={6}
                placeholder="Describe your issue or question in detail…"
                className={inputClass}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,140,0,0.5)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                }
              />
              <p className="text-gray-700 text-xs mt-1 text-right">
                {form.message.length}/2000
              </p>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Message
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* Disclaimer */}
      <div
        className="mt-10 rounded-xl p-4 text-xs text-gray-600 leading-relaxed"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <strong className="text-gray-500">Note:</strong> BattleXGround support is available in
        English and Hindi. For payment-related disputes, please include your User ID, transaction
        ID, and order ID in your message for faster resolution. We do not share your contact
        information with third parties.
      </div>
    </PolicyPageLayout>
  );
};

export default ContactPage;
