import { LegalLayout } from "@/components/legal-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cookie Policy",
    description: "Learn about how Nodebase uses cookies and your choices regarding cookie usage.",
}

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" date="December 9, 2025">
      <div className="space-y-8">

        <p className="text-neutral-300 leading-relaxed">
          This Cookie Policy explains what cookies are, how we use them, and the choices you have
          regarding cookie usage on our website and services.
        </p>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">1. What Are Cookies?</h3>

          <p className="text-neutral-400">
            Cookies are small text files stored on your device when you visit a website. They are
            used to make websites function, enhance user experience, and provide insights to site
            owners.
          </p>

          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-neutral-300 font-medium">Cookies help with:</p>
            <ul className="list-disc list-inside text-neutral-400 mt-2">
              <li>Remembering your preferences</li>
              <li>Keeping you signed in</li>
              <li>Understanding how visitors use the site</li>
            </ul>
          </div>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">2. How We Use Cookies</h3>

          <p className="text-neutral-400">We use cookies to:</p>

          <ul className="list-disc list-inside text-neutral-400 mt-2">
            <li>Authenticate users and prevent fraudulent activity</li>
            <li>Store your preferences for future visits</li>
            <li>
              Collect aggregate analytics about site traffic and interactions to improve the
              experience
            </li>
          </ul>

          <div className="mt-4 p-3 rounded-md bg-amber-900/10 border border-amber-800/20">
            <strong className="text-amber-300">Note:</strong>
            <p className="text-neutral-400 mt-1">
              Some cookies are essential for the basic functionality of our website.
            </p>
          </div>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">3. Types of Cookies We Use</h3>

          <p className="text-neutral-400">
            We use a combination of session cookies (expire when your browser closes) and persistent
            cookies (remain on your device until removed or expired).
          </p>

          <dl className="mt-4">
            <div className="flex flex-col gap-1">
              <dt className="font-medium text-neutral-200">Session Cookies</dt>
              <dd className="text-neutral-400 text-sm">
                Help us manage your session and provide a smooth browsing experience.
              </dd>
            </div>

            <div className="flex flex-col gap-1 mt-4">
              <dt className="font-medium text-neutral-200">Persistent Cookies</dt>
              <dd className="text-neutral-400 text-sm">
                Store preferences and enhance personalization across visits.
              </dd>
            </div>
          </dl>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">4. Your Choices</h3>

          <p className="text-neutral-400">
            You can control cookie usage through your browser settings. Options typically include:
          </p>

          <ul className="list-disc list-inside text-neutral-400 mt-2">
            <li>Receiving alerts when cookies are being used</li>
            <li>Blocking all cookies</li>
            <li>Deleting cookies after each session</li>
          </ul>

          <p className="text-neutral-400 mt-3">
            In addition to browser settings, you may also opt out of certain types of third-party
            tracking.
          </p>
        </section>

        <section className="prose prose-invert max-w-none">
          <h3 className="scroll-mt-24">5. Changes to This Policy</h3>

          <p className="text-neutral-400">
            We may update this Cookie Policy from time to time. Any changes will be posted on this
            page with an updated “Last Updated” date.
          </p>
        </section>


      </div>
    </LegalLayout>
  );
}
