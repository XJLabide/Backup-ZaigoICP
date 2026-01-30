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
    <section className="py-16 md:py-20 border-t border-white/10">
      <div className={tokens.spacing.container}>
        <p className="text-center text-sm text-[#6b7280] uppercase tracking-wider mb-8">
          Trusted by independent financial professionals
        </p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {companies.map((company) => (
            <div
              key={company}
              className="px-4 py-2 rounded-full bg-[#242836] border border-white/10 text-[#9ca3af] text-sm font-medium"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
