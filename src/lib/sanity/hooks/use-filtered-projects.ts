'use client'

import { createQueryKeyStore } from '@lukemorales/query-key-factory'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import type { FilteredProjectCard } from '@/lib/sanity/adapters'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export type ProjectFilters = {
  category: string
  location: string
  doorType: string
  windowType: string
  windowStyle: string
}

export const projectKeys = createQueryKeyStore({
  projects: {
    filtered: (filters: ProjectFilters) => ({
      queryKey: [filters],
      queryFn: () => fetchFilteredProjects(filters),
    }),
  },
})

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

const responseSchema = z.object({
  projects: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      coverImageUrl: z.string().nullable(),
      coverImageAlt: z.string(),
      categories: z.array(z.object({ id: z.string(), title: z.string(), slug: z.string() })),
      location: z.object({ id: z.string(), title: z.string(), slug: z.string() }).nullable(),
      doorTypes: z.array(z.object({ id: z.string(), title: z.string(), slug: z.string() })),
      windowTypes: z.array(z.object({ id: z.string(), title: z.string(), slug: z.string() })),
      windowStyles: z.array(z.object({ id: z.string(), title: z.string(), slug: z.string() })),
    }),
  ),
})

// ---------------------------------------------------------------------------
// Fetch function
// ---------------------------------------------------------------------------

const fetchFilteredProjects = async (filters: ProjectFilters): Promise<FilteredProjectCard[]> => {
  const params = new URLSearchParams()

  if (filters.category) params.set('category', filters.category)
  if (filters.location) params.set('location', filters.location)
  if (filters.doorType) params.set('doorType', filters.doorType)
  if (filters.windowType) params.set('windowType', filters.windowType)
  if (filters.windowStyle) params.set('windowStyle', filters.windowStyle)

  const res = await fetch(`/api/cms/projects?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.status}`)
  }

  const json: unknown = await res.json()
  const validated = responseSchema.parse(json)

  return validated.projects
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useFilteredProjects = (filters: ProjectFilters) =>
  useQuery(projectKeys.projects.filtered(filters))
