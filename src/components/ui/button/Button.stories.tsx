import { Button } from './Button'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon', 'inline'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary Button' },
}

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline Button' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost Button' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Danger Button' },
}

export const Link: Story = {
  args: { variant: 'link', children: 'Link Button' },
}

export const Loading: Story = {
  args: { variant: 'primary', children: 'Saving...', loading: true },
}

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Disabled', disabled: true },
}

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button variant='primary'>Primary</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='danger'>Danger</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Button size='sm'>Small</Button>
      <Button size='md'>Medium</Button>
      <Button size='lg'>Large</Button>
      <Button size='icon' aria-label='Icon button'>
        ★
      </Button>
      <Button variant='link' size='inline'>
        Inline CTA
      </Button>
    </div>
  ),
}

export const InlineCTA: Story = {
  name: 'Inline CTA',
  render: () => (
    <div className='flex flex-col gap-4'>
      <p className='text-sm'>
        Text-only CTA with no box model — pairs with <code>variant=&quot;link&quot;</code> or{' '}
        <code>variant=&quot;ghost&quot;</code>:
      </p>
      <div className='flex items-baseline gap-6'>
        <Button variant='link' size='inline'>
          Explore Collection →
        </Button>
        <Button variant='ghost' size='inline'>
          View Details
        </Button>
      </div>
    </div>
  ),
}
