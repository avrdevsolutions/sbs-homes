import { defineQuery } from 'next-sanity'

export const PROJECT_LIST_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    coverImage { asset->, alt },
    "categories": categories[]->{_id, title, "slug": slug.current},
    "location": location->{_id, title, "slug": slug.current}
  }
`)

export const PROJECT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    description,
    body,
    coverImage { asset->, alt },
    gallery[] { asset->, alt, caption },
    "categories": categories[]->{_id, title, "slug": slug.current},
    "location": location->{_id, title, "slug": slug.current},
    "doorTypes": doorTypes[]->{_id, title, "slug": slug.current},
    "windowTypes": windowTypes[]->{_id, title, "slug": slug.current},
    "windowStyles": windowStyles[]->{_id, title, "slug": slug.current},
    seo {
      metaTitle,
      metaDescription,
      ogImage { asset-> },
      noIndex
    }
  }
`)

export const PROJECT_SLUGS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] {
    "slug": slug.current
  }
`)

export const FILTERED_PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)
    && ($category == "" || $category in categories[]->slug.current)
    && ($location == "" || location->slug.current == $location)
    && ($doorType == "" || $doorType in doorTypes[]->slug.current)
    && ($windowType == "" || $windowType in windowTypes[]->slug.current)
    && ($windowStyle == "" || $windowStyle in windowStyles[]->slug.current)
  ] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    coverImage { asset->, alt },
    "categories": categories[]->{_id, title, "slug": slug.current},
    "location": location->{_id, title, "slug": slug.current},
    "doorTypes": doorTypes[]->{_id, title, "slug": slug.current},
    "windowTypes": windowTypes[]->{_id, title, "slug": slug.current},
    "windowStyles": windowStyles[]->{_id, title, "slug": slug.current}
  }
`)
