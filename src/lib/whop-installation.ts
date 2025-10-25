/**
 * Whop Installation Management
 * 
 * Functions for managing Whop app installations and access tokens
 */

import { prisma } from './prisma'

/**
 * Get Whop access token from database
 * @param companyId - The company ID (optional, defaults to first installation)
 * @returns Access token or null if not found
 */
export async function getWhopToken(companyId?: string): Promise<string | null> {
  try {
    let installation

    if (companyId) {
      installation = await prisma.whopInstallation.findUnique({
        where: { companyId },
      })
    } else {
      // Get the first installation (for single-company setups)
      installation = await prisma.whopInstallation.findFirst()
    }

    return installation?.accessToken || null
  } catch (error) {
    console.error('Error fetching Whop token:', error)
    return null
  }
}

/**
 * Check if Whop app is installed
 * @param companyId - Optional company ID to check specific installation
 * @returns true if app is installed
 */
export async function isWhopInstalled(companyId?: string): Promise<boolean> {
  const token = await getWhopToken(companyId)
  return token !== null
}

/**
 * Get all Whop installations
 * @returns Array of all installations
 */
export async function getAllInstallations() {
  try {
    return await prisma.whopInstallation.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error fetching installations:', error)
    return []
  }
}

