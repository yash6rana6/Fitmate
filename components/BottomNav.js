import { useRouter } from 'next/router';
import { Home, ClipboardList, TrendingUp, Menu, Plus } from 'lucide-react';

const TABS = [
  { key: 'home', label: 'Home', href: '/dashboard', icon: Home },
  { key: 'plan', label: 'Plan', href: '/plan', icon: ClipboardList },
  { key: 'progress', label: 'Progress', href: '/checkin', icon: TrendingUp },
  { key: 'more', label: 'More', href: '/more', icon: Menu },
];

export default function BottomNav({ active }) {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto safe-bottom z-40">
      <div className="mx-4 mb-4 card !rounded-full px-2 py-2 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {TABS.slice(0, 2).map((tab) => (
          <NavButton key={tab.key} tab={tab} active={active === tab.key} onClick={() => router.push(tab.href)} />
        ))}

        <button
          onClick={() => router.push('/checkin')}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-accent to-accent2 text-[#052e16] -mt-1 shadow-lg active:scale-90 transition-transform animate-pulse-glow"
          aria-label="Check in"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        {TABS.slice(2).map((tab) => (
          <NavButton key={tab.key} tab={tab} active={active === tab.key} onClick={() => router.push(tab.href)} />
        ))}
      </div>
    </div>
  );
}

function NavButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 active:scale-90 transition-transform"
    >
      <Icon size={20} strokeWidth={2} color={active ? '#34d399' : '#8b948f'} />
      <span className={`text-[10px] ${active ? 'text-accent' : 'text-muted'}`}>{tab.label}</span>
    </button>
  );
}
