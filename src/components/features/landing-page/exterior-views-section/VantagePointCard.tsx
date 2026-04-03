import Image from 'next/image'

import { Stack, Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

type VantagePointCardProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  total: number
}

export const VantagePointCard = ({ vantagePoint, index, total }: VantagePointCardProps) => (
  <article className='overflow-hidden rounded-lg bg-background'>
    <div className='relative aspect-video w-full'>
      <Image
        src={vantagePoint.image.src}
        alt={vantagePoint.image.alt}
        width={vantagePoint.image.width}
        height={vantagePoint.image.height}
        sizes='(max-width: 768px) 100vw, 80vw'
        loading='lazy'
        className='size-full object-cover'
      />
    </div>
    <div className='flex items-start gap-6 p-6'>
      <div className='relative shrink-0' style={{ width: '15%', minWidth: 60, maxWidth: 100 }}>
        <Image
          src={vantagePoint.sitePlan.src}
          alt={vantagePoint.sitePlan.alt}
          width={vantagePoint.sitePlan.width}
          height={vantagePoint.sitePlan.height}
          loading='lazy'
          className='w-full opacity-60'
        />
      </div>
      <Stack gap='2' className='flex-1'>
        <Typography variant='overline' className='text-primary-600'>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Typography>
        <Typography variant='h3' as='h3'>
          {vantagePoint.title}
        </Typography>
        <Typography variant='body-sm' className='text-foreground' style={{ opacity: 0.6 }}>
          {vantagePoint.description}
        </Typography>
      </Stack>
    </div>
  </article>
)
