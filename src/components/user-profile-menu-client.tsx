'use client'

import { UserProfileMenu } from './user-profile-menu'

interface UserProfileMenuClientProps {
  companyId: string
  plan?: 'free' | 'pro' | 'business'
}

/**
 * Client wrapper for UserProfileMenu
 * In the future, this can be enhanced to fetch user data from Whop SDK
 * For now, shows a generic business name
 */
export function UserProfileMenuClient({ companyId, plan = 'free' }: UserProfileMenuClientProps) {
  // Extract a friendly name from companyId if possible
  const displayName = companyId.startsWith('biz_') || companyId.startsWith('user_') 
    ? 'My Business' 
    : companyId

  return (
    <UserProfileMenu
      companyId={companyId}
      username={displayName}
      plan={plan}
    />
  )
}

