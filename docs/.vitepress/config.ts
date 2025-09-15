import type { DefaultTheme, UserConfig } from 'vitepress';

const config: UserConfig<DefaultTheme.Config> = {
  title: 'Blue Ocean Developer Portal',
  description: 'Self-hostable documentation for peer-to-peer commerce agents.',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: '/assets/logo.svg',
    nav: [
      { text: 'Quickstart', link: '/quickstart' },
      { text: 'API Playground', link: '/api-playground' },
      {
        text: 'Guides',
        items: [
          { text: 'Self-hosting', link: '/self-hosting' },
          { text: 'Telemetry Opt-In', link: '/telemetry-opt-in' },
          { text: 'Onboarding', link: '/onboarding' },
          { text: 'Config', link: '/config' }
        ]
      },
      { text: 'Reference', link: '/routes' }
    ],
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Quickstart', link: '/quickstart' },
            { text: 'Self-hosting the Docs', link: '/self-hosting' },
            { text: 'Onboarding', link: '/onboarding' },
            { text: 'Configuration', link: '/config' },
            { text: 'Navigation', link: '/navigation' }
          ]
        },
        {
          text: 'Developer Toolkit',
          collapsed: false,
          items: [
            { text: 'API Playground', link: '/api-playground' },
            { text: 'Telemetry Opt-In', link: '/telemetry-opt-in' },
            { text: 'Quick Caching Reference', link: '/cache' },
            { text: 'Cache Invalidation', link: '/cache-invalidation' },
            { text: 'Observability', link: '/observability' },
            { text: 'Analytics Events', link: '/analytics' },
            { text: 'Performance', link: '/performance' }
          ]
        },
        {
          text: 'Protocol & Agents',
          collapsed: true,
          items: [
            { text: 'Architecture', link: '/architecture' },
            { text: 'Provider Invariants', link: '/provider-invariants' },
            { text: 'Primitives', link: '/primitives' },
            { text: 'Notifications', link: '/notifications' },
            { text: 'Notification Topics', link: '/notifications-topics' },
            { text: 'Waku Sync', link: '/waku-sync' },
            { text: 'Waku Signing', link: '/waku-signing' },
            { text: 'Broker Tuning', link: '/broker-tuning' }
          ]
        },
        {
          text: 'Security & Governance',
          collapsed: true,
          items: [
            { text: 'Threat Model', link: '/threat-model' },
            { text: 'Secure Key Management', link: '/secure-key-management' },
            { text: 'Admin Bootstrap', link: '/admin-bootstrap' },
            { text: 'Admin Revocation', link: '/admin-revocation' },
            { text: 'Auth Keys', link: '/auth-keys' },
            { text: 'Session Tokens', link: '/session-tokens' },
            { text: 'Scope Policy & Legal Review', link: '/scope-policy-legal-review' }
          ]
        },
        {
          text: 'Operations & Support',
          collapsed: true,
          items: [
            { text: 'Incident Runbook', link: '/incident-runbook' },
            { text: 'Testing Matrix', link: '/testing' },
            { text: 'Performance QA', link: '/qa/sprint-verification' },
            { text: 'Private Beta QA', link: '/qa/private-beta' },
            { text: 'QA Checklist', link: '/checklists/qa' },
            { text: 'Rollout Checklist', link: '/checklists/rollout' },
            { text: 'Join Requests', link: '/join-requests' },
            { text: 'Wallet Integrations', link: '/wallet' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/blue-ocean-labs/blue-ocean' }
    ],
    footer: {
      message: 'Built for autonomous commerce over Waku.',
      copyright: 'Copyright © 2025 Blue Ocean contributors'
    }
  }
};

export default config;
