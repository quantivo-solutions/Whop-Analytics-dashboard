'use client'

import { WhopIframeSdkProvider } from '@whop/react'
import { ReactNode } from 'react'

/**
 * Whop SDK Provider
 * Wraps the app to provide Whop iFrame SDK context
 */
export function WhopProvider({ children }: { children: ReactNode }) {
  return (
    <WhopIframeSdkProvider>
      {children}
    </WhopIframeSdkProvider>
  )
}

