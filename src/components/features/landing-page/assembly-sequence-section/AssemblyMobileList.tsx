import Image from 'next/image'

import { Stack, Typography } from '@/components/ui'
import type { AssemblyStep } from '@/dictionaries/landing-page'

type AssemblyMobileListProps = {
  steps: AssemblyStep[]
}

export const AssemblyMobileList = ({ steps }: AssemblyMobileListProps) => (
  <Stack gap='8'>
    {steps.map((step, index) => (
      <div
        key={step.name}
        className='overflow-hidden rounded-lg'
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <div className='relative aspect-square bg-surface-darker'>
          <Image
            src={step.image.src}
            alt={step.image.alt}
            width={step.image.width}
            height={step.image.height}
            className='size-full object-contain'
          />
        </div>
        <div className='p-5'>
          <Typography variant='overline' className='mb-1 text-primary-600'>
            {String(index + 1).padStart(2, '0')}
          </Typography>
          <Typography variant='h4' as='h3' className='mb-1 text-white'>
            {step.name}
          </Typography>
          <Typography variant='body-sm' className='text-white' style={{ opacity: 0.5 }}>
            {step.description}
          </Typography>
        </div>
      </div>
    ))}
  </Stack>
)
