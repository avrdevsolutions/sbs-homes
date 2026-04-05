import {
  AssemblySequenceSection,
  ComponentDetailsSection,
  ConstructionOverviewSection,
  ExteriorViewsSection,
  FloorPlansSection,
  HeroSection,
  IntroSection,
  InteriorLifestyleSection,
  StructuralFloorPlansSection,
  TechnologyDividerSection,
} from '@/components/features/landing-page'
import { landingPageContent } from '@/dictionaries/landing-page'

const HomePage = () => (
  <>
    <HeroSection content={landingPageContent.hero} />
    <IntroSection content={landingPageContent.intro} />
    <ExteriorViewsSection content={landingPageContent.exteriorViews} />
    <InteriorLifestyleSection content={landingPageContent.interiorLifestyle} />
    <FloorPlansSection content={landingPageContent.floorPlans} />
    <TechnologyDividerSection content={landingPageContent.technologyDivider} />
    <ConstructionOverviewSection content={landingPageContent.constructionOverview} />
    <AssemblySequenceSection content={landingPageContent.assemblySequence} />
    <StructuralFloorPlansSection content={landingPageContent.structuralFloorPlans} />
    <ComponentDetailsSection content={landingPageContent.componentDetails} />
  </>
)

export default HomePage
