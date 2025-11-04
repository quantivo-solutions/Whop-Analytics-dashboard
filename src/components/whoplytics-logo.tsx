/**
 * Whoplytics Logo Component
 * Displays the official Whoplytics logo using the provided image file
 */

import Image from 'next/image'

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
      {/* Logo Icon - Using the provided logo image */}
      <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
        <Image
          src="/whoplytics-logo.png"
          alt="Whoplytics Logo"
          width={48}
          height={48}
          className="h-full w-full object-contain"
          priority
        />
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
