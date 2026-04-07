import { Stack, Typography } from '@/components/ui'

type ImageBounds = {
  top: number
  left: number
  width: number
  height: number
}

type SlideAnnotationProps = {
  letter: string
  label: string
  /** X position as percentage (0–100) of the cross-section image width */
  anchorX: number
  /** Y position as percentage (0–100) of the cross-section image height */
  anchorY: number
  side: 'left' | 'right'
  /** Measured image bounds within the container (pixels) */
  imageBounds: ImageBounds
}

export const SlideAnnotation = ({
  letter,
  label,
  anchorX,
  anchorY,
  side,
  imageBounds,
}: SlideAnnotationProps) => {
  const isRight = side === 'right'

  /* Compute pixel position of anchor within the overlay (which is the full container with padding) */
  const anchorPxX = imageBounds.left + (anchorX / 100) * imageBounds.width
  const anchorPxY = imageBounds.top + (anchorY / 100) * imageBounds.height

  return (
    <div
      data-sc-annotation
      className='absolute flex items-start opacity-0'
      style={{
        top: anchorPxY,
        ...(isRight
          ? { left: anchorPxX, right: 0, flexDirection: 'row' as const }
          : {
              left: 0,
              right: `calc(100% - ${anchorPxX}px)`,
              flexDirection: 'row-reverse' as const,
            }),
        textAlign: isRight ? 'left' : 'right',
        clipPath: isRight ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)',
      }}
    >
      {/* Arrowhead at anchor — points back toward the image */}
      <svg
        width='6'
        height='8'
        viewBox='0 0 6 8'
        fill='none'
        className='shrink-0'
        style={{ marginTop: 6, transform: isRight ? 'rotate(180deg)' : 'none' }}
        aria-hidden='true'
      >
        <path d='M0 0L6 4L0 8V0Z' fill='currentColor' className='text-primary-600' />
      </svg>

      {/* Line */}
      <div className='mx-1 min-w-0 flex-1 bg-primary-600' style={{ height: 1, marginTop: 9 }} />

      {/* Label text at the far edge */}
      <Stack
        style={{
          flexDirection: isRight ? 'row' : 'row-reverse',
        }}
        gap='1'
        direction='row'
        align='start'
        className='shrink-0'
      >
        <Typography
          variant='body'
          className='shrink-0 font-semibold uppercase tracking-widest text-primary-600'
          style={{ fontSize: '0.7rem', maxWidth: '40ch' }}
        >
          {isRight ? `${letter})` : `(${letter}`}
        </Typography>
        <Typography
          variant='body'
          className='shrink-0 text-white'
          style={{ fontSize: '0.7rem', maxWidth: '30ch' }}
        >
          {label}
        </Typography>
      </Stack>
    </div>
  )
}
