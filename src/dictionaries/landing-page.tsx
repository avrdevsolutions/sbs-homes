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

export type SystemComponentAnnotation = {
  letter: string
  label: string
  /** X position as percentage (0–100) of cross-section image width */
  anchorX: number
  /** Y position as percentage (0–100) of cross-section image height */
  anchorY: number
  /** Which side the label appears on */
  side: 'left' | 'right'
}

export type SystemComponent = {
  id: string
  title: string
  subtitle: string
  buildUp: string
  uValue: string
  locationKeyImage: { src: string; alt: string }
  crossSectionImage: { src: string; alt: string }
  annotations: SystemComponentAnnotation[]
}

export type SystemComponentsSectionContent = {
  id: string
  eyebrow: string
  title: string
  description: string
  components: SystemComponent[]
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
  systemComponents: SystemComponentsSectionContent
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
  systemComponents: {
    id: 'system-components',
    eyebrow: '08 - System Components',
    title: 'Layer-by-Layer Build-Up',
    description:
      'Each component of the building envelope is precision-engineered. Explore the cross-section details of every structural element.',
    components: [
      {
        id: 'ground-floor-slab',
        title: '01 / Ground Floor Slab',
        subtitle: 'Ground Floor Slab',
        buildUp: 'Total build-up: 198 mm (concrete floor by other — i.e. not included)',
        uValue: 'U-Value: ?',
        locationKeyImage: {
          src: '/images/construction/ground-floor-slab/location-key.png',
          alt: 'House diagram highlighting ground floor slab location',
        },
        crossSectionImage: {
          src: '/images/construction/ground-floor-slab/cross-section.webp',
          alt: 'Cross-section of ground floor slab construction layers',
        },
        annotations: [
          {
            letter: 'A',
            label: 'Laminated flooring: 12 mm',
            anchorX: 50,
            anchorY: 15,
            side: 'right',
          },
          {
            letter: 'B',
            label: 'Laminated flooring underlay with vapour control layer: 3 mm',
            anchorX: 40,
            anchorY: 30,
            side: 'left',
          },
          { letter: 'C', label: 'OSB3 board: 18 mm', anchorX: 70, anchorY: 40, side: 'right' },
          {
            letter: 'D',
            label:
              'Timber framing structure of laminated timber (W:50 × H:160 mm) with 160 mm rockwool insulation inside the frame: 160 mm',
            anchorX: 47,
            anchorY: 63,
            side: 'left',
          },
          { letter: 'E', label: 'DPM: 5 mm', anchorX: 80, anchorY: 56, side: 'right' },
          {
            letter: 'F',
            label: 'Concrete floor or beam & block',
            anchorX: 53,
            anchorY: 78,
            side: 'right',
          },
        ],
      },
      {
        id: 'external-walls',
        title: '02 / External Walls',
        subtitle: 'External Walls',
        buildUp: 'Total build-up: 407.5 mm',
        uValue: 'U-Value: 0.12W/m2K',
        locationKeyImage: {
          src: '/images/construction/external-walls/location-key.png',
          alt: 'House diagram highlighting external wall locations',
        },
        crossSectionImage: {
          src: '/images/construction/external-walls/cross-section.webp',
          alt: 'Cross-section of external wall construction layers',
        },
        annotations: [
          {
            letter: 'C',
            label: 'Timber battens (W:45 mm x H:45 mm) / technical space for services: 45',
            anchorX: 35.5,
            anchorY: 42,
            side: 'left',
          },
          { letter: 'B', label: 'OSB3 board: 15 mm', anchorX: 50, anchorY: 57, side: 'left' },
          {
            letter: 'A',
            label: 'Internal plasterboard (fire rated or moisture if required): 12.5 mm',
            anchorX: 40,
            anchorY: 70,
            side: 'left',
          },
          {
            letter: 'I',
            label: 'Reinforced system plastering with silicone K render: 10 mm',
            anchorX: 52,
            anchorY: 9,
            side: 'left',
          },
          {
            letter: 'H',
            label: 'Double density mineral wool plaster base: 150 mm',
            anchorX: 55,
            anchorY: 22,
            side: 'left',
          },
          { letter: 'G', label: 'Breathable membrane', anchorX: 78, anchorY: 40, side: 'right' },
          { letter: 'F', label: 'OSB3 board: 15 mm', anchorX: 73, anchorY: 56, side: 'right' },
          {
            letter: 'E',
            label:
              'Timber frame structure of laminated timber (W:80 × D:160 mm) with 2 layers of 80 mm rockwool insulation inside the frame: 160 mm',
            anchorX: 68,
            anchorY: 68,
            side: 'right',
          },
          { letter: 'D', label: 'Vapour control layer', anchorX: 58, anchorY: 80, side: 'left' },
        ],
      },
      {
        id: 'internal-walls',
        title: '03 / Internal Walls',
        subtitle: 'Internal Walls',
        buildUp: 'Total build-up: 155 mm',
        uValue: 'U-Value: NA',
        locationKeyImage: {
          src: '/images/construction/internal-walls/location-key.png',
          alt: 'House diagram highlighting internal wall locations',
        },
        crossSectionImage: {
          src: '/images/construction/internal-walls/cross-section.webp',
          alt: 'Cross-section of internal wall construction layers',
        },
        annotations: [
          { letter: 'B', label: 'OSB3 board: 15 mm', anchorX: 38, anchorY: 32, side: 'left' },
          {
            letter: 'A',
            label: 'Internal plasterboard (fire rated or moisture if required): 12.5 mm',
            anchorX: 45,
            anchorY: 58,
            side: 'left',
          },
          {
            letter: 'E',
            label: 'Internal plasterboard (fire rated or moisture if required): 12.5 mm',
            anchorX: 65,
            anchorY: 18,
            side: 'right',
          },
          { letter: 'D', label: 'OSB3 board: 15 mm', anchorX: 81, anchorY: 50, side: 'right' },
          {
            letter: 'C',
            label:
              'Timber frame structure (W:80 × D:100 mm) with 100 mm rockwool insulation inside the frame: 100 mm',
            anchorX: 75,
            anchorY: 70,
            side: 'right',
          },
        ],
      },
      {
        id: 'party-walls',
        title: '04 / Internal Walls (Party Walls)',
        subtitle: 'Party Walls',
        buildUp: 'Total build-up: 240 mm',
        uValue: 'U-Value: NA',
        locationKeyImage: {
          src: '/images/construction/party-walls/location-key.png',
          alt: 'House diagram highlighting party wall locations',
        },
        crossSectionImage: {
          src: '/images/construction/party-walls/cross-section.png',
          alt: 'Cross-section of party wall construction layers',
        },
        annotations: [
          { letter: 'B', label: 'OSB3 board: 15 mm', anchorX: 39, anchorY: 36, side: 'left' },
          {
            letter: 'A',
            label: '2 layers of 12.5 mm fire rated plasterboard: 25 mm',
            anchorX: 45,
            anchorY: 65,
            side: 'left',
          },
          {
            letter: 'E',
            label: '2 layers of 12.5 mm fire rated plasterboard: 25 mm',
            anchorX: 70,
            anchorY: 18,
            side: 'right',
          },
          { letter: 'D', label: 'OSB3 board: 15 mm', anchorX: 79, anchorY: 50, side: 'right' },
          {
            letter: 'C',
            label:
              'Timber frame structure (W:80 × D:160 mm) with 160 mm rockwool insulation inside the frame: 160 mm',
            anchorX: 73,
            anchorY: 80,
            side: 'right',
          },
        ],
      },
      {
        id: 'intermediate-floor',
        title: '05 / Intermediate Floor',
        subtitle: 'Intermediate Floor',
        buildUp: 'Total build-up: 290.5 mm',
        uValue: 'U-Value: NA',
        locationKeyImage: {
          src: '/images/construction/intermediate-floor/location-key.png',
          alt: 'House diagram highlighting intermediate floor location',
        },
        crossSectionImage: {
          src: '/images/construction/intermediate-floor/cross-section.webp',
          alt: 'Cross-section of intermediate floor construction layers',
        },
        annotations: [
          {
            letter: 'A',
            label: 'Laminated flooring: 12 mm',
            anchorX: 50,
            anchorY: 20,
            side: 'right',
          },
          {
            letter: 'B',
            label: 'Laminated flooring underlay: 3 mm',
            anchorX: 38,
            anchorY: 28,
            side: 'left',
          },
          { letter: 'C', label: 'OSB3 board: 18 mm', anchorX: 66, anchorY: 30, side: 'right' },
          {
            letter: 'D',
            label:
              'Timber framing structure of laminated timber (W:100 × H:200 mm) with 100 mm rockwool insulation inside the frame: 200 mm',
            anchorX: 75,
            anchorY: 40,
            side: 'right',
          },
          { letter: 'E', label: 'Vapour control layer', anchorX: 44, anchorY: 66, side: 'left' },
          {
            letter: 'F',
            label: 'Timber battens (W:45 mm x H:45 mm) / technical space for services: 45',
            anchorX: 58,
            anchorY: 73,
            side: 'right',
          },
          {
            letter: 'G',
            label: 'Internal plasterboard (fire rated or moisture if required): 12.5 mm',
            anchorX: 49,
            anchorY: 81,
            side: 'left',
          },
        ],
      },
      {
        id: 'roof',
        title: '06 / Roof',
        subtitle: 'Roof',
        buildUp: 'Total build-up: 450.5 mm (roof tiles by other — i.e. not included)',
        uValue: 'U-Value: 0.113W/m2K',
        locationKeyImage: {
          src: '/images/construction/roof/location-key.png',
          alt: 'House diagram highlighting roof location',
        },
        crossSectionImage: {
          src: '/images/construction/roof/cross-section.webp',
          alt: 'Cross-section of roof construction layers',
        },
        annotations: [
          { letter: 'A', label: 'Roof tiles (by others)', anchorX: 45, anchorY: 6, side: 'right' },
          {
            letter: 'B',
            label: 'Timber battens (W:50 mm x H:30 mm): 30 mm',
            anchorX: 63.5,
            anchorY: 13,
            side: 'right',
          },
          {
            letter: 'C',
            label: 'Timber battens (W:45 mm x H:45 mm): 45 mm',
            anchorX: 61,
            anchorY: 22,
            side: 'right',
          },
          { letter: 'D', label: 'Breathable membrane', anchorX: 26, anchorY: 30, side: 'left' },
          { letter: 'E', label: 'OSB3 board: 18 mm', anchorX: 32, anchorY: 38, side: 'left' },
          {
            letter: 'G',
            label:
              'Timber battens (W:45 mm x H:100 mm) attached along the rafter with 100 mm rockwool insulation between battens: 100 mm',
            anchorX: 84,
            anchorY: 33,
            side: 'right',
          },
          {
            letter: 'F',
            label:
              'Laminated timber rafter (W:80 × H:200 mm) with 2 layers of 100 mm rockwool insulation between rafters: 200 mm',
            anchorX: 17.5,
            anchorY: 46,
            side: 'left',
          },
          { letter: 'H', label: 'Vapour control layer', anchorX: 70, anchorY: 55, side: 'right' },
          {
            letter: 'I',
            label: 'Timber battens (W:45 mm x H:45 mm) / technical space for services: 45 mm',
            anchorX: 11,
            anchorY: 63,
            side: 'left',
          },
          {
            letter: 'L',
            label: 'Internal plasterboard (fire rated or moisture if required): 12.5 mm',
            anchorX: 40,
            anchorY: 83,
            side: 'left',
          },
        ],
      },
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
