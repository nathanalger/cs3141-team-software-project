import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from '../../pages/Home'

describe('Home', () => {
   it('renders at the root route', async () => {
      render(<Home />)
      expect(await screen.findByText('kajhdkajshd')).toBeTruthy()
   })
})
