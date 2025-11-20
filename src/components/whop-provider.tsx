'use client'

import { WhopIframeSdkProvider, WhopThemeScript } from '@whop/react'
// @ts-ignore - Theme is exported from frosted-ui via @whop/react but types may not be available
import { Theme } from 'frosted-ui/theme'
import { ReactNode } from 'react'
import { ThemeSync } from './theme-sync'

/**
 * Whop SDK Provider
 * Wraps the app to provide Whop iFrame SDK context and theme synchronization
 * WhopThemeScript runs the script that reads Whop's theme cookie on initial load
 * ThemeSync listens for cookie changes and updates theme in real-time
 * Theme component with appearance="inherit" syncs with Whop's theme settings
 */
export function WhopProvider({ children }: { children: ReactNode }) {
  return (
    <WhopIframeSdkProvider>
      <WhopThemeScript />
      <ThemeSync />
      <Theme appearance="inherit" grayColor="gray" accentColor="blue">
        {children}
      </Theme>
    </WhopIframeSdkProvider>
  )
}
