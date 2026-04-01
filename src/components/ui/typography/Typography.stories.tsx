import { Typography } from './Typography'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Typography> = {
  title: 'UI/Typography',
  component: Typography,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'body', 'body-sm', 'caption', 'overline'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Typography>

export const Heading1: Story = {
  args: { variant: 'h1', children: 'Heading 1' },
}

export const Heading2: Story = {
  args: { variant: 'h2', children: 'Heading 2' },
}

export const Heading3: Story = {
  args: { variant: 'h3', children: 'Heading 3' },
}

export const Heading4: Story = {
  args: { variant: 'h4', children: 'Heading 4' },
}

export const Body: Story = {
  args: {
    variant: 'body',
    children:
      'Body text with a relaxed line height for comfortable reading. This is the default variant used for paragraphs and general content.',
  },
}

export const BodySmall: Story = {
  args: {
    variant: 'body-sm',
    children: 'Smaller body text for secondary information or compact layouts.',
  },
}

export const Caption: Story = {
  args: { variant: 'caption', children: 'Caption text for labels and metadata' },
}

export const Overline: Story = {
  args: { variant: 'overline', children: 'Overline text' },
}

export const SemanticOverride: Story = {
  name: 'Semantic Override (as prop)',
  args: { variant: 'h1', as: 'h2', children: 'Looks like h1, renders as h2' },
}

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <Typography variant='h1'>Heading 1</Typography>
      <Typography variant='h2'>Heading 2</Typography>
      <Typography variant='h3'>Heading 3</Typography>
      <Typography variant='h4'>Heading 4</Typography>
      <Typography variant='body'>
        Body text — comfortable reading size for paragraphs and general content.
      </Typography>
      <Typography variant='body-sm'>
        Body Small — secondary information or compact layouts.
      </Typography>
      <Typography variant='caption'>Caption — labels and metadata</Typography>
      <Typography variant='overline'>Overline — section labels</Typography>
    </div>
  ),
}

export const OnDarkBackground: Story = {
  name: 'On Dark Background',
  render: () => (
    <div className='rounded-lg bg-primary-900 p-8 text-white'>
      <div className='flex flex-col gap-4'>
        <Typography variant='h1'>Heading on Dark</Typography>
        <Typography variant='h2'>Subheading on Dark</Typography>
        <Typography variant='body'>
          Body text inherits white from the section — no className override needed.
        </Typography>
        <Typography variant='body-sm'>
          Smaller body text also inherits the section color context.
        </Typography>
        <Typography variant='caption'>Caption inherits too — no baked-in color</Typography>
        <Typography variant='overline'>Overline — clean inheritance</Typography>
        <Typography variant='caption' className='text-white/60'>
          Muted caption — explicit className for reduced opacity
        </Typography>
      </div>
    </div>
  ),
}

export const OnImageOverlay: Story = {
  name: 'On Image Overlay',
  render: () => (
    <div className='relative overflow-hidden rounded-lg text-white'>
      <div className='absolute inset-0 bg-gradient-to-b from-primary-900/80 to-primary-950/95' />
      <div className='relative z-10 flex flex-col gap-4 p-8'>
        <Typography variant='overline'>Gallery</Typography>
        <Typography variant='h1'>Hero Over Image</Typography>
        <Typography variant='body'>
          All text inherits white from the section wrapper. Typography has no baked-in color, so it
          works on any background.
        </Typography>
        <Typography variant='body' className='text-white/70'>
          Muted body text — explicit className for reduced opacity on overlay.
        </Typography>
      </div>
    </div>
  ),
}

export const OnColoredBackground: Story = {
  name: 'On Colored Background',
  render: () => (
    <div className='rounded-lg bg-primary-600 p-8 text-white'>
      <div className='flex flex-col gap-3'>
        <Typography variant='overline'>Announcement</Typography>
        <Typography variant='h3'>Brand-Colored Section</Typography>
        <Typography variant='body'>Typography inherits color from the section context.</Typography>
      </div>
    </div>
  ),
}
