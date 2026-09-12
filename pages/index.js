import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Zap, LineChart, Users, Send } from 'lucide-react';
import { apiFetch } from '../lib/telegramClient';

const FEATURES = [
  { icon: Zap, title: 'Personalized Plans', sub: 'Workout. Diet. Daily todos.' },
  { icon: LineChart, title: 'Track Progress', sub: 'Stay consistent. See results.' },
  { icon: Users, title: 'No Signup. Just You.', sub: 'Powered by Telegram.' },
];

export default function Welcome() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiFetch('/api/auth/session')
      .then(({ user }) => {
        if (user.onboarding_complete) {
          router.replace('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center text-muted text-sm">
        Loading FitMate…
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* ambient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-base" />
        <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-accent/20 blur-[90px]" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="flex items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-[#052e16] font-bold text-sm">
            F
          </div>
          <span className="font-semibold">FitMate</span>
        </div>
        <span className="text-[10px] tracking-wide text-muted text-right leading-tight">
          BUILT FOR
          <br />A BETTER YOU
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-end px-6 pb-10 pt-16">
        <h1 className="text-5xl font-bold leading-[1.05] mb-4 page-enter">
          Small
          <br />
          Steps
          <br />
          <span className="text-accent">Big</span>
          <br />
          <span className="text-accent">Changes.</span>
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-8 max-w-xs">
          Your AI fitness trainer, right inside Telegram.
        </p>

        <div className="space-y-4 mb-8">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="icon-badge shrink-0">
                  <Icon size={18} />
                </span>
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-muted">{f.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="btn-white w-full py-4 flex items-center justify-center gap-2"
          onClick={() => router.push('/onboarding')}
        >
          <Send size={16} />
          Start My Journey →
        </button>
        <p className="text-center text-xs text-muted mt-4">
          100% Free · No Extra Apps · Built on Telegram
        </p>
      </div>
    </div>
  );
}
