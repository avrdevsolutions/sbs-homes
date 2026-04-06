import type { ImageAsset } from '@/dictionaries/common'

export type HeroSectionContent = {
  id: string
  eyebrow: string
  headline: string
  headlineAccent: string
  subtitle: string
  cta: { label: string; href: string }
  watermark: string
}

export type IntroSectionContent = {
  id: string
  sectionNumber: string
  title: string
  description: string
  backgroundWord: string
}

export type PlaceholderSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  placeholderLabel: string
}

export type ExteriorVantagePoint = {
  id: string
  title: string
  description: string
  image: ImageAsset
  sitePlan: ImageAsset
}

export type ExteriorViewsSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  vantagePoints: [ExteriorVantagePoint, ExteriorVantagePoint, ExteriorVantagePoint]
}

export type InteriorRoom = {
  id: string
  title: string
  subtitle: string
  image: ImageAsset
  plan: ImageAsset
}

export type InteriorLifestyleSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  rooms: InteriorRoom[]
}

export type FloorPlanTab = {
  label: string
  image: ImageAsset
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

export type ConstructionAnnotation = {
  label: string
  number: string
  /** x anchor on the cutaway image (px in 4960×2730 space) */
  anchorX: number
  /** y anchor on the cutaway image (px in 4960×2730 space) */
  anchorY: number
  /** indicator color (hex) */
  color: string
}

export type ConstructionOverviewSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  placeholderLabel: string
  exteriorImage: ImageAsset
  cutawayImage: ImageAsset
  annotations: ConstructionAnnotation[]
  cutawayParagraphs: string[]
  structuralComponents: string[]
  detailsLink: {
    label: string
    href: string
  }
}

export type AssemblyStep = {
  name: string
  description: string
  image: ImageAsset
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
  intro: IntroSectionContent
  exteriorViews: ExteriorViewsSectionContent
  interiorLifestyle: InteriorLifestyleSectionContent
  floorPlans: FloorPlansSectionContent
  technologyDivider: DividerSectionContent
  constructionOverview: ConstructionOverviewSectionContent
  panelPlans: FloorPlansSectionContent
  assemblySequence: AssemblySequenceSectionContent
  structuralFloorPlans: StructuralFloorPlansSectionContent
  componentDetails: ComponentDetailsSectionContent
}

