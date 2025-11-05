import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { WhopProvider } from '@/components/whop-provider'
import { Footer } from '@/components/footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Whoplytics - Your Whop Business Analytics Companion',
  description: 'Track revenue, members, and churn in real time with automated email reports.',
  openGraph: {
    title: 'Whoplytics - Your Whop Business Analytics Companion',
    description: 'Track revenue, members, and churn in real time with automated email reports.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WhopProvider>
          {children}
          <Footer />
          <Toaster position="bottom-right" richColors />
        </WhopProvider>
      </body>
    </html>
  )
}
