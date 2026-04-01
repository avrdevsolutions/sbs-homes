import { Separator } from './Separator'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    thickness: {
      control: 'select',
      options: ['thin', 'medium', 'thick'],
    },
    variant: {
      control: 'select',
      options: ['default', 'muted', 'primary', 'inverse'],
    },
    decorative: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  decorators: [
    (Story) => (
      <div className='flex flex-col gap-4'>
        <p className='text-sm'>Content above</p>
        <Story />
        <p className='text-sm'>Content below</p>
      </div>
    ),
  ],
}

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  decorators: [
    (Story) => (
      <div className='flex h-8 items-center gap-4'>
        <span className='text-sm'>Left</span>
        <Story />
        <span className='text-sm'>Right</span>
      </div>
    ),
  ],
}

export const Thin: Story = {
  args: { thickness: 'thin' },
}

export const Medium: Story = {
  args: { thickness: 'medium' },
}

export const Thick: Story = {
  args: { thickness: 'thick' },
}

export const VariantDefault: Story = {
  name: 'Variant: Default',
  args: { variant: 'default' },
}

export const VariantMuted: Story = {
  name: 'Variant: Muted',
  args: { variant: 'muted' },
}

export const VariantPrimary: Story = {
  name: 'Variant: Primary',
  args: { variant: 'primary' },
}

export const VariantInverse: Story = {
  name: 'Variant: Inverse',
  args: { variant: 'inverse' },
  decorators: [
    (Story) => (
      <div className='rounded bg-primary-900 p-6'>
        <Story />
      </div>
    ),
  ],
}

export const ThickPrimaryAccent: Story = {
  name: 'Thick Primary Accent',
  args: { thickness: 'thick', variant: 'primary' },
  decorators: [
    (Story) => (
      <div className='flex flex-col gap-4'>
        <p className='text-sm'>Decorative accent separator</p>
        <Story />
        <p className='text-sm'>Content below</p>
      </div>
    ),
  ],
}

export const Decorative: Story = {
  args: { orientation: 'horizontal', decorative: true },
  decorators: [
    (Story) => (
      <div className='flex flex-col gap-4'>
        <p className='text-sm'>Decorative separator (role=&quot;none&quot;)</p>
        <Story />
        <p className='text-sm'>No semantic meaning</p>
      </div>
    ),
  ],
}

export const Semantic: Story = {
  args: { orientation: 'horizontal', decorative: false },
  decorators: [
    (Story) => (
      <div className='flex flex-col gap-4'>
        <p className='text-sm'>Semantic separator (role=&quot;separator&quot;)</p>
        <Story />
        <p className='text-sm'>Meaningful content boundary</p>
      </div>
    ),
  ],
}

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <div>
        <p className='mb-2 text-xs font-semibold uppercase tracking-wider'>Thickness</p>
        <div className='flex flex-col gap-3'>
          <Separator thickness='thin' />
          <Separator thickness='medium' />
          <Separator thickness='thick' />
        </div>
      </div>
      <div>
        <p className='mb-2 text-xs font-semibold uppercase tracking-wider'>Color Variants</p>
        <div className='flex flex-col gap-3'>
          <Separator variant='default' />
          <Separator variant='muted' />
          <Separator variant='primary' />
          <div className='rounded bg-primary-900 p-3'>
            <Separator variant='inverse' />
          </div>
        </div>
      </div>
      <div>
        <p className='mb-2 text-xs font-semibold uppercase tracking-wider'>Vertical Orientations</p>
        <div className='flex h-12 items-center gap-4'>
          <span className='text-sm'>A</span>
          <Separator orientation='vertical' />
          <span className='text-sm'>B</span>
          <Separator orientation='vertical' thickness='medium' variant='primary' />
          <span className='text-sm'>C</span>
          <Separator orientation='vertical' thickness='thick' variant='primary' />
          <span className='text-sm'>D</span>
        </div>
      </div>
    </div>
  ),
}