export const landingPageContent: LandingPageContent = {
  hero: {
    id: 'sbs',
    eyebrow: 'Sustainable Building Solutions',
    headline: 'Homes Built to',
    headlineAccent: 'Last Centuries',
    subtitle:
      'Where engineering meets craft. Every wall, floor, and roof panel precision-cut to the millimetre — then brought together on-site in a single, seamless build.',
    cta: { label: 'Explore the Homes', href: '#the-homes' },
    watermark: 'SBS',
  },
  intro: {
    id: 'the-homes',
    sectionNumber: '01',
    title: 'These Are SBS Homes',
    description:
      'Four contemporary homes that prove sustainable construction can be beautiful, precise, and fast. Each one timber-engineered off-site, assembled on-site in weeks, and built to last generations.',
    backgroundWord: 'Homes',
  },
  exteriorViews: {
    id: 'exterior-views',
    eyebrow: '02 - Exterior Views',
    title: 'Street Approach, Front Door, Rear Garden',
    description:
      'Each home from three vantage points - the arrival, the threshold, and the private outdoor space.',
    vantagePoints: [
      {
        id: 'street-approach',
        title: 'Street Approach',
        description:
          'The arrival — four homes visible from the street, clean lines and timber cladding against the landscape.',
        image: {
          src: '/images/exteriors/terrace-front.png',
          alt: 'Four contemporary timber-clad homes viewed from the street approach with landscaped frontage',
          width: 1920,
          height: 1080,
        },
        sitePlan: {
          src: '/images/exteriors/site-plan-front-street.svg',
          alt: 'Site plan highlighting the street approach vantage point',
          width: 400,
          height: 400,
        },
      },
      {
        id: 'front-door',
        title: 'Front Door',
        description:
          'The threshold — where the public street gives way to private space. A recessed entrance framed by timber.',
        image: {
          src: '/images/exteriors/terrace-front-door.png',
          alt: 'Close-up of the recessed timber-framed front entrance to one of the homes',
          width: 1920,
          height: 1080,
        },
        sitePlan: {
          src: '/images/exteriors/site-plan-front-door.svg',
          alt: 'Site plan highlighting the front door vantage point',
          width: 400,
          height: 400,
        },
      },
      {
        id: 'rear-garden',
        title: 'Rear Garden',
        description:
          'The private outdoor space — full-width glazing opens onto a sheltered garden. Indoor and outdoor merge.',
        image: {
          src: '/images/exteriors/private-outdoor.png',
          alt: 'Rear view of the home showing full-width glazing opening onto a private garden space',
          width: 1920,
          height: 1080,
        },
        sitePlan: {
          src: '/images/exteriors/site-plan-rear-garden.svg',
          alt: 'Site plan highlighting the rear garden vantage point',
          width: 400,
          height: 400,
        },
      },
    ],
  },
  interiorLifestyle: {
    id: 'interior',
    eyebrow: '03 - Interior Lifestyle',
    title: 'Living Area, Kitchen, Master Bedroom',
    description: 'The spaces that define daily life - open, light-filled, precisely detailed.',
    rooms: [
      {
        id: 'living-area-gather',
        title: 'Living Area',
        subtitle: 'A Space to Gather',
        image: {
          src: '/images/interiors/living-area-tv-view.webp',
          alt: 'Open-plan living area with natural light, timber flooring and modern furnishings',
          width: 1920,
          height: 1080,
        },
        plan: {
          src: '/images/interiors/living-area-tv-view-overlay.png',
          alt: 'Living area plan showing spatial layout',
          width: 1920,
          height: 1080,
        },
      },
      {
        id: 'living-area-garden',
        title: 'Living Area',
        subtitle: 'Where Home Opens to the Garden',
        image: {
          src: '/images/interiors/living-area-garden-view.webp',
          alt: 'Living area with full-height glazing opening onto the garden',
          width: 1920,
          height: 1080,
        },
        plan: {
          src: '/images/interiors/living-area-garden-view-overlay.png',
          alt: 'Garden view living area plan',
          width: 1920,
          height: 1080,
        },
      },
      {
        id: 'kitchen',
        title: 'Open-Plan Kitchen',
        subtitle: 'For Everyday Living',
        image: {
          src: '/images/interiors/kitchen-open-plan.webp',
          alt: 'Open-plan kitchen with pendant lighting and dining area',
          width: 1920,
          height: 1080,
        },
        plan: {
          src: '/images/interiors/kitchen-open-plan-overlay.png',
          alt: 'Kitchen plan showing spatial arrangement',
          width: 1920,
          height: 1080,
        },
      },
      {
        id: 'master-bedroom',
        title: 'Master Bedroom',
        subtitle: 'A Private Retreat',
        image: {
          src: '/images/interiors/master-bedroom.webp',
          alt: 'Master bedroom with vaulted ceiling, full-height glazing and natural materials',
          width: 1920,
          height: 1080,
        },
        plan: {
          src: '/images/interiors/master-bedroom-overlay.png',
          alt: 'Master bedroom plan',
          width: 1920,
          height: 1080,
        },
      },
    ],
  },
  floorPlans: {
    id: 'floor-plans',
    eyebrow: '04 - Floor Plans',
    title: 'General Arrangement',
    description: 'Ground floor and first floor plans with room dimensions and layout.',
    tabs: [
      {
        label: 'Ground Floor',
        image: {
          src: '/images/plans/ground-floor-plan.svg',
          alt: 'Ground floor plan showing entrance hall, living room, kitchen, dining area, and utility spaces',
          width: 1200,
          height: 900,
        },
      },
      {
        label: 'First Floor',
        image: {
          src: '/images/plans/first-floor-plan.svg',
          alt: 'First floor plan showing master bedroom, secondary bedrooms, bathrooms, and landing',
          width: 1200,
          height: 900,
        },
      },
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
    exteriorImage: {
      src: '/images/exteriors/terrace-front-numbered.webp',
      alt: 'Front view of a terrace of four homes with unit numbers 1 through 4',
      width: 1500,
      height: 750,
    },
    cutawayImage: {
      src: '/images/exteriors/construction-cutaway.webp',
      alt: 'Cutaway view showing internal structural components of the timber panel construction',
      width: 1500,
      height: 750,
    },
    cutawayParagraphs: [
      'Off-site timber panel construction transforms the building process from traditional on-site construction to precision industrial assembly.',
      'The structural components of the house are manufactured as fully engineered timber panels in a controlled factory environment. Each panel integrates structural elements, insulation layers and technical components before arriving on site.',
      'The building process therefore becomes a rapid and highly precise assembly operation, ensuring consistent quality, reduced construction time and greater cost efficiency.',
    ],
    annotations: [
      { label: 'Ground Floor Slab', number: '01', anchorX: 2500, anchorY: 2230, color: '#9CA3AF' },
      { label: 'External Walls', number: '02', anchorX: 3250, anchorY: 2060, color: '#D4A843' },
      { label: 'Internal Walls', number: '03', anchorX: 2720, anchorY: 1890, color: '#D97706' },
      { label: 'Intermediate Floor', number: '04', anchorX: 3200, anchorY: 1685, color: '#C0C0C0' },
      { label: 'Roof', number: '05', anchorX: 3050, anchorY: 1000, color: '#7BA7CC' },
    ],
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
  panelPlans: {
    id: 'panel-plans',
    eyebrow: '06 - Panel Plans',
    title: 'General Arrangement',
    description:
      'Panel layout plans for ground floor and first floor — showing how off-site timber panels map to the building footprint.',
    tabs: [
      {
        label: 'Ground Floor',
        image: {
          src: '/images/plans/panel-plan-ground-floor.svg',
          alt: 'Ground floor panel plan showing the layout of prefabricated timber panels across the ground floor footprint',
          width: 1200,
          height: 900,
        },
      },
      {
        label: 'First Floor',
        image: {
          src: '/images/plans/panel-plan-first-floor.svg',
          alt: 'First floor panel plan showing the layout of prefabricated timber panels across the first floor footprint',
          width: 1200,
          height: 900,
        },
      },
    ],
  },
  assemblySequence: {
    id: 'assembly',
    eyebrow: '07 - Assembly Sequence',
    title: 'From Slab to Roof in Seven Steps',
    description:
      'A controlled, sequential assembly process. Each phase completes before the next begins.',
    placeholderLabel: 'Build sequence animation content',
    steps: [
      {
        name: 'Foundation Slab',
        description: 'Concrete slab poured and cured on prepared ground',
        image: {
          src: '/images/construction/assembly/step-1-ground-floor-slab.png',
          alt: 'Step 1: Ground floor slab foundation',
          width: 1080,
          height: 1080,
        },
      },
      {
        name: 'Ground Floor Panels',
        description: 'Pre-insulated floor cassettes positioned on slab',
        image: {
          src: '/images/construction/assembly/step-2-ground-floor-walls.png',
          alt: 'Step 2: Ground floor walls erected on slab',
          width: 1080,
          height: 1080,
        },
      },
      {
        name: 'External Wall Panels',
        description: 'Factory-assembled wall panels craned into position',
        image: {
          src: '/images/construction/assembly/step-3-first-floor.png',
          alt: 'Step 3: Intermediate floor cassette installed',
          width: 1080,
          height: 1080,
        },
      },
      {
        name: 'Internal Partitions',
        description: 'Non-structural internal walls and service zones fitted',
        image: {
          src: '/images/construction/assembly/step-4-first-floor-walls.png',
          alt: 'Step 4: First floor walls with internal partitions',
          width: 1080,
          height: 1080,
        },
      },
      {
        name: 'First Floor Cassette',
        description: 'Engineered joist floor panels installed between storeys',
        image: {
          src: '/images/construction/assembly/step-5-second-floor-int.png',
          alt: 'Step 5: Second floor slab added',
          width: 1080,
          height: 1080,
        },
      },
      {
        name: 'Upper Storey Walls',
        description: 'First-floor external and party wall panels erected',
        image: {
          src: '/images/construction/assembly/step-6-party-walls.png',
          alt: 'Step 6: Upper storey party walls erected',
          width: 1080,
          height: 1080,
        },
      },
      {
        name: 'Roof Cassette',
        description: 'Pre-assembled roof panels complete the weathertight envelope',
        image: {
          src: '/images/construction/assembly/step-7-roof.png',
          alt: 'Step 7: Roof cassette completes the build',
          width: 1080,
          height: 1080,
        },
      },
    ],
  },
  structuralFloorPlans: {
    id: 'structural-floor-plans',
    eyebrow: '08 - Structural Floor Plans',
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
    eyebrow: '09 - Component Details',
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
