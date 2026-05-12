import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminPage() {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [codice, setCodice] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [indirizzoCliente, setIndirizzoCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [giardinieriCount, setGiardinieriCount] = useState<number>(0);
  const [clientiCount, setClientiCount] = useState<number>(0);
  const [giardinieriList, setGiardinieriList] = useState<Array<{ id: string; username: string; codice: string; created_at: string }>>([]);
  const [clientiList, setClientiList] = useState<Array<{ id: string; nome: string; indirizzo: string; telefono: string }>>([]);
  const [editingGiardiniereId, setEditingGiardiniereId] = useState<string | null>(null);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const statusTimeoutRef = useRef<number | null>(null);
  const nomeClienteRef = useRef<HTMLInputElement | null>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);

  const statusBoxClasses = `fixed top-8 left-1/2 z-50 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-xl px-4 py-3 text-center text-sm font-medium shadow-2xl transition-transform duration-200 ${
    statusType === 'success'
      ? 'bg-tertiary text-on-tertiary border border-tertiary'
      : 'bg-error text-on-error border border-error'
  }`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearInterval(timer);
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const clearStatusAfterDelay = () => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      setStatusType(null);
      statusTimeoutRef.current = null;
    }, 2000);
  };

  const fetchGiardinieri = async () => {
    try {
      const res = await fetch('/api/giardinieri');
      if (!res.ok) {
        console.error('Caricamento giardinieri fallito', res.status);
        return;
      }
      const data = await res.json();
      setGiardinieriList(
        Array.isArray(data.giardinieri)
          ? [...data.giardinieri].sort((a, b) =>
              a.username.localeCompare(b.username, 'it', { sensitivity: 'base' })
            )
          : []
      );
    } catch (error) {
      console.error('Caricamento giardinieri fallito', error);
    }
  };

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/counts');
      if (!res.ok) {
        console.error('Conteggio totali fallito', res.status);
        return;
      }
      const data = await res.json();
      setGiardinieriCount(Number(data.giardinieriCount) || 0);
      setClientiCount(Number(data.clientiCount) || 0);
    } catch (error) {
      console.error('Caricamento conteggi fallito', error);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchGiardinieri();
    fetchClienti();
  }, []);

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setStatusMessage(null);
    setEditingGiardiniereId(null);
    setEditingClienteId(null);
  };

  const handleSelectGiardiniere = (giardiniere: { id: string; username: string; codice: string }) => {
    setEditingGiardiniereId(giardiniere.id);
    setUsername(giardiniere.username);
    setCodice(giardiniere.codice);
  };

  const handleClearGiardiniereForm = () => {
    setEditingGiardiniereId(null);
    setUsername('');
    setCodice('');
    setStatusMessage(null);
    setStatusType(null);
    usernameRef.current?.focus();
  };


  const fetchClienti = async () => {
    try {
      const res = await fetch('/api/clienti');
      if (!res.ok) {
        console.error('Caricamento clienti fallito', res.status);
        return;
      }
      const data = await res.json();
      setClientiList(
        Array.isArray(data.clienti)
          ? [...data.clienti].sort((a, b) =>
              a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' })
            )
          : []
      );
    } catch (error) {
      console.error('Caricamento clienti fallito', error);
    }
  };

  const handleSelectCliente = (cliente: { id: string; nome: string; indirizzo: string; telefono: string }) => {
    setEditingClienteId(cliente.id);
    setNomeCliente(cliente.nome);
    setIndirizzoCliente(cliente.indirizzo);
    setTelefonoCliente(cliente.telefono);
  };

  const handleClearClienteForm = () => {
    setEditingClienteId(null);
    setNomeCliente('');
    setIndirizzoCliente('');
    setTelefonoCliente('');
    setStatusMessage(null);
    setStatusType(null);
    nomeClienteRef.current?.focus();
  };

  const handleCloseForm = () => {
    setSelectedAction(null);
    setUsername('');
    setCodice('');
    setNomeCliente('');
    setIndirizzoCliente('');
    setTelefonoCliente('');
    setEditingGiardiniereId(null);
    setEditingClienteId(null);
    setStatusMessage(null);
    setStatusType(null);
  };

  const handleLogout = () => {
    handleCloseForm();
    navigate('/login', { replace: true });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !codice.trim()) {
      setStatusType('error');
      setStatusMessage('Compila username e codice prima di salvare.');
      clearStatusAfterDelay();
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setStatusType(null);

    try {
      const url = editingGiardiniereId ? `/api/giardinieri/${editingGiardiniereId}` : '/api/giardinieri';
      const method = editingGiardiniereId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), codice: codice.trim() }),
      });

      const text = await response.text();
      let result: { success?: boolean; message?: string } | null = null;

      if (text) {
        try {
          result = JSON.parse(text);
        } catch (parseError) {
          console.warn('Non-JSON response from /api/giardinieri:', text);
        }
      }

      if (!response.ok || (result && result.success === false)) {
        const message = result?.message || `Errore server (${response.status})`;
        throw new Error(message);
      }

      if (!result || result.success !== true) {
        throw new Error('Risposta non valida dal server.');
      }

      setStatusType('success');
      setStatusMessage(editingGiardiniereId ? 'Giardiniere aggiornato con successo.' : 'Dati salvati con successo.');
      await fetchCounts();
      await fetchGiardinieri();
      setEditingGiardiniereId(null);
      setUsername('');
      setCodice('');
      clearStatusAfterDelay();
    } catch (error) {
      console.error(error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : 'Impossibile salvare i dati. Riprova.');
      clearStatusAfterDelay();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCliente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nomeCliente.trim() || !indirizzoCliente.trim()) {
      setStatusType('error');
      setStatusMessage('Nome e indirizzo sono obbligatori.');
      clearStatusAfterDelay();
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setStatusType(null);

    try {
      const url = editingClienteId ? `/api/clienti/${editingClienteId}` : '/api/clienti';
      const method = editingClienteId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeCliente.trim(),
          indirizzo: indirizzoCliente.trim(),
          telefono: telefonoCliente.trim(),
        }),
      });

      const text = await response.text();
      let result: { success?: boolean; message?: string } | null = null;

      if (text) {
        try {
          result = JSON.parse(text);
        } catch (parseError) {
          console.warn('Non-JSON response from /api/clienti:', text);
        }
      }

      if (!response.ok || (result && result.success === false)) {
        const message = result?.message || `Errore server (${response.status})`;
        throw new Error(message);
      }

      if (!result || result.success !== true) {
        throw new Error('Risposta non valida dal server.');
      }

      setStatusType('success');
      setStatusMessage(editingClienteId ? 'Cliente aggiornato con successo.' : 'Cliente salvato con successo.');
      await fetchCounts();
      await fetchClienti();
      setEditingClienteId(null);
      setNomeCliente('');
      setIndirizzoCliente('');
      setTelefonoCliente('');
      clearStatusAfterDelay();
    } catch (error) {
      console.error(error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : 'Impossibile salvare il cliente. Riprova.');
      clearStatusAfterDelay();
    } finally {
      setIsSaving(false);
    }
  };

  const actionButtonClasses = (action: string) =>
    `flex items-center gap-sm p-md rounded-xl transition-all active:scale-95 w-full ${
      selectedAction === action
        ? 'bg-primary text-on-primary border border-primary'
        : 'bg-surface-container-low text-primary border border-surface-tint hover:bg-surface-container-high'
    }`;

  return (
    <div className="bg-background text-on-surface h-screen flex flex-col overflow-hidden admin-page-root">
      <header className="w-full shrink-0 bg-transparent dark:bg-transparent flex items-center justify-between px-edge-margin py-sm h-touch-target-min border-b border-outline-variant z-40">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined admin-page__brand-icon text-primary dark:text-primary-fixed-dim" data-icon="park">
            park
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-primary tracking-tight">
            GeoGiardini
          </h1>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={handleLogout} className="w-touch-target-min h-touch-target-min flex items-center justify-center rounded-full hover:bg-surface-container transition-colors active:scale-95 duration-150" aria-label="Logout">
            <span className="material-symbols-outlined text-on-surface-variant" data-icon="logout">
              logout
            </span>
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className={statusBoxClasses} role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}

      <main className="flex-1 flex flex-col max-w-[720px] mx-auto w-full px-edge-margin overflow-hidden py-md">
        <section className="mb-md shrink-0">
          <h2 className="font-headline-md text-headline-md text-on-primary leading-tight">Benvenuto, Angelo</h2>
        </section>

        <div className="bg-surface-container-low rounded-xl p-sm mb-md flex items-center justify-between border border-outline-variant shrink-0">
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-primary text-3xl" data-icon="schedule">
              schedule
            </span>
            <div>
              <p className="font-label-lg text-label-lg text-on-surface">Oggi è il:</p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ora</p>
            <p className="font-headline-md text-headline-md text-primary">
              {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-sm shrink-0 mb-lg">
          <button
            type="button"
            className={actionButtonClasses('giardinieri')}
            onClick={() => handleActionClick('giardinieri')}
          >
            <span className="material-symbols-outlined text-2xl" data-icon="engineering">
              engineering
            </span>
            <span className="font-label-lg text-label-lg">Giardinieri ({giardinieriCount})</span>
          </button>
          <button
            type="button"
            className={actionButtonClasses('clienti')}
            onClick={() => handleActionClick('clienti')}
          >
            <span className="material-symbols-outlined text-2xl" data-icon="groups">
              groups
            </span>
            <span className="font-label-lg text-label-lg">Clienti ({clientiCount})</span>
          </button>
          <button
            type="button"
            className={actionButtonClasses('attivita')}
            onClick={() => handleActionClick('attivita')}
          >
            <span className="material-symbols-outlined text-2xl" data-icon="assignment_turned_in">
              assignment_turned_in
            </span>
            <span className="font-label-lg text-label-lg">Attività</span>
          </button>
          <button
            type="button"
            className={actionButtonClasses('avvisi')}
            onClick={() => handleActionClick('avvisi')}
          >
            <span className="material-symbols-outlined text-2xl" data-icon="send">
              send
            </span>
            <span className="font-label-lg text-label-lg">Avvisi</span>
          </button>
        </div>

        {selectedAction === 'giardinieri' && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-inverse-surface/20 backdrop-blur-sm p-4 overflow-auto">
            <section
              className="w-full max-w-[720px] max-h-[calc(100vh-3rem)] flex flex-col rounded-[32px] border border-outline-variant bg-surface-container-low shadow-2xl p-6 overflow-hidden"
              style={{
                backgroundImage: 'var(--page-background)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-white text-3xl" data-icon="person_add">
                  person_add
                </span>
                <h3 className="font-label-lg text-xl font-semibold text-white">
                  {editingGiardiniereId ? 'Modifica Giardiniere' : 'Nuovo Giardiniere'}
                </h3>
                <button
                  type="button"
                  className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-sm hover:bg-tertiary-container focus:outline-none focus:ring-2 focus:ring-tertiary-container"
                  onClick={handleClearGiardiniereForm}
                  aria-label="Nuovo giardiniere"
                >
                  +
                </button>
              </div>
              <form className="flex flex-col h-full gap-md" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="font-label-lg text-label-lg text-black font-bold block">Username</label>
                  <input
                    ref={usernameRef}
                    className="w-full h-10 px-4 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-black font-bold"
                    placeholder="Es. m.rossi"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-lg text-label-lg text-black font-bold block">Codice</label>
                  <input
                    className="w-full h-10 px-4 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-black font-bold"
                    placeholder="Es. GARD-2024"
                    type="text"
                    value={codice}
                    onChange={(event) => setCodice(event.target.value)}
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="mb-3">
                    <p className="font-label-lg text-label-lg text-black font-bold">
                      Giardinieri esistenti:<span className="ml-2 text-sm text-black font-bold">{giardinieriList.length}</span>
                    </p>
                  </div>
                  <div className="h-44 overflow-y-auto rounded-2xl border-2 border-outline-variant bg-surface p-2 space-y-2">
                    {giardinieriList.length === 0 ? (
                      <p className="text-sm text-on-surface-variant text-center py-6">Nessun giardiniere presente.</p>
                    ) : (
                      giardinieriList.map((giardiniere) => (
                        <button
                          key={giardiniere.id}
                          type="button"
                          onClick={() => handleSelectGiardiniere(giardiniere)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            editingGiardiniereId === giardiniere.id
                              ? 'border-primary bg-primary/10'
                              : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-high'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-label-lg text-label-lg text-on-surface">{giardiniere.username}</p>
                              <p className="text-sm text-on-surface-variant">Codice: {giardiniere.codice}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 pb-1">
                  <button
                    className="w-full h-10 bg-primary text-on-primary font-label-sm rounded-full active:opacity-90 transition-all shadow-sm"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    className="w-full h-10 border border-primary text-black font-bold font-label-sm rounded-full active:bg-surface-container-high transition-colors"
                    type="button"
                    onClick={handleCloseForm}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {selectedAction === 'clienti' && (
          <div className="fixed inset-0 z-50 grid place-items-start bg-inverse-surface/20 backdrop-blur-sm p-4 pt-4 overflow-auto">
            <section
              className="w-full max-w-[720px] max-h-[calc(100vh-3rem)] flex flex-col rounded-[32px] border border-outline-variant bg-surface-container-low shadow-2xl p-6 overflow-hidden"
              style={{
                backgroundImage: 'var(--page-background)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-white text-3xl" data-icon="groups">
                  groups
                </span>
                <h3 className="font-label-lg text-xl font-semibold text-white">
                  {editingClienteId ? 'Modifica Cliente' : 'Nuovo Cliente'}
                </h3>
                <button
                  type="button"
                  className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-sm hover:bg-tertiary-container focus:outline-none focus:ring-2 focus:ring-tertiary-container"
                  onClick={handleClearClienteForm}
                  aria-label="Nuovo cliente"
                >
                  +
                </button>
              </div>
              <form className="flex flex-col h-full gap-md" onSubmit={handleSaveCliente}>
                <div className="space-y-2">
                  <label className="font-label-lg text-label-lg text-black font-bold block">Nome cliente</label>
                  <input
                    ref={nomeClienteRef}
                    className="w-full h-10 px-4 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-black font-bold"
                    placeholder="Es. Mario Rossi"
                    type="text"
                    value={nomeCliente}
                    onChange={(event) => setNomeCliente(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-lg text-label-lg text-black font-bold block">Indirizzo</label>
                  <input
                    className="w-full h-10 px-4 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-black font-bold"
                    placeholder="Es. Via Roma 1"
                    type="text"
                    value={indirizzoCliente}
                    onChange={(event) => setIndirizzoCliente(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-lg text-label-lg text-black font-bold block">Telefono</label>
                  <div className="flex items-center gap-4">
                    <input
                      className="w-full max-w-[8rem] h-10 px-4 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-black font-bold"
                      placeholder="Es. 345 123 4567"
                      type="text"
                      value={telefonoCliente}
                      onChange={(event) => setTelefonoCliente(event.target.value)}
                    />
                    <div className="ml-auto flex items-center gap-2 text-sm font-bold text-black">
                      <span>Attivo :</span>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 accent-primary" />
                        Check
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="mb-3">
                    <p className="font-label-lg text-label-lg text-black font-bold">
                      Clienti esistenti:<span className="ml-2 text-sm text-black font-bold">{clientiList.length}</span>
                    </p>
                  </div>
                  <div className="h-40 overflow-y-auto rounded-2xl border-2 border-outline-variant bg-surface p-2 space-y-2">
                    {clientiList.length === 0 ? (
                      <p className="text-sm text-on-surface-variant text-center py-6">Nessun cliente presente.</p>
                    ) : (
                      clientiList.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => handleSelectCliente(cliente)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            editingClienteId === cliente.id
                              ? 'border-primary bg-primary/10'
                              : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-high'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-label-lg text-label-lg text-on-surface truncate">{cliente.nome}</p>
                            <span className="text-sm text-on-surface-variant whitespace-nowrap">
                              {cliente.telefono || 'Nessun telefono'}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 pb-1">
                  <button
                    className="w-full h-10 bg-primary text-on-primary font-label-sm rounded-full active:opacity-90 transition-all shadow-sm"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    className="w-full h-10 border border-primary text-black font-bold font-label-sm rounded-full active:bg-surface-container-high transition-colors"
                    type="button"
                    onClick={handleCloseForm}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>

    </div>
  );
}

export default AdminPage;
