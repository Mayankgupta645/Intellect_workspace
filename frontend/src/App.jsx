import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { activities, artwork, clubBrand, clubUpdates, leadership, officialDomains, socialLinks } from "./data/club.js";
import {
  ApiError,
  attendanceIsActive,
  explainApiError,
  getPendingRequestCount,
  isConfigured,
  request,
  unwrapList,
  unwrapObject,
  userCanApproveCore,
  userIsAdmin,
} from "./services/api.js";

const AuthContext = createContext(null);
const ThemeContext = createContext(null);
const domains = [
  "Core Team",
  "Technical",
  "Competitive Programming",
  "Creative",
  "Event Management",
  "Social Media",
];
const years = ["1", "2", "3", "4"];

function useAuth() {
  return useContext(AuthContext);
}

function useTheme() {
  return useContext(ThemeContext);
}

function DashboardIcon({ name, size = 18 }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    attendance: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 10h16m-11 5 2 2 4-4" /></>,
    records: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r=".7" /><circle cx="4" cy="12" r=".7" /><circle cx="4" cy="18" r=".7" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18m0-18a14 14 0 0 0 0 18" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.8 14.2A8.6 8.6 0 0 1 9.8 3.2 8.8 8.8 0 1 0 20.8 14.2Z" />,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  };
  return <svg className="dashboard-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.overview}</svg>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`}>
      <DashboardIcon name={theme === "dark" ? "sun" : "moon"} size={16} />
      <span>{theme === "dark" ? "Light" : "Dark"} mode</span>
    </button>
  );
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => isConfigured("me"));
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!isConfigured("me")) return;
    const controller = new AbortController();
    request("me", { signal: controller.signal })
      .then((data) => setUser(unwrapObject(data)))
      .catch((error) => {
        if (error.name !== "AbortError") {
          if (error.status !== 401 && error.status !== 403) setAuthError(explainApiError(error));
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function login(email, password, role) {
    setAuthError("");
    const data = await request("login", { method: "POST", body: { email, password, role } });
    let account = unwrapObject(data);
    if (!account || typeof account !== "object" || !("email" in account || "role" in account || "id" in account)) {
      if (!isConfigured("me")) {
        throw new ApiError("The login response did not include a profile and no current-user route is configured.");
      }
      account = unwrapObject(await request("me"));
    }
    if (!account || typeof account !== "object") {
      throw new ApiError("The service did not return an authenticated profile.");
    }
    setUser(account);
    return account;
  }

  async function logout() {
    let error = "";
    if (isConfigured("logout")) {
      try {
        await request("logout", { method: "POST" });
      } catch (reason) {
        error = explainApiError(reason);
      }
    } else {
      error = "The browser session was cleared, but the backend logout route is not configured.";
    }
    setUser(null);
    setAuthError(error);
    return error;
  }

  const value = useMemo(
    () => ({ user, loading, authError, login, logout, setAuthError, setUser }),
    [user, loading, authError],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="INTELLECTS home">
      <span className="brand-icon"><img src={clubBrand.logo} alt="" /></span>
      <span className="brand-words">
        <strong>INTELLECTS</strong>
        <small>REVAMPING TECH</small>
      </span>
    </Link>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function Notice({ kind = "info", children, role }) {
  if (!children) return null;
  return <div className={`notice notice-${kind}`} role={role || (kind === "error" ? "alert" : "status")}>{children}</div>;
}

function Intro({ onFinish }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
      const motionReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const duration = motionReduced ? 450 : 3800;
      const startedAt = performance.now();
      let frame;
      function animate(now) {
        const fraction = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - (1 - fraction) ** 2.5;
        const nextProgress = Math.round(eased * 100);
        setProgress(nextProgress);
        if (fraction >= 1) onFinish();
        else frame = window.requestAnimationFrame(animate);
      }
      frame = window.requestAnimationFrame(animate);
      return () => window.cancelAnimationFrame(frame);
  }, [onFinish]);

  return (
      <div className="intro-screen" aria-label="Loading INTELLECTS">
      <div className="intro-stars" aria-hidden="true" />
      <div className="intro-astronaut-scene">
        <img className="intro-astronaut" src={clubBrand.loadingAstronaut} alt="" />
      </div>
      <div className="intro-copy">
          <span className="eyebrow">INTELLECTS · SRM IST RAMAPURAM</span>
          <div className="intro-loading-line"><p>LOADING<span className="loading-dots">...</span></p></div>
          <div className="intro-progress" role="progressbar" aria-label="Loading website" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
          <span className="intro-caption">Please wait — good things are loading.</span>
      </div>
      <button className="intro-skip" onClick={onFinish}>Skip intro <span aria-hidden="true">↗</span></button>
    </div>
  );
}

function ApiLoadingIndicator() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    let pending = 0;
    let shown = false;

    function handleRequestState(event) {
      pending = event.detail?.pending || 0;
      if (pending > 0) {
        if (!timer && !shown) {
          timer = window.setTimeout(() => {
            timer = undefined;
            shown = true;
            setVisible(true);
          }, 500);
        }
        return;
      }
      window.clearTimeout(timer);
      timer = undefined;
      shown = false;
      setVisible(false);
    }

    window.addEventListener("api-request-state", handleRequestState);
    handleRequestState({ detail: { pending: getPendingRequestCount() } });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("api-request-state", handleRequestState);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="api-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <span className="api-loading-spinner" aria-hidden="true" />
      <strong>Please wait — good things are loading.</strong>
      <span>The service may be waking up. This can take a little longer on the first request.</span>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("intellects-theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem("intellects-intro-seen");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("intellects-theme", theme);
    } catch {
      return;
    }
  }, [theme]);

  const themeContext = useMemo(() => ({ theme, toggleTheme: () => setTheme((value) => value === "dark" ? "light" : "dark") }), [theme]);

  function finishIntro() {
    try {
      sessionStorage.setItem("intellects-intro-seen", "true");
    } catch {
      // The intro is optional; storage restrictions should not block the site.
    }
    setShowIntro(false);
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      <AuthProvider>
        {showIntro && <Intro onFinish={finishIntro} />}
        <ApiLoadingIndicator />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginChoice />} />
          <Route path="/member/login" element={<LoginPage mode="member" />} />
          <Route path="/admin/login" element={<LoginPage mode="admin" />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/member" element={<ProtectedRoute admin={false} />}>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="attendance" element={<MemberAttendance />} />
          </Route>
          <Route path="/admin" element={<ProtectedRoute admin />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="attendance" element={<AdminRecords />} />
            <Route path="members" element={<AdminMembersRoute />} />
            <Route path="approvals" element={<AdminApprovalsRoute />} />
          </Route>
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}

function HomePage() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPlaying, setGalleryPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!galleryPlaying || preview) return undefined;
    const interval = window.setInterval(() => {
      setGalleryIndex((index) => (index + 1) % artwork.length);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [galleryPlaying, preview]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const site = document.querySelector(".public-site");
    if (!site || !("IntersectionObserver" in window)) return undefined;

    const revealSelector = [
      ".ticker",
      ".community-copy",
      ".community-photo",
      ".section-heading",
      ".about-copy",
      ".about-stats > div",
      ".domain-card",
      ".team-card",
      ".activity-card",
      ".collection-empty",
      ".gallery-carousel",
      ".update-card",
      ".contact-section > :not(.contact-orb)",
      ".site-footer > *",
    ].join(", ");
    const revealItems = Array.from(site.querySelectorAll(revealSelector));

    revealItems.forEach((item) => {
      const siblings = Array.from(item.parentElement.children).filter((sibling) => sibling.matches(revealSelector));
      item.style.setProperty("--reveal-delay", `${Math.min(siblings.indexOf(item), 5) * 85}ms`);
      item.classList.add("scroll-reveal");
    });

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px 0px" });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="public-site">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span />
          </button>
          <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            {["Home", "About", "Domains", "Activities", "Team", "Gallery", "Events", "Contact"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}>{item}</a>
            ))}
            <ThemeToggle />
            {user
              ? <Link className="nav-cta" to={userIsAdmin(user) ? "/admin/dashboard" : "/member/dashboard"}>Dashboard <span>↗</span></Link>
              : <Link className="nav-cta" to="/login">Member login <span>↗</span></Link>}
          </nav>
        </div>
      </header>

      <section
        className="hero-section"
        id="home"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
          event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.removeProperty("--pointer-x");
          event.currentTarget.style.removeProperty("--pointer-y");
        }}
      >
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-earth" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-tag"><span className="pulse-dot" /> {clubBrand.subline}</div>
          <h1>INTELLECTS<br /><span>REVAMPING TECH.</span></h1>
          <p>{clubBrand.about}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#about">Explore the club <span>↗</span></a>
            <Link className="button button-ghost" to="/member/login">Member login <span>→</span></Link>
          </div>
          <div className="hero-footnote"><span className="hero-line" /> {clubBrand.tagline} · {clubBrand.instagramBio}</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-halo" />
          <img src={clubBrand.astronaut} alt="" />
          <span className="hero-coordinate">13°01' N<br />80°10' E</span>
          <span className="hero-club-label">INNOVATE / BUILD / INSPIRE</span>
        </div>
        <div className="hero-scroll">SCROLL TO EXPLORE <span>↓</span></div>
      </section>

      <section className="ticker" aria-label="Club values"><span>INNOVATE</span><i>✳</i><span>BUILD</span><i>✳</i><span>INSPIRE</span><i>✳</i><span>REVAMPING TECH</span></section>

      <section className="community-feature" aria-labelledby="community-title">
        <div className="community-copy">
          <span className="eyebrow">A club built together</span>
          <h2 id="community-title">Good ideas start<br /><span>with good people.</span></h2>
          <p>Meet the students who bring INTELLECTS to life at SRM IST Ramapuram.</p>
          <a className="text-link" href="#team">Meet the team <span>↗</span></a>
        </div>
        <figure className="community-photo">
          <img src={clubBrand.groupPhoto} alt="INTELLECTS students gathered together in a computer lab" />
          <figcaption><DashboardIcon name="users" size={15} /> The INTELLECTS community</figcaption>
        </figure>
      </section>

      <section className="section about-section" id="about">
        <SectionHeading number="01" label="Who we are" title={<>Curiosity is our<br /><span>starting point.</span></>} />
        <div className="about-copy">
          <p className="lead-copy">{clubBrand.about}</p>
          <p className="body-copy">Based at SRM IST Ramapuram, INTELLECTS brings students together through technical learning, leadership, creativity, and collaborative projects. The club welcomes students across skill levels and domains.</p>
          <a className="text-link" href="#activities">Discover how we learn <span>↗</span></a>
        </div>
        <div className="about-stats">
          <div><span className="stat-symbol">✳</span><strong>Learn</strong><small>Stay curious, keep exploring</small></div>
          <div><span className="stat-symbol">⌘</span><strong>Build</strong><small>Turn new ideas into practice</small></div>
          <div><span className="stat-symbol">↗</span><strong>Grow</strong><small>Make progress together</small></div>
        </div>
      </section>

      <section className="section domains-section" id="domains">
        <SectionHeading number="02" label="Find your domain" title={<>Different strengths.<br /><span>One club.</span></>} note="Domains listed by the INTELLECTS club website." />
        <div className="domain-grid">
          {officialDomains.map((domain, index) => <article className="domain-card" key={domain}><span>{String(index + 1).padStart(2, "0")}</span><h3>{domain}</h3><i aria-hidden="true">↗</i></article>)}
        </div>
      </section>

      <section className="section team-section" id="team">
        <SectionHeading number="03" label="The people" title={<>Meet the<br /><span>leadership team.</span></>} note="Leadership details from the club website and the latest team updates." />
        <div className="placeholder-team">
          {leadership.map((member) => (
            <article className="team-card" key={`${member.name}-${member.role}`}>
              <div className="team-portrait"><img src={member.image} alt={member.name} loading="lazy" /></div>
              <div className="team-card-meta"><span><strong>{member.name}</strong><small>{member.role}</small></span><span>{member.team}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section activity-section" id="activities">
        <SectionHeading number="04" label="What we do" title={<>Learn by doing.<br /><span>Build together.</span></>} note="Challenges, workshops, and project activities at INTELLECTS." />
        {activities.length ? <div className="activity-grid">
          {activities.map((activity, index) => (
            <article className="activity-card" key={activity.title}>
              <div className="activity-image"><img src={activity.image} alt="" loading="lazy" /></div>
              <span className="activity-number">{String(index + 1).padStart(2, "0")} / {activity.category}</span>
              <h3>{activity.title}</h3><p>{activity.description}</p>
            </article>
          ))}
        </div> : <EmptyCollection title="More club moments are on the way." detail="We’ll share activities here when the team is ready to feature them." />}
      </section>

      <section className="section gallery-section" id="gallery">
        <SectionHeading number="05" label="From the club" title={<>Moments from<br /><span>our community.</span></>} note="A few snapshots from INTELLECTS workshops, challenges, and club activities." />
        <div className="gallery-carousel">
          <div className="gallery-viewport" aria-live="polite">
            <div className="gallery-track" style={{ width: `${artwork.length * 100}%`, transform: `translateX(-${galleryIndex * (100 / artwork.length)}%)` }}>
              {artwork.map((item, index) => (
                <button
                  className="gallery-slide"
                  key={item.title}
                  onClick={() => setPreview(item)}
                  aria-label={`Preview ${item.title}`}
                  aria-hidden={galleryIndex !== index}
                  tabIndex={galleryIndex === index ? 0 : -1}
                  style={{ flexBasis: `${100 / artwork.length}%` }}
                >
                  <img src={item.image} alt="" loading="lazy" />
                  <span className="gallery-slide-shade" aria-hidden="true" />
                  <span className="art-label">{item.title}<small>{item.category}</small></span>
                  <span className="art-zoom" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
          <div className="gallery-controls">
            <div className="gallery-dots" role="group" aria-label="Choose a gallery slide">
              {artwork.map((item, index) => (
                <button
                  key={item.title}
                  className={`gallery-dot${galleryIndex === index ? " active" : ""}`}
                  onClick={() => setGalleryIndex(index)}
                  aria-label={`Show slide ${index + 1}: ${item.title}`}
                  aria-pressed={galleryIndex === index}
                />
              ))}
            </div>
            <span className="gallery-count">{String(galleryIndex + 1).padStart(2, "0")} / {String(artwork.length).padStart(2, "0")}</span>
            <div className="gallery-arrows">
              <button
                type="button"
                onClick={() => setGalleryPlaying((playing) => !playing)}
                aria-label={galleryPlaying ? "Pause automatic gallery" : "Play automatic gallery"}
                title={galleryPlaying ? "Pause slideshow" : "Play slideshow"}
              >
                {galleryPlaying ? "Ⅱ" : "▶"}
              </button>
              <button type="button" onClick={() => setGalleryIndex((index) => (index - 1 + artwork.length) % artwork.length)} aria-label="Previous gallery slide">←</button>
              <button type="button" onClick={() => setGalleryIndex((index) => (index + 1) % artwork.length)} aria-label="Next gallery slide">→</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section events-section" id="events">
        <SectionHeading number="06" label="Club updates" title={<>What’s happening<br /><span>in our club.</span></>} note="Updates featured on the club website. No event dates are published here; follow official channels for current schedules." />
        <div className="updates-grid">
          {clubUpdates.map((update) => <article className="update-card" key={update.title}>
            <img src={update.image} alt="" loading="lazy" />
            <div className="update-copy"><span className="event-status">{update.category}</span><h3>{update.title}</h3><p>{update.description}</p><a className="text-link" href={socialLinks[0].href} target="_blank" rel="noreferrer">Follow event updates <span>↗</span></a></div>
          </article>)}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-orb" aria-hidden="true" />
        <span className="eyebrow">{clubBrand.instagramBio}</span>
        <h2>Curious minds<br /><span>belong here.</span></h2>
        <p>Follow INTELLECTS for club news, recruitment, events, and community highlights.</p>
        <Link to="/signup" className="button button-light">Join the community <span>↗</span></Link>
        <div className="social-links">{socialLinks.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noreferrer">{social.name} <span>↗</span></a>)}</div>
      </section>
      <footer className="site-footer">
        <Brand />
        <span>© {new Date().getFullYear()} INTELLECTS · SRM Ramapuram</span>
        <div className="footer-links">{socialLinks.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noreferrer">{social.name}</a>)}<a href="#home">Back to club ↑</a></div>
      </footer>
      <ScrollTrail />
      {preview && <GalleryModal item={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}

const scrollSections = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "domains", label: "Domains" },
  { id: "team", label: "Team" },
  { id: "activities", label: "Activities" },
  { id: "gallery", label: "Gallery" },
  { id: "events", label: "Events" },
  { id: "contact", label: "Contact" },
];

function ScrollTrail() {
  const [activeSection, setActiveSection] = useState("home");
  const activeIndex = scrollSections.findIndex(({ id }) => id === activeSection);

  useEffect(() => {
    let frame = 0;
    function updateActiveSection() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const marker = window.innerHeight * 0.45;
        const current = scrollSections.reduce((active, section) => {
          const element = document.getElementById(section.id);
          return element && element.getBoundingClientRect().top <= marker ? section.id : active;
        }, "home");
        setActiveSection((previous) => previous === current ? previous : current);
      });
    }
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav className="scroll-trail" aria-label="Page progress">
      <span className="scroll-trail-line" aria-hidden="true">
        <span style={{ height: `${Math.max(activeIndex, 0) / (scrollSections.length - 1) * 100}%` }} />
      </span>
      {scrollSections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={activeSection === id ? "active" : ""}
          aria-label={`Scroll to ${label}`}
          aria-current={activeSection === id ? "location" : undefined}
          title={label}
        ><span aria-hidden="true" />{activeSection === id && <small aria-hidden="true">{label}</small>}</a>
      ))}
    </nav>
  );
}

function SectionHeading({ number, label, title, note }) {
  return (
    <div className="section-heading">
      <span className="section-index">{number} <i /> {label}</span>
      <h2>{title}</h2>
      {note && <p className="section-note">{note}</p>}
    </div>
  );
}

function EmptyCollection({ title, detail }) {
  return (
    <div className="collection-empty">
      <span className="empty-club-mark" aria-hidden="true"><DashboardIcon name="overview" size={23} /></span>
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  );
}

function GalleryModal({ item, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="gallery-modal" role="dialog" aria-modal="true" aria-label={`${item.title} preview`}>
        <button className="modal-close" onClick={onClose} aria-label="Close preview">×</button>
        <img src={item.image} alt={item.title} />
        <div className="modal-caption"><strong>{item.title}</strong><span>{item.caption}</span></div>
      </div>
    </div>
  );
}

function LoginChoice() {
  return (
    <AuthPageShell eyebrow="Choose your access" title="Welcome back." subtitle="Select the space that matches your role.">
      <div className="choice-grid">
        <Link className="access-choice" to="/member/login"><span className="choice-icon">✳</span><strong>Member portal</strong><small>Profile and attendance</small><span className="choice-arrow">↗</span></Link>
        <Link className="access-choice admin-choice" to="/admin/login"><span className="choice-icon">⌘</span><strong>Core Team</strong><small>Authorised admin access</small><span className="choice-arrow">↗</span></Link>
      </div>
      <p className="form-foot">New to INTELLECTS? <Link to="/signup">Create a member account</Link></p>
    </AuthPageShell>
  );
}

function AuthPageShell({ eyebrow, title, subtitle, children, wide = false }) {
  return (
    <main className="auth-page">
      <div className="auth-backdrop" style={{ "--auth-mark": `url("${clubBrand.logo}")` }} aria-hidden="true" />
      <header className="auth-top"><Brand /><div className="auth-top-actions"><ThemeToggle /><Link to="/" className="back-home">← Back to home</Link></div></header>
      <section className={`auth-card${wide ? " auth-card-wide" : ""}`}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </section>
      <span className="auth-copyright">INTELLECTS · REVAMPING TECH</span>
    </main>
  );
}

function LoginPage({ mode }) {
  const { login, user, loading, authError } = useAuth();
  const navigate = useNavigate();
  const isAdmin = mode === "admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && (!isAdmin || userIsAdmin(user))) {
      navigate(userIsAdmin(user) ? "/admin/dashboard" : "/member/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (!isAdmin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const account = await login(email.trim(), password, isAdmin ? "core" : "member");
      if (isAdmin && !userIsAdmin(account)) {
        setError("This account is not authorised for Core Team access.");
        navigate("/access-denied", { replace: true });
        return;
      }
      navigate(userIsAdmin(account) ? "/admin/dashboard" : "/member/dashboard", { replace: true });
    } catch (reason) {
      setError(explainApiError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setResetBusy(true);
    try {
      const result = await request("passwordReset", { method: "POST", body: { email: email.trim() } });
      setNotice(result?.message || "The password reset request was accepted by the service.");
    } catch (reason) {
      setError(explainApiError(reason));
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow={isAdmin ? "Core Team · secure access" : "Member access"}
      title={isAdmin ? "Command center." : "Welcome back."}
      subtitle={isAdmin ? "Sign in with your authorised Core Team account." : "Sign in to your member space and pick up where you left off."}
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor={`${mode}-email`}>Email
          <input id={`${mode}-email`} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        </label>
        <div className="field-label">
          <label htmlFor={`${mode}-password`}>Password</label>
          <span className="password-input"><input id={`${mode}-password`} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span>
        </div>
        {isConfigured("passwordReset") && !isAdmin && <button className="inline-action forgot-action" type="button" disabled={resetBusy} onClick={handleReset}>{resetBusy ? "Sending request…" : "Forgot password?"}</button>}
        <Notice kind="error">{error}</Notice><Notice kind="success">{notice}</Notice>
        <Notice kind="info">{authError}</Notice>
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : isAdmin ? "Enter Core Team" : "Sign in"} <span>↗</span></Button>
      </form>
      {isAdmin && <Notice kind="info">Core Team access is available only after an administrator approves your request. Member accounts cannot sign in here.</Notice>}
      <p className="form-foot">{isAdmin ? <>Member instead? <Link to="/member/login">Go to member login</Link></> : <>New to INTELLECTS? <Link to="/signup">Create an account</Link></>}</p>
      <Link className="auth-switch" to={isAdmin ? "/member/login" : "/admin/login"}>{isAdmin ? "Member sign-in" : "Core Team sign-in"} <span>→</span></Link>
    </AuthPageShell>
  );
}

function passwordRules(password) {
  return [
    ["12+ characters", password.length >= 12],
    ["Uppercase and lowercase", /[A-Z]/.test(password) && /[a-z]/.test(password)],
    ["A number", /\d/.test(password)],
    ["A special character", /[^A-Za-z0-9]/.test(password)],
  ];
}

function SignupPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", registerNumber: "", email: "", password: "", confirmPassword: "", domain: "", year: "", class: "", section: "", role: "member" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ kind: "", text: "" });

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validate() {
    const next = {};
    for (const field of ["name", "registerNumber", "email", "password", "confirmPassword", "domain", "year", "class", "section"]) {
      if (!values[field].trim()) next[field] = "This field is required.";
    }
    if (!["member", "core"].includes(values.role)) next.role = "Choose Member or Core Team.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (passwordRules(values.password).some(([, passed]) => !passed)) next.password = "Meet all password requirements.";
    if (values.confirmPassword && values.password !== values.confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ kind: "", text: "" });
    if (!validate()) return;
    if (!isConfigured("register")) {
      setFeedback({ kind: "error", text: "Registration is unavailable until the existing backend route is configured." });
      return;
    }
    setBusy(true);
    try {
      const result = await request("register", {
        method: "POST",
        body: {
          name: values.name.trim(),
          registerNumber: values.registerNumber.trim(),
          email: values.email.trim(),
          password: values.password,
          domain: values.domain,
          year: values.year,
          class: values.class.trim(),
          section: values.section.trim(),
          role: values.role,
        },
      });
      setFeedback({
        kind: "success",
        text: result?.message || (values.role === "core"
          ? "Core Team access requested. An administrator must approve your request before you can sign in."
          : "Member account created successfully."),
      });
      setTimeout(() => navigate(values.role === "core" ? "/admin/login" : "/member/login"), 1200);
    } catch (error) {
      setFeedback({ kind: "error", text: explainApiError(error) });
    } finally {
      setBusy(false);
    }
  }

  const strength = passwordRules(values.password);
  return (
    <AuthPageShell eyebrow="Your next chapter" title="Join the club." subtitle="Create a member account or request access to the Core Team." wide>
      <form className="form-stack signup-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field id="signup-name" label="Full name" value={values.name} onChange={(value) => update("name", value)} error={errors.name} autoComplete="name" />
          <Field id="signup-reg" label="Register number" value={values.registerNumber} onChange={(value) => update("registerNumber", value)} error={errors.registerNumber} />
          <Field id="signup-email" label="Email" type="email" value={values.email} onChange={(value) => update("email", value)} error={errors.email} autoComplete="email" />
          <label className="field-label" htmlFor="signup-role">Account type
            <select id="signup-role" value={values.role} onChange={(event) => update("role", event.target.value)} aria-invalid={Boolean(errors.role)}>
              <option value="member">Member</option>
              <option value="core">Core Team (requires approval)</option>
            </select>{errors.role && <small className="field-error">{errors.role}</small>}
          </label>
          <label className="field-label" htmlFor="signup-domain">Domain
            <select id="signup-domain" value={values.domain} onChange={(event) => update("domain", event.target.value)} aria-invalid={Boolean(errors.domain)}>
              <option value="">Choose a domain</option>{domains.map((domain) => <option key={domain}>{domain}</option>)}
            </select>{errors.domain && <small className="field-error">{errors.domain}</small>}
          </label>
          <label className="field-label" htmlFor="signup-year">Year
            <select id="signup-year" value={values.year} onChange={(event) => update("year", event.target.value)} aria-invalid={Boolean(errors.year)}>
              <option value="">Choose a year</option>{years.map((year) => <option value={year} key={year}>Year {year}</option>)}
            </select>{errors.year && <small className="field-error">{errors.year}</small>}
          </label>
          <Field id="signup-class" label="Class" value={values.class} onChange={(value) => update("class", value)} error={errors.class} />
          <Field id="signup-section" label="Section" value={values.section} onChange={(value) => update("section", value)} error={errors.section} />
          <div className="field-label">
            <label htmlFor="signup-password">Password</label>
            <span className="password-input"><input id="signup-password" type={showPassword ? "text" : "password"} value={values.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" aria-invalid={Boolean(errors.password)} /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span>
            <small className="field-hint">Use 12+ characters, upper and lowercase letters, a number, and a special character.</small>
            {errors.password && <small className="field-error">{errors.password}</small>}
          </div>
          <label className="field-label" htmlFor="signup-confirm">Confirm password
            <input id="signup-confirm" type={showPassword ? "text" : "password"} value={values.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} />
            {errors.confirmPassword && <small className="field-error">{errors.confirmPassword}</small>}
          </label>
        </div>
        <div className="password-checklist" aria-label="Password strength requirements">
          {strength.map(([label, passed]) => <span className={passed ? "passed" : ""} key={label}><i>{passed ? "✓" : "·"}</i>{label}</span>)}
        </div>
        <p className="privacy-note">Member accounts cannot access the Core Team portal. Core Team sign-ups remain locked until an administrator approves them.</p>
        <Notice kind={feedback.kind}>{feedback.text}</Notice>
        <Button type="submit" disabled={busy}>{busy ? "Creating account…" : values.role === "core" ? "Request Core Team access" : "Create member account"} <span>↗</span></Button>
      </form>
      <p className="form-foot">Already registered? <Link to="/member/login">Sign in</Link></p>
    </AuthPageShell>
  );
}

function Field({ id, label, type = "text", value, onChange, error, ...props }) {
  return (
    <label className="field-label" htmlFor={id}>{label}
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function ProtectedRoute({ admin }) {
  const { user, loading, authError } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingPage label="Checking your access…" />;
  if (!user) return <Navigate to={admin ? "/admin/login" : "/member/login"} state={{ from: location.pathname }} replace />;
  if (admin && !userIsAdmin(user)) return <Navigate to="/access-denied" replace />;
  if (!admin && userIsAdmin(user)) return <Navigate to="/admin/dashboard" replace />;
  return <AppShell admin={admin} authError={authError}><Outlet /></AppShell>;
}

function AppShell({ admin, authError, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState("");
  const links = admin
    ? [
      { label: "Overview", path: "/admin/dashboard", icon: "overview" },
      { label: "Attendance records", path: "/admin/attendance", icon: "records" },
      { label: "Members", path: "/admin/members", icon: "users" },
      ...(userCanApproveCore(user) ? [{ label: "Core approvals", path: "/admin/approvals", icon: "users" }] : []),
    ]
    : [
      { label: "Overview", path: "/member/dashboard", icon: "overview" },
      { label: "My profile", path: "/member/profile", icon: "profile" },
      { label: "Attendance", path: "/member/attendance", icon: "attendance" },
    ];

  async function handleLogout() {
    const error = await logout();
    if (error) {
      setLogoutError(error);
      navigate(admin ? "/admin/login" : "/member/login");
    } else {
      navigate("/");
    }
  }

  return (
    <div className={`portal-shell${admin ? " portal-admin" : ""}`}>
      <div className="portal-background-mark" style={{ "--portal-mark": `url("${clubBrand.logo}")` }} aria-hidden="true" />
      <aside className="portal-sidebar">
        <Brand />
        <div className="portal-label">{admin ? "CORE TEAM CONSOLE" : "MEMBER PORTAL"}</div>
        <nav className="portal-nav" aria-label="Dashboard navigation">
          {links.map(({ label, path, icon }) => <Link key={path} to={path} className={location.pathname === path ? "selected" : ""} aria-current={location.pathname === path ? "page" : undefined}><span className="nav-icon"><DashboardIcon name={icon} /></span>{label}</Link>)}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/"><DashboardIcon name="globe" size={16} /> Public website</Link>
          <button className="sidebar-logout" onClick={handleLogout}><DashboardIcon name="logout" size={16} /> <span>Log out</span></button>
        </div>
      </aside>
      <div className="portal-main">
        <header className="portal-topbar">
          <span className="portal-breadcrumb">{admin ? "CORE TEAM / OPERATIONS" : "MEMBER SPACE / OVERVIEW"}</span>
          <div className="portal-top-actions"><ThemeToggle /><div className="portal-user"><MemberAvatar user={user} /><span>{displayName(user)}</span><span className="user-presence" /></div></div>
        </header>
        <div className="portal-content">
          <Notice kind="error">{authError || logoutError}</Notice>
          {children}
        </div>
      </div>
    </div>
  );
}

function initials(user) {
  const name = displayName(user);
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "I";
}

function MemberAvatar({ user, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = user?.profilePicture || user?.avatarUrl;
  return (
    <span className={`user-avatar ${className}`}>
      {image && !imageFailed ? <img src={image} alt="" onError={() => setImageFailed(true)} /> : initials(user)}
    </span>
  );
}

function displayName(user) {
  return user?.name || user?.fullName || user?.email || (userIsAdmin(user) ? "Core Team" : "Member");
}

function LoadingPage({ label }) {
  return <main className="center-state"><span className="loader-mark" /><p>{label}</p></main>;
}

function PageTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-title-row">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  );
}

function DashboardPanel({ children, className = "" }) {
  return <section className={`dashboard-panel ${className}`}>{children}</section>;
}

function MemberDashboard() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const tasks = [
      request("attendanceStatus", { signal: controller.signal }).then(setStatus).catch((error) => {
        if (error.name !== "AbortError") setErrors((items) => [...items, explainApiError(error)]);
      }),
      request("attendanceHistory", { signal: controller.signal }).then((data) => setHistory(unwrapList(data))).catch((error) => {
        if (error.name !== "AbortError" && error.code !== "NOT_CONFIGURED") setErrors((items) => [...items, explainApiError(error)]);
      }),
    ];
    Promise.all(tasks).finally(() => setLoading(false));
    return () => controller.abort();
  }, [submitted]);

  async function submitCode(code) {
    const result = await request("attendanceSubmit", { method: "POST", body: { code } });
    const status = String(result?.attendanceStatus || result?.status || "").toLowerCase();
    const resultCode = String(result?.code || result?.errorCode || "").toUpperCase();
    if (result?.duplicate === true || result?.alreadyAttended === true || ["duplicate", "already_attended", "already-attended"].includes(status)) {
      throw new ApiError(result?.message || "Attendance has already been recorded for this session.", 200, resultCode || "DUPLICATE_ATTENDANCE");
    }
    if (["invalid", "invalid_code", "expired", "session_expired", "inactive", "closed"].includes(status)) {
      const errorCode = resultCode || ({
        invalid: "INVALID_CODE",
        invalid_code: "INVALID_CODE",
        expired: "CODE_EXPIRED",
        session_expired: "SESSION_EXPIRED",
        inactive: "SESSION_INACTIVE",
        closed: "SESSION_INACTIVE",
      })[status];
      throw new ApiError(result?.message || "The attendance code could not be accepted.", 200, errorCode);
    }
    setSubmitted(result);
    return result;
  }

  return (
    <>
      <PageTitle eyebrow="Member dashboard" title={`Welcome, ${displayName(user).split(" ")[0]}.`} subtitle="Your club space, status, and recent activity." action={<Link className="button button-ghost" to="/member/profile">View profile <span>↗</span></Link>} />
      <div className="member-overview-grid">
        <DashboardPanel className="profile-summary">
          <div className="panel-heading"><span className="panel-title"><DashboardIcon name="profile" /> YOUR PROFILE</span><Link to="/member/profile" aria-label="Edit profile"><DashboardIcon name="arrow" size={16} /></Link></div>
          <div className="member-profile-inline"><MemberAvatar user={user} className="large-avatar" /><div><h2>{displayName(user)}</h2><p>{user?.domain || "Domain not supplied"}</p></div></div>
          <div className="profile-detail-row"><span>Register number</span><strong>{user?.registerNumber || "—"}</strong></div>
          <div className="profile-detail-row"><span>Year</span><strong>{user?.year || "—"}</strong></div>
        </DashboardPanel>
        <DashboardPanel className="attendance-summary">
          <div className="panel-heading"><span className="panel-title"><DashboardIcon name="attendance" /> ATTENDANCE SESSION</span><span className={`status-pill ${attendanceIsActive(status) ? "status-on" : "status-off"}`}>{status ? (attendanceIsActive(status) ? "ACTIVE" : attendanceIsActive(status) === false ? "INACTIVE" : "STATUS UNKNOWN") : "UNAVAILABLE"}</span></div>
          {loading ? <div className="inline-loading"><span className="loader-dot" /> Checking session status…</div> : <AttendanceSummary status={status} />}
          <Link to="/member/attendance" className="text-link">Open attendance <span>↗</span></Link>
        </DashboardPanel>
      </div>
      <div className="member-content-grid">
        <AttendanceEntry active={attendanceIsActive(status)} onSubmit={submitCode} latestResult={submitted} />
        <DashboardPanel>
          <div className="panel-heading"><span className="panel-title"><DashboardIcon name="records" /> RECENT ATTENDANCE</span><Link to="/member/attendance">View all <DashboardIcon name="arrow" size={14} /></Link></div>
          {errors.length > 0 && <Notice kind="info">{errors[0]}</Notice>}
          {loading ? <div className="empty-state">Loading attendance history…</div> : history.length
            ? <div className="mini-history">{history.slice(0, 4).map((record, index) => <HistoryRow record={record} key={record.id || index} />)}</div>
            : <div className="empty-state">No attendance history has been returned by the backend.</div>}
        </DashboardPanel>
      </div>
    </>
  );
}

function AttendanceSummary({ status }) {
  if (!status) return <p className="session-message">Session status is unavailable until the attendance API is configured.</p>;
  const active = attendanceIsActive(status);
  const attendance = status.attendance || status.memberAttendance || {};
  const rawMemberStatus = status.memberAttendanceStatus ?? attendance.status;
  const memberStatus = rawMemberStatus ?? (typeof status.hasAttended === "boolean" ? (status.hasAttended ? "Recorded" : "Not recorded") : null);
  const attendanceDate = status.attendanceDate || attendance.date || attendance.createdAt || status.session?.date;
  return (
    <div className="summary-status">
      <span className={`session-glyph ${active ? "glyph-active" : "glyph-inactive"}`}>{active ? "↗" : "—"}</span>
      <div>
        <strong>{active === null ? "Awaiting session state" : active ? "Attendance is open" : "Attendance is closed"}</strong>
        <small>{status.message || status.session?.message || "Status received from the backend."}</small>
        <small className="session-meta">YOUR STATUS · {memberStatus ?? "Not provided"}{attendanceDate ? ` · DATE ${formatDate(attendanceDate)}` : ""}</small>
      </div>
    </div>
  );
}

function AttendanceEntry({ active, onSubmit, latestResult }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!code.trim()) {
      setError("Enter the temporary attendance code.");
      return;
    }
    if (active !== true) {
      setError(active === false ? "Attendance is currently closed." : "The current session status is unavailable.");
      return;
    }
    setBusy(true);
    try {
      const response = await onSubmit(code.trim());
      setResult(response);
      setCode("");
    } catch (reason) {
      setError(explainApiError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPanel className="attendance-entry">
      <div className="panel-heading"><span>SUBMIT ATTENDANCE</span><span className={`status-pill ${active === true ? "status-on" : "status-off"}`}>{active === true ? "OPEN" : active === false ? "CLOSED" : "UNAVAILABLE"}</span></div>
      <p className="panel-description">{active === true ? "Enter the temporary code shared for this session." : active === false ? "Attendance is currently closed." : "Attendance entry is unavailable until the backend session status is confirmed."}</p>
      <form onSubmit={handleSubmit} className="code-form">
        <label className="field-label" htmlFor="attendance-code">Temporary code
          <input id="attendance-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter code" autoComplete="off" disabled={active !== true || busy} />
        </label>
        <Button type="submit" disabled={active !== true || busy}>{busy ? "Submitting…" : "Submit attendance"} <span>↗</span></Button>
      </form>
      <Notice kind="error">{error}</Notice>
      {result && <Notice kind="success">{result.message || "Attendance confirmed by the backend."}{result.date ? ` · ${formatDate(result.date)}` : ""}</Notice>}
      {latestResult && !result && <span className="sr-only">A backend response has been received.</span>}
    </DashboardPanel>
  );
}

function HistoryRow({ record, index }) {
  return (
    <div className="history-row">
      <span className="history-date-mark">{String(index + 1).padStart(2, "0")}</span>
      <span><strong>{record.sessionName || record.eventName || "Attendance"}</strong><small>{formatDate(record.date || record.createdAt || record.timestamp)}</small></span>
      <span className="history-status">{record.status || record.attendanceStatus || "Recorded"}</span>
    </div>
  );
}

function MemberAttendance() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      request("attendanceStatus", { signal: controller.signal }).then(setStatus),
      request("attendanceHistory", { signal: controller.signal }).then((data) => setRecords(unwrapList(data))),
    ]).catch((reason) => {
      if (reason.name !== "AbortError") setError(explainApiError(reason));
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  return (
    <>
      <PageTitle eyebrow="Member space / attendance" title="Your attendance." subtitle="Session status and attendance history supplied by the backend." />
      <DashboardPanel className="records-summary">
        <div className="panel-heading"><span className="panel-title"><DashboardIcon name="attendance" /> CURRENT SESSION</span><span className={`status-pill ${attendanceIsActive(status) ? "status-on" : "status-off"}`}>{status ? attendanceIsActive(status) === null ? "UNKNOWN" : attendanceIsActive(status) ? "ACTIVE" : "INACTIVE" : "UNAVAILABLE"}</span></div>
        <AttendanceSummary status={status} />
        <Link className="button button-primary" to="/member/dashboard">Go to attendance entry <span>↗</span></Link>
      </DashboardPanel>
      <DashboardPanel className="records-panel">
        <div className="panel-heading"><span className="panel-title"><DashboardIcon name="records" /> ATTENDANCE HISTORY</span><span>{records.length} returned</span></div>
        {loading ? <div className="empty-state">Loading records…</div> : error ? <Notice kind="error">{error}</Notice> : records.length ? <HistoryTable records={records} /> : <div className="empty-state">The backend returned no attendance records.</div>}
      </DashboardPanel>
    </>
  );
}

function ProfilePage() {
  const { user, setUser } = useAuth();
  const fields = ["name", "registerNumber", "email", "domain", "post", "year"];
  const profileFields = [...fields, "profilePicture"];
  const editableFields = Array.isArray(user?.editableFields) ? user.editableFields.filter((field) => profileFields.includes(field)) : [];
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => Object.fromEntries(profileFields.map((field) => [field, user?.[field] ?? ""])));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ kind: "", text: "" });
  const [imageBusy, setImageBusy] = useState(false);
  const canEdit = isConfigured("profileUpdate") && editableFields.length > 0;

  function selectProfilePicture(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ kind: "error", text: "Choose a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ kind: "error", text: "Choose an image no larger than 2 MB." });
      return;
    }

    setImageBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setFeedback({ kind: "error", text: "The selected image could not be read." });
      } else {
        setValues((current) => ({ ...current, profilePicture: reader.result }));
        setFeedback({ kind: "", text: "" });
      }
      setImageBusy(false);
    };
    reader.onerror = () => {
      setFeedback({ kind: "error", text: "The selected image could not be read." });
      setImageBusy(false);
    };
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback({ kind: "", text: "" });
    try {
      const payload = Object.fromEntries(editableFields.map((field) => [field, values[field]]));
      const result = await request("profileUpdate", { method: "PATCH", body: payload });
      const updatedUser = unwrapObject(result);
      if (updatedUser && typeof updatedUser === "object" && "email" in updatedUser) {
        setUser(updatedUser);
        setValues((current) => ({ ...current, ...updatedUser }));
      }
      setFeedback({ kind: "success", text: result?.message || "Profile updated successfully." });
      setEditing(false);
    } catch (error) {
      setFeedback({ kind: "error", text: explainApiError(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="Member space / profile" title="Your profile." subtitle="Only information returned by the backend is shown." action={canEdit && !editing ? <Button variant="ghost" onClick={() => setEditing(true)}>Edit profile</Button> : null} />
      <DashboardPanel className="profile-page-panel">
        {!canEdit && <Notice kind="info">Profile editing is unavailable until the backend supplies an editable-fields allowlist and a profile update route.</Notice>}
        {editing ? <form className="profile-edit-form" onSubmit={save}>
          {editableFields.filter((field) => field !== "profilePicture").map((field) => <label className="field-label" key={field}>{profileLabel(field)}
            <input value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} />
          </label>)}
          {editableFields.includes("profilePicture") && <div className="field-label profile-image-editor">
            <span>Profile picture</span>
            <div className="profile-image-preview">
              {values.profilePicture ? <img src={values.profilePicture} alt="Selected profile preview" /> : <MemberAvatar user={user} className="profile-photo" />}
              <label className="button button-ghost profile-image-button">
                {imageBusy ? "Reading image…" : "Choose image"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectProfilePicture} disabled={imageBusy || busy} />
              </label>
              {values.profilePicture && <Button type="button" variant="ghost" onClick={() => setValues((current) => ({ ...current, profilePicture: "" }))}>Remove</Button>}
            </div>
            <small className="field-hint">JPEG, PNG, or WebP · max 2 MB</small>
          </div>}
          <Notice kind={feedback.kind}>{feedback.text}</Notice>
          <div className="button-row"><Button type="submit" disabled={busy || imageBusy}>{busy ? "Saving…" : "Save changes"}</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
        </form> : <div className="profile-data-grid">
          {fields.map((field) => <div className="profile-data" key={field}><small>{profileLabel(field)}</small><strong>{user?.[field] || "Not provided"}</strong></div>)}
          <div className="profile-data"><small>Profile picture</small>{user?.profilePicture || user?.avatarUrl ? <MemberAvatar user={user} className="profile-photo" /> : <strong>Not provided</strong>}</div>
        </div>}
      </DashboardPanel>
    </>
  );
}

function profileLabel(field) {
  return ({ name: "Name", registerNumber: "Register number", email: "Email", domain: "Domain", post: "Post / position", year: "Year", profilePicture: "Profile picture" })[field] || field;
}

function AdminMembersRoute() {
  const { user } = useAuth();
  if (!userIsAdmin(user)) return <Navigate to="/admin/dashboard" replace />;
  return <AdminMembers />;
}

function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    request("adminMembers", { signal: controller.signal })
      .then((data) => setMembers(unwrapList(data)))
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(explainApiError(reason));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const visibleMembers = members.filter((member) => filter === "all" || member.role === filter);
  return (
    <>
      <PageTitle eyebrow="Core Team / directory" title="Registered members." subtitle="Member and Core Team accounts registered with INTELLECTS." />
      <DashboardPanel className="records-panel">
        <div className="panel-heading">
          <span className="panel-title"><DashboardIcon name="users" /> MEMBER DIRECTORY</span>
          <label className="directory-filter">Show
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Everyone</option>
              <option value="member">Members</option>
              <option value="core">Core Team</option>
            </select>
          </label>
        </div>
        {loading ? <div className="empty-state">Loading registered accounts…</div> : error ? <Notice kind="error">{error}</Notice> : visibleMembers.length ? (
          <div className="member-directory">
            {visibleMembers.map((member) => (
              <article className="member-directory-card" key={member.id}>
                <span className="directory-avatar">{member.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "I"}</span>
                <div className="directory-member-details">
                  <strong>{member.name || "Member"}</strong>
                  <small>{member.email}</small>
                  <small>{member.registerNumber || "No register number"} · {member.domain || "No domain"} · Year {member.year || "—"}</small>
                </div>
                <div className="directory-member-status">
                  <span className={`status-pill ${member.role === "core" ? "status-on" : "status-off"}`}>{member.role === "core" ? "CORE TEAM" : "MEMBER"}</span>
                  {member.role === "core" && <small>{member.coreApproval === "approved" ? "Approved" : member.coreApproval === "rejected" ? "Rejected" : "Pending approval"}</small>}
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">No accounts match this filter.</div>}
      </DashboardPanel>
    </>
  );
}

function AdminApprovalsRoute() {
  const { user } = useAuth();
  if (!userCanApproveCore(user)) return <Navigate to="/admin/dashboard" replace />;
  return <AdminApprovals />;
}

function AdminApprovals() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState({ kind: "", text: "" });

  async function refresh(clearFeedback = true) {
    try {
      const data = await request("coreApplications");
      setApplications(unwrapList(data));
      if (clearFeedback) setFeedback({ kind: "", text: "" });
    } catch (error) {
      setFeedback({ kind: "error", text: explainApiError(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function decide(application, decision) {
    setBusy(application.id);
    setFeedback({ kind: "", text: "" });
    try {
      const result = await request("coreApplications", {
        method: "PATCH",
        body: { userId: application.id, decision },
      });
      setFeedback({ kind: "success", text: result?.message || "Application decision saved." });
      await refresh(false);
    } catch (error) {
      setFeedback({ kind: "error", text: explainApiError(error) });
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageTitle eyebrow="Administrator / access control" title="Core Team requests." subtitle="Approve applicants to enable Core Team sign-in, or reject their request." />
      <Notice kind={feedback.kind}>{feedback.text}</Notice>
      <DashboardPanel className="records-panel">
        <div className="panel-heading"><span className="panel-title"><DashboardIcon name="users" /> PENDING APPLICATIONS</span><span>{applications.length} pending</span></div>
        {loading ? <div className="empty-state">Loading applications…</div> : applications.length ? (
          <div className="mini-history">
            {applications.map((application) => (
              <article className="history-row" key={application.id}>
                <span className="history-date-mark"><DashboardIcon name="profile" size={17} /></span>
                <span>
                  <strong>{application.name || "Applicant"}</strong>
                  <small>{application.email} · {application.registerNumber || "No register number"}</small>
                  <small>{application.domain || "No domain"} · Year {application.year || "—"}</small>
                </span>
                <span className="button-row">
                  <Button type="button" disabled={Boolean(busy)} onClick={() => decide(application, "approved")}>{busy === application.id ? "Saving…" : "Approve"}</Button>
                  <Button type="button" variant="danger" disabled={Boolean(busy)} onClick={() => decide(application, "rejected")}>Reject</Button>
                </span>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">There are no pending Core Team requests.</div>}
      </DashboardPanel>
    </>
  );
}

function AdminDashboard() {
  const [status, setStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordData, setRecordData] = useState(null);
  const [totalMembers, setTotalMembers] = useState(null);
  const [codeResult, setCodeResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState({ kind: "", text: "" });

  async function refresh() {
    const [statusResult, recordsResult, membersResult] = await Promise.allSettled([
      request("attendanceStatus"),
      request("adminRecords"),
      request("adminMembers"),
    ]);
    const errors = [];
    if (statusResult.status === "fulfilled") setStatus(statusResult.value);
    else errors.push(explainApiError(statusResult.reason));
    if (recordsResult.status === "fulfilled") {
      setRecordData(recordsResult.value);
      setRecords(unwrapList(recordsResult.value));
    } else errors.push(explainApiError(recordsResult.reason));
    if (membersResult.status === "fulfilled") {
      setTotalMembers(unwrapList(membersResult.value).length);
    } else errors.push(explainApiError(membersResult.reason));
    if (errors.length) setFeedback({ kind: "error", text: [...new Set(errors)].join(" ") });
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function runAdminAction(action) {
    if (action === "deactivate" && !window.confirm("Deactivate the current attendance session?")) return;
    const route = { activate: "adminActivate", generate: "adminGenerateCode", deactivate: "adminDeactivate" }[action];
    setBusy(action);
    setCodeResult(null);
    setFeedback({ kind: "", text: "" });
    try {
      const result = await request(route, { method: "POST" });
      if (action === "activate" || action === "generate") setCodeResult(result);
      if (action === "deactivate") setCodeResult(null);
      setFeedback({ kind: "success", text: result?.message || "The backend confirmed the requested action." });
      await refresh();
    } catch (error) {
      setFeedback({ kind: "error", text: explainApiError(error) });
    } finally {
      setBusy("");
    }
  }

  async function copyCode() {
    const code = codeResult?.code || codeResult?.temporaryCode || codeResult?.data?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(String(code));
      setFeedback({ kind: "success", text: "The code returned by the backend was copied." });
    } catch {
      setFeedback({ kind: "error", text: "Could not copy the code. Select it and copy manually." });
    }
  }

  return (
    <>
      <PageTitle eyebrow="Core Team / operations" title="Operations overview." subtitle="Manage attendance using backend-confirmed session controls." action={<span className="live-indicator"><i /> ADMIN CONSOLE</span>} />
      <Notice kind={feedback.kind}>{feedback.text}</Notice>
      <div className="admin-metric-grid">
        <Metric icon="attendance" label="Attendance session" value={status ? (attendanceIsActive(status) === null ? "Unknown" : attendanceIsActive(status) ? "Active" : "Inactive") : "Unavailable"} detail={status?.session?.name || status?.sessionName || status?.message || "No status data returned"} />
        <Metric icon="records" label="Attendance records" value={recordData ? records.length : "—"} detail={recordData?.totalRecords != null ? `${recordData.totalRecords} total returned` : "Count from current response"} />
        <Metric icon="users" label="Registered members" value={totalMembers ?? "—"} detail={totalMembers == null ? "Loading registered accounts" : "Total member and Core Team accounts"} />
      </div>
      <DashboardPanel className="admin-controls">
        <div className="panel-heading"><span className="panel-title"><DashboardIcon name="attendance" /> SESSION CONTROLS</span><span className={`status-pill ${attendanceIsActive(status) ? "status-on" : "status-off"}`}>{status ? attendanceIsActive(status) === null ? "UNKNOWN" : attendanceIsActive(status) ? "ACTIVE" : "INACTIVE" : "UNAVAILABLE"}</span></div>
        <p className="panel-description">The session and its code stay active until an administrator deactivates the session or refreshes the code.</p>
        <div className="admin-action-row">
          <Button onClick={() => runAdminAction("activate")} disabled={Boolean(busy)}>{busy === "activate" ? "Activating…" : "Activate attendance"} <span>↗</span></Button>
          <Button variant="soft" onClick={() => runAdminAction("generate")} disabled={Boolean(busy)}>{busy === "generate" ? "Refreshing…" : "Refresh code"} <span>⌁</span></Button>
          <Button variant="danger" onClick={() => runAdminAction("deactivate")} disabled={Boolean(busy)}>{busy === "deactivate" ? "Deactivating…" : "Deactivate session"} <span>×</span></Button>
        </div>
        {codeResult && <div className="generated-code">
            <div><small>ACTIVE CODE · BACKEND RESPONSE</small><strong>{codeResult.code || codeResult.temporaryCode || codeResult.data?.code || "The backend response did not include a code field."}</strong><span>{codeResult.session?.name || codeResult.sessionName || "Valid until the session is deactivated or the code is refreshed."}</span></div>
          {(codeResult.code || codeResult.temporaryCode || codeResult.data?.code) && <Button variant="ghost" onClick={copyCode}>Copy code</Button>}
        </div>}
      </DashboardPanel>
      <DashboardPanel className="records-panel">
        <div className="panel-heading"><span className="panel-title"><DashboardIcon name="records" /> RECENT ATTENDANCE RECORDS</span><Link to="/admin/attendance">View all <DashboardIcon name="arrow" size={14} /></Link></div>
        {loading ? <div className="empty-state">Loading records…</div> : records.length ? <HistoryTable records={records.slice(0, 5)} admin /> : <div className="empty-state">No attendance records were returned.</div>}
      </DashboardPanel>
    </>
  );
}

function Metric({ icon, label, value, detail }) {
  return <DashboardPanel className="admin-metric"><span className="metric-label"><i><DashboardIcon name={icon} size={17} /></i>{label}</span><strong>{value}</strong><small>{detail}</small></DashboardPanel>;
}

function AdminRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  useEffect(() => {
    const controller = new AbortController();
    request("adminRecords", { signal: controller.signal })
      .then((data) => setRecords(unwrapList(data)))
      .catch((reason) => { if (reason.name !== "AbortError") setError(explainApiError(reason)); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  const filtered = records.filter((record) => {
    const matchesQuery = [record.name, record.memberName, record.registerNumber, record.email, record.status].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
    const date = record.date || record.createdAt || record.timestamp;
    return matchesQuery && (!selectedDate || localDateKey(date) === selectedDate);
  });
  const pageCount = Math.ceil(filtered.length / pageSize);
  const visibleRecords = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const reportDate = selectedDate
    ? formatLongDate(new Date(`${selectedDate}T12:00:00`))
    : "Select a day to generate a day-specific report";
  return (
    <>
      <PageTitle eyebrow="Core Team / records" title="Attendance records." subtitle="Member identity and attendance details returned by the backend." />
      <DashboardPanel className="records-panel">
        <div className="records-toolbar"><div className="panel-heading"><span>ATTENDANCE RECORDS</span><span>{loading ? "Loading…" : `${filtered.length} shown${selectedDate ? ` for ${formatLongDate(new Date(`${selectedDate}T12:00:00`))}` : ""}`}</span></div><label className="records-date-filter">Attendance day<input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setPage(0); }} /></label><label className="search-field"><span className="sr-only">Search attendance records</span><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search records" /></label><Button type="button" variant="soft" disabled={loading || Boolean(error) || !selectedDate || filtered.length === 0} onClick={() => window.print()}>Generate day PDF</Button></div>
        {loading ? <div className="empty-state">Loading attendance records…</div> : error ? <Notice kind="error">{error}</Notice> : filtered.length ? <>
          <HistoryTable records={visibleRecords} admin />
          {pageCount > 1 && <div className="pagination"><span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span><div><Button variant="ghost" type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button><span>Page {page + 1} of {pageCount}</span><Button variant="ghost" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>}
        </> : <div className="empty-state">{records.length ? "No records match your search." : "The backend returned no attendance records."}</div>}
      </DashboardPanel>
      {!loading && !error && selectedDate && filtered.length > 0 && <section className="attendance-print-report" aria-hidden="true">
        <h1>Intellects Club Attendance on {reportDate}</h1>
        <p className="attendance-report-date">{reportDate}</p>
        <table>
          <thead><tr><th>Member</th><th>Register number</th><th>Role</th><th>Class</th><th>Section</th><th>Session</th><th>Day and date</th><th>Status</th></tr></thead>
          <tbody>{filtered.map((record, index) => <tr key={record.id || `${record.registerNumber || "record"}-${index}`}>
            <td>{record.memberName || record.name || record.email || record.memberId || "—"}</td>
            <td>{record.registerNumber || "—"}</td>
            <td>{record.role || record.post || "—"}</td>
            <td>{record.className || record.class || "—"}</td>
            <td>{record.section || "—"}</td>
            <td>{record.sessionName || record.eventName || record.sessionId || "Attendance"}</td>
            <td>{formatDate(record.date || record.createdAt || record.timestamp)}</td>
            <td>{record.status || record.attendanceStatus || "Recorded"}</td>
          </tr>)}</tbody>
        </table>
        <footer>
          <p>Generate by Intellects Attendance software</p>
          <p>Intellects Workspace phase 1 ( by Intellects Member )</p>
          <div className="attendance-signatures">
            <div><span>VICE PRESIDENT</span><strong>MAYANK GUPTA</strong></div>
            <div><span>PRESIDENT</span><strong>KARTHIK</strong></div>
          </div>
        </footer>
      </section>}
    </>
  );
}

function HistoryTable({ records, admin = false }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>{admin && <><th>Member</th><th>Register number</th></>}<th>Session</th><th>{admin ? "Day, date / time" : "Date / time"}</th><th>Status</th></tr></thead>
        <tbody>{records.map((record, index) => <tr key={record.id || `${record.registerNumber || "record"}-${index}`}>
          {admin && <><td>{record.memberName || record.name || record.email || record.memberId || "—"}</td><td>{record.registerNumber || "—"}</td></>}
          <td>{record.sessionName || record.eventName || record.sessionId || "Attendance"}</td>
          <td>{formatDate(record.date || record.createdAt || record.timestamp)}</td>
          <td><span className="history-status">{record.status || record.attendanceStatus || "Recorded"}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Date not provided";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function localDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(value) {
  return value.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function AccessDenied() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <AuthPageShell eyebrow="Access denied" title="This area is restricted." subtitle="Core Team permissions are verified by the backend. Selecting the admin login does not grant access.">
      <Notice kind="error">Your account is not authorised to open the Core Team console.</Notice>
      <div className="button-row access-actions">{user ? <Button onClick={async () => { const error = await logout(); navigate(error ? "/member/login" : "/"); }}>Log out</Button> : <Link className="button button-primary" to="/member/dashboard">Go to member portal</Link>}<Link className="button button-ghost" to="/">Return home</Link></div>
    </AuthPageShell>
  );
}

function NotFound() {
  return <AuthPageShell eyebrow="404 / off course" title="Page not found." subtitle="This route is not part of the INTELLECTS workspace."><Link className="button button-primary" to="/">Return to homepage <span>↗</span></Link></AuthPageShell>;
}

export default App;
