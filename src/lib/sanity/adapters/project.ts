import { urlFor } from '@/lib/sanity/image'

import type {
  FEATURED_PROJECTS_QUERYResult,
  FILTERED_PROJECTS_QUERYResult,
  PROJECT_BY_SLUG_QUERYResult,
  PROJECT_LIST_QUERYResult,
} from '../../../../sanity.types'
import type { PortableTextBlock } from '@portabletext/types'

// ---------------------------------------------------------------------------
// Frontend types
// ---------------------------------------------------------------------------

export type TaxonomyItem = {
  id: string
  title: string
  slug: string
}

export type ProjectCard = {
  id: string
  title: string
  slug: string
  description: string
  coverImageUrl: string | null
  coverImageAlt: string
  categories: TaxonomyItem[]
  location: TaxonomyItem | null
}

export type ProjectDetail = {
  id: string
  title: string
  slug: string
  description: string
  body: PortableTextBlock[]
  coverImage: { url: string; alt: string } | null
  gallery: Array<{ url: string; alt: string; caption: string | null }>
  categories: TaxonomyItem[]
  location: TaxonomyItem | null
  doorTypes: TaxonomyItem[]
  windowTypes: TaxonomyItem[]
  windowStyles: TaxonomyItem[]
  seo: {
    metaTitle: string | null
    metaDescription: string | null
    ogImageUrl: string | null
    noIndex: boolean
  } | null
}

export type FilteredProjectCard = ProjectCard & {
  doorTypes: TaxonomyItem[]
  windowTypes: TaxonomyItem[]
  windowStyles: TaxonomyItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toTaxonomy = (
  raw: { _id: string; title: string | null; slug: string | null } | null,
): TaxonomyItem | null => {
  if (!raw) return null
  return { id: raw._id, title: raw.title ?? '', slug: raw.slug ?? '' }
}

const toTaxonomyList = (
  raw: Array<{ _id: string; title: string | null; slug: string | null }> | null,
): TaxonomyItem[] =>
  (raw ?? []).map((item) => ({ id: item._id, title: item.title ?? '', slug: item.slug ?? '' }))

// ---------------------------------------------------------------------------
// Adapter functions
// ---------------------------------------------------------------------------

export const toProjectCard = (raw: PROJECT_LIST_QUERYResult[number]): ProjectCard => ({
  id: raw._id,
  title: raw.title ?? 'Untitled',
  slug: raw.slug ?? '',
  description: raw.description ?? '',
  coverImageUrl: raw.coverImage?.asset
    ? urlFor(raw.coverImage).width(600).auto('format').url()
    : null,
  coverImageAlt: raw.coverImage?.alt ?? '',
  categories: toTaxonomyList(raw.categories),
  location: toTaxonomy(raw.location),
})

export const toProjectDetail = (raw: NonNullable<PROJECT_BY_SLUG_QUERYResult>): ProjectDetail => ({
  id: raw._id,
  title: raw.title ?? 'Untitled',
  slug: raw.slug ?? '',
  description: raw.description ?? '',
  body: (raw.body ?? []) as PortableTextBlock[],
  coverImage: raw.coverImage?.asset
    ? {
        url: urlFor(raw.coverImage).width(1200).auto('format').url(),
        alt: raw.coverImage.alt ?? '',
      }
    : null,
  gallery: (raw.gallery ?? []).map((img: NonNullable<typeof raw.gallery>[number]) => ({
    url: img.asset ? urlFor(img).width(800).auto('format').url() : '',
    alt: img.alt ?? '',
    caption: img.caption ?? null,
  })),
  categories: toTaxonomyList(raw.categories),
  location: toTaxonomy(raw.location),
  doorTypes: toTaxonomyList(raw.doorTypes),
  windowTypes: toTaxonomyList(raw.windowTypes),
  windowStyles: toTaxonomyList(raw.windowStyles),
  seo: raw.seo
    ? {
        metaTitle: raw.seo.metaTitle ?? null,
        metaDescription: raw.seo.metaDescription ?? null,
        ogImageUrl: raw.seo.ogImage?.asset
          ? urlFor(raw.seo.ogImage).width(1200).height(630).auto('format').url()
          : null,
        noIndex: raw.seo.noIndex ?? false,
      }
    : null,
})

type FeaturedProjectRaw = NonNullable<
  NonNullable<FEATURED_PROJECTS_QUERYResult>['projects']
>[number]

export const toFeaturedProject = (raw: FeaturedProjectRaw): ProjectCard => ({
  id: raw._id,
  title: raw.title ?? 'Untitled',
  slug: raw.slug ?? '',
  description: raw.description ?? '',
  coverImageUrl: raw.coverImage?.asset
    ? urlFor(raw.coverImage).width(600).auto('format').url()
    : null,
  coverImageAlt: raw.coverImage?.alt ?? '',
  categories: toTaxonomyList(raw.categories),
  location: toTaxonomy(raw.location),
})

export const toFilteredProjectCard = (
  raw: FILTERED_PROJECTS_QUERYResult[number],
): FilteredProjectCard => ({
  id: raw._id,
  title: raw.title ?? 'Untitled',
  slug: raw.slug ?? '',
  description: raw.description ?? '',
  coverImageUrl: raw.coverImage?.asset
    ? urlFor(raw.coverImage).width(600).auto('format').url()
    : null,
  coverImageAlt: raw.coverImage?.alt ?? '',
  categories: toTaxonomyList(raw.categories),
  location: toTaxonomy(raw.location),
  doorTypes: toTaxonomyList(raw.doorTypes),
  windowTypes: toTaxonomyList(raw.windowTypes),
  windowStyles: toTaxonomyList(raw.windowStyles),
})
