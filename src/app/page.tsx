import {
  ComponentDetailsSection,
  SystemComponentsSection,
} from '@/components/features/landing-page'
import { landingPageContent } from '@/dictionaries/landing-page'

const HomePage = () => (
  <>
    {/*<HeroSection content={landingPageContent.hero} />*/}
    {/*<IntroSection content={landingPageContent.intro} />*/}
    {/*<ExteriorViewsSection content={landingPageContent.exteriorViews} />*/}
    {/*<InteriorLifestyleSection content={landingPageContent.interiorLifestyle} />*/}
    {/*<FloorPlansSection content={landingPageContent.floorPlans} />*/}
    {/*<TechnologyDividerSection content={landingPageContent.technologyDivider} />*/}
    {/*<ConstructionOverviewSection content={landingPageContent.constructionOverview} />*/}
    {/*<FloorPlansSection*/}
    {/*  content={landingPageContent.panelPlans}*/}
    {/*  background='default'*/}
    {/*  className='bg-white'*/}
    {/*/>*/}
    {/*<AssemblySequenceSection content={landingPageContent.assemblySequence} />*/}
    <SystemComponentsSection content={landingPageContent.systemComponents} />
    <ComponentDetailsSection content={landingPageContent.componentDetails} />
  </>
)

export default HomePage
