import { Target, MessageCircle, Clock } from 'lucide-react';

const values = [
  {
    icon: Target,
    title: 'Find Prospects Who Actually Need What You Sell',
    description: 'Target business owners planning exits, executives approaching retirement, and high-net-worth individuals in your territory. AOG Outreach uses LinkedIn data to identify who\'s most likely to need life insurance, annuities, or wealth planning—so you\'re not wasting time on dead ends.',
  },
  {
    icon: MessageCircle,
    title: 'Messages That Sound Like You, Not a Robot',
    description: 'Every outreach is written specifically for that prospect—referencing their company, role, career history, even shared connections. No templates. No "Dear Sir/Madam." Just natural conversations that get responses.',
  },
  {
    icon: Clock,
    title: 'Follow-Up Without the Mental Load',
    description: 'You know the money is in the follow-up, but who has time to track 50 conversations? AOG Outreach remembers every prospect, sends the right follow-up at the right time, and stops automatically when they reply. Nothing falls through the cracks.',
  },
];

export function AboutSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Main Card Container */}
        <div className="bg-[#242836] border border-white/10 rounded-3xl shadow-lg shadow-black/20 p-8 md:p-12 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left: Text Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Built for financial professionals who'd rather close than chase
              </h2>

              <div className="space-y-4 text-[#9ca3af] text-lg leading-relaxed">
                <p>
                  You got into this business to help people protect their families and plan for retirement—not to spend hours cold-calling or figuring out LinkedIn.
                </p>
                <p>
                  AOG Outreach does the prospecting for you. Set it up once, and it finds qualified prospects, reaches out personally, and follows up until they respond. You just show up for the conversation.
                </p>
              </div>
            </div>

            {/* Right: Timeline */}
            <div className="relative">
              {/* Vertical Timeline Line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/10" />

              {/* Timeline Items */}
              <div className="space-y-8">
                {values.map((value, _index) => (
                  <div key={value.title} className="relative flex gap-6">
                    {/* Timeline Dot */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-[#242836] border-2 border-[#d4a84b] flex items-center justify-center shadow-sm">
                      <value.icon className="w-5 h-5 text-[#d4a84b]" />
                    </div>

                    {/* Content */}
                    <div className="pt-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {value.title}
                      </h3>
                      <p className="text-[#9ca3af] text-sm leading-relaxed">
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
