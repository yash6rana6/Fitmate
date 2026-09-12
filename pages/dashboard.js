import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Flame, Gem, Dumbbell, Utensils, Droplet, BookOpen, Camera, CheckCircle2, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/telegramClient';
import Avatar from '../components/Avatar';
import ProgressRing from '../components/ProgressRing';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import { useToast } from '../components/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const XP_PER_LEVEL = 500;

function todayName() {
  const idx = (new Date().getDay() + 6) % 7;
  return DAYS[idx];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function iconForTodo(text = '') {
  const t = text.toLowerCase();
  if (t.includes('water')) return { Icon: Droplet, color: '#38bdf8' };
  if (t.includes('meal') || t.includes('diet') || t.includes('eat')) return { Icon: Utensils, color: '#fb923c' };
  if (t.includes('workout') || t.includes('exercise') || t.includes('train')) return { Icon: Dumbbell, color: '#34d399' };
  if (t.includes('read') || t.includes('learn') || t.includes('article')) return { Icon: BookOpen, color: '#a78bfa' };
  if (t.includes('photo') || t.includes('picture')) return { Icon: Camera, color: '#f472b6' };
  return { Icon: CheckCircle2, color: '#34d399' };
}

export default function Dashboard() {
  const router = useRouter();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [meta, setMeta] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load(week) {
    setLoading(true);
    setError('');
    try {
      const session = await apiFetch('/api/auth/session');
      if (!session.user.onboarding_complete) {
        router.replace('/onboarding');
        return;
      }
      setName(session.user.name || 'there');
      const targetWeek = week || session.user.current_week || 1;
      const { plan, user, today_log } = await apiFetch(`/api/plan/${targetWeek}`);
      setPlan(plan);
      setMeta(user);
      setTodayLog(today_log);
      setSelectedWeek(targetWeek);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTodo(todo, currentlyDone) {
    if (selectedWeek !== meta.current_week) return; // only today's actual week is interactive
    const day = plan.days.find((d) => d.day === todayName());
    try {
      const prevStreak = meta.streak;
      const res = await apiFetch('/api/todos/complete', {
        method: 'POST',
        body: JSON.stringify({
          week_number: plan.week_number,
          day: day.day,
          todo,
          completed: !currentlyDone,
        }),
      });
      setTodayLog(res.log);
      setMeta((m) => ({ ...m, xp: res.xp, streak: res.streak }));

      if (!currentlyDone) {
        showToast('+10 XP earned', { emoji: '⚡' });
        if (res.streak > prevStreak) {
          setTimeout(() => showToast(`Streak up! ${res.streak} days 🔥`, { emoji: '🔥' }), 500);
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-muted text-sm">Loading your plan…</div>;
  }

  if (error || !plan) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-muted text-sm">{error || 'No plan found.'}</p>
        <button className="btn-ghost px-4 py-2 text-sm" onClick={() => load()}>Retry</button>
      </div>
    );
  }

  const isCurrentWeek = selectedWeek === meta.current_week;
  const dayPlan = plan.days.find((d) => d.day === todayName()) || plan.days[0];
  const allTodos = [...dayPlan.todos, 'Log workout', 'Log meals'];
  const doneSet = new Set((isCurrentWeek && todayLog?.todos_completed) || []);
  const percentDone = allTodos.length ? (doneSet.size / allTodos.length) * 100 : 0;

  const level = Math.floor(meta.xp / XP_PER_LEVEL) + 1;
  const levelProgress = ((meta.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  const weekOptions = Array.from({ length: meta.current_week }, (_, i) => i + 1);

  return (
    <div className="min-h-screen pb-28">
      <div className="px-6 pt-7 pb-5 flex items-center justify-between page-enter">
        <div>
          <h1 className="text-xl font-bold">{greeting()}, {name.split(' ')[0]} 👋</h1>
          <p className="text-muted text-xs mt-0.5">"{plan.coach_note || 'Discipline today, a stronger tomorrow.'}"</p>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Avatar name={name} size={44} />
        </div>
      </div>

      <div className="px-6 grid grid-cols-3 gap-2 mb-5">
        <StatCard icon={<Flame size={16} color="#fb923c" />} value={meta.streak} label="Day Streak" />
        <StatCard icon={<Gem size={16} color="#38bdf8" />} value={meta.xp} label="Total XP" />
        <div className="card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Level {level}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent2 transition-all duration-700" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="px-6 flex gap-2 mb-4 overflow-x-auto">
        {weekOptions.map((w) => (
          <button
            key={w}
            onClick={() => load(w)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-colors ${
              selectedWeek === w ? 'bg-white text-black font-medium' : 'bg-surface2 text-muted'
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>

      <div className="px-6">
        <div className="card p-5 mb-4 animate-fade-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">{isCurrentWeek ? "Today's Plan" : `${dayPlan.day}'s Plan`}</div>
              <div className="text-xs text-muted">{isCurrentWeek ? new Date().toDateString().slice(0, -5) : `Week ${selectedWeek}`}</div>
            </div>
            <ProgressRing percent={percentDone} label="Completed" />
          </div>

          <div className="space-y-1">
            {allTodos.map((todo, i) => {
              const done = doneSet.has(todo);
              const { Icon, color } = iconForTodo(todo);
              return (
                <button
                  key={i}
                  disabled={!isCurrentWeek}
                  onClick={() => toggleTodo(todo, done)}
                  className="flex items-center gap-3 w-full text-left py-2.5 disabled:opacity-60"
                >
                  <span className="icon-badge shrink-0" style={{ background: `${color}22`, color }}>
                    <Icon size={16} />
                  </span>
                  <span className={`text-sm flex-1 ${done ? 'line-through text-muted' : ''}`}>{todo}</span>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                      done ? 'bg-accent border-accent check-pop' : 'border-border'
                    }`}
                  >
                    {done && <span className="text-[10px] text-[#052e16]">✓</span>}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => router.push('/checkin')}
              className="flex items-center gap-3 w-full text-left py-2.5"
            >
              <span className="icon-badge shrink-0" style={{ background: '#f472b622', color: '#f472b6' }}>
                <Camera size={16} />
              </span>
              <span className="text-sm flex-1">Take progress photo</span>
              <ChevronRight size={16} className="text-muted" />
            </button>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-emerald-900/40 to-surface relative overflow-hidden">
          <div className="absolute -right-6 -bottom-8 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />
          <div className="text-lg font-semibold leading-snug relative">
            Consistency
            <br />
            Compounds
            <br />
            <span className="text-accent">Everything.</span>
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-sm font-semibold">{value}</span></div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}
