'use client'

import { WhopApp } from '@whop/react'
import { ReactNode } from 'react'

/**
 * Whop SDK Provider
 * Wraps the app to provide Whop iFrame SDK context and theme synchronization
 * WhopApp component with appearance="inherit" automatically syncs with Whop's theme settings
 */
export function WhopProvider({ children }: { children: ReactNode }) {
  return (
    <WhopApp appearance="inherit" grayColor="gray" accentColor="blue">
      {children}
    </WhopApp>
  )
}
