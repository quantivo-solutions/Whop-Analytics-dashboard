'use client'

/**
 * TokenCleanup component - DISABLED
 * 
 * We're keeping the token in the URL instead of removing it because:
 * 1. Removing it can cause page reloads/navigations
 * 2. Token in URL is harmless if cookie works
 * 3. Token provides important fallback if cookie isn't readable in iframe
 * 4. Prevents redirect loops
 * 
 * The token will naturally disappear when user navigates away or refreshes
 * with a valid cookie-based session.
 */
export function TokenCleanup() {
  // Do nothing - keep token in URL for safety
  return null
}

