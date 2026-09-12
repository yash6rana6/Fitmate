import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Camera } from 'lucide-react';
import { apiFetch, getInitData } from '../lib/telegramClient';

const MOODS = [
  { key: 1, label: 'Very Hard', emoji: '😣' },
  { key: 2, label: 'Hard', emoji: '😕' },
  { key: 3, label: 'Okay', emoji: '😐' },
  { key: 4, label: 'Good', emoji: '🙂' },
  { key: 5, label: 'Great', emoji: '⭐' },
];

const STRUGGLES = ['Time', 'Motivation', 'Diet', 'Workouts', 'No Equipment', 'Other'];

export default function CheckIn() {
  const router = useRouter();
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState(4);
  const [struggles, setStruggles] = useState([]);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [weekNumber, setWeekNumber] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    apiFetch('/api/checkin/previous')
      .then((data) => {
        setPrevious(data.previous);
        setWeekNumber(data.current_week);
      })
      .catch(() => {});
  }, []);

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function toggleStruggle(s) {
    setStruggles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function handleSubmit() {
    if (!weight || !photo) {
      setError('Weight and a progress photo are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('weight_kg', weight);
      formData.append('adherence_rating', String(adherence));
      formData.append('struggles', JSON.stringify(struggles));
      formData.append('note', note);
      formData.append('photo', photo);

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'x-telegram-init-data': getInitData() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen px-6 py-8 flex flex-col page-enter">
        <h1 className="text-2xl font-bold mb-1">Week {result.checkIn.week_number} complete! 🎉</h1>
        <p className="text-muted text-sm mb-6">Here's what your coach found.</p>

        <div className="card p-5 mb-4 animate-fade-slide-up">
          <div className="text-sm font-medium mb-1">Coach feedback</div>
          <p className="text-sm text-muted mb-3">{result.nextPlan.feedback?.summary}</p>
          <div className="text-xs text-muted">
            Weight change: {result.nextPlan.feedback?.weight_change_kg} kg
          </div>
          <div className="text-xs text-muted mt-1">{result.nextPlan.feedback?.adjustment_reason}</div>
        </div>

        <button className="btn-primary w-full py-4 mt-auto" onClick={() => router.replace('/dashboard')}>
          View Week {result.nextPlan.week_number} Plan →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-6 flex flex-col pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1 -ml-1 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-accent2 w-full" />
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1">Week {weekNumber || ''} check-in 🎉</h1>
      <p className="text-muted text-sm mb-6">Great job making it this far! Let's see how it went.</p>

      <div className="card p-5 mb-4 animate-fade-slide-up">
        <div className="text-sm font-medium mb-1">Progress photos</div>
        <p className="text-xs text-muted mb-4">Compare your progress</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <PhotoSlot label={previous ? `Before (Week ${previous.week_number})` : 'Before'} src={previous?.photo_url} />
          <PhotoSlot label="Now" src={photoPreview} highlight />
        </div>
        <label className="btn-ghost w-full py-3 flex items-center justify-center gap-2 text-sm cursor-pointer">
          <Camera size={16} />
          {photo ? 'Change photo' : 'Upload photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </label>
      </div>

      <div className="card p-5 mb-4 animate-fade-slide-up">
        <label className="text-xs text-muted mb-2 block">Current weight (kg)</label>
        <input
          type="number"
          className="input-field mb-4"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <label className="text-xs text-muted mb-2 block">How was this week overall?</label>
        <div className="grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setAdherence(m.key)}
              className={`pill-select flex flex-col items-center gap-1 py-3 px-1 ${adherence === m.key ? 'active' : ''}`}
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="text-[9px] text-muted leading-tight text-center">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 mb-4 animate-fade-slide-up">
        <label className="text-xs text-muted mb-2 block">What did you struggle with?</label>
        <div className="flex flex-wrap gap-2 mb-5">
          {STRUGGLES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStruggle(s)}
              className={`pill-select text-xs px-3 py-2 ${struggles.includes(s) ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>

        <label className="text-xs text-muted mb-2 block">Any additional notes?</label>
        <textarea
          className="input-field"
          rows={3}
          placeholder="e.g. I couldn't complete 2 workouts due to travel…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted mb-4 leading-relaxed">
        Your photos are used only for AI analysis and are not shared.
      </p>

      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

      <button disabled={submitting} className="btn-primary w-full py-4" onClick={handleSubmit}>
        {submitting ? 'Analyzing your progress…' : `Submit & Get Week ${(weekNumber || 1) + 1} Plan →`}
      </button>
    </div>
  );
}

function PhotoSlot({ label, src, highlight }) {
  return (
    <div>
      <div
        className={`aspect-[3/4] rounded-xl bg-surface2 border overflow-hidden flex items-center justify-center ${
          highlight ? 'border-accent/50' : 'border-border'
        }`}
      >
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-muted text-xs px-2 text-center">No photo yet</span>
        )}
      </div>
      <p className="text-[10px] text-muted text-center mt-1.5">{label}</p>
    </div>
  );
}
