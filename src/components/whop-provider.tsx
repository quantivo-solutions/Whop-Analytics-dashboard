'use client'

import { WhopIframeSdkProvider } from '@whop/react'
import { Theme } from '@whop/frosted-ui'
import { ReactNode } from 'react'

/**
 * Whop SDK Provider
 * Wraps the app to provide Whop iFrame SDK context and theme synchronization
 * Theme component with appearance="inherit" automatically syncs with Whop's theme settings
 */
export function WhopProvider({ children }: { children: ReactNode }) {
  return (
    <WhopIframeSdkProvider>
      <Theme appearance="inherit" grayColor="gray" accentColor="blue">
        {children}
      </Theme>
    </WhopIframeSdkProvider>
  )
}
