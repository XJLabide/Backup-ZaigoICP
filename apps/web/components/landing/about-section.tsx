import { Zap, Eye, Sparkles } from 'lucide-react';

const values = [
  {
    icon: Zap,
    title: 'Speed',
    description: 'Sub-second response times across every interaction. Your outreach happens instantly.',
  },
  {
    icon: Eye,
    title: 'Clarity',
    description: 'Clear analytics and insights that make sense at a glance. Know what works.',
  },
  {
    icon: Sparkles,
    title: 'Craft',
    description: 'AI-crafted messages that feel genuinely human. No robotic templates.',
  },
];

export function AboutSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Main Card Container */}
        <div className="bg-white border border-neutral-200 rounded-3xl shadow-lg shadow-black/5 p-8 md:p-12 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left: Text Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                Built for the way you actually work
              </h2>

              <div className="space-y-4 text-neutral-600 text-lg leading-relaxed">
                <p>
                  We started with a simple question: why does LinkedIn outreach feel like a chore?
                  The tools meant to help us connect often slow us down with complexity and generic templates.
                </p>
                <p>
                  So we built something different. An AI that understands context, personalizes every message,
                  and works while you sleep. No learning curve, no friction—just growth.
                </p>
              </div>
            </div>

            {/* Right: Timeline */}
            <div className="relative">
              {/* Vertical Timeline Line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-neutral-200" />

              {/* Timeline Items */}
              <div className="space-y-8">
                {values.map((value, _index) => (
                  <div key={value.title} className="relative flex gap-6">
                    {/* Timeline Dot */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-neutral-200 flex items-center justify-center shadow-sm">
                      <value.icon className="w-5 h-5 text-neutral-700" />
                    </div>

                    {/* Content */}
                    <div className="pt-1">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                        {value.title}
                      </h3>
                      <p className="text-neutral-600 text-sm leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
