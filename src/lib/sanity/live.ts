import { defineLive } from 'next-sanity'

import { env } from '@/lib/env'

import { client } from './client'

const token = env.SANITY_API_READ_TOKEN
if (!token) {
  throw new Error('Missing SANITY_API_READ_TOKEN — required for CMS data fetching')
}

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion: env.NEXT_PUBLIC_SANITY_API_VERSION }),
  serverToken: token,
  browserToken: token,
})
