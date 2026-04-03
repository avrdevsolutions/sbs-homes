import { Section } from './Section'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Section> = {
  title: 'UI/Section',
  component: Section,
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'compact', 'standard', 'spacious', 'hero'],
    },
    background: {
      control: 'select',
      options: ['default', 'warm', 'warm-alt', 'dark', 'dark-deeper'],
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

export const Spacious: Story = {
  args: { spacing: 'spacious', children: placeholder },
}

export const Hero: Story = {
  args: { spacing: 'hero', children: placeholder },
}

export const BackgroundWarm: Story = {
  args: { background: 'warm', children: placeholder },
}

export const BackgroundWarmAlt: Story = {
  args: { background: 'warm-alt', children: placeholder },
}

export const BackgroundDark: Story = {
  args: { background: 'dark', children: placeholder },
}

export const BackgroundDarkDeeper: Story = {
  args: { background: 'dark-deeper', children: placeholder },
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
      {(['none', 'compact', 'standard', 'spacious', 'hero'] as const).map((spacing) => (
        <Section key={spacing} spacing={spacing} background='warm'>
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
      {(['default', 'warm', 'warm-alt', 'dark', 'dark-deeper'] as const).map((bg) => (
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

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col'>
      {(['compact', 'standard', 'spacious'] as const).map((spacing) => (
        <Section key={spacing} spacing={spacing} background='warm'>
          <div className='rounded border border-dashed border-primary-300 p-4 text-center text-sm'>
            spacing=&quot;{spacing}&quot; / background=&quot;warm&quot;
          </div>
        </Section>
      ))}
      <Section spacing='compact' background='dark'>
        <div className='rounded border border-dashed border-white/40 p-4 text-center text-sm'>
          spacing=&quot;compact&quot; / background=&quot;dark&quot;
        </div>
      </Section>
    </div>
  ),
}
