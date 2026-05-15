import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
};

type AppointmentItem = {
  id: string;
  data: string;
  clienteNome: string;
  note: string;
  attivita: string[];
  giardinieri: Array<{ id: string; username: string }>;
};

function GiardinierePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedId = window.localStorage.getItem('userId');
    const storedName = window.localStorage.getItem('loginUsername') || '';
    const storedRole = window.localStorage.getItem('loginRole');

    if (!storedId || storedRole !== 'giardiniere') {
      navigate('/geologin', { replace: true });
      return;
    }

    setUserId(storedId);
    setUserName(storedName);
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const [notificheRes, appointmentsRes] = await Promise.all([
          fetch(`/api/notifiche?giardiniereId=${encodeURIComponent(userId)}&read=0`),
          fetch(`/api/appuntamenti?giardiniereId=${encodeURIComponent(userId)}`),
        ]);

        const notificheData = await notificheRes.json().catch(() => null);
        const appointmentsData = await appointmentsRes.json().catch(() => null);

        if (!notificheRes.ok) {
          throw new Error(notificheData?.message || 'Errore caricamento notifiche.');
        }
        if (!appointmentsRes.ok) {
          throw new Error(appointmentsData?.message || 'Errore caricamento appuntamenti.');
        }

        setNotifications(Array.isArray(notificheData?.notifiche) ? notificheData.notifiche : []);
        setAppointments(Array.isArray(appointmentsData?.appointments) ? appointmentsData.appointments : []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Errore durante il caricamento.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!userId) return;

    const interval = window.setInterval(() => {
      setRefreshKey((current) => current + 1);
    }, 15000); // aggiorna automaticamente ogni 15 secondi

    return () => {
      window.clearInterval(interval);
    };
  }, [userId]);

  const markNotificationRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifiche/${id}/read`, { method: 'PUT' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Errore segnare notifica come letta.');
      }
      setRefreshKey((current) => current + 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento.');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userId');
      window.localStorage.removeItem('loginUsername');
      window.localStorage.removeItem('loginRole');
    }
    navigate('/geologin', { replace: true });
  };

  const formatNotification = (notification: NotificationItem) => {
    const appointmentTitleMatch = notification.title.match(/^Nuovo appuntamento per\s*(.+)$/i);
    const appointmentAltTitleMatch = notification.title.match(/^Appuntamento da\s*:$/i);
    if (appointmentTitleMatch || appointmentAltTitleMatch) {
      const clienteName = appointmentTitleMatch ? appointmentTitleMatch[1].trim() : '';
      const message = notification.message || '';
      const lines: string[] = [];

      if (clienteName) {
        lines.push(`Cliente : ${clienteName}`);
      } else {
        const clientMatch = message.match(/^Cliente\s*:\s*(.+)$/m);
        if (clientMatch?.[1]) {
          lines.push(`Cliente : ${clientMatch[1].trim()}`);
        }
      }

      const activityMatch = message.match(/^(?:Attività da svolgere|Attivita' da svolgere|Attivita'\s*:\s*|Attività\s*:\s*)(.+)$/im);
      if (activityMatch?.[1]) {
        lines.push(`Attività da svolgere : ${activityMatch[1].trim()}`);
      } else {
        const activityLineMatch = message.match(/(?:Hai un nuovo appuntamento il\s*\d{4}-\d{2}-\d{2}:?\s*)(.+)$/i);
        if (activityLineMatch?.[1]) {
          lines.push(`Attività da svolgere : ${activityLineMatch[1].trim().replace(/[.。]+$/, '')}`);
        }
      }

      const dateMatch = message.match(/Data Appuntamento\s*:\s*(.+)$/im) || message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (dateMatch?.[1]) {
        const parsed = new Date(dateMatch[1].trim());
        if (!Number.isNaN(parsed.getTime())) {
          lines.push(`Data attività : ${parsed.toLocaleDateString('it-IT')}`);
        } else {
          lines.push(`Data attività : ${dateMatch[1].trim()}`);
        }
      }

      return {
        title: 'Nuovo Appuntamento :',
        lines,
      };
    }

    const avvisoTitleMatch = notification.title.match(/^Nuovo avviso\s*:/i);
    if (avvisoTitleMatch) {
      const message = notification.message || '';
      const lines: string[] = [];
      const clientMatch = message.match(/^Cliente\s*:\s*(.+)$/m);
      const msgMatch = message.match(/^Messaggio\s*:\s*(.+)$/m);
      if (clientMatch?.[1]) {
        lines.push(`Cliente : ${clientMatch[1].trim()}`);
      }
      if (msgMatch?.[1]) {
        lines.push(`Avviso : ${msgMatch[1].trim()}`);
      }
      lines.push(`Data avviso : ${new Date(notification.created_at).toLocaleDateString('it-IT')}`);
      return {
        title: notification.title,
        lines,
      };
    }

    return {
      title: notification.title,
      lines: notification.message ? notification.message.split('\n') : [],
    };
  };

  const unreadCount = notifications.filter((item) => item.read === 0).length;

  return (
    <div className="bg-background text-on-surface min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg">Ciao, {userName || 'Giardiniere'}</h1>
            <p className="font-body-md text-on-surface-variant">
              Qui trovi gli appuntamenti e le notifiche a te assegnate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              {unreadCount} notifiche non lette
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center justify-center rounded-full border border-outline-variant bg-surface px-4 text-sm font-bold transition hover:bg-surface-container-high"
            >
              Logout
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-outline-variant bg-surface-container-low p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Notifiche</p>
                <h2 className="font-headline-sm text-headline-sm">Aggiornamenti</h2>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                className="rounded-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface transition hover:bg-surface-container-high"
              >
                Aggiorna
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-on-surface-variant">Caricamento...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Nessuna notifica nuova.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-2xl border p-4 transition ${notification.read === 0 ? 'border-primary/40 bg-primary/10' : 'border-outline-variant bg-surface'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {(() => {
                          const formatted = formatNotification(notification);
                          return (
                            <>
                              <p className="font-label-md text-label-md font-semibold text-on-surface">{formatted.title}</p>
                              <div className="text-sm text-on-surface-variant mt-1 whitespace-pre-wrap overflow-x-auto">
                                {formatted.lines.map((line, index) => (
                                  <p key={index} className="whitespace-nowrap">
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {notification.read === 0 ? (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(notification.id)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-surface text-on-surface transition hover:bg-surface-container-high"
                          aria-label="Segna come letta"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle_outline</span>
                        </button>
                      ) : (
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-outline-variant bg-surface-container-low p-5 shadow-sm">
            <div className="mb-4">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Appuntamenti</p>
              <h2 className="font-headline-sm text-headline-sm">I tuoi lavori</h2>
            </div>
            {loading ? (
              <p className="text-sm text-on-surface-variant">Caricamento...</p>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Nessun appuntamento assegnato.</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-2xl border border-outline-variant bg-surface p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-label-md text-label-md font-semibold text-on-surface">{appointment.clienteNome}</p>
                        <p className="text-sm text-on-surface-variant">{appointment.data}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {appointment.attivita.length > 0 ? appointment.attivita.join(', ') : 'Nessuna attività'}
                      </div>
                    </div>
                    {appointment.note ? (
                      <p className="mt-3 text-sm text-on-surface-variant">Note: {appointment.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default GiardinierePage;
