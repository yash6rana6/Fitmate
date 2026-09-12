import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const showToast = useCallback((message, opts = {}) => {
    const id = ++counter.current;
    const toast = { id, message, emoji: opts.emoji || '✅', tone: opts.tone || 'default' };
    setToasts((cur) => [...cur, toast]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, opts.duration || 2600);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 left-0 right-0 max-w-md mx-auto px-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pop-in pointer-events-auto card !bg-[#141a17] px-4 py-2.5 flex items-center gap-2 shadow-lg border-accent/30"
          >
            <span>{t.emoji}</span>
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
