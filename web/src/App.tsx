import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";
type User = { id: string; email: string; name: string; role: Role; createdAt?: string };
type EventItem = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
  organizerId: string;
  createdAt: string;
};
type EventPage = { data: EventItem[]; page: number; limit: number; total: number };
type Booking = { id: string; userId: string; eventId: string; status: string; createdAt: string };

type AuthMode = "login" | "signup";

const API = "/api";

function decodeToken(token: string): { sub?: string; role?: Role } {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const candidate = body as { error?: { message?: string } | string; message?: string };
    if (typeof candidate.error === "string") return candidate.error;
    if (candidate.error && typeof candidate.error === "object" && candidate.error.message) return candidate.error.message;
    if (candidate.message) return candidate.message;
  }
  return fallback;
}

export default function App() {
  const [events, setEvents] = useState<EventPage>({ data: [], page: 1, limit: 9, total: 0 });
  const [page, setPage] = useState(1);
  const [venue, setVenue] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const canOrganize = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  const pages = Math.max(1, Math.ceil(events.total / events.limit));

  const stats = useMemo(() => {
    const upcoming = events.data.filter((item) => new Date(item.startsAt).getTime() > Date.now()).length;
    const venues = new Set(events.data.map((item) => item.venue)).size;
    return { upcoming, venues, total: events.total };
  }, [events]);

  async function request(path: string, init: RequestInit = {}, retry = true): Promise<{ response: Response; body: any }> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
    const body = await parseResponse(response);
    if (response.status === 401 && retry && accessToken) {
      const refreshed = await refreshSession();
      if (refreshed) return request(path, init, false);
    }
    return { response, body };
  }

  async function refreshSession() {
    try {
      const response = await fetch(`${API}/v1/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        credentials: "include",
      });
      const body = await parseResponse(response);
      if (!response.ok || !body?.accessToken) {
        setAccessToken(null);
        setUser(null);
        return false;
      }
      setAccessToken(body.accessToken);
      const claims = decodeToken(body.accessToken);
      setUser((current) =>
        current ??
        (claims.sub && claims.role
          ? { id: claims.sub, role: claims.role, email: "Authenticated account", name: claims.role === "ADMIN" ? "Administrator" : "Eventify member" }
          : null),
      );
      return true;
    } catch {
      return false;
    }
  }

  async function loadEvents(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "9" });
      if (venue.trim()) params.set("venue", venue.trim());
      if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
      const response = await fetch(`${API}/v1/events?${params}`, { credentials: "include" });
      const body = await parseResponse(response);
      if (!response.ok) throw new Error(errorMessage(body, "Could not load events"));
      setEvents(body);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadEvents(1), refreshSession()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadEvents(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  async function handleAuth(input: { email: string; password: string; name?: string }) {
    const endpoint = authMode === "login" ? "/v1/auth/login" : "/v1/auth/signup";
    const response = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const body = await parseResponse(response);
    if (!response.ok) throw new Error(errorMessage(body, authMode === "login" ? "Login failed" : "Signup failed"));
    setAccessToken(body.accessToken);
    setUser(body.user);
    setAuthOpen(false);
    setNotice(`Welcome ${body.user?.name ?? "back"}.`);
  }

  function signOut() {
    setAccessToken(null);
    setUser(null);
    setBooking(null);
    setNotice("Signed out on this device. Your refresh session remains protected by its HttpOnly cookie until it expires or rotates.");
  }

  async function createBooking(eventId: string) {
    if (!accessToken) return openAuth("login");
    const { response, body } = await request("/v1/bookings", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    });
    if (!response.ok) {
      setNotice(errorMessage(body, "Booking failed"));
      return;
    }
    setBooking(body);
    setNotice("Booking confirmed 🎟️");
  }

  async function cancelBooking() {
    if (!booking) return;
    const { response, body } = await request(`/v1/bookings/${booking.id}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice(errorMessage(body, "Could not cancel booking"));
      return;
    }
    setBooking(body);
    setNotice("Booking cancelled.");
  }

  async function createEvent(input: Omit<EventItem, "id" | "organizerId" | "createdAt">) {
    const { response, body } = await request("/v1/events", { method: "POST", body: JSON.stringify(input) });
    if (!response.ok) throw new Error(errorMessage(body, "Could not create event"));
    setCreateOpen(false);
    setNotice(`“${body.title}” is live.`);
    setPage(1);
    await loadEvents(1);
  }

  async function deleteEvent(item: EventItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const { response, body } = await request(`/v1/events/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice(errorMessage(body, "Could not delete event"));
      return;
    }
    setSelected(null);
    setNotice(`“${item.title}” deleted.`);
    await loadEvents(page);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Eventify home">
          <span className="brand-mark"><Sparkles size={18} /></span>
          Eventify
        </a>
        <nav className="nav-links">
          <a href="#events">Events</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#about">About</a>
        </nav>
        <div className="auth-actions">
          {user ? (
            <>
              <div className="user-chip"><CircleUserRound size={17} /><span>{user.name}</span><b>{user.role}</b></div>
              <button className="ghost-button" onClick={signOut}><LogOut size={17} />Sign out</button>
            </>
          ) : (
            <>
              <button className="ghost-button" onClick={() => openAuth("login")}><LogIn size={17} />Log in</button>
              <button className="primary-button compact" onClick={() => openAuth("signup")}>Create account</button>
            </>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Events that feel worth leaving home for</span>
            <h1>Discover, book, and run remarkable events.</h1>
            <p>Eventify brings public event discovery, secure bookings, and organizer tools into one fast workspace.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#events"><Search size={18} />Explore events</a>
              {canOrganize ? (
                <button className="secondary-button" onClick={() => setCreateOpen(true)}><Plus size={18} />Create an event</button>
              ) : (
                <button className="secondary-button" onClick={() => openAuth("signup")}><TicketCheck size={18} />Join Eventify</button>
              )}
            </div>
          </div>
          <div className="hero-panel">
            <div className="pulse-dot" />
            <span>Live catalog</span>
            <strong>{events.total}</strong>
            <small>events available</small>
            <div className="mini-stats">
              <div><CalendarDays size={18} /><b>{stats.upcoming}</b><span>on this page</span></div>
              <div><MapPin size={18} /><b>{stats.venues}</b><span>venues</span></div>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Platform highlights">
          <div><ShieldCheck size={19} /><span>Role-based access</span></div>
          <div><TicketCheck size={19} /><span>Transactional bookings</span></div>
          <div><RefreshCw size={19} /><span>Rotating refresh sessions</span></div>
          <div><Users size={19} /><span>Ownership protection</span></div>
        </section>

        {notice && <div className="notice"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={17} /></button></div>}

        <section className="events-section" id="events">
          <div className="section-heading">
            <div><span className="eyebrow">Curated by the community</span><h2>Upcoming events</h2></div>
            <span className="result-count">{events.total} total</span>
          </div>

          <form className="filter-bar" onSubmit={(event) => { event.preventDefault(); setPage(1); void loadEvents(1); }}>
            <label><MapPin size={17} /><input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue" /></label>
            <label><CalendarDays size={17} /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" /></label>
            <label><CalendarDays size={17} /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" /></label>
            <button className="primary-button compact" type="submit"><Search size={17} />Filter</button>
            {(venue || from || to) && <button className="ghost-button" type="button" onClick={() => { setVenue(""); setFrom(""); setTo(""); setPage(1); setTimeout(() => void loadEvents(1), 0); }}>Clear</button>}
          </form>

          {loading ? (
            <div className="loading-grid">{Array.from({ length: 6 }).map((_, index) => <div className="skeleton-card" key={index} />)}</div>
          ) : events.data.length === 0 ? (
            <div className="empty-state"><CalendarDays size={36} /><h3>No events found</h3><p>Try widening the date range or clearing the venue filter.</p></div>
          ) : (
            <div className="event-grid">
              {events.data.map((item, index) => (
                <article className="event-card" key={item.id}>
                  <div className={`event-art art-${index % 5}`}>
                    <span>{new Date(item.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    <Sparkles size={24} />
                  </div>
                  <div className="event-card-body">
                    <div className="event-meta"><span><MapPin size={14} />{item.venue}</span><span><Users size={14} />{item.capacity}</span></div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="event-footer">
                      <div><b>{item.priceCents === 0 ? "Free" : `$${(item.priceCents / 100).toFixed(2)}`}</b><span><Clock3 size={13} />{new Date(item.startsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></div>
                      <button className="round-button" onClick={() => setSelected(item)} aria-label={`Open ${item.title}`}><ChevronRight size={19} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17} />Previous</button>
            <span>Page <b>{page}</b> of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next<ChevronRight size={17} /></button>
          </div>
        </section>

        <section className="dashboard-section" id="dashboard">
          <div className="section-heading">
            <div><span className="eyebrow">One account, clear permissions</span><h2>Your Eventify dashboard</h2></div>
          </div>
          <div className="dashboard-grid">
            <div className="dashboard-card featured">
              <ShieldCheck size={25} />
              <h3>{user ? `${user.role} workspace` : "Secure member workspace"}</h3>
              <p>{user ? `Signed in as ${user.email}. Your UI follows the same authorization rules enforced by the API.` : "Log in to book events. Organizer and admin accounts also receive protected event-management controls."}</p>
              {!user && <button className="primary-button compact" onClick={() => openAuth("login")}>Open dashboard</button>}
            </div>
            <div className="dashboard-card">
              <TicketCheck size={25} />
              <h3>Latest booking</h3>
              {booking ? <><p><b>{booking.status}</b><br />Booking ID<br /><code>{booking.id}</code></p>{booking.status !== "CANCELLED" && <button className="danger-link" onClick={() => void cancelBooking()}>Cancel booking</button>}</> : <p>Your newly created booking will appear here for quick access.</p>}
            </div>
            <div className="dashboard-card">
              <CalendarDays size={25} />
              <h3>Organizer controls</h3>
              <p>{canOrganize ? "Create events from this dashboard. Your API enforces event ownership; admins can manage across organizers." : "Organizer controls appear automatically for ORGANIZER and ADMIN accounts."}</p>
              {canOrganize && <button className="secondary-button compact" onClick={() => setCreateOpen(true)}><Plus size={16} />New event</button>}
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <span className="eyebrow">Built for trust</span>
          <h2>The frontend does not replace backend security.</h2>
          <p>Protected actions still pass through JWT authentication, role checks, ownership validation, database constraints, and serializable booking transactions on the Eventify API.</p>
        </section>
      </main>

      <footer><a className="brand" href="#top"><span className="brand-mark"><Sparkles size={16} /></span>Eventify</a><span>Event discovery · Secure bookings · Organizer tools</span></footer>

      {authOpen && <AuthModal mode={authMode} onMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} />}
      {createOpen && <EventFormModal onClose={() => setCreateOpen(false)} onSubmit={createEvent} />}
      {selected && <EventModal item={selected} user={user} canManage={Boolean(user && (user.role === "ADMIN" || user.id === selected.organizerId))} onClose={() => setSelected(null)} onBook={() => void createBooking(selected.id)} onDelete={() => void deleteEvent(selected)} />}
    </div>
  );
}

function AuthModal({ mode, onMode, onClose, onSubmit }: { mode: AuthMode; onMode: (mode: AuthMode) => void; onClose: () => void; onSubmit: (input: { email: string; password: string; name?: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ email, password, ...(mode === "signup" ? { name } : {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal auth-modal" onMouseDown={(e) => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={19} /></button>
    <span className="brand-mark large"><CircleUserRound size={24} /></span>
    <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
    <p>{mode === "login" ? "Log in to book events and access your protected workspace." : "New accounts start as attendees. Organizer/admin permissions are managed by the platform."}</p>
    <form className="stack-form" onSubmit={submit}>
      {mode === "signup" && <label>Name<input required minLength={1} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
      <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
    </form>
    <button className="mode-switch" onClick={() => onMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}</button>
  </div></div>;
}

function EventFormModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: Omit<EventItem, "id" | "organizerId" | "createdAt">) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(100);
  const [price, setPrice] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ title, description, venue, startsAt: new Date(startsAt).toISOString(), capacity, priceCents: Math.round(price * 100) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal wide-modal" onMouseDown={(e) => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={19} /></button><span className="eyebrow">Organizer workspace</span><h2>Create an event</h2>
    <form className="stack-form two-column" onSubmit={submit}>
      <label>Title<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Venue<input required value={venue} onChange={(e) => setVenue(e.target.value)} /></label>
      <label className="span-two">Description<textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label>Starts at<input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
      <label>Capacity<input required min={0} type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label>
      <label>Price (USD)<input required min={0} step="0.01" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
      {error && <div className="form-error span-two">{error}</div>}
      <button className="primary-button span-two" disabled={busy}>{busy ? "Publishing…" : "Publish event"}</button>
    </form>
  </div></div>;
}

function EventModal({ item, user, canManage, onClose, onBook, onDelete }: { item: EventItem; user: User | null; canManage: boolean; onClose: () => void; onBook: () => void; onDelete: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal event-modal" onMouseDown={(e) => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={19} /></button>
    <div className="detail-art"><span>{new Date(item.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}</span><Sparkles size={34} /></div>
    <span className="eyebrow"><MapPin size={14} />{item.venue}</span><h2>{item.title}</h2><p>{item.description}</p>
    <div className="detail-grid"><div><Clock3 size={18} /><span>Starts</span><b>{new Date(item.startsAt).toLocaleString()}</b></div><div><Users size={18} /><span>Capacity</span><b>{item.capacity}</b></div><div><TicketCheck size={18} /><span>Price</span><b>{item.priceCents === 0 ? "Free" : `$${(item.priceCents / 100).toFixed(2)}`}</b></div></div>
    <div className="modal-actions"><button className="primary-button" onClick={onBook}><TicketCheck size={17} />{user ? "Book this event" : "Log in to book"}</button>{canManage && <button className="danger-button" onClick={onDelete}><Trash2 size={17} />Delete</button>}</div>
  </div></div>;
}
