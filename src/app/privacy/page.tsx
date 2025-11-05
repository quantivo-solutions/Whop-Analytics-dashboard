/**
 * Privacy Policy Page
 */

import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: 'Privacy Policy | Whoplytics',
  description: 'Privacy Policy for Whoplytics - Learn how we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy | Whoplytics',
    description: 'Privacy Policy for Whoplytics - Learn how we collect, use, and protect your data.',
  },
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'quantivosolutions@gmail.com'
const COMPANY_LEGAL_NAME = 'Quantivo Solutions'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <PageHeader title="Privacy Policy" />
        
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
          <CardContent className="pt-8 pb-12 px-8">
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                <p className="mb-4">
                  {COMPANY_LEGAL_NAME} ("we," "our," or "us") operates Whoplytics, a Whop app that provides analytics and insights for your Whop business. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
                </p>
                <p>
                  By using Whoplytics, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                
                <h3 className="text-xl font-semibold mb-2 mt-4">Company and Account Identifiers</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Company identifiers (e.g., biz_…), experienceId, and user IDs provided by Whop</li>
                  <li>Whop username, email address, and profile picture URL</li>
                </ul>

                <h3 className="text-xl font-semibold mb-2 mt-4">Membership and Payment Metadata</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Membership status, plan type (Free, Pro, Business), and subscription details</li>
                  <li>Payment metadata via Whop webhooks (no full card numbers or sensitive payment data)</li>
                  <li>Revenue amounts, transaction dates, and payment status</li>
                </ul>

                <h3 className="text-xl font-semibold mb-2 mt-4">Email Addresses</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Email addresses you provide for receiving analytics reports</li>
                  <li>Optional Discord webhook URLs for alerts</li>
                </ul>

                <h3 className="text-xl font-semibold mb-2 mt-4">Usage and Technical Data</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>App usage logs, timestamps, and error reports</li>
                  <li>Analytics metrics: revenue, member counts, cancellations, trial conversions</li>
                  <li>IP addresses and browser information (for security and support)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">How We Use Information</h2>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Provide Analytics & Reports:</strong> Process your Whop data to generate insights, dashboards, and email summaries</li>
                  <li><strong>Improve Reliability:</strong> Monitor app performance, detect errors, and optimize service delivery</li>
                  <li><strong>Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
                  <li><strong>Support:</strong> Respond to your inquiries and provide customer support</li>
                  <li><strong>Communications:</strong> Send you email reports and optional notifications (you can opt out anytime)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Legal Basis</h2>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Contract:</strong> Processing necessary to provide Whoplytics services</li>
                  <li><strong>Legitimate Interests:</strong> Improving our service, ensuring security, and preventing fraud</li>
                  <li><strong>Consent:</strong> For optional email reports and notifications (you can withdraw consent anytime)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
                <p className="mb-4">
                  We share your data only with trusted service providers who help us operate Whoplytics:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Whop:</strong> Platform provider — we receive data through their APIs and webhooks</li>
                  <li><strong>Vercel:</strong> Hosting and infrastructure provider</li>
                  <li><strong>Neon (PostgreSQL):</strong> Database hosting provider</li>
                  <li><strong>Resend:</strong> Email delivery service (for reports)</li>
                  <li><strong>Error Monitoring Services:</strong> If used, for debugging and reliability</li>
                </ul>
                <p>
                  We do not sell your data. We do not share your data with third parties for marketing purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
                <ul className="list-disc pl-6 mb-4">
                  <li>Metrics and analytics data are retained while your account is active</li>
                  <li>Upon uninstallation, we stop processing new data</li>
                  <li>You may request deletion of your data at any time by contacting us</li>
                  <li>Some data may be retained for legal compliance or dispute resolution (e.g., transaction records)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Security</h2>
                <p className="mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Encryption in Transit:</strong> All data transmitted via HTTPS/TLS</li>
                  <li><strong>Access Controls:</strong> Least-privilege access to data, secure authentication</li>
                  <li><strong>Secure Storage:</strong> Database access restricted, credentials encrypted</li>
                  <li><strong>Regular Audits:</strong> Monitoring and logging for security incidents</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Your Rights (GDPR/CCPA)</h2>
                <p className="mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                  <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                  <li><strong>Portability:</strong> Request export of your data in a machine-readable format</li>
                  <li><strong>Opt-Out:</strong> Unsubscribe from email reports or disable optional features</li>
                  <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                </ul>
                <p>
                  To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
                <p>
                  Whoplytics is not intended for users under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
                <p className="mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Posting the new Privacy Policy on this page</li>
                  <li>Updating the "Last updated" date at the top</li>
                  <li>Sending an email notification for material changes (if you've provided an email)</li>
                </ul>
                <p>
                  Your continued use of Whoplytics after changes become effective constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p className="mb-4">
                  If you have questions about this Privacy Policy or our data practices, please contact us:
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

