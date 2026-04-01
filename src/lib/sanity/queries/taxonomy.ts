import { defineQuery } from 'next-sanity'

export const CATEGORY_LIST_QUERY = defineQuery(`
  *[_type == "category"] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current
  }
`)

export const LOCATION_LIST_QUERY = defineQuery(`
  *[_type == "location"] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current
  }
`)

export const DOOR_TYPE_LIST_QUERY = defineQuery(`
  *[_type == "door-type"] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current
  }
`)

export const WINDOW_TYPE_LIST_QUERY = defineQuery(`
  *[_type == "window-type"] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current
  }
`)

export const WINDOW_STYLE_LIST_QUERY = defineQuery(`
  *[_type == "window-style"] | order(orderRank asc) {
    _id,
    title,
    "slug": slug.current
  }
`)
