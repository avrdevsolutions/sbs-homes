import type { ConstructionOverviewSectionContent } from '@/dictionaries/landing-page'

import { ConstructionOverviewScene } from './ConstructionOverviewScene'

type ConstructionOverviewSectionProps = {
  content: ConstructionOverviewSectionContent
}

export const ConstructionOverviewSection = ({ content }: ConstructionOverviewSectionProps) => (
  <section id={content.id} aria-label={content.title}>
    <ConstructionOverviewScene content={content} />
  </section>
)
