import React from 'react'
import styled from 'styled-components'

export type ComponentProps = {
  children?: React.ReactNode
  bg: string
}

export const Component: React.FC<ComponentProps> = styled.input`
  padding: 10px;

  background-color: ${({ bg }) => bg};
`
