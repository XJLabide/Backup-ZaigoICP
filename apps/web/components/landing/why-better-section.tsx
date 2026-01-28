'use client';

const features = [
  {
    title: 'Purpose-built workflow',
    description: 'Designed around how modern teams actually work. Every feature exists to eliminate friction, not add complexity.',
    className: 'md:col-span-2',
  },
  {
    title: 'Fast by default',
    description: "Performance isn't an afterthought—it's the foundation. Instant load times, real-time sync, zero lag.",
    className: 'col-span-1',
  },
  {
    title: 'Crafted experience',
    description: 'Beautiful interfaces that feel intuitive from day one. We sweat the details so you can focus on your work.',
    className: 'col-span-1',
  },
  {
    title: 'Seamless integrations',
    description: 'Connect your tools without the integration tax. Seamless data flow that just works.',
    className: 'md:col-span-2',
  },
];

export function WhyBetterSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 text-center mb-12">
          Why teams choose us
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`${feature.className} bg-white border border-neutral-900 rounded-2xl p-8 md:p-10`}
            >
              <h3 className="font-bold text-2xl md:text-3xl text-neutral-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-neutral-600 text-base md:text-lg leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
