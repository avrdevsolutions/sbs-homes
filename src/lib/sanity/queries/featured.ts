import { defineQuery } from 'next-sanity'

export const FEATURED_PROJECTS_QUERY = defineQuery(`
  *[_type == "featured-projects" && _id == "featured-projects"][0] {
    _id,
    title,
    "projects": projects[]->{
      _id,
      title,
      "slug": slug.current,
      description,
      coverImage { asset->, alt },
      "categories": categories[]->{_id, title, "slug": slug.current},
      "location": location->{_id, title, "slug": slug.current}
    }
  }
`)
