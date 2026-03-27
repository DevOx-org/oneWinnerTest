import React from 'react';
import PolicyPageLayout from '../components/layout/PolicyPageLayout';

const Section: React.FC<{ num: string | number; title: string; children: React.ReactNode }> = ({
  num,
  title,
  children,
}) => (
  <section className="mb-10">
    <h2 className="flex items-center gap-3 text-white font-bold text-lg mb-4">
      <span
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
        style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)', color: '#fff' }}
      >
        {num}
      </span>
      {title}
    </h2>
    <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-11">{children}</div>
    <div className="mt-6 h-[1px] ml-11" style={{ background: 'rgba(255,255,255,0.05)' }} />
  </section>
);

const PrivacyPolicyPage: React.FC = () => (
  <PolicyPageLayout
    title="Privacy Policy"
    subtitle="We respect your privacy and are committed to protecting your personal data."
    lastUpdated="March 23, 2026"
  >
    {/* Intro */}
    <div
      className="rounded-xl p-5 mb-10 text-sm text-gray-400 leading-relaxed"
      style={{ background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.15)' }}
    >
      This Privacy Policy describes how BattleXGround ("BXG", "we", "us", "our") collects, uses,
      stores, and protects personal information when you use our Platform. We comply with the
      Information Technology Act, 2000, the IT (Reasonable Security Practices and Procedures and
      Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection
      Act, 2023 (DPDPA).
    </div>

    <Section num={1} title="Information We Collect">
      <p>We collect the following categories of personal data:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong className="text-white">Account Data:</strong> Full name, email address, username,
          date of birth, and password (hashed, never stored in plain text).
        </li>
        <li>
          <strong className="text-white">Financial Data:</strong> UPI ID for withdrawal processing.
          We do not store full credit/debit card numbers or CVVs — payment processing is handled
          exclusively by Razorpay.
        </li>
        <li>
          <strong className="text-white">Device & Usage Data:</strong> IP address, browser type,
          device identifier, operating system, pages visited, and time spent on the Platform
          (collected automatically via cookies and server logs).
        </li>
        <li>
          <strong className="text-white">Communication Data:</strong> Emails, support tickets, and
          contact form submissions you send us.
        </li>
        <li>
          <strong className="text-white">Tournament Data:</strong> Game usernames, match results,
          scores, and participation history.
        </li>
      </ul>
    </Section>

    <Section num={2} title="How We Use Your Information">
      <p>We process your personal data for the following purposes:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Creating and managing your user account.</li>
        <li>Processing deposits, entry fees, prize payouts, and withdrawal requests.</li>
        <li>Verifying identity and age for regulatory compliance.</li>
        <li>Communicating platform updates, tournament announcements, and support responses.</li>
        <li>Detecting fraud, cheating, and account abuse.</li>
        <li>Improving our services through anonymised analytics.</li>
        <li>Complying with legal obligations, court orders, and regulatory requirements.</li>
      </ul>
      <p>
        We will never sell your personal data to third parties for marketing purposes.
      </p>
    </Section>

    <Section num={3} title="Data Sharing & Third Parties">
      <p>We share your personal data only in limited circumstances:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong className="text-white">Razorpay:</strong> Our payment gateway. Razorpay processes
          all financial transactions and has access to the data required to complete payments. Their
          privacy policy is available at{' '}
          <a
            href="https://razorpay.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FF8C00' }}
          >
            razorpay.com/privacy
          </a>
          .
        </li>
        <li>
          <strong className="text-white">Cloud Infrastructure:</strong> We use secure cloud hosting
          providers to store data. All providers are contractually bound to data protection
          standards.
        </li>
        <li>
          <strong className="text-white">Law Enforcement:</strong> We may disclose data when
          required by law, legal process, or governmental authority.
        </li>
      </ul>
      <p>
        We do not share your data with advertisers, data brokers, or any non-essential third
        parties.
      </p>
    </Section>

    <Section num={4} title="Cookies & Tracking">
      <p>
        BattleXGround uses cookies and similar technologies to enhance your experience:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong className="text-white">Essential Cookies:</strong> Required for authentication
          and security. Cannot be disabled.
        </li>
        <li>
          <strong className="text-white">Analytics Cookies:</strong> Help us understand how users
          interact with the Platform (anonymised).
        </li>
      </ul>
      <p>
        You can control cookies through your browser settings. Disabling essential cookies may
        affect Platform functionality.
      </p>
    </Section>

    <Section num={5} title="Data Security">
      <p>
        We implement industry-standard security measures to protect your personal data:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>All data is transmitted over HTTPS (TLS encryption).</li>
        <li>Passwords are hashed using bcrypt with salting.</li>
        <li>JWT tokens are used for session management with appropriate expiry.</li>
        <li>Access to user data is restricted to authorised personnel only.</li>
        <li>Regular security audits and vulnerability assessments are conducted.</li>
      </ul>
      <p>
        In the event of a data breach that affects your rights, we will notify you within 72 hours
        as required by applicable law.
      </p>
    </Section>

    <Section num={6} title="Data Retention">
      <p>
        We retain your personal data for as long as your account is active or as needed to provide
        services. If you delete your account:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Account data and personal identifiers are deleted within{' '}
          <strong className="text-white">30 days</strong>.
        </li>
        <li>
          Financial transaction records are retained for{' '}
          <strong className="text-white">7 years</strong> as required by Indian tax and financial
          regulations.
        </li>
        <li>Anonymised analytics data may be retained indefinitely.</li>
      </ul>
    </Section>

    <Section num={7} title="Your Rights (DPDPA 2023)">
      <p>Under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong className="text-white">Access:</strong> Request a copy of the personal data we
          hold about you.
        </li>
        <li>
          <strong className="text-white">Correction:</strong> Request correction of inaccurate or
          incomplete data.
        </li>
        <li>
          <strong className="text-white">Erasure:</strong> Request deletion of your data (subject
          to legal retention requirements).
        </li>
        <li>
          <strong className="text-white">Grievance Redressal:</strong> Lodge a grievance with our
          Data Protection Officer.
        </li>
        <li>
          <strong className="text-white">Withdrawal of Consent:</strong> Withdraw consent for
          optional data processing.
        </li>
      </ul>
      <p>
        To exercise any of these rights, email us at{' '}
        <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
          battlexgroundofficial@gmail.com
        </a>{' '}
        with the subject line "Data Privacy Request". We will respond within 30 days.
      </p>
    </Section>

    <Section num={8} title="Children's Privacy">
      <p>
        BattleXGround is strictly for users aged 18 and above. We do not knowingly collect
        personal data from minors. If we discover that a user is under 18, we will immediately
        suspend the account and delete associated data. If you believe a minor has registered,
        please contact us immediately.
      </p>
    </Section>

    <Section num={9} title="Changes to This Policy">
      <p>
        We may update this Privacy Policy periodically. Significant changes will be communicated
        via email to registered users and/or a notice on the Platform. The "Last Updated" date at
        the top of this page indicates when the most recent revision was made. Continued use of
        the Platform after changes indicates acceptance.
      </p>
    </Section>

    <Section num={10} title="Contact Our Data Protection Officer">
      <p>
        For data privacy matters, contact our Data Protection Officer (DPO):
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Email:{' '}
          <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
            battlexgroundofficial@gmail.com
          </a>
        </li>
        <li>
          Response time: Within <strong className="text-white">30 days</strong> for privacy
          requests.
        </li>
        <li>Platform: BattleXGround, India</li>
      </ul>
    </Section>
  </PolicyPageLayout>
);

export default PrivacyPolicyPage;
