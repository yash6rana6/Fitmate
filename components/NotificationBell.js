import { useEffect, useRef, useState } from 'react';
import { Bell, Sparkles, CalendarClock, Camera, PartyPopper, Info } from 'lucide-react';
import { apiFetch } from '../lib/telegramClient';

const TYPE_ICON = {
  plan_ready: Sparkles,
  feedback: PartyPopper,
  reminder_daily: CalendarClock,
  reminder_checkin: Camera,
  achievement: Sparkles,
  info: Info,
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  async function load() {
    try {
      const data = await apiFetch('/api/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      // silent — bell is a non-critical enhancement
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // light polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
      apiFetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleOpen} className="relative p-2 -mr-2 active:scale-90 transition-transform">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-72 card p-2 z-50 animate-pop-in max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">No notifications yet.</p>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] || Info;
              return (
                <div key={n._id} className="flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-surface2">
                  <span className="icon-badge shrink-0 !w-8 !h-8">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium leading-snug">{n.title}</div>
                    {n.message && <div className="text-[11px] text-muted mt-0.5 leading-snug">{n.message}</div>}
                    <div className="text-[10px] text-muted/70 mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
