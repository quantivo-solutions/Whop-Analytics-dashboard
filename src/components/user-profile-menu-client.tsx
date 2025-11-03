'use client'

import { UserProfileMenu } from './user-profile-menu'

interface UserProfileMenuClientProps {
  companyId: string
  username?: string | null
  email?: string | null
  profilePicUrl?: string | null
  plan?: 'free' | 'pro' | 'business'
  prefs?: {
    goalAmount: number | null
    completedAt: string | null
  } | null
}

/**
 * Client wrapper for UserProfileMenu
 * Passes user data from installation to profile menu
 */
export function UserProfileMenuClient({ 
  companyId, 
  username,
  email,
  profilePicUrl,
  plan = 'free',
  prefs
}: UserProfileMenuClientProps) {
  // Use username, fallback to email, then generic name
  const displayName = username || email || 'My Business'

  return (
    <UserProfileMenu
      companyId={companyId}
      username={displayName}
      profilePicture={profilePicUrl || undefined}
      plan={plan}
      prefs={prefs}
    />
  )
}

