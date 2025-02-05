import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "WIZARD",
  description: "Browser-based development environment for Arbitrum Stylus smart contracts",
  base: '/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  themeConfig: {
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg'
    },
    nav: [
      { text: 'Go To Playground', link: 'https://thewizard.app' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
          { text: 'Features', link: '/getting-started/features' }
        ]
      },
      {
        text: 'Templates',
        items: [
          { text: 'Counter', link: '/templates/counter' },
          { text: 'ERC20 Token', link: '/templates/erc20' },
          { text: 'ERC721 NFT', link: '/templates/erc721' },
          { text: 'ERC1155 Multi-Token', link: '/templates/erc1155' },
          { text: 'Access Control', link: '/templates/access-control' }
        ]
      },
      {
        text: 'Help & Support',
        items: [
          { text: 'FAQ', link: '/support/faq' },
          { text: 'Contributing', link: '/support/contributing' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tolgayayci/wizard' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 - Tolga Yaycı'
    },

    search: {
      provider: 'local'
    }
  },

  vite: {
    ssr: {
      noExternal: ['vitepress-plugin-nprogress']
    }
  }
})