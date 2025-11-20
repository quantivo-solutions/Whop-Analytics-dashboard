'use client'

import { WhopIframeSdkProvider, WhopThemeScript } from '@whop/react'
import { ReactNode } from 'react'

/**
 * Whop SDK Provider
 * Wraps the app to provide Whop iFrame SDK context and theme synchronization
 * WhopThemeScript automatically applies the dark class based on Whop's theme settings
 * The frosted-ui/styles.css import in globals.css provides the theme styling
 */
export function WhopProvider({ children }: { children: ReactNode }) {
  return (
    <WhopIframeSdkProvider>
      <WhopThemeScript />
      {children}
    </WhopIframeSdkProvider>
  )
}
