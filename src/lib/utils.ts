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
            'h1-sm',
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
            'caption',
            'specimen',
            'micro',
            'detail',
            'button',
          ],
        },
      ],
    },
  },
})

export const cn = (...inputs: ClassValue[]): string => {
  return customTwMerge(clsx(inputs))
}
