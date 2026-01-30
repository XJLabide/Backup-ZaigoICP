import Link from 'next/link';
import { Twitter, Github, Linkedin } from 'lucide-react';
import { tokens } from './theme-tokens';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#features' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function FooterSection() {
  return (
    <footer className="border-t border-white/10 bg-[#1a1d29]">
      <div className={`${tokens.spacing.container} py-12 md:py-16`}>
        {/* Brand and social */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div className="mb-6 md:mb-0">
            <img
              src="https://associateownersgroup.com/wp-content/uploads/Logo-Horizontal.svg"
              alt="AOG Outreach"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[#9ca3af] hover:text-[#d4a84b] hover:bg-white/20 transition-colors"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-8 mb-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#9ca3af] hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-sm text-[#6b7280]">
            © {new Date().getFullYear()} AOG Outreach. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
