/**
 * Terms of Service Page
 */

import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: 'Terms of Service | Whoplytics',
  description: 'Terms of Service for Whoplytics - Learn about our service terms and conditions.',
  openGraph: {
    title: 'Terms of Service | Whoplytics',
    description: 'Terms of Service for Whoplytics - Learn about our service terms and conditions.',
  },
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'quantivosolutions@gmail.com'
const COMPANY_LEGAL_NAME = 'Quantivo Solutions'
const PRO_PRICE = '$15/mo'
const EFFECTIVE_DATE = 'November 5, 2025'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <PageHeader title="Terms of Service" />
        
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
          <CardContent className="pt-8 pb-12 px-8">
            <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">
              Effective Date: {EFFECTIVE_DATE}
            </p>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
                <p className="mb-4">
                  By accessing or using Whoplytics ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
                </p>
                <p>
                  These Terms apply to all users of Whoplytics, including creators, communities, and businesses using the Service to analyze their Whop data.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Access & License</h2>
                <p className="mb-4">
                  {COMPANY_LEGAL_NAME} grants you a limited, non-exclusive, non-transferable license to access and use Whoplytics for your internal business purposes, subject to these Terms.
                </p>
                <p className="mb-4">
                  You must:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Have a valid Whop account and authorized access to the Whop business you're analyzing</li>
                  <li>Provide accurate information when setting up your account</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Use the Service in compliance with all applicable laws and regulations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Plans & Billing</h2>
                <h3 className="text-xl font-semibold mb-2 mt-4">Subscription Plans</h3>
                <p className="mb-4">
                  Whoplytics offers Free and Pro plans:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Free Plan:</strong> Includes 7-day dashboard history, core KPIs, and weekly email reports</li>
                  <li><strong>Pro Plan:</strong> Priced at {PRO_PRICE}, includes 90-day history, daily email reports, churn risk insights, trial conversion analysis, Discord alerts, and CSV export</li>
                </ul>

                <h3 className="text-xl font-semibold mb-2 mt-4">Billing & Payments</h3>
                <p className="mb-4">
                  All plans and billing are handled through Whop. By subscribing to Pro:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Whop processes all payments, trials, and cancellations</li>
                  <li>You agree to Whop's billing terms and payment policies</li>
                  <li>Pro plan subscriptions are billed monthly</li>
                  <li>Free trials (if offered) are managed by Whop</li>
                  <li>You may cancel your Pro subscription at any time through Whop</li>
                </ul>
                <p>
                  We do not handle refunds directly — all refund requests must go through Whop's support.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
                <p className="mb-4">You agree not to:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Scrape, crawl, or systematically extract data from Whoplytics</li>
                  <li>Reverse engineer, decompile, or attempt to discover the source code of the Service</li>
                  <li>Abuse webhooks, APIs, or automated systems to overload or disrupt the Service</li>
                  <li>Use the Service to violate any laws or infringe on third-party rights</li>
                  <li>Share your account credentials or allow unauthorized access to your account</li>
                  <li>Use the Service for any fraudulent or malicious purpose</li>
                </ul>
                <p>
                  Violation of these terms may result in immediate suspension or termination of your access.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Data & Content</h2>
                <h3 className="text-xl font-semibold mb-2 mt-4">Your Data</h3>
                <p className="mb-4">
                  By using Whoplytics, you grant us permission to:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Process membership and payment metadata received via Whop webhooks for analytics purposes</li>
                  <li>Store and aggregate your data to generate insights, reports, and dashboards</li>
                  <li>Send you email reports and notifications (you can opt out anytime)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-2 mt-4">Data Ownership</h3>
                <p className="mb-4">
                  You retain ownership of your content and data. We process your data solely to provide the Service. You may request deletion of your data at any time by contacting us or uninstalling the app.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Term & Termination</h2>
                <p className="mb-4">
                  <strong>Your Rights:</strong> You may terminate your use of Whoplytics at any time by uninstalling the app through Whop. Upon uninstallation, we will stop processing new data for your account.
                </p>
                <p className="mb-4">
                  <strong>Our Rights:</strong> We may suspend or terminate your access to the Service if:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>You violate these Terms or engage in abusive behavior</li>
                  <li>You fail to pay subscription fees (for Pro plans)</li>
                  <li>We determine, in our sole discretion, that your use poses a risk to the Service or other users</li>
                  <li>Required by law or requested by Whop</li>
                </ul>
                <p>
                  We will provide reasonable notice before termination when possible, except in cases of immediate violation or security risk.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Disclaimers & Limitation of Liability</h2>
                <h3 className="text-xl font-semibold mb-2 mt-4">Service Availability</h3>
                <p className="mb-4">
                  Whoplytics is provided "as is" and "as available." We do not guarantee:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Uninterrupted or error-free operation</li>
                  <li>Complete accuracy of analytics or reports</li>
                  <li>Compatibility with all Whop features or third-party integrations</li>
                </ul>

                <h3 className="text-xl font-semibold mb-2 mt-4">Limitation of Liability</h3>
                <p className="mb-4">
                  To the maximum extent permitted by law, {COMPANY_LEGAL_NAME} shall not be liable for:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Indirect, incidental, special, or consequential damages</li>
                  <li>Loss of profits, revenue, data, or business opportunities</li>
                  <li>Service interruptions or data loss</li>
                </ul>
                <p>
                  Our total liability for any claims arising from or related to the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Support & SLA</h2>
                <p className="mb-4">
                  We provide support on a best-effort basis:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Response Time:</strong> We aim to respond to support inquiries within 2-3 business days</li>
                  <li><strong>Availability:</strong> Support is provided via email during business hours (weekdays)</li>
                  <li><strong>Scope:</strong> We assist with technical issues, feature questions, and account management</li>
                </ul>
                <p>
                  We do not guarantee specific uptime percentages or response times. Pro users may receive priority support, but no SLA is guaranteed.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
                <p className="mb-4">
                  We reserve the right to modify these Terms at any time. We will notify you of material changes by:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Posting updated Terms on this page</li>
                  <li>Updating the "Effective Date" at the top</li>
                  <li>Sending an email notification for significant changes (if you've provided an email)</li>
                </ul>
                <p>
                  Your continued use of Whoplytics after changes become effective constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which {COMPANY_LEGAL_NAME} operates, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration or in the courts of competent jurisdiction.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Contact</h2>
                <p className="mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <p>
                  <strong>{COMPANY_LEGAL_NAME}</strong><br />
                  Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}

