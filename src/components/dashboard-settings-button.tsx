'use client'

import { useState } from 'react'
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
          <DashboardSettingsInline companyId={companyId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

