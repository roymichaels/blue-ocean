import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Blue Ocean — Codex Guide',
  description: 'Single source of truth for agents, security, and MVP tasks',
  lang: 'en-US',
  cleanUrls: true,
  themeConfig: {
    outline: [2,3],
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Codex', link: '/codex/playbook' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Security', link: '/security/baseline' },
      { text: 'UI', link: '/ui/mvp-app-tree' },
    ],
    sidebar: {
      '/codex/': [
        { text: 'Playbook', link: '/codex/playbook' },
        { text: 'Task Template', link: '/codex/task-template' },
        { text: 'PR Template', link: '/codex/pr-template' },
        { text: 'MVP Checklist', link: '/codex/checklist' },
      ],
      '/architecture/': [
        { text: 'Overview', link: '/architecture/overview' },
        { text: 'Agents', link: '/architecture/agents' },
        { text: 'Waku Topics', link: '/architecture/topics-waku' },
      ],
      '/security/': [
        { text: 'Baseline', link: '/security/baseline' },
        { text: 'Message Signing', link: '/security/message-signing' },
        { text: 'Tenant KYC Policy', link: '/security/kyc-policy' },
      ],
      '/ui/': [
        { text: 'MVP App Tree', link: '/ui/mvp-app-tree' },
        { text: 'Wireframes (paths)', link: '/ui/wireframes' },
        { text: 'Hebrew Copy Rules', link: '/ui/copy-hebrew' },
      ],
      '/data/': [
        { text: 'Lake Warm-Start', link: '/data/lake-warmstart' },
        { text: 'Cache Contracts', link: '/data/cache-contracts' },
      ],
      '/payments/': [
        { text: 'NEAR Flow', link: '/payments/near-flow' },
        { text: 'MoonPay (Tenant)', link: '/payments/moonpay-tenant' },
      ],
      '/testing/': [
        { text: 'Integration — MVP', link: '/testing/integration-mvp' },
        { text: 'Accessibility', link: '/testing/accessibility' },
      ],
    }
  }
});
