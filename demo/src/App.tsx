import React from 'react'
import Examples from './examples'

const App: React.FC = () => (
  <div className="demo">
    <h1>react-mentions-ts</h1>
    <p>
      <span role="img" aria-label="hooray">
        🙌
      </span>
      &nbsp; brought to you by HM & Signavio, docs and code on GitHub:{' '}
      <a href="https://github.com/hbmartin/react-mentions-ts" target="_blank" rel="noreferrer">
        https://github.com/hbmartin/react-mentions-ts
      </a>{' '}
      (BSD license)
    </p>
    <Examples />
  </div>
)

export default App
