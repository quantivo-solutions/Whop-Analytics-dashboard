'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { DashboardSettingsInline } from './dashboard-settings-inline'

interface DashboardSettingsButtonProps {
  companyId: string
}

export function DashboardSettingsButton({ companyId }: DashboardSettingsButtonProps) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(0)

  // Force remount of settings component when modal opens
  // This ensures fresh data is loaded (especially after upgrade)
  useEffect(() => {
    if (open) {
      setKey(prev => prev + 1)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogDescription>
            Configure your email and Discord notifications for analytics reports
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <DashboardSettingsInline key={key} companyId={companyId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

