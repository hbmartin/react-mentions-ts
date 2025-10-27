/** @type {import('@lhci/cli').LighthouseCiConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: 'demo/dist',
      numberOfRuns: 2,
      startServerReadyTimeout: 30_000,
      settings: {
        logLevel: 'verbose',
        chromeFlags: '--enable-logging=stderr',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
  },
}
