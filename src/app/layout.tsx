import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { WhopProvider } from '@/components/whop-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description: 'A clean and simple analytics dashboard built with Next.js 14',
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
          <Toaster position="bottom-right" richColors />
        </WhopProvider>
      </body>
    </html>
  )
}
