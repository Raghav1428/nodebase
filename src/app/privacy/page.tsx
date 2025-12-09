import { LegalLayout } from "@/components/legal-layout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" date="December 9, 2025">
      <div className="space-y-8">

        <p className="text-neutral-300 leading-relaxed">
          At Nodebase, we take your privacy seriously. This Privacy Policy explains how we
          collect, use, and protect your personal information when you use our services.
        </p>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">1. Information We Collect</h3>
          <p className="text-neutral-400">
            We collect information you provide directly to us, such as when you create an account,
            subscribe to our newsletter, or contact us for support.
          </p>

          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-neutral-300 font-medium">This may include:</p>
            <ul className="list-disc list-inside mt-2 text-neutral-400">
              <li>Your name</li>
              <li>Your email address</li>
              <li>Any additional information you choose to provide</li>
            </ul>
          </div>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">2. How We Use Your Information</h3>
          <p className="text-neutral-400">
            We use the information we collect to operate, maintain, and improve our services, to
            communicate with you, and to personalize your experience.
          </p>

          <ul className="list-disc list-inside text-neutral-400 mt-3">
            <li>Service operation and feature delivery</li>
            <li>Customer support and communication</li>
            <li>Security and fraud prevention</li>
            <li>Sending promotional or informational updates</li>
          </ul>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">3. Sharing of Information</h3>
          <p className="text-neutral-400">
            We do not share your personal information with third parties except as described in this
            policy.
          </p>

          <div className="mt-4 p-4 rounded-lg bg-amber-900/10 border border-amber-800/20">
            <strong className="text-amber-300">We may share your data when:</strong>
            <ul className="list-disc list-inside mt-2 text-neutral-400">
              <li>Working with service providers on our behalf</li>
              <li>Complying with legal obligations</li>
              <li>Responding to valid law enforcement requests</li>
            </ul>
          </div>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">4. Data Security</h3>
          <p className="text-neutral-400">
            We take reasonable measures to help protect information about you from loss, theft,
            misuse, and unauthorized access, disclosure, alteration, and destruction.
          </p>

          <p className="text-neutral-400 mt-3">
            While no system is 100% secure, we follow industry best practices to minimize risk.
          </p>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">5. Your Rights</h3>
          <p className="text-neutral-400">
            You have the right to access, correct, or delete your personal information. You may also
            opt out of receiving promotional communications at any time.
          </p>

          <ul className="list-disc list-inside text-neutral-400 mt-3">
            <li>Request data access</li>
            <li>Request correction or deletion</li>
            <li>Request a copy of your personal data</li>
            <li>Withdraw consent where applicable</li>
          </ul>
        </section>

      </div>
    </LegalLayout>
  );
}
