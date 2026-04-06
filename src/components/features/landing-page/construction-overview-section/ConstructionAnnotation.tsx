import { Typography } from '@/components/ui'

type ConstructionAnnotationProps = {
  label: string
  number: string
}

export const ConstructionAnnotation = ({ label, number }: ConstructionAnnotationProps) => (
  <div
    data-gsap='annotation'
    className='flex items-center gap-4 opacity-0'
    style={{ clipPath: 'inset(0 100% 0 0)' }}
  >
    <div className='bg-annotation h-px w-16 sm:w-24' />
    <Typography variant='overline' className='whitespace-nowrap text-foreground/70'>
      {number} / {label.toUpperCase()}
    </Typography>
  </div>
)
