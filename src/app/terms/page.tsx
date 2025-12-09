import { LegalLayout } from "@/components/legal-layout";


export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" date="December 9, 2025">
      <div className="space-y-8">
        <p className="text-neutral-300 leading-relaxed">
          Please read these Terms of Service ("Terms") carefully before using the Nodebase
          platform. By accessing or using our services, you agree to be bound by these Terms.
        </p>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">1. Use of Services</h3>
          <p className="text-neutral-400 leading-relaxed">
            You may use our services for lawful purposes only. You agree not to use our services in
            any way that violates any applicable laws or regulations.
          </p>

          <div className="mt-4 p-4 rounded-lg bg-amber-900/10 border border-amber-800/20">
            <strong className="text-amber-300">Prohibited examples:</strong>
            <ul className="mt-2 list-disc list-inside text-neutral-400">
              <li>Unauthorized access to another user’s data</li>
              <li>Spamming, scraping, or using automated bots against our endpoints</li>
              <li>Using the service to infringe intellectual property rights</li>
            </ul>
          </div>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">2. Accounts</h3>
          <p className="text-neutral-400 leading-relaxed">
            To access certain features of our services, you may be required to create an account.
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account.
          </p>

          <dl className="mt-4">
            <div className="flex gap-4">
              <dt className="min-w-[160px] text-sm text-neutral-300">Security</dt>
              <dd className="text-neutral-400">
                Protect your password and enable multi-factor authentication where available.
              </dd>
            </div>
            <div className="flex gap-4 mt-3">
              <dt className="min-w-[160px] text-sm text-neutral-300">Account Sharing</dt>
              <dd className="text-neutral-400">
                Sharing credentials is discouraged — owners are responsible for activity on their
                account.
              </dd>
            </div>
          </dl>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">3. Intellectual Property</h3>
          <p className="text-neutral-400 leading-relaxed">
            The content, features, and functionality of our services are owned by Nodebase and are
            protected by copyright, trademark, and other intellectual property laws.
          </p>

          <div className="mt-4 p-4 rounded-lg bg-white/3 border border-white/6">
            <p className="text-neutral-300">
              Unless otherwise stated, Nodebase and its licensors retain all rights, title, and
              interest in the Service and its contents. You may not copy, modify, or distribute our
              content without explicit permission.
            </p>
          </div>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">4. Termination</h3>
          <p className="text-neutral-400 leading-relaxed">
            We may terminate or suspend your access to our services immediately, without prior
            notice or liability, for any reason whatsoever, including without limitation if you
            breach the Terms.
          </p>

          <ul className="mt-3 list-disc list-inside text-neutral-400">
            <li>Termination does not waive Nodebase’s rights to pursue remedies available by law.</li>
            <li>Upon termination you must stop using the Service and delete any local copies of
              proprietary content if instructed.</li>
          </ul>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">5. Limitation of Liability</h3>
          <p className="text-neutral-400 leading-relaxed">
            In no event shall Nodebase be liable for any indirect, incidental, special,
            consequential, or punitive damages, including without limitation, loss of profits, data,
            use, goodwill, or other intangible losses, resulting from your use of our services.
          </p>

          <p className="text-neutral-400">
            Our aggregate liability to you for any claim arising out of or relating to these Terms
            will not exceed the amount you paid us in the 12 months preceding the claim, or $100,
            whichever is greater.
          </p>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">6. Changes to Terms</h3>
          <p className="text-neutral-400 leading-relaxed">
            We reserve the right to modify or replace these Terms at any time. If a revision is
            material, we will try to provide at least 30 days' notice prior to any new terms taking
            effect.
          </p>

          <div className="mt-4 p-3 rounded-md bg-neutral-900/30 border border-white/6">
            <strong className="text-neutral-200">Effective date</strong>
            <p className="text-neutral-400 mt-1">These Terms are effective as of December 9, 2025.</p>
          </div>
        </section>

      </div>
    </LegalLayout>
  );
}
