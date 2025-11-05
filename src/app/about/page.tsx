/**
 * About Page
 * Company profile for Quantivo Solutions
 */

import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Eye, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | Whoplytics',
  description: 'About Quantivo Solutions - We build simple analytics for creators on Whop.',
  openGraph: {
    title: 'About | Whoplytics',
    description: 'About Quantivo Solutions - We build simple analytics for creators on Whop.',
  },
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'quantivosolutions@gmail.com'
const COMPANY_LEGAL_NAME = 'Quantivo Solutions'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <PageHeader title="About Quantivo Solutions" />
        
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
          <CardContent className="pt-8 pb-12 px-8">
            <h1 className="text-4xl font-bold mb-8">About {COMPANY_LEGAL_NAME}</h1>

            <div className="prose prose-lg max-w-none dark:prose-invert">
              <section className="mb-8">
                <p className="text-lg leading-relaxed mb-4">
                  We build simple analytics for creators on Whop.
                </p>
                <p className="text-lg leading-relaxed mb-4">
                  Our mission is to give you clear metrics, smart insights, and a clean UI — so you can focus on growing your business, not wrestling with spreadsheets.
                </p>
                <p className="text-lg leading-relaxed">
                  Whoplytics turns your Whop data into decisions. No guesswork. No complexity. Just the signal you need to grow.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-6">Why Whoplytics?</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Fast setup</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect once and get instant insights. No complex configuration or data imports.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Clean insights</h3>
                    <p className="text-sm text-muted-foreground">
                      See what matters at a glance. Goals, trends, churn risk — all in one place.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Built for growth</h3>
                    <p className="text-sm text-muted-foreground">
                      Designed for creators who want to scale. From first sale to steady revenue.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Support</h2>
                <p className="mb-4">
                  Have questions or need help? We're here for you.
                </p>
                <p>
                  Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-medium">{CONTACT_EMAIL}</a>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  We aim to respond within 2-3 business days.
                </p>
              </section>

              <section className="mb-8 pt-8 border-t">
                <div className="flex flex-wrap gap-4">
                  <Link href="/discover">
                    <Button variant="outline" className="gap-2">
                      Discover Whoplytics <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/privacy">
                    <Button variant="outline">
                      Privacy Policy
                    </Button>
                  </Link>
                  <Link href="/terms">
                    <Button variant="outline">
                      Terms of Service
                    </Button>
                  </Link>
                  <a href={`mailto:${CONTACT_EMAIL}`}>
                    <Button variant="outline">
                      Contact Us
                    </Button>
                  </a>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}

