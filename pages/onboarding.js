import { useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Ruler, Scale, Home as HomeIcon, Dumbbell, Leaf, Beef, Utensils } from 'lucide-react';
import { apiFetch, getTelegramWebApp } from '../lib/telegramClient';

const GOALS = [
  { key: 'fat_loss', label: 'Lose Fat', sub: 'Get leaner and healthier', icon: '🔥' },
  { key: 'muscle_gain', label: 'Build Muscle', sub: 'Gain size and strength', icon: '💪' },
  { key: 'maintenance', label: 'Maintain', sub: 'Stay consistent', icon: '🌿' },
  { key: 'general_fitness', label: 'Tone Up', sub: 'Look and feel better', icon: '✨' },
];

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', sub: 'Desk job, little exercise' },
  { key: 'light', label: 'Light', sub: '1-3 workouts/week' },
  { key: 'moderate', label: 'Moderate', sub: '3-5 workouts/week' },
  { key: 'active', label: 'Active', sub: '6-7 workouts/week' },
  { key: 'very_active', label: 'Very active', sub: 'Physical job + training' },
];

const EQUIPMENT_OPTIONS = ['Dumbbells', 'Barbell', 'Resistance bands', 'Bodyweight only', 'Full gym access'];
const TOTAL_STEPS = 5;

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const tg = getTelegramWebApp();
  const tgFirstName = tg?.initDataUnsafe?.user?.first_name || '';

  const [form, setForm] = useState({
    name: tgFirstName,
    gender: '',
    age: 24,
    height_cm: '',
    weight_kg: '',
    goal: '',
    workout_location: '',
    equipment: [],
    diet_type: '',
    activity_level: '',
    budget_tier: '',
    region: '',
    medical_flags: [],
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleEquipment(item) {
    setForm((f) => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter((e) => e !== item)
        : [...f.equipment, item],
    }));
  }

  function canProceed() {
    if (step === 1) return form.gender && form.age && form.height_cm && form.weight_kg;
    if (step === 2) return !!form.goal;
    if (step === 3) return !!form.workout_location && !!form.diet_type;
    if (step === 4) return !!form.activity_level;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
      };
      await apiFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.replace('/dashboard');
    } catch (e) {
      setError(e.message || 'Something went wrong generating your plan. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <div className="flex items-center gap-3 mb-8">
        {step > 1 ? (
          <button onClick={() => setStep((s) => s - 1)} className="text-muted p-1 -ml-1 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-6" />
        )}
        <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent2 transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted w-8 text-right">{step}/{TOTAL_STEPS}</span>
      </div>

      <div key={step} className="page-enter flex-1">
        {step === 1 && <StepBasics form={form} update={update} />}
        {step === 2 && <StepGoal form={form} update={update} />}
        {step === 3 && <StepDietTraining form={form} update={update} toggleEquipment={toggleEquipment} />}
        {step === 4 && <StepActivity form={form} update={update} />}
        {step === 5 && <StepOptional form={form} update={update} error={error} />}
      </div>

      <div className="mt-6">
        {step < TOTAL_STEPS ? (
          <button
            disabled={!canProceed()}
            className="btn-primary w-full py-4"
            onClick={() => setStep((s) => s + 1)}
          >
            Next →
          </button>
        ) : (
          <button
            disabled={submitting}
            className="btn-primary w-full py-4"
            onClick={handleSubmit}
          >
            {submitting ? 'Building your plan…' : 'Generate My Plan →'}
          </button>
        )}
      </div>
    </div>
  );
}

