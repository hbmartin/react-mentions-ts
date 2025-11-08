/// <reference types="@welldone-software/why-did-you-render" />

import React from 'react'

const wdyrFlag = String(import.meta.env.VITE_WDYR ?? '').toLowerCase()
const shouldEnableWhyDidYouRender = import.meta.env.DEV && (wdyrFlag === 'true' || wdyrFlag === '1')

if (shouldEnableWhyDidYouRender) {
  console.info('[wdyr] why-did-you-render instrumentation enabled')

  const { default: whyDidYouRender } = await import('@welldone-software/why-did-you-render')

  const coreComponentsToTrack = ['MentionsInput', 'Highlighter', 'Suggestion', 'SuggestionsOverlay']

  const demoWrapperComponentsToTrack = [
    'Examples',
    'ExampleCard',
    'Advanced',
    'AllowSpaceInQuery',
    'AlphabetRegexTrigger',
    'AsyncGithubUserMentions',
    'AutoResize',
    'CutCopyPaste',
    'CustomSuggestionsContainer',
    'Emojis',
    'InlineAutocomplete',
    'LeftAnchored',
    'MentionSelection',
    'MultipleTriggers',
    'PaginatedEmojis',
    'Scrollable',
    'SingleLine',
    'SingleLineIgnoringAccents',
    'SuggestionPortal',
  ]

  const trackedComponents = [...coreComponentsToTrack, ...demoWrapperComponentsToTrack]
  const includePatterns = trackedComponents.map((name) => new RegExp(`^${name}$`))

  whyDidYouRender(React, {
    include: includePatterns,
    trackAllPureComponents: false,
    trackHooks: true,
    trackExtraHooks: [
      [React, 'useMemo'],
      [React, 'useCallback'],
      [React, 'useEffect'],
    ],
    logOnDifferentValues: true,
    logOwnerReasons: true,
    collapseGroups: true,
  })
}
