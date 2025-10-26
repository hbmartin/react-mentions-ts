/** @type {import('@lhci/cli').LighthouseCiConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: 'demo/dist',
      numberOfRuns: 2,
      startServerReadyTimeout: 120_000,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
