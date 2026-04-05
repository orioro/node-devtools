import { Meta } from '@storybook/react'
import { Component } from './index'
import { ThemeProvider } from 'styled-components'
import { expect, userEvent, within, fn } from '@storybook/test'

const meta: Meta<typeof Component> = {
  title: 'Component',
  component: Component,
  decorators: [
    (Story) => (
      <ThemeProvider theme={{}}>
        <Story />
      </ThemeProvider>
    ),
  ],
}
export default meta

export const Basic = {
  args: {
    bg: 'skyblue',
    placeholder: 'Type here...',
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox')

    await userEvent.type(input, 'hello world')

    await expect(input).toHaveValue('hello world')
    await expect(args.onChange).toHaveBeenCalled()
  },
}
