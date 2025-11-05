/**
 * Footer Component
 * Global footer with links to legal pages and contact
 */

import Link from 'next/link'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'quantivosolutions@gmail.com'

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/discover" className="hover:text-foreground transition-colors">
              Discover
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
          <div className="text-center md:text-right">
            <p>© {new Date().getFullYear()} Quantivo Solutions. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

