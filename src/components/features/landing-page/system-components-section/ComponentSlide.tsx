'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'

import Image from 'next/image'

import { Typography } from '@/components/ui'
import type { SystemComponent } from '@/dictionaries/landing-page'

import { SlideAnnotation } from './SlideAnnotation'

type ImageBounds = {
  top: number
  left: number
  width: number
  height: number
}

/** Compute the rendered rect of an object-contain image relative to its container */
const getContainedBounds = (img: HTMLImageElement, container: HTMLElement): ImageBounds | null => {
  const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img
  if (!naturalWidth || !naturalHeight || !clientWidth || !clientHeight) return null

  const imgRatio = naturalWidth / naturalHeight
  const containerRatio = clientWidth / clientHeight

  let renderW: number
  let renderH: number

  if (imgRatio > containerRatio) {
    renderW = clientWidth
    renderH = clientWidth / imgRatio
  } else {
    renderH = clientHeight
    renderW = clientHeight * imgRatio
  }

  const imgOffsetX = (clientWidth - renderW) / 2
  const imgOffsetY = (clientHeight - renderH) / 2

  const containerRect = container.getBoundingClientRect()
  const imgRect = img.getBoundingClientRect()

  return {
    left: imgRect.left - containerRect.left + imgOffsetX,
    top: imgRect.top - containerRect.top + imgOffsetY,
    width: renderW,
    height: renderH,
  }
}

type ComponentSlideProps = {
  component: SystemComponent
  index: number
}

export const ComponentSlide = memo(({ component, index }: ComponentSlideProps) => {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState<ImageBounds | null>(null)

  const measure = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return
    setBounds(getContainedBounds(imgRef.current, containerRef.current))
  }, [])

  useEffect(() => {
    measure()

    const observer = new ResizeObserver(measure)
    const container = containerRef.current
    if (container) observer.observe(container)

    return () => observer.disconnect()
  }, [measure])

  return (
    <div
      className='flex size-full shrink-0 overflow-hidden'
      data-sc-slide={index}
      aria-roledescription='slide'
      aria-label={`${index + 1} of 6: ${component.subtitle}`}
      role='group'
    >
      {/* Left — card info */}
      <div className='hidden w-1/4 shrink-0 md:flex'>
        <div className='relative flex flex-col border-l border-primary-600/40 pl-12 pt-2'>
          {/* Watermark number */}
          <span
            className='pointer-events-none absolute select-none font-bold leading-none text-white/[0.03]'
            style={{ fontSize: '8rem', top: '0rem', left: '.2rem' }}
            aria-hidden='true'
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          <Typography as='h3' variant='h3' className='relative mb-3 mt-20 text-white'>
            {component.subtitle}
          </Typography>
          <Typography
            variant='overline'
            className='mb-2 text-primary-600'
            style={{ fontSize: '0.8rem' }}
          >
            Typical detail
          </Typography>
          <Typography variant='body-sm' className='text-white/60' style={{ maxWidth: '28ch' }}>
            {component.buildUp}
          </Typography>
          <Typography variant='body-sm' className='text-white/60'>
            {component.uValue}
          </Typography>
        </div>
      </div>

      {/* Right — cross-section image */}
      <div ref={containerRef} className='relative min-h-0 flex-1'>
        <Image
          ref={imgRef}
          src={component.crossSectionImage.src}
          alt={component.crossSectionImage.alt}
          width={1200}
          height={900}
          className='relative z-10 size-full object-contain'
          sizes='(max-width: 768px) 100vw, 70vw'
          onLoad={measure}
        />
        {/* Annotation overlay — full container, anchors computed from image bounds */}
        {bounds ? (
          <div
            className='pointer-events-none absolute inset-0 z-20 hidden lg:block'
            aria-hidden='true'
          >
            {component.annotations.map((annotation) => (
              <SlideAnnotation
                key={`${component.id}-${annotation.letter}`}
                letter={annotation.letter}
                label={annotation.label}
                anchorX={annotation.anchorX}
                anchorY={annotation.anchorY}
                side={annotation.side}
                imageBounds={bounds}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
})

ComponentSlide.displayName = 'ComponentSlide'
