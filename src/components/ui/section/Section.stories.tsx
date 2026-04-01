import { Section } from './Section'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Section> = {
  title: 'UI/Section',
  component: Section,
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'compact', 'standard', 'hero'],
    },
    background: {
      control: 'select',
      options: ['default', 'alt', 'primary', 'inverse'],
    },
    containerSize: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    containerPadding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'wide'],
    },
    fullBleed: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Section>

const placeholder = (
  <div className='rounded border border-dashed border-primary-300 bg-white/10 p-6 text-center text-sm'>
    Section content area
  </div>
)

export const Default: Story = {
  args: { children: placeholder },
}

export const Compact: Story = {
  args: { spacing: 'compact', children: placeholder },
}

export const Standard: Story = {
  args: { spacing: 'standard', children: placeholder },
}

export const Hero: Story = {
  args: { spacing: 'hero', children: placeholder },
}

export const BackgroundAlt: Story = {
  args: { background: 'alt', children: placeholder },
}

export const BackgroundPrimary: Story = {
  args: { background: 'primary', children: placeholder },
}

export const BackgroundInverse: Story = {
  args: { background: 'inverse', children: placeholder },
}

export const FullBleed: Story = {
  args: {
    fullBleed: true,
    children: (
      <div className='bg-primary-100 p-8 text-center text-sm'>
        Full-bleed content — no Container wrapper
      </div>
    ),
  },
}

export const AllSpacings: Story = {
  render: () => (
    <div className='flex flex-col'>
      {(['none', 'compact', 'standard', 'hero'] as const).map((spacing) => (
        <Section key={spacing} spacing={spacing} background='alt'>
          <div className='rounded border border-dashed border-primary-300 p-4 text-center text-sm'>
            spacing=&quot;{spacing}&quot;
          </div>
        </Section>
      ))}
    </div>
  ),
}

export const AllBackgrounds: Story = {
  render: () => (
    <div className='flex flex-col'>
      {(['default', 'alt', 'primary', 'inverse'] as const).map((bg) => (
        <Section key={bg} spacing='compact' background={bg}>
          <div className='border-current/30 rounded border border-dashed p-4 text-center text-sm'>
            background=&quot;{bg}&quot;
          </div>
        </Section>
      ))}
    </div>
  ),
}

export const NativeProps: Story = {
  args: {
    id: 'hero-section',
    'aria-label': 'Hero section',
    children: placeholder,
  },
}
