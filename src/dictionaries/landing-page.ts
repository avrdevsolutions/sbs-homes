import type { ImageAsset } from '@/dictionaries/common'

export type HeroSectionContent = {
  id: string
  sectionNumber: string
  title: string
  subtitle: string
  image: ImageAsset
  cta: {
    label: string
    href: string
  }
  scrollLabel: string
}

export type PlaceholderSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  placeholderLabel: string
}

export type FloorPlanTab = {
  label: string
  placeholderLabel: string
}

export type FloorPlansSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  tabs: FloorPlanTab[]
}

export type StructuralLayer = {
  label: string
  tone: LayerTone
}

export type StructuralFloorPlansSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  placeholderLabel: string
  layers: StructuralLayer[]
}

export type DividerSectionContent = {
  id: string
  backgroundWord: string
  sectionNumber: string
  title: string
}

export type LayerTone =
  | 'primary'
  | 'annotation'
  | 'earth'
  | 'amber'
  | 'steel'
  | 'steel-light'
  | 'stone'
  | 'stone-dark'
  | 'sage'
  | 'tan'
  | 'porcelain'
  | 'charcoal'

export type ComponentLayer = {
  name: string
  dimension: string
  tone: LayerTone
}

export type ComponentCardContent = {
  title: string
  metric: {
    label: string
    value: string
    muted?: boolean
  }
  layers: ComponentLayer[]
}

export type ConstructionOverviewSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  placeholderLabel: string
  structuralComponents: string[]
  detailsLink: {
    label: string
    href: string
  }
}

export type AssemblyStep = {
  name: string
  description: string
}

export type AssemblySequenceSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  placeholderLabel: string
  steps: AssemblyStep[]
}

export type ComponentDetailsSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  cards: ComponentCardContent[]
}

export type LandingPageContent = {
  hero: HeroSectionContent
  exteriorViews: PlaceholderSectionContent
  interiorLifestyle: PlaceholderSectionContent
  floorPlans: FloorPlansSectionContent
  technologyDivider: DividerSectionContent
  constructionOverview: ConstructionOverviewSectionContent
  assemblySequence: AssemblySequenceSectionContent
  structuralFloorPlans: StructuralFloorPlansSectionContent
  componentDetails: ComponentDetailsSectionContent
}

