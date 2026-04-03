import type { LinkItem } from '@/dictionaries/common'

type NavLink = LinkItem & {
  number: string
  ariaLabel: string
  active?: boolean
}

type NavGroup = {
  label: string
  links: NavLink[]
}

export type NavSpineContent = {
  ariaLabel: string
  wordmark: {
    label: string
    href: string
    ariaLabel: string
  }
  groups: NavGroup[]
  contactEmail: string
}

export type FooterContent = {
  title: string
  description: string
  contact: {
    nameLabel: string
    name: string
    phoneLabel: string
    phone: string
    emailLabel: string
    email: LinkItem
    webLabel: string
    web: LinkItem
  }
  bottom: {
    copyright: string
    brand: string
  }
}

export const navSpineContent: NavSpineContent = {
  ariaLabel: 'Section navigation',
  wordmark: {
    label: 'SBS Homes',
    href: '#',
    ariaLabel: 'SBS Homes - back to top',
  },
  groups: [
    {
      label: 'Act I - The Homes',
      links: [
        {
          number: '01',
          label: 'The Homes',
          href: '#the-homes',
          ariaLabel: 'Hero - section 01',
          active: true,
        },
        {
          number: '02',
          label: 'Exteriors',
          href: '#exterior-views',
          ariaLabel: 'Exterior Views - section 02',
        },
        {
          number: '03',
          label: 'Interiors',
          href: '#interior',
          ariaLabel: 'Interior Lifestyle - section 03',
        },
        {
          number: '04',
          label: 'Plans',
          href: '#floor-plans',
          ariaLabel: 'Floor Plans - section 04',
        },
      ],
    },
    {
      label: 'Act II - The Technology',
      links: [
        {
          number: '05',
          label: 'Technology',
          href: '#the-technology',
          ariaLabel: 'The Technology - section 05',
        },
        {
          number: '06',
          label: 'Construction',
          href: '#construction',
          ariaLabel: 'Construction - section 06',
        },
        {
          number: '07',
          label: 'Assembly',
          href: '#assembly',
          ariaLabel: 'Assembly - section 07',
        },
      ],
    },
    {
      label: 'Act III - The Components',
      links: [
        {
          number: '08',
          label: 'Components',
          href: '#the-components',
          ariaLabel: 'Components - section 08',
        },
      ],
    },
  ],
  contactEmail: 'enquiries@sbs-homes.co.uk',
}

export const footerContent: FooterContent = {
  title: 'Get in Touch',
  description:
    "Interested in learning more about SBS Homes? Contact Adrian Farcut directly - we're happy to discuss your project.",
  contact: {
    nameLabel: 'Contact',
    name: 'Adrian Farcut',
    phoneLabel: 'Phone',
    phone: '+44 (0)792 7714 786',
    emailLabel: 'Email',
    email: {
      label: 'enquiries@sbs-homes.co.uk',
      href: 'mailto:enquiries@sbs-homes.co.uk',
    },
    webLabel: 'Web',
    web: {
      label: 'www.sbs-homes.co.uk',
      href: 'https://www.sbs-homes.co.uk',
    },
  },
  bottom: {
    copyright: '© 2026 SBS Homes. All rights reserved.',
    brand: 'SBS Homes',
  },
}
