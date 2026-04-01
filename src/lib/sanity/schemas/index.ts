import { category } from './category'
import { doorType } from './door-type'
import { featuredProjects } from './featured-projects'
import { location } from './location'
import { portableText } from './objects/portable-text'
import { seoFields } from './objects/seo-fields'
import { project } from './project'
import { windowStyle } from './window-style'
import { windowType } from './window-type'

import type { SchemaTypeDefinition } from 'sanity'

export const schemaTypes: SchemaTypeDefinition[] = [
  // Object types
  portableText,
  seoFields,
  // Document types
  category,
  location,
  doorType,
  windowType,
  windowStyle,
  project,
  featuredProjects,
]
