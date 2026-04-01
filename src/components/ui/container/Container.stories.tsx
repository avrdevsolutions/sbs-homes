import { Container } from './Container'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Container> = {
  title: 'UI/Container',
  component: Container,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'wide'],
    },
  },
  decorators: [
    (Story) => (
      <div className='bg-primary-50'>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Container>

const placeholder = (
  <div className='rounded border border-dashed border-primary-300 bg-white p-4 text-center text-sm'>
    Content area
  </div>
)

export const Small: Story = {
  args: { size: 'sm', children: placeholder },
}

export const Medium: Story = {
  args: { size: 'md', children: placeholder },
}

export const Large: Story = {
  args: { size: 'lg', children: placeholder },
}

export const ExtraLarge: Story = {
  args: { size: 'xl', children: placeholder },
}

export const Full: Story = {
  args: { size: 'full', children: placeholder },
}

export const AllSizes: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
        <Container key={size} size={size}>
          <div className='rounded border border-dashed border-primary-300 bg-white p-4 text-center text-sm'>
            size=&quot;{size}&quot;
          </div>
        </Container>
      ))}
    </div>
  ),
}

export const PaddingNone: Story = {
  args: { padding: 'none', children: placeholder },
}

export const PaddingTight: Story = {
  args: { padding: 'tight', children: placeholder },
}

export const PaddingDefault: Story = {
  args: { padding: 'default', children: placeholder },
}

export const PaddingWide: Story = {
  args: { padding: 'wide', children: placeholder },
}

export const AllPaddings: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      {(['none', 'tight', 'default', 'wide'] as const).map((padding) => (
        <Container key={padding} padding={padding}>
          <div className='rounded border border-dashed border-primary-300 bg-white p-4 text-center text-sm'>
            padding=&quot;{padding}&quot;
          </div>
        </Container>
      ))}
    </div>
  ),
}
