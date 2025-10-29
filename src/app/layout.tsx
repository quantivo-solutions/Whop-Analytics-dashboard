import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { WhopSdkLoader } from '@/components/whop-sdk-loader'
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
        <WhopSdkLoader />
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
