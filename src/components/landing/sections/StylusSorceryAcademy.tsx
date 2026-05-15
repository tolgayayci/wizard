import { ArrowRight, Sparkles, Wand2, BookOpen, Trophy } from 'lucide-react';

export function StylusSorceryAcademy() {
  return (
    <section className="py-32 px-6 bg-gradient-to-b from-white via-indigo-50/40 to-white relative overflow-hidden">
      {/* Soft ambient glows that match the wizardry theme without leaving the brand palette */}
      <div className="absolute -top-32 left-1/3 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-3">
            Companion learning platform
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Learn Stylus through enchantment
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Stylus Sorcery Academy — a gamified academy where functions are spells, contracts are
            grimoires, and you ascend from <span className="font-medium text-gray-700">Apprentice</span>{' '}
            to <span className="font-medium text-gray-700">Archmage</span>.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all">
            <div className="inline-flex p-2.5 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 mb-4">
              <Wand2 className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Cast spells, not boilerplate</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every concept lands through hands-on coding exercises in the browser. No setup,
              instant feedback.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all">
            <div className="inline-flex p-2.5 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 mb-4">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Three progressive grimoires</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Foundations, intermediate patterns, expert techniques — paced for total beginners,
              Solidity devs, and Rust devs alike.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all">
            <div className="inline-flex p-2.5 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 mb-4">
              <Trophy className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Earn ranks &amp; artifacts</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              XP, achievements, and themed badges as you progress. Inspired by CryptoZombies — built
              for Stylus.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center">
          <a
            href="https://stylus.academy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 transition-all group"
          >
            <Sparkles className="h-4 w-4" />
            Enter the Academy
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
