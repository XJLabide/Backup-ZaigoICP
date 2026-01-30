import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to AOG Outreach',
    content: 'Your autopilot for growing your book. Let me show you around.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard"]',
    title: 'Your Dashboard',
    content: 'See your outreach stats at a glance - prospects found, messages sent, and replies received.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="prospects"]',
    title: 'Prospects',
    content: 'View and manage potential clients who\'ve viewed your profile or match your ideal customer profile.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="campaigns"]',
    title: 'Campaigns',
    content: 'Create targeted outreach campaigns with AI-powered personalized messages.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="icp"]',
    title: 'Ideal Customer Profile',
    content: 'Define who your perfect prospects are - job titles, industries, and company sizes.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="messages"]',
    title: 'Messages',
    content: 'Review AI-generated connection requests before they\'re sent.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="history"]',
    title: 'History',
    content: 'Track all your outreach activity and see who\'s responded.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="settings"]',
    title: 'Settings',
    content: 'Connect your LinkedIn account and customize your preferences.',
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    title: 'You\'re All Set!',
    content: 'Start by connecting LinkedIn in Settings, then set your ICP to find the right prospects.',
    disableBeacon: true,
  },
];
