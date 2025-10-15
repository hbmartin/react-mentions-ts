import React from 'react'
import Examples from './examples'

const App: React.FC = () => (
  <div className="demo">
    <h1>react-mentions</h1>
    <p>
      <span role="img" aria-label="hooray">
        🙌
      </span>
      &nbsp; brought to you by Signavio, docs and code on GitHub:{' '}
      <a href="https://github.com/signavio/react-mentions" target="_blank" rel="noreferrer">
        https://github.com/signavio/react-mentions
      </a>{' '}
      (BSD license)
    </p>
    <Examples />
  </div>
)

export default App
