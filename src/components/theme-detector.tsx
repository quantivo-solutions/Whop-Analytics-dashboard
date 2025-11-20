'use client'

import { useEffect } from 'react'

/**
 * Theme Detector Component
 * Automatically detects and applies dark mode based on:
 * 1. Whop Frosted UI cookie (whop-frosted-theme)
 * 2. Parent window's theme class (for iframe context)
 * 3. System prefers-color-scheme media query
 */
export function ThemeDetector() {
  useEffect(() => {
    const updateTheme = (isDark: boolean) => {
      const html = document.documentElement
      if (isDark) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    const detectTheme = (): boolean => {
      // Method 1: Check Whop Frosted UI cookie
      try {
        const cookies = document.cookie.split(';')
        const themeCookie = cookies.find(cookie => cookie.trim().startsWith('whop-frosted-theme='))
        if (themeCookie) {
          const themeValue = themeCookie.split('=')[1]?.trim()
          if (themeValue === 'dark') {
            console.log('[ThemeDetector] Using Whop Frosted UI cookie: dark')
            return true
          } else if (themeValue === 'light') {
            console.log('[ThemeDetector] Using Whop Frosted UI cookie: light')
            return false
          }
          // 'inherit' means use system preference
        }
      } catch (error) {
        // Cookie not accessible
      }

      // Method 2: Check parent window's theme (for iframe context)
      if (window.self !== window.top) {
        try {
          const parentDocument = window.parent.document
          if (parentDocument) {
            // Check for dark class
            if (parentDocument.documentElement.classList.contains('dark')) {
              console.log('[ThemeDetector] Using parent window dark class')
              return true
            }
            // Check for data-theme attribute
            const dataTheme = parentDocument.documentElement.getAttribute('data-theme')
            if (dataTheme === 'dark') {
              console.log('[ThemeDetector] Using parent window data-theme: dark')
              return true
            }
            // Check for color-scheme style
            const colorScheme = parentDocument.documentElement.style.colorScheme
            if (colorScheme === 'dark') {
              console.log('[ThemeDetector] Using parent window color-scheme: dark')
              return true
            }
            // Check for dark mode indicator in body
            if (parentDocument.body?.classList.contains('dark')) {
              console.log('[ThemeDetector] Using parent window body dark class')
              return true
            }
          }
        } catch (error) {
          // Cross-origin iframe, can't access parent directly
          // Try postMessage approach
          try {
            window.parent.postMessage({ type: 'GET_THEME' }, '*')
          } catch (e) {
            // Ignore
          }
        }
      }

      // Method 3: Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const isDark = mediaQuery.matches
      console.log('[ThemeDetector] Using system preference:', isDark ? 'dark' : 'light')
      return isDark
    }

    // Initial theme detection
    const initialIsDark = detectTheme()
    updateTheme(initialIsDark)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      const isDark = detectTheme()
      updateTheme(isDark)
    }
    mediaQuery.addEventListener('change', handleMediaChange)

    // Listen for cookie changes (Whop Frosted UI theme cookie)
    const checkCookie = () => {
      const isDark = detectTheme()
      updateTheme(isDark)
    }
    const cookieCheckInterval = setInterval(checkCookie, 1000) // Check every second

    // Listen for postMessage from parent (iframe communication)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'THEME_CHANGED') {
        const isDark = event.data.theme === 'dark'
        console.log('[ThemeDetector] Received theme change from parent:', event.data.theme)
        updateTheme(isDark)
      }
    }
    window.addEventListener('message', handleMessage)

    // Poll for parent window theme changes (for same-origin iframe)
    let themeCheckInterval: NodeJS.Timeout | null = null
    if (window.self !== window.top) {
      themeCheckInterval = setInterval(() => {
        try {
          const parentDocument = window.parent.document
          if (parentDocument) {
            const parentIsDark = parentDocument.documentElement.classList.contains('dark') ||
                                 parentDocument.documentElement.getAttribute('data-theme') === 'dark' ||
                                 parentDocument.documentElement.style.colorScheme === 'dark' ||
                                 parentDocument.body?.classList.contains('dark')
            const currentIsDark = document.documentElement.classList.contains('dark')
            
            if (parentIsDark !== currentIsDark) {
              console.log('[ThemeDetector] Parent theme changed, updating...')
              updateTheme(parentIsDark)
            }
          }
        } catch (error) {
          // Cross-origin iframe, can't access parent
        }
      }, 500) // Check every 500ms
    }

    // MutationObserver for parent document changes (more efficient than polling)
    let mutationObserver: MutationObserver | null = null
    if (window.self !== window.top) {
      try {
        const parentDocument = window.parent.document
        if (parentDocument) {
          mutationObserver = new MutationObserver(() => {
            const isDark = detectTheme()
            updateTheme(isDark)
          })
          
          mutationObserver.observe(parentDocument.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme', 'style'],
          })
          
          // Also observe body if it has theme classes
          if (parentDocument.body) {
            mutationObserver.observe(parentDocument.body, {
              attributes: true,
              attributeFilter: ['class'],
            })
          }
        }
      } catch (error) {
        // Cross-origin iframe, can't observe parent
      }
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
      clearInterval(cookieCheckInterval)
      window.removeEventListener('message', handleMessage)
      if (themeCheckInterval) {
        clearInterval(themeCheckInterval)
      }
      if (mutationObserver) {
        mutationObserver.disconnect()
      }
    }
  }, [])

  return null
}

