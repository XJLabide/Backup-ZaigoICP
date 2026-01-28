import { tokens } from './theme-tokens';

const companies = [
  'Acme Corp',
  'Nova Labs',
  'Vertex AI',
  'Juniper Tech',
  'Kairo Systems',
  'Orion Group',
  'Pulse Digital',
  'Apex Ventures',
];

export function CompanySection() {
  return (
    <section className="py-16 md:py-20 border-t border-neutral-200">
      <div className={tokens.spacing.container}>
        <p className="text-center text-sm text-neutral-500 uppercase tracking-wider mb-8">
          Trusted by forward-thinking teams
        </p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {companies.map((company) => (
            <div
              key={company}
              className="px-4 py-2 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-sm font-medium"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
