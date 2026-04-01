import type { TaxonomyItem } from './project'

export type { TaxonomyItem }

type RawTaxonomyItem = {
  _id: string
  title: string | null
  slug: string | null
}

export const toTaxonomyItem = (raw: RawTaxonomyItem): TaxonomyItem => ({
  id: raw._id,
  title: raw.title ?? '',
  slug: raw.slug ?? '',
})
