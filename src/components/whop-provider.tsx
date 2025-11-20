'use client'

import { WhopIframeSdkProvider, Theme } from '@whop/react'
import { ReactNode } from 'react'

/**
 * Whop SDK Provider
 * Wraps the app to provide Whop iFrame SDK context and theme synchronization
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

