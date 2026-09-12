import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { User, Target, Utensils, Home as HomeIcon, Scale, Flame, Gem } from 'lucide-react';
import { apiFetch } from '../lib/telegramClient';
import Avatar from '../components/Avatar';
import BottomNav from '../components/BottomNav';

const GOAL_LABELS = {
  fat_loss: 'Lose Fat',
  muscle_gain: 'Build Muscle',
  maintenance: 'Maintain',
  general_fitness: 'Tone Up',
};

const DIET_LABELS = {
  vegetarian: 'Vegetarian',
  non_veg: 'Non-veg',
  flexible: 'Flexible',
};

export default function More() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/auth/session')
      .then(({ user }) => {
        if (!user.onboarding_complete) {
          router.replace('/onboarding');
          return;
        }
        setUser(user);
      })
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) {
    return <div className="h-screen flex items-center justify-center text-muted text-sm px-6 text-center">{error}</div>;
  }
  if (!user) {
    return <div className="h-screen flex items-center justify-center text-muted text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="px-6 pt-7 pb-6 flex items-center gap-4 page-enter">
        <Avatar name={user.name} size={56} />
        <div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-xs text-muted">Week {user.current_week} of your journey</p>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-3 mb-6">
        <MiniStat icon={<Flame size={16} color="#fb923c" />} value={user.streak} label="Day streak" />
        <MiniStat icon={<Gem size={16} color="#38bdf8" />} value={user.xp} label="Total XP" />
      </div>

      <div className="px-6">
        <div className="card divide-y divide-border animate-fade-slide-up">
          <Row icon={<Target size={16} />} label="Goal" value={GOAL_LABELS[user.goal] || user.goal} />
          <Row icon={<Utensils size={16} />} label="Diet" value={DIET_LABELS[user.diet_type] || user.diet_type} />
          <Row icon={<HomeIcon size={16} />} label="Trains at" value={user.workout_location} capitalize />
          <Row icon={<Scale size={16} />} label="Weight" value={`${user.weight_kg} kg`} />
          <Row icon={<User size={16} />} label="Age" value={`${user.age} years`} />
        </div>

        {user.medical_flags?.length > 0 && (
          <div className="card p-4 mt-3">
            <div className="text-xs text-muted mb-2">Medical notes</div>
            <div className="flex flex-wrap gap-2">
              {user.medical_flags.map((m, i) => (
                <span key={i} className="pill-select text-xs px-3 py-1.5">{m}</span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted mt-6 leading-relaxed text-center">
          Your check-in photos are used only for AI analysis and are never shared.
        </p>
      </div>

      <BottomNav active="more" />
    </div>
  );
}

function MiniStat({ icon, value, label }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="icon-badge">{icon}</span>
      <div>
        <div className="text-sm font-semibold">{value}</div>
        <div className="text-[10px] text-muted">{label}</div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, capitalize }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-muted">{icon}</span>
      <span className="text-sm text-muted flex-1">{label}</span>
      <span className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}
