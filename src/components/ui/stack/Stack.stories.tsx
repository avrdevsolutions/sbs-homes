import { Stack } from './Stack'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Stack> = {
  title: 'UI/Stack',
  component: Stack,
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['row', 'col'],
    },
    gap: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '6', '8', '10', '12', '16'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around'],
    },
    wrap: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Stack>

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className='rounded bg-primary-100 px-4 py-2 text-sm'>{children}</div>
)

export const Column: Story = {
  args: { direction: 'col', gap: '4' },
  render: (args) => (
    <Stack {...args}>
      <Box>Item 1</Box>
      <Box>Item 2</Box>
      <Box>Item 3</Box>
    </Stack>
  ),
}

export const Row: Story = {
  args: { direction: 'row', gap: '4' },
  render: (args) => (
    <Stack {...args}>
      <Box>Item 1</Box>
      <Box>Item 2</Box>
      <Box>Item 3</Box>
    </Stack>
  ),
}

export const Centered: Story = {
  args: { direction: 'row', gap: '4', align: 'center', justify: 'center' },
  render: (args) => (
    <Stack {...args} className='h-40 rounded border border-dashed border-primary-300'>
      <Box>Centered</Box>
      <Box>Content</Box>
    </Stack>
  ),
}

export const SpaceBetween: Story = {
  args: { direction: 'row', gap: '4', justify: 'between' },
  render: (args) => (
    <Stack {...args}>
      <Box>Left</Box>
      <Box>Right</Box>
    </Stack>
  ),
}

export const Wrapped: Story = {
  args: { direction: 'row', gap: '3', wrap: true },
  render: (args) => (
    <Stack {...args} className='max-w-xs'>
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i}>Tag {i + 1}</Box>
      ))}
    </Stack>
  ),
}

export const GapVariations: Story = {
  render: () => (
    <div className='flex flex-col gap-8'>
      {(['0', '2', '4', '8', '16'] as const).map((gap) => (
        <div key={gap}>
          <p className='mb-2 text-xs font-medium text-foreground/60'>gap=&quot;{gap}&quot;</p>
          <Stack direction='row' gap={gap}>
            <Box>A</Box>
            <Box>B</Box>
            <Box>C</Box>
          </Stack>
        </div>
      ))}
    </div>
  ),
}
