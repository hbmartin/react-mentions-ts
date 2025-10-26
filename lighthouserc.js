/** @type {import('@lhci/cli').LighthouseCiConfig} */
const config = {
  ci: {
    collect: {
      staticDistDir: 'demo/dist',
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

export default config
