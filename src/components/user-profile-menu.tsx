'use client'

import { useState } from 'react'
import { Settings, LogOut, User, Crown, Sparkles } from 'lucide-react'
import { Badge } from './ui/badge'
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
  username?: string
  profilePicture?: string
  plan?: 'free' | 'pro' | 'business'
}

export function UserProfileMenu({ 
  companyId, 
  username = 'User', 
  profilePicture,
  plan = 'free'
}: UserProfileMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isPro = plan === 'pro' || plan === 'business'

  // Get initials from username
  const getInitials = () => {
    if (!username || username === 'User') return 'U'
    
    // Handle email addresses
    if (username.includes('@')) {
      return username.charAt(0).toUpperCase()
    }
    
    // Handle names with spaces
    const parts = username.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    
    // Single word username
    return username.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    try {
      console.log('[Logout] Starting logout process...')
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Ensure cookies are sent
      })
      
      if (!response.ok) {
        console.error('[Logout] Logout API call failed:', response.status)
        return
      }
      
      console.log('[Logout] Logout API call successful, waiting for cookie deletion...')
      
      // Set logout flag to prevent auto-login on redirect
      sessionStorage.setItem('whop_logged_out', 'true')
      sessionStorage.setItem('whop_logout_time', Date.now().toString())
      
      // Wait a moment for cookie deletion to propagate
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Extract experienceId from current URL if present
      const pathMatch = window.location.pathname.match(/\/experiences\/(exp_[^\/]+)/)
      if (pathMatch) {
        const experienceId = pathMatch[1]
        console.log('[Logout] Redirecting to login page with experienceId (clean URL, using sessionStorage for logout flag)')
        // Redirect to login with experienceId ONLY - no loggedOut param in URL
        // The sessionStorage flag prevents auto-login without polluting the URL
        window.location.href = `/login?experienceId=${experienceId}`
      } else {
        console.log('[Logout] Redirecting to login page')
        // No experienceId in URL, just go to login
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('[Logout] Logout failed:', error)
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
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium leading-none">{username}</p>
              <Badge 
                variant={isPro ? "default" : "secondary"}
                className={isPro ? "bg-gradient-to-r from-purple-500 to-pink-500 border-0 w-fit" : "w-fit"}
              >
                {isPro ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Pro Plan
                  </>
                ) : (
                  'Free Plan'
                )}
              </Badge>
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

