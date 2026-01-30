'use client';

const features = [
  {
    title: 'Works while you work',
    description: 'Running appointments all day? AOG Outreach keeps prospecting in the background. New conversations show up in your inbox without you lifting a finger.',
    className: 'md:col-span-2',
  },
  {
    title: 'No tech skills needed',
    description: 'If you can send an email, you can use this. Setup takes 5 minutes and then it runs on its own.',
    className: 'col-span-1',
  },
  {
    title: 'Feels personal, not spammy',
    description: 'Every message references real details about the prospect. Recipients think you wrote it yourself—because the AI studied their profile first.',
    className: 'col-span-1',
  },
  {
    title: 'Built for your territory',
    description: 'Target by location, industry, company size, and job title. Find business owners, executives, and high-net-worth individuals right in your backyard.',
    className: 'md:col-span-2',
  },
];

export function WhyBetterSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
          Why reps choose AOG Outreach
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`${feature.className} bg-[#242836] border border-[#d4a84b] rounded-2xl p-8 md:p-10 hover:border-[#e5b95c] transition-colors`}
            >
              <h3 className="font-bold text-2xl md:text-3xl text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-[#9ca3af] text-base md:text-lg leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
