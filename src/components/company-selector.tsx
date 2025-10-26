/**
 * Company Selector Component
 * Allows switching between different companies/installations
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, ChevronDown, Check } from 'lucide-react'

interface Company {
  companyId: string
  plan: string | null
  experienceId: string | null
}

interface CompanySelectorProps {
  companies: Company[]
  currentCompanyId: string
}

export function CompanySelector({ companies, currentCompanyId }: CompanySelectorProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const currentCompany = companies.find(c => c.companyId === currentCompanyId)

  const handleSelectCompany = (companyId: string) => {
    setIsOpen(false)
    router.push(`/dashboard/${companyId}`)
  }

  if (companies.length <= 1) {
    // Don't show selector if only one company
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px]">
          <Building2 className="h-4 w-4" />
          <span className="truncate">
            {currentCompany?.companyId || 'Select Company'}
          </span>
          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => {
          const isActive = company.companyId === currentCompanyId
          const planBadge = company.plan ? company.plan.toUpperCase() : 'FREE'
          const planColor = company.plan === 'pro' ? 'text-green-600' : 
                           company.plan === 'business' ? 'text-indigo-600' : 
                           'text-gray-600'
          
          return (
            <DropdownMenuItem
              key={company.companyId}
              onClick={() => handleSelectCompany(company.companyId)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isActive && <Check className="h-4 w-4 text-primary" />}
                <span className="truncate flex-1">{company.companyId}</span>
              </div>
              <span className={`text-xs font-medium ${planColor}`}>
                {planBadge}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

