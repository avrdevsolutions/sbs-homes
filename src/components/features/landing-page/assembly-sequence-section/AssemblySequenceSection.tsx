import type { AssemblySequenceSectionContent } from '@/dictionaries/landing-page'

import { AssemblyScrollScene } from './AssemblyScrollScene'

type AssemblySequenceSectionProps = {
  content: AssemblySequenceSectionContent
}

export const AssemblySequenceSection = ({ content }: AssemblySequenceSectionProps) => (
  <section id={content.id} aria-label={content.title}>
    <AssemblyScrollScene
      steps={content.steps}
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
    />
  </section>
)