function StepBasics({ form, update }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Let's build a better you.</h2>
      <p className="text-muted text-sm mb-6">Just a few details to create your personalized plan.</p>

      <div className="mb-6">
        <label className="text-xs text-muted mb-2 block">What's your gender?</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'male', label: 'Male', icon: '♂' },
            { key: 'female', label: 'Female', icon: '♀' },
            { key: 'other', label: 'Other', icon: '⚧' },
          ].map((g) => (
            <button
              key={g.key}
              className={`pill-select flex flex-col items-center gap-1 ${form.gender === g.key ? 'active' : ''}`}
              onClick={() => update('gender', g.key)}
            >
              <span className="text-lg">{g.icon}</span>
              <span className="text-xs">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-muted">Your age</label>
          <span className="text-sm font-semibold">{form.age} years</span>
        </div>
        <input
          type="range"
          min="14"
          max="80"
          value={form.age}
          onChange={(e) => update('age', Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IconField label="Height" icon={<Ruler size={16} />} value={form.height_cm} onChange={(v) => update('height_cm', v)} suffix="cm" />
        <IconField label="Weight" icon={<Scale size={16} />} value={form.weight_kg} onChange={(v) => update('weight_kg', v)} suffix="kg" />
      </div>
    </div>
  );
}

function StepGoal({ form, update }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">What's your goal?</h2>
      <p className="text-muted text-sm mb-6">Choose the one that fits you best.</p>
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.key}
            onClick={() => update('goal', g.key)}
            className={`pill-select flex flex-col items-start gap-2 text-left h-28 ${form.goal === g.key ? 'active' : ''}`}
          >
            <span className="icon-badge text-base">{g.icon}</span>
            <span>
              <div className="font-medium text-sm">{g.label}</div>
              <div className="text-[11px] text-muted">{g.sub}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDietTraining({ form, update, toggleEquipment }) {
  const DIETS = [
    { key: 'vegetarian', label: 'Vegetarian', icon: Leaf },
    { key: 'non_veg', label: 'Non-veg', icon: Beef },
    { key: 'flexible', label: 'Flexible', icon: Utensils },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Diet & training</h2>
      <p className="text-muted text-sm mb-6">We'll tailor meals and workouts around this.</p>

      <label className="text-xs text-muted mb-2 block">Diet preference</label>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {DIETS.map((d) => {
          const Icon = d.icon;
          return (
            <button
              key={d.key}
              className={`pill-select flex flex-col items-center gap-1.5 py-4 ${form.diet_type === d.key ? 'active' : ''}`}
              onClick={() => update('diet_type', d.key)}
            >
              <Icon size={18} color={form.diet_type === d.key ? '#34d399' : '#8b948f'} />
              <span className="text-xs">{d.label}</span>
            </button>
          );
        })}
      </div>

      <label className="text-xs text-muted mb-2 block">Where will you train?</label>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { key: 'home', label: 'Home', icon: HomeIcon },
          { key: 'gym', label: 'Gym', icon: Dumbbell },
        ].map((loc) => {
          const Icon = loc.icon;
          return (
            <button
              key={loc.key}
              className={`pill-select flex items-center justify-center gap-2 py-3.5 ${form.workout_location === loc.key ? 'active' : ''}`}
              onClick={() => update('workout_location', loc.key)}
            >
              <Icon size={16} color={form.workout_location === loc.key ? '#34d399' : '#8b948f'} />
              <span className="text-sm">{loc.label}</span>
            </button>
          );
        })}
      </div>

      <label className="text-xs text-muted mb-2 block">Equipment available (optional)</label>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((eq) => (
          <button
            key={eq}
            onClick={() => toggleEquipment(eq)}
            className={`pill-select text-xs px-3 py-2 ${form.equipment.includes(eq) ? 'active' : ''}`}
          >
            {eq}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepActivity({ form, update }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">How active are you?</h2>
      <p className="text-muted text-sm mb-6">This helps us set the right calorie and training load.</p>

      <div className="space-y-2">
        {ACTIVITY_LEVELS.map((a) => (
          <button
            key={a.key}
            className={`pill-select w-full text-left flex items-center justify-between ${form.activity_level === a.key ? 'active' : ''}`}
            onClick={() => update('activity_level', a.key)}
          >
            <span>
              <div className="text-sm font-medium">{a.label}</div>
              <div className="text-[11px] text-muted">{a.sub}</div>
            </span>
            <span className={`w-4 h-4 rounded-full border ${form.activity_level === a.key ? 'bg-accent border-accent' : 'border-border'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function StepOptional({ form, update, error }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Almost done</h2>
      <p className="text-muted text-sm mb-6">These are optional — you can add them later too.</p>

      <label className="text-xs text-muted mb-2 block">Budget tier</label>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {['low', 'mid', 'high'].map((b) => (
          <button
            key={b}
            className={`pill-select capitalize text-sm ${form.budget_tier === b ? 'active' : ''}`}
            onClick={() => update('budget_tier', b)}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-muted mb-2 block">Region (city/country)</label>
        <input
          className="input-field"
          value={form.region}
          onChange={(e) => update('region', e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="text-xs text-muted mb-2 block">Any medical conditions? (optional, comma separated)</label>
        <input
          className="input-field"
          placeholder="e.g. knee injury, hypertension"
          value={form.medical_flags.join(', ')}
          onChange={(e) =>
            update(
              'medical_flags',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
        />
      </div>

      <p className="text-xs text-muted mt-6 leading-relaxed">
        Your photos are used only for AI analysis and are not shared.
      </p>

      {error && <p className="text-xs text-red-400 mt-4">{error}</p>}
    </div>
  );
}

function IconField({ label, icon, value, onChange, suffix }) {
  return (
    <div>
      <label className="text-xs text-muted mb-2 block">{label}</label>
      <div className="input-field flex items-center gap-2">
        <span className="text-muted">{icon}</span>
        <input
          type="number"
          className="bg-transparent outline-none flex-1 min-w-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
