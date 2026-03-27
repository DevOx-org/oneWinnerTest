import React from 'react';
import PolicyPageLayout from '../components/layout/PolicyPageLayout';

interface Section {
  title: string;
  content: React.ReactNode;
}

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
    <div
      className="mt-6 h-[1px] ml-11"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    />
  </section>
);

const TermsOfServicePage: React.FC = () => (
  <PolicyPageLayout
    title="Terms of Service"
    subtitle="Please read these terms carefully before using BattleXGround."
    lastUpdated="March 23, 2026"
  >
    {/* Intro */}
    <div
      className="rounded-xl p-5 mb-10 text-sm text-gray-400 leading-relaxed"
      style={{ background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.15)' }}
    >
      These Terms of Service ("Terms") govern your access to and use of BattleXGround ("BXG",
      "Platform", "we", "us", or "our"), a real-money competitive gaming and esports platform
      operated in India. By accessing or using our Platform, you agree to be bound by these Terms.
      If you disagree, please discontinue use immediately.
    </div>

    <Section num={1} title="Eligibility">
      <p>
        You must be at least <strong className="text-white">18 years of age</strong> to register
        and participate in real-money tournaments on BattleXGround. By creating an account, you
        represent and warrant that:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>You are 18 years or older.</li>
        <li>You are a resident of India and are legally permitted to participate in skill-based gaming contests.</li>
        <li>You are not accessing the Platform from states where skill-based real-money gaming is prohibited (including but not limited to Assam, Odisha, Nagaland, Sikkim, Andhra Pradesh, and Telangana).</li>
        <li>All information you provide during registration is accurate and truthful.</li>
      </ul>
      <p>
        We reserve the right to verify your age and identity at any time and to suspend or terminate
        accounts that do not meet eligibility requirements.
      </p>
    </Section>

    <Section num={2} title="Account Registration & Security">
      <p>
        To use BattleXGround, you must create an account by providing a valid email address and a
        secure password. You are responsible for:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Maintaining the confidentiality of your login credentials.</li>
        <li>All activities that occur under your account.</li>
        <li>Notifying us immediately at <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>battlexgroundofficial@gmail.com</a> of any unauthorised use.</li>
      </ul>
      <p>
        You may only maintain one account. Creating multiple accounts to gain unfair advantage is
        strictly prohibited and will result in permanent banning and forfeiture of all balances.
      </p>
    </Section>

    <Section num={3} title="Platform & Game Rules">
      <p>
        BattleXGround hosts skill-based competitive tournaments. By participating, you agree to:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Abide by the specific rules published for each tournament.</li>
        <li>Not use cheats, hacks, bots, scripts, or any software that provides an unfair advantage.</li>
        <li>Not engage in collusion, match-fixing, or any form of fraud.</li>
        <li>Not use offensive, abusive, or discriminatory language on the Platform.</li>
        <li>Accept all game results and match decisions made by BXG administrators as final unless a formal dispute is lodged.</li>
      </ul>
      <p>
        Violation of game rules may result in immediate disqualification, forfeiture of entry fees
        and prize money, and permanent account suspension.
      </p>
    </Section>

    <Section num={4} title="Wallet, Deposits & Withdrawals">
      <p>
        BattleXGround maintains a digital wallet for each user, consisting of:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-white">Deposit Balance:</strong> Funds added via payment gateway (Razorpay). Used to enter paid tournaments.</li>
        <li><strong className="text-white">Winning Balance:</strong> Prize credits earned through tournament victories. This balance is withdrawable to your registered UPI ID.</li>
      </ul>
      <p>
        Minimum withdrawal amount is <strong className="text-white">₹50</strong>. Withdrawals are
        processed within 3–7 business days after identity verification. BXG reserves the right to
        withhold withdrawals pending fraud or compliance checks. All financial transactions are
        processed securely via Razorpay.
      </p>
    </Section>

    <Section num={5} title="Prohibited Activities">
      <p>The following activities are strictly prohibited on BattleXGround:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Creating fake or duplicate accounts.</li>
        <li>Exploiting bugs or platform vulnerabilities for financial gain (must be reported to us).</li>
        <li>Attempting to reverse-engineer, scrape, or decompile any part of the Platform.</li>
        <li>Making fraudulent payment chargebacks after consuming services.</li>
        <li>Sharing, selling, or transferring your account to another person.</li>
        <li>Harassment, threats, or abuse directed at other users or staff.</li>
      </ul>
      <p>
        We reserve the right to take legal action against any user engaged in fraudulent or
        illegal activities on the Platform.
      </p>
    </Section>

    <Section num={6} title="Intellectual Property">
      <p>
        All content on BattleXGround — including logos, graphics, text, tournament formats, and
        software — is the exclusive intellectual property of BattleXGround and its licensors. You
        may not reproduce, distribute, or use any Platform content without express written
        permission. Game titles, brand names, and related IP belong to their respective owners;
        BXG operates as an independent platform and is not affiliated with any game publisher
        unless explicitly stated.
      </p>
    </Section>

    <Section num={7} title="Limitation of Liability">
      <p>
        To the maximum extent permitted by law, BattleXGround shall not be liable for:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Loss of profits, revenue, or data resulting from use of the Platform.</li>
        <li>Service interruptions, technical failures, or downtime caused by factors beyond our control.</li>
        <li>Actions or conduct of other users on the Platform.</li>
        <li>Third-party payment gateway failures or delays.</li>
      </ul>
      <p>
        Our total liability to you for any claim arising out of these Terms shall not exceed the
        amount deposited by you in your BXG wallet in the 30 days preceding the claim.
      </p>
    </Section>

    <Section num={8} title="Dispute Resolution">
      <p>
        In the event of a dispute between you and BattleXGround, we encourage you to first contact
        our support team at{' '}
        <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
          battlexgroundofficial@gmail.com
        </a>{' '}
        for resolution. If unresolved, disputes shall be subject to:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Arbitration under the Arbitration and Conciliation Act, 1996 (India).</li>
        <li>Jurisdiction of the courts in <strong className="text-white">New Delhi, India</strong>.</li>
        <li>Governing law: the laws of India.</li>
      </ul>
    </Section>

    <Section num={9} title="Modifications to Terms">
      <p>
        BattleXGround reserves the right to modify these Terms at any time. Changes will be
        published on this page with an updated "Last Updated" date. Continued use of the Platform
        after changes constitutes your acceptance of the revised Terms. We recommend reviewing
        these Terms periodically.
      </p>
    </Section>

    <Section num={10} title="Contact">
      <p>
        For any questions regarding these Terms of Service, please contact us at:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
            battlexgroundofficial@gmail.com
          </a>{' '}
          (Primary Support)
        </li>
        <li>
          <a href="mailto:medeepanshukashyap@gmail.com" style={{ color: '#FF8C00' }}>
            medeepanshukashyap@gmail.com
          </a>{' '}
          (Technical)
        </li>
      </ul>
    </Section>
  </PolicyPageLayout>
);

export default TermsOfServicePage;
