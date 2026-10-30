import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { hydrationSettingsSnapshotSchema } from "./settings-contract";
import { hydrationReminderSlot } from "./reminder-slot";
/** No browser Notification API, storage, worker or background delivery. */
export function HydrationForegroundReminder({
  preferences,
  paused = false,
  now = systemNow,
}: {
  preferences: z.infer<typeof hydrationSettingsSnapshotSchema> | null;
  paused?: boolean;
  now?: () => string;
}) {
  const seen = useRef(new Set<string>()),
    lastClock = useRef(-Infinity);
  const [notice, setNotice] = useState<ReturnType<typeof hydrationReminderSlot>>(null);
  useEffect(() => {
    setNotice(null);
    if (!preferences || !preferences.settings.remindersEnabled || paused) return;
    function tick() {
      if (document.visibilityState !== "visible") {
        setNotice(null);
        return;
      }
      const instant = now(),
        clock = Date.parse(instant);
      if (!Number.isFinite(clock) || clock < lastClock.current) return;
      lastClock.current = clock;
      const slot = hydrationReminderSlot(preferences, instant);
      // Fail closed after a very long lived tab instead of evicting and repeating earlier slots.
      if (!slot || seen.current.has(slot.key) || seen.current.size >= 10000) return;
      seen.current.add(slot.key);
      setNotice(slot);
    }
    tick();
    const timer = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [preferences, paused, now]);
  if (!notice) return null;
  return (
    <aside
      role="status"
      aria-label="Lembrete de hidratação no aplicativo"
      className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-4"
    >
      <p className="font-medium">
        Horário escolhido por você: {notice.localTime} ({notice.timeZone})
      </p>
      <p>
        Se desejar, revise seus registros de água. Este aviso não registra consumo nem recomenda um
        volume.
      </p>
      <Button type="button" variant="outline" onClick={() => setNotice(null)}>
        Fechar aviso de hidratação
      </Button>
    </aside>
  );
}
function systemNow() {
  return new Date().toISOString();
}
