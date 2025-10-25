import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Analytics Dashboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          A clean and simple analytics dashboard built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.
        </p>
        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  )
}
