import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../../App'

describe('App', () => {
   it('renders without errors', () => {
      const { container } = render(<App />)

      expect(container).not.toBeEmptyDOMElement()
   })
})
