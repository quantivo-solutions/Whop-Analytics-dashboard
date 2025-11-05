'use client'

import { useEffect } from 'react'

/**
 * Emergency client-side cleanup to hide any lingering "Company: ... • Scope locked" lines
 * that might appear from cached builds or host shell content.
 */
export function RemoveScopeBadge() {
  useEffect(() => {
    const removeBadge = () => {
      try {
        // Look for any element containing "Company:" and "Scope locked"
        const allElements = Array.from(document.querySelectorAll('*'))
        for (const el of allElements) {
          const text = (el.textContent || '').trim()
          // Match any text containing "Company:" followed by anything and "Scope locked"
          if (text.includes('Company:') && text.includes('Scope locked')) {
            (el as HTMLElement).style.display = 'none'
            // Also hide parent if it's a small text element
            const parent = el.parentElement
            if (parent && (parent.tagName === 'DIV' || parent.tagName === 'P' || parent.tagName === 'SPAN')) {
              const parentText = (parent.textContent || '').trim()
              if (parentText === text) {
                parent.style.display = 'none'
              }
            }
          }
        }
        
        // Also check for specific class patterns that might contain this text
        const textElements = Array.from(document.querySelectorAll('.text-xs, .text-sm, [class*="muted"]'))
        for (const el of textElements) {
          const text = (el.textContent || '').trim()
          if (text.includes('Company:') && text.includes('Scope locked')) {
            (el as HTMLElement).style.display = 'none'
          }
        }
      } catch (err) {
        console.error('[RemoveScopeBadge] Error:', err)
      }
    }
    
    // Run immediately
    removeBadge()
    
    // Also run after a short delay to catch dynamically rendered content
    setTimeout(removeBadge, 100)
    setTimeout(removeBadge, 500)
    
    // Set up MutationObserver to catch any future additions
    const observer = new MutationObserver(() => {
      removeBadge()
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
    
    return () => {
      observer.disconnect()
    }
  }, [])
  
  return null
}


