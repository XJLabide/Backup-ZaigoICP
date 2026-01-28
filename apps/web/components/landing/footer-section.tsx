import Link from 'next/link';
import { Twitter, Github, Linkedin } from 'lucide-react';
import { tokens } from './theme-tokens';

const footerLinks = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Careers', 'Blog', 'Press'],
  Resources: ['Documentation', 'API Reference', 'Community', 'Status'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Security'],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function FooterSection() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className={`${tokens.spacing.container} py-12 md:py-16`}>
        {/* Brand and social */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div className="mb-6 md:mb-0">
            <span className="text-xl font-bold text-neutral-900">Flowline</span>
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Flowline. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
