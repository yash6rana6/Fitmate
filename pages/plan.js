import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Dumbbell, Utensils } from 'lucide-react';
import { apiFetch } from '../lib/telegramClient';
import BottomNav from '../components/BottomNav';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function todayName() {
  const idx = (new Date().getDay() + 6) % 7;
  return DAYS[idx];
}

export default function Plan() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(todayName());
  const [tab, setTab] = useState('workout');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const session = await apiFetch('/api/auth/session');
      if (!session.user.onboarding_complete) {
        router.replace('/onboarding');
        return;
      }
      const week = session.user.current_week || 1;
      const { plan } = await apiFetch(`/api/plan/${week}`);
      setPlan(plan);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-muted text-sm">Loading your plan…</div>;
  }

  if (error || !plan) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-muted text-sm">{error || 'No plan found.'}</p>
        <button className="btn-ghost px-4 py-2 text-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  const dayPlan = plan.days.find((d) => d.day === activeDay) || plan.days[0];

  return (
    <div className="min-h-screen pb-28">
      <div className="px-6 pt-7 pb-5 page-enter">
        <div className="text-xs text-muted">Week {plan.week_number}</div>
        <h1 className="text-xl font-bold">Your full plan</h1>
      </div>

      <div className="px-6 flex gap-2 mb-4 overflow-x-auto">
        {plan.days.map((d) => (
          <button
            key={d.day}
            onClick={() => setActiveDay(d.day)}
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeDay === d.day ? 'bg-accent text-[#052e16] font-medium' : 'bg-surface2 text-muted'
            }`}
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="px-6 flex gap-2 mb-5">
        {[
          { key: 'workout', label: 'Workout', icon: Dumbbell },
          { key: 'diet', label: 'Diet', icon: Utensils },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors ${
                tab === t.key ? 'bg-white text-black font-medium' : 'bg-surface2 text-muted'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="px-6">
        {tab === 'workout' && <WorkoutView dayPlan={dayPlan} />}
        {tab === 'diet' && <DietView dayPlan={dayPlan} targets={plan.targets} />}
      </div>

      <BottomNav active="plan" />
    </div>
  );
}

function WorkoutView({ dayPlan }) {
  const w = dayPlan.workout || {};
  if (!w.exercises || w.exercises.length === 0) {
    return <div className="card p-5 text-sm text-muted animate-fade-slide-up">Rest day — recover well.</div>;
  }
  return (
    <div className="card p-5 animate-fade-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="font-medium capitalize">{w.type} workout</div>
        <div className="text-xs text-muted">{w.duration_min} min</div>
      </div>
      <div className="space-y-3">
        {w.exercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between bg-surface2 rounded-xl px-4 py-3">
            <div className="text-sm">{ex.name}</div>
            <div className="text-xs text-muted">
              {ex.sets} × {ex.reps}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DietView({ dayPlan, targets }) {
  return (
    <div className="space-y-3 animate-fade-slide-up">
      {targets && (
        <div className="card p-4 flex justify-around text-center">
          <div>
            <div className="text-sm font-semibold">{targets.calories}</div>
            <div className="text-[10px] text-muted">kcal target</div>
          </div>
          <div>
            <div className="text-sm font-semibold">{targets.protein_g}g</div>
            <div className="text-[10px] text-muted">protein target</div>
          </div>
          <div>
            <div className="text-sm font-semibold">{targets.water_liters}L</div>
            <div className="text-[10px] text-muted">water target</div>
          </div>
        </div>
      )}
      {dayPlan.meals.map((meal, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium capitalize text-sm">{meal.type}</div>
            <div className="text-xs text-muted">
              {meal.calories} kcal · {meal.protein_g}g protein
            </div>
          </div>
          <div className="text-xs text-muted">{meal.items.join(', ')}</div>
        </div>
      ))}
    </div>
  );
}
