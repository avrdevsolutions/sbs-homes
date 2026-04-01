// Client + fetch
export { client } from './client'
export { sanityFetch, SanityLive } from './live'
export { urlFor } from './image'

// Queries
export {
  CATEGORY_LIST_QUERY,
  DOOR_TYPE_LIST_QUERY,
  FEATURED_PROJECTS_QUERY,
  FILTERED_PROJECTS_QUERY,
  LOCATION_LIST_QUERY,
  PROJECT_BY_SLUG_QUERY,
  PROJECT_LIST_QUERY,
  PROJECT_SLUGS_QUERY,
  WINDOW_STYLE_LIST_QUERY,
  WINDOW_TYPE_LIST_QUERY,
} from './queries'

// Adapters
export {
  toFilteredProjectCard,
  toFeaturedProject,
  toProjectCard,
  toProjectDetail,
  toTaxonomyItem,
} from './adapters'
export type { FilteredProjectCard, ProjectCard, ProjectDetail, TaxonomyItem } from './adapters'
