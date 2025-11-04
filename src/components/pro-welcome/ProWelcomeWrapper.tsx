'use client'

import { ProWelcomeModal } from './ProWelcomeModal'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProWelcomeWrapperProps {
  companyId: string
}

export function ProWelcomeWrapper({ companyId }: ProWelcomeWrapperProps) {
  const [open, setOpen] = useState(true)
  const router = useRouter()

  const handleClose = async () => {
    setOpen(false)
    // Mark Pro welcome as shown
    try {
      await fetch('/api/company/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          patch: { proWelcomeShownAt: new Date().toISOString() },
        }),
      })
    } catch (error) {
      console.error('[Pro Welcome] Error marking as shown:', error)
    }
    // Reload page to show dashboard
    router.refresh()
  }

  return <ProWelcomeModal open={open} onClose={handleClose} />
}

