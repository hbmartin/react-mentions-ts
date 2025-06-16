import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import Examples from './examples'

const Demo = () => (
  <div>
    <h1>react-mentions</h1>
    <p>
      <span role="img" aria-labelledby="yay!">
        🙌
      </span>
      &nbsp; brought to you by Signavio, docs and code on Github:{' '}
      <a href="https://github.com/signavio/react-mentions">
        https://github.com/signavio/react-mentions
      </a>{' '}
      (BSD license)
    </p>
    <StrictMode>
      <Examples />
    </StrictMode>
  </div>
)

const root = createRoot(document.querySelector('#demo'))
root.render(<Demo />)
