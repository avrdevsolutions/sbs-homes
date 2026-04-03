import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-sm',
            'display-md',
            'display-lg',
            'display-xl',
            'h1-sm',
            'h1-md',
            'h1-lg',
            'h2-sm',
            'h2-md',
            'h2-lg',
            'h3-sm',
            'h3-md',
            'h3-lg',
            'h4-sm',
            'h4-lg',
            'body-base',
            'body-sm',
            'eyebrow',
            'caption',
            'specimen',
            'micro',
            'detail',
            'button',
            'section-number-sm',
            'section-number-md',
            'section-number-lg',
            'section-number-xl',
          ],
        },
      ],
    },
  },
})

export const cn = (...inputs: ClassValue[]): string => {
  return customTwMerge(clsx(inputs))
}
