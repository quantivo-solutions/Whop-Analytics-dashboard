'use client'

import { useState } from 'react'
import { Settings, LogOut, User, Crown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { DashboardSettingsInline } from './dashboard-settings-inline'

interface UserProfileMenuProps {
  companyId: string
  userId?: string
  username?: string
  profilePicture?: string
  plan?: 'free' | 'pro' | 'business'
}

export function UserProfileMenu({ 
  companyId, 
  userId, 
  username, 
  profilePicture,
  plan = 'free'
}: UserProfileMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isPro = plan === 'pro' || plan === 'business'

  // Get initials from username
  const getInitials = () => {
    if (!username) return '?'
    const parts = username.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return username.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all hover:ring-2 hover:ring-primary/50">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={profilePicture} alt={username || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {isPro && (
              <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-background flex items-center justify-center">
                <Crown className="h-2 w-2 text-white" />
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{username || 'User'}</p>
              {userId && (
                <p className="text-xs leading-none text-muted-foreground">
                  {userId.substring(0, 20)}...
                </p>
              )}
              {isPro && (
                <div className="flex items-center gap-1 pt-1">
                  <Crown className="h-3 w-3 text-purple-500" />
                  <span className="text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Pro Plan
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
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
    </>
  )
}

