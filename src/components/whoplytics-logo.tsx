/**
 * Whoplytics Logo Component
 * Displays the official Whoplytics logo with rounded square icon
 * featuring dark blue gradient background and upward-trending cyan line graph
 */

interface WhoplyticsLogoProps {
  className?: string
  showText?: boolean
  personalizedText?: string
  tagline?: string
}

export function WhoplyticsLogo({ 
  className = '', 
  showText = true,
  personalizedText,
  tagline = 'Business insights at a glance'
}: WhoplyticsLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Rounded square with dark blue gradient and upward-trending line graph */}
      <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
        {/* Dark blue gradient background */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-600 via-blue-800 to-blue-900 shadow-xl" />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-blue-500/30 to-transparent" />
        
        {/* Upward-trending line graph inside */}
        <svg 
          className="absolute inset-2 rounded-xl" 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Cyan gradient for the line graph */}
            <linearGradient id="logoGraphGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="1" />
              <stop offset="50%" stopColor="#22D3EE" stopOpacity="1" />
              <stop offset="100%" stopColor="#67E8F9" stopOpacity="1" />
            </linearGradient>
            {/* Glow effect */}
            <filter id="logoGlow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Upward-trending line graph */}
          <path
            d="M 20 75 Q 30 60, 40 50 T 60 35 L 75 25"
            stroke="url(#logoGraphGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#logoGlow)"
          />
          
          {/* Data points */}
          <circle cx="30" cy="65" r="2.5" fill="#06B6D4" filter="url(#logoGlow)" />
          <circle cx="50" cy="42" r="2.5" fill="#22D3EE" filter="url(#logoGlow)" />
          <circle cx="70" cy="28" r="2.5" fill="#67E8F9" filter="url(#logoGlow)" />
        </svg>
      </div>
      
      {/* Text Content */}
      {showText && (
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {personalizedText || 'Whoplytics'}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block font-medium">
            {tagline}
          </p>
        </div>
      )}
    </div>
  )
}
