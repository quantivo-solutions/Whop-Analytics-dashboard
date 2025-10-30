'use client'

import { useState, useEffect } from 'react'
import { useIframeSdk } from '@whop/react'
import { UserProfileMenu } from './user-profile-menu'

interface UserProfileMenuClientProps {
  companyId: string
  plan?: 'free' | 'pro' | 'business'
}

export function UserProfileMenuClient({ companyId, plan = 'free' }: UserProfileMenuClientProps) {
  const iframeSdk = useIframeSdk()
  const [userData, setUserData] = useState<{
    username: string
    profilePicture?: string
  }>({
    username: 'My Business',
    profilePicture: undefined,
  })

  useEffect(() => {
    async function fetchUserData() {
      try {
        // Use Whop SDK to get user info
        const user = await iframeSdk.getUser()
        
        if (user) {
          console.log('[Profile Menu] User data from SDK:', {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePic: user.profile_pic_url ? 'present' : 'missing',
          })
          
          setUserData({
            username: user.username || user.email || 'User',
            profilePicture: user.profile_pic_url,
          })
        }
      } catch (error) {
        console.error('[Profile Menu] Failed to get user data:', error)
        // Keep default "My Business"
      }
    }

    if (iframeSdk) {
      fetchUserData()
    }
  }, [iframeSdk])

  return (
    <UserProfileMenu
      companyId={companyId}
      username={userData.username}
      profilePicture={userData.profilePicture}
      plan={plan}
    />
  )
}

