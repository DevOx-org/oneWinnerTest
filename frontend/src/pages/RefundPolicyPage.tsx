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

const RefundPolicyPage: React.FC = () => (
  <PolicyPageLayout
    title="Refund Policy"
    subtitle="Clear, transparent refund and cancellation terms for UPI-based deposits."
    lastUpdated="March 23, 2026"
  >
    {/* Intro */}
    <div
      className="rounded-xl p-5 mb-10 text-sm text-gray-400 leading-relaxed"
      style={{ background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.15)' }}
    >
      This Refund and Cancellation Policy governs all financial transactions on the BattleXGround
      ("BXG") platform, including wallet deposits, tournament entry fees, and prize withdrawals.
      All deposit transactions on BXG are processed via <strong className="text-white">UPI QR manual payment</strong>{' '}
      and are subject to admin verification before wallet credit.
    </div>

    {/* Summary Table */}
    <div className="mb-10 overflow-x-auto">
      <h2 className="text-white font-bold text-base mb-4">📊 Quick Reference</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'rgba(255,140,0,0.08)' }}>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#FF8C00', border: '1px solid rgba(255,140,0,0.15)' }}>
              Transaction Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#FF8C00', border: '1px solid rgba(255,140,0,0.15)' }}>
              Refundable?
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#FF8C00', border: '1px solid rgba(255,140,0,0.15)' }}>
              Timeline
            </th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Failed payment (not credited)', '✅ Yes — auto refund', '5–7 business days'],
            ['Wallet top-up (successful)', '❌ No (usable in platform)', '—'],
            ['Tournament entry fee', '⚠️ Conditional (see §3)', '3–5 business days'],
            ['Cancelled tournament by BXG', '✅ Yes — automatic credit back', 'Within 24 hours'],
            ['Prize/winning withdrawal', 'N/A (outgoing payment)', 'Up to 7 business days'],
            ['Fraudulent/chargeback scenario', '❌ Investigated before refund', 'Up to 30 days'],
          ].map(([type, refundable, timeline], i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}
            >
              <td className="px-4 py-3 text-gray-300" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>{type}</td>
              <td className="px-4 py-3 text-gray-300" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>{refundable}</td>
              <td className="px-4 py-3 text-gray-400" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>{timeline}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <Section num={1} title="Wallet Deposits">
      <p>
        Deposits made to your BXG wallet are generally{' '}
        <strong className="text-white">non-refundable</strong> once the funds have been credited to
        your account. The wallet balance can be used to participate in tournaments on the Platform.
      </p>
      <p>
        <strong className="text-white">Exception — Failed Transactions:</strong> If a payment is
        deducted from your bank account but not credited to your BXG wallet within 24
        hours, please contact us with your UPI Reference ID within{' '}
        <strong className="text-white">5–7 business days</strong>. Contact your bank or{' '}
        <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
          battlexgroundofficial@gmail.com
        </a>{' '}
        with your payment reference ID for expedited resolution.
      </p>
    </Section>

    <Section num={2} title="Tournament Entry Fees — General Rule">
      <p>
        Tournament entry fees deducted from your wallet are{' '}
        <strong className="text-white">non-refundable</strong> once you have been confirmed as a
        participant. This is because each entry slot is allocated from a fixed pool, and your joinin
        prevents other players from taking the spot.
      </p>
      <p>
        However, you may be considered for an entry fee refund (as wallet credit) in the specific
        cases described in Section 3.
      </p>
    </Section>

    <Section num={3} title="Eligible Refund Scenarios for Entry Fees">
      <p>
        Entry fee refunds (as BXG wallet credit) will be processed in the following situations:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong className="text-white">Tournament Cancelled by BXG:</strong> If BattleXGround
          cancels a tournament before it begins (due to insufficient participants, technical
          failure, or any other reason), all entry fees will be automatically refunded as wallet
          credit within <strong className="text-white">24 hours</strong>.
        </li>
        <li>
          <strong className="text-white">Server-Side Match Failure:</strong> If a confirmed match
          fails to start due to a BXG server error (not a user disconnect), affected users will
          receive full entry fee credit after investigation.
        </li>
        <li>
          <strong className="text-white">Incorrect Billing:</strong> If you were charged incorrectly
          due to a platform bug, contact us within{' '}
          <strong className="text-white">72 hours</strong> with proof for a review.
        </li>
        <li>
          <strong className="text-white">Duplicate Entry Charge:</strong> If your entry fee was
          deducted more than once for the same tournament, the duplicate amount will be refunded
          as wallet credit.
        </li>
      </ul>
    </Section>

    <Section num={4} title="Non-Refundable Scenarios">
      <p>Refunds will not be issued in the following cases:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Voluntary withdrawal from a tournament after entry confirmation.</li>
        <li>Disqualification due to cheating, rule violations, or prohibited conduct.</li>
        <li>User-side connectivity issues (internet disconnection, device failure) during a match.</li>
        <li>Failure to participate in a scheduled match without prior notice.</li>
        <li>Dissatisfaction with tournament results or match outcomes.</li>
        <li>
          Refund requests made more than{' '}
          <strong className="text-white">7 days</strong> after the disputed transaction.
        </li>
      </ul>
    </Section>

    <Section num={5} title="Winning Balance & Withdrawals">
      <p>
        Your <strong className="text-white">Winning Balance</strong> consists of prizes earned
        through BXG tournaments. This balance is real money owed to you and can be withdrawn to your
        registered UPI ID. Withdrawal requests are:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Minimum withdrawal amount: <strong className="text-white">₹50</strong>.</li>
        <li>
          Processed within <strong className="text-white">3–7 business days</strong> after identity
          verification is completed.
        </li>
        <li>
          Subject to TDS deduction as required under the Income Tax Act (Section 194BA) for winnings
          above applicable thresholds.
        </li>
      </ul>
      <p>
        If your withdrawal is delayed beyond 7 business days after approval, contact us immediately
        at{' '}
        <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
          battlexgroundofficial@gmail.com
        </a>
        .
      </p>
    </Section>

    <Section num={6} title="UPI Payment Refund Process">
      <p>
        All approved refunds are processed as wallet credit (Deposit Balance). For failed UPI
        transactions where money was deducted but not credited:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-white">UPI:</strong> Contact your UPI app provider for reversal — typically instant to 2 business days.</li>
        <li><strong className="text-white">Manual deposit mismatch:</strong> If your deposit was approved for the wrong amount, contact us for correction within 72 hours.</li>
      </ul>
      <p>
        BXG is not responsible for delays caused by the banking system or UPI provider processing
        timelines. Once we process a refund as wallet credit, confirmation will be visible in your Wallet tab.
      </p>
    </Section>

    <Section num={7} title="How to Request a Refund">
      <p>To request an eligible refund, follow these steps:</p>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          Email us at{' '}
          <a href="mailto:battlexgroundofficial@gmail.com" style={{ color: '#FF8C00' }}>
            battlexgroundofficial@gmail.com
          </a>{' '}
          with the subject: <em className="text-gray-300">"Refund Request – [Your User ID]"</em>.
        </li>
        <li>
          Include: Your registered email, User ID, Transaction ID / Order ID, amount, date of
          transaction, and reason for the refund request.
        </li>
        <li>
          Our support team will acknowledge your request within{' '}
          <strong className="text-white">24 hours</strong> and resolve it within{' '}
          <strong className="text-white">5 business days</strong>.
        </li>
      </ol>
      <p>
        Alternatively, use our{' '}
        <a href="/contact" style={{ color: '#FF8C00' }}>
          Contact Form
        </a>
        .
      </p>
    </Section>

    <Section num={8} title="Chargeback Policy">
      <p>
        Initiating an unjustified chargeback (disputing a legitimate transaction with your bank)
        is considered a violation of our Terms of Service. BXG reserves the right to:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Suspend your account pending investigation.</li>
        <li>Recover funds and associated costs from your wallet balance.</li>
        <li>Take legal action for fraud under the Indian Penal Code and IT Act, 2000.</li>
      </ul>
      <p>
        If you have a legitimate payment dispute, please contact us before initiating a chargeback.
        We are committed to resolving valid issues promptly.
      </p>
    </Section>

    <Section num={9} title="Amendments">
      <p>
        BattleXGround reserves the right to modify this Refund Policy at any time. Changes will be
        effective immediately upon posting. Transactions completed before the date of change are
        governed by the policy in effect at the time of the transaction.
      </p>
    </Section>
  </PolicyPageLayout>
);

export default RefundPolicyPage;