export const landingPageContent: LandingPageContent = {
  hero: {
    id: 'the-homes',
    sectionNumber: '01',
    title: 'These Are SBS Homes',
    subtitle:
      'A Showcase Project of Four Contemporary Homes. Precision-Manufactured. Timber-Engineered. Assembled On-Site.',
    image: {
      src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&h=1080&fit=crop',
      alt: 'Modern contemporary timber-clad home with clean architectural lines and landscaped approach',
      width: 1920,
      height: 1080,
    },
    cta: {
      label: 'Explore the homes',
      href: '#exterior-views',
    },
    scrollLabel: 'Scroll',
  },
  exteriorViews: {
    id: 'exterior-views',
    eyebrow: '02 - Exterior Views',
    title: 'Street Approach, Front Door, Rear Garden',
    description:
      'Each home from three vantage points - the arrival, the threshold, and the private outdoor space.',
    placeholderLabel: 'Scroll-driven animation content',
  },
  interiorLifestyle: {
    id: 'interior',
    eyebrow: '03 - Interior Lifestyle',
    title: 'Living Area, Kitchen, Master Bedroom',
    description: 'The spaces that define daily life - open, light-filled, precisely detailed.',
    placeholderLabel: 'Scroll-driven animation content',
  },
  floorPlans: {
    id: 'floor-plans',
    eyebrow: '04 - Floor Plans',
    title: 'General Arrangement',
    description:
      'Ground floor and first floor plans with room schedule - real plan drawings provided later.',
    tabs: [
      { label: 'Ground Floor', placeholderLabel: 'Ground floor plan — provided separately' },
      { label: 'First Floor', placeholderLabel: 'First floor plan — provided separately' },
    ],
  },
  technologyDivider: {
    id: 'the-technology',
    backgroundWord: 'Precision',
    sectionNumber: '02',
    title: 'What Makes Them Special',
  },
  constructionOverview: {
    id: 'construction',
    eyebrow: '05 - Construction Overview',
    title: 'Off-Site Timber Panel Construction',
    description:
      'Five key components - engineered in a factory, not improvised on a building site.',
    placeholderLabel: 'Exploded cutaway animation content',
    structuralComponents: [
      'Foundation Slab',
      'External Walls',
      'Internal Walls & Partitions',
      'Floor Cassette',
      'Roof Cassette',
    ],
    detailsLink: {
      label: 'See full layer specifications ↓',
      href: '#the-components',
    },
  },
  assemblySequence: {
    id: 'assembly',
    eyebrow: '06 - Assembly Sequence',
    title: 'From Slab to Roof in Seven Steps',
    description:
      'A controlled, sequential assembly process. Each phase completes before the next begins.',
    placeholderLabel: 'Build sequence animation content',
    steps: [
      { name: 'Foundation Slab', description: 'Concrete slab poured and cured on prepared ground' },
      {
        name: 'Ground Floor Panels',
        description: 'Pre-insulated floor cassettes positioned on slab',
      },
      {
        name: 'External Wall Panels',
        description: 'Factory-assembled wall panels craned into position',
      },
      {
        name: 'Internal Partitions',
        description: 'Non-structural internal walls and service zones fitted',
      },
      {
        name: 'First Floor Cassette',
        description: 'Engineered joist floor panels installed between storeys',
      },
      {
        name: 'Upper Storey Walls',
        description: 'First-floor external and party wall panels erected',
      },
      {
        name: 'Roof Cassette',
        description: 'Pre-assembled roof panels complete the weathertight envelope',
      },
    ],
  },
  structuralFloorPlans: {
    id: 'structural-floor-plans',
    eyebrow: '07 - Structural Floor Plans',
    title: 'Component Mapping',
    description:
      'Colour-coded plans showing the structural system - every wall, floor, and panel type identified. Real structural drawings provided later.',
    placeholderLabel: 'Structural plan content - provided separately',
    layers: [
      { label: 'Exterior Walls', tone: 'primary' },
      { label: 'Internal Walls & Panels', tone: 'porcelain' },
      { label: 'Floor Cassette', tone: 'amber' },
      { label: 'Roof Structure', tone: 'steel' },
    ],
  },
  componentDetails: {
    id: 'the-components',
    eyebrow: '08 - Component Details',
    title: 'Layer-by-Layer Specification',
    description:
      'Every element is engineered to a specific performance target. From slab to ridge, nothing is left to chance.',
    cards: [
      {
        title: 'Ground Floor Slab',
        metric: { label: 'U-value', value: '0.13 W/m²K' },
        layers: [
          { name: 'Finished floor covering', dimension: '—', tone: 'primary' },
          { name: 'Screed', dimension: '65 mm', tone: 'earth' },
          { name: 'Underfloor heating', dimension: 'Pipes', tone: 'annotation' },
          { name: 'PIR insulation', dimension: '100 mm', tone: 'amber' },
          { name: 'DPM', dimension: '—', tone: 'steel' },
          { name: 'Concrete slab', dimension: '150 mm', tone: 'stone' },
          { name: 'Compacted hardcore', dimension: '150 mm', tone: 'stone-dark' },
        ],
      },
      {
        title: 'External Walls',
        metric: { label: 'U-value', value: '0.18 W/m²K' },
        layers: [
          { name: 'Timber cladding / render', dimension: '18 mm', tone: 'primary' },
          { name: 'Ventilated cavity', dimension: '25 mm', tone: 'sage' },
          { name: 'Breather membrane', dimension: '—', tone: 'steel' },
          { name: 'OSB sheathing', dimension: '9 mm', tone: 'tan' },
          { name: 'Timber frame + insulation', dimension: '140 mm', tone: 'amber' },
          { name: 'VCL', dimension: '—', tone: 'steel-light' },
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
        ],
      },
      {
        title: 'Internal Walls',
        metric: { label: 'Type', value: 'Non-structural', muted: true },
        layers: [
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
          { name: 'Timber frame', dimension: '75 mm', tone: 'tan' },
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
        ],
      },
      {
        title: 'Party Walls',
        metric: { label: 'Acoustic', value: '60 dB Rw' },
        layers: [
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
          { name: 'Resilient bars', dimension: '—', tone: 'stone' },
          { name: 'OSB sheathing', dimension: '9 mm', tone: 'tan' },
          { name: 'Timber frame + acoustic insulation', dimension: '89 mm', tone: 'amber' },
          { name: 'Acoustic void', dimension: '50 mm', tone: 'charcoal' },
          { name: 'Timber frame + acoustic insulation', dimension: '89 mm', tone: 'amber' },
          { name: 'OSB sheathing', dimension: '9 mm', tone: 'tan' },
          { name: 'Resilient bars', dimension: '—', tone: 'stone' },
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
        ],
      },
      {
        title: 'Intermediate Floor',
        metric: { label: 'Acoustic', value: '55 dB Rw' },
        layers: [
          { name: 'Finished floor covering', dimension: '—', tone: 'primary' },
          { name: 'OSB deck', dimension: '18 mm', tone: 'tan' },
          { name: 'Engineered joists + insulation', dimension: '235 mm', tone: 'amber' },
          { name: 'Resilient bars', dimension: '—', tone: 'stone' },
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
        ],
      },
      {
        title: 'Roof',
        metric: { label: 'U-value', value: '0.15 W/m²K' },
        layers: [
          { name: 'Concrete tiles / slates', dimension: '—', tone: 'stone-dark' },
          { name: 'Battens', dimension: '50 × 25 mm', tone: 'tan' },
          { name: 'Counter-battens', dimension: '50 × 50 mm', tone: 'tan' },
          { name: 'Breather membrane', dimension: '—', tone: 'steel' },
          { name: 'OSB sheathing', dimension: '9 mm', tone: 'tan' },
          { name: 'Rafters + insulation', dimension: '200 mm', tone: 'amber' },
          { name: 'VCL', dimension: '—', tone: 'steel-light' },
          { name: 'Plasterboard', dimension: '12.5 mm', tone: 'porcelain' },
        ],
      },
    ],
  },
}
