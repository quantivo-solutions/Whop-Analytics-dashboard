'use client'

import { useEffect } from 'react'

/**
 * Theme Sync Component
 * Listens for changes to the whop-frosted-theme cookie and updates the theme in real-time
 * Works alongside WhopThemeScript to provide instant theme switching
 */
export function ThemeSync() {
  useEffect(() => {
    const updateTheme = () => {
      try {
        // Read the cookie
        const cookies = document.cookie.split(';')
        const themeCookie = cookies.find(cookie => 
          cookie.trim().startsWith('whop-frosted-theme=')
        )
        
        if (themeCookie) {
          // Cookie format: whop-frosted-theme=appearance:dark or whop-frosted-theme=appearance:light
          const match = themeCookie.match(/appearance:(?<appearance>light|dark)/)
          const appearance = match?.groups?.appearance
          
          if (appearance === 'dark' || appearance === 'light') {
            const html = document.documentElement
            html.classList.remove('light', 'dark')
            html.classList.add(appearance)
            html.style.colorScheme = appearance
            console.log('[ThemeSync] Theme updated to:', appearance)
          }
        } else {
          // Fallback to system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const theme = prefersDark ? 'dark' : 'light'
          const html = document.documentElement
          html.classList.remove('light', 'dark')
          html.classList.add(theme)
          html.style.colorScheme = theme
        }
      } catch (error) {
        console.error('[ThemeSync] Error updating theme:', error)
      }
    }

    // Initial theme update
    updateTheme()

    // Poll for cookie changes (check every 200ms for responsive updates)
    const interval = setInterval(() => {
      updateTheme()
    }, 200)

    // Also listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      // Only update if no cookie is set (cookie takes precedence)
      const cookies = document.cookie.split(';')
      const themeCookie = cookies.find(cookie => 
        cookie.trim().startsWith('whop-frosted-theme=')
      )
      if (!themeCookie) {
        updateTheme()
      }
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    // Listen for storage events (in case theme is changed in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'whop-frosted-theme' || e.key === null) {
        updateTheme()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // MutationObserver to watch for cookie changes via document.cookie
    // This is a workaround since we can't directly observe cookie changes
    let lastCookie = document.cookie
    const checkCookieChange = () => {
      if (document.cookie !== lastCookie) {
        lastCookie = document.cookie
        updateTheme()
      }
    }
    const cookieCheckInterval = setInterval(checkCookieChange, 100)

    return () => {
      clearInterval(interval)
      clearInterval(cookieCheckInterval)
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return null
}

