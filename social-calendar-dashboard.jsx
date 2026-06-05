import { useState, useEffect, useRef } from "react";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", color: "#E1306C", bg: "#fce4ec", icon: "ti-brand-instagram" },
  { id: "twitter", name: "Twitter / X", color: "#000000", bg: "#f5f5f5", icon: "ti-brand-x" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", bg: "#e3f2fd", icon: "ti-brand-linkedin" },
  { id: "facebook", name: "Facebook", color: "#1877F2", bg: "#e8f0fe", icon: "ti-brand-facebook" },
  { id: "youtube", name: "YouTube", color: "#FF0000", bg: "#ffebee", icon: "ti-brand-youtube" },
  { id: "threads", name: "Threads", color: "#000000", bg: "#f3e5f5", icon: "ti-brand-threads" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const today = new Date();
const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

function getDayKey(year, month, day) {
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [view, setView] = useState("dashboard"); // dashboard | accounts | ai
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [posts, setPosts] = useState({});
  const [accounts, setAccounts] = useState(
    PLATFORMS.map(p => ({ id: p.id, username: "", url: "", notes: "" }))
  );
  const [activePlatforms, setActivePlatforms] = useState(PLATFORMS.map(p => p.id));
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your AI assistant. Ask me anything — SEO tips, caption ideas, goal tracking, or post strategies." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [addAccountModal, setAddAccountModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const aiEndRef = useRef(null);

  useEffect(() => {
    if (aiEndRef.current) aiEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const togglePost = (platformId, dayKey) => {
    setPosts(prev => {
      const key = `${platformId}__${dayKey}`;
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = { posted: true, count: (updated[key]?.count || 0) + 1 };
      }
      return updated;
    });
  };

  const isPosted = (platformId, dayKey) => !!posts[`${platformId}__${dayKey}`];

  const getMonthStats = (platformId) => {
    const days = getDaysInMonth(year, month);
    let count = 0;
    for (let d = 1; d <= days; d++) {
      if (isPosted(platformId, getDayKey(year, month, d))) count++;
    }
    return count;
  };

  const getTotalStreak = (platformId) => {
    let streak = 0;
    let d = today.getDate();
    let m = today.getMonth();
    let y = today.getFullYear();
    while (true) {
      if (isPosted(platformId, getDayKey(y, m, d))) {
        streak++;
        d--;
        if (d < 1) { m--; if (m < 0) { m = 11; y--; } d = getDaysInMonth(y, m); }
      } else break;
    }
    return streak;
  };

  const getTodayGoalStatus = () => {
    const done = PLATFORMS.filter(p =>
      activePlatforms.includes(p.id) && isPosted(p.id, todayStr)
    ).length;
    return { done, total: activePlatforms.length };
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setAiLoading(true);

    const stats = getTodayGoalStatus();
    const context = `You are an AI assistant for a social media calendar dashboard. The user tracks posts on: ${activePlatforms.join(", ")}. Today's goal: ${stats.done}/${stats.total} platforms posted. Month: ${MONTHS[month]} ${year}. Be concise, helpful, and focus on social media strategy, SEO, caption ideas, and engagement tips.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: context,
          messages: [
            ...aiMessages.filter(m => m.role !== "assistant" || aiMessages.indexOf(m) > 0).map(m => ({
              role: m.role,
              content: m.text
            })),
            { role: "user", content: userMsg }
          ]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "Sorry, I couldn't respond right now.";
      setAiMessages(prev => [...prev, { role: "assistant", text }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", text: "Connection error. Please try again." }]);
    }
    setAiLoading(false);
  };

  const renderCalendarRow = (platform) => {
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);

    return (
      <div style={{
        background: "#111318",
        border: "1px solid #1e2130",
        borderRadius: 14,
        padding: "14px 18px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{ minWidth: 148, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: platform.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={`ti ${platform.icon}`} style={{ fontSize: 18, color: platform.color }} aria-hidden="true" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#e8eaf0" }}>{platform.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
              {getMonthStats(platform.id)} posts · {getTotalStreak(platform.id)}🔥
            </p>
          </div>
        </div>
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 3, minWidth: "fit-content" }}>
            {Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) => (
              <div key={week} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                  if (!day) return <div key={i} style={{ width: 22, height: 22 }} />;
                  const key = getDayKey(year, month, day);
                  const posted = isPosted(platform.id, key);
                  const isToday = key === todayStr;
                  return (
                    <button
                      key={i}
                      onClick={() => togglePost(platform.id, key)}
                      title={`${day} ${MONTHS[month]} — ${posted ? "Posted ✓" : "Not posted"}`}
                      style={{
                        width: 22, height: 22, borderRadius: 4, border: "none",
                        cursor: "pointer",
                        background: posted
                          ? platform.color
                          : isToday
                          ? "#1e2130"
                          : "#1a1d27",
                        outline: isToday ? `2px solid ${platform.color}` : "none",
                        outlineOffset: 1,
                        transition: "transform 0.1s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      aria-label={`${platform.name} ${day} ${MONTHS[month]}`}
                    >
                      {posted && (
                        <i className="ti ti-check" style={{ fontSize: 11, color: "#fff" }} aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 48, textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0" }}>{getMonthStats(platform.id)}</p>
          <p style={{ margin: 0, fontSize: 10, color: "#6b7280" }}>posts</p>
        </div>
      </div>
    );
  };

  const { done, total } = getTodayGoalStatus();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d12", fontFamily: "system-ui, sans-serif", color: "#e8eaf0" }}>
      {/* Navbar */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px", borderBottom: "1px solid #1e2130",
        background: "#0e1017", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-calendar-stats" style={{ fontSize: 16, color: "#fff" }} aria-hidden="true" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#e8eaf0" }}>PostTrack</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
            { id: "accounts", icon: "ti-user-circle", label: "Accounts" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                background: view === tab.id ? "#1e2130" : "transparent",
                border: view === tab.id ? "1px solid #2a2f45" : "1px solid transparent",
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                color: view === tab.id ? "#e8eaf0" : "#6b7280",
                fontSize: 13, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </nav>

      {/* Dashboard View */}
      {view === "dashboard" && (
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
          {/* Top Bento Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#111318", border: "1px solid #1e2130", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>Today's goal</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: done === total && total > 0 ? "#4ade80" : "#e8eaf0" }}>
                {done}/{total}
              </p>
              <div style={{ marginTop: 8, height: 4, background: "#1e2130", borderRadius: 999 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: done === total && total > 0 ? "#4ade80" : "#7c3aed", borderRadius: 999, transition: "width 0.4s" }} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>platforms posted</p>
            </div>
            <div style={{ background: "#111318", border: "1px solid #1e2130", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>Month total</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#e8eaf0" }}>
                {PLATFORMS.filter(p => activePlatforms.includes(p.id)).reduce((sum, p) => sum + getMonthStats(p.id), 0)}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>posts across all platforms</p>
            </div>
            <div style={{ background: "#111318", border: "1px solid #1e2130", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>Best streak</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#fb923c" }}>
                {Math.max(0, ...PLATFORMS.filter(p => activePlatforms.includes(p.id)).map(p => getTotalStreak(p.id)))}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>consecutive days</p>
            </div>
            <div style={{ background: "#111318", border: "1px solid #1e2130", borderRadius: 14, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>Active platforms</p>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlatforms(prev =>
                      prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                    )}
                    title={p.name}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                      background: activePlatforms.includes(p.id) ? p.bg : "#1e2130",
                      opacity: activePlatforms.includes(p.id) ? 1 : 0.4,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "opacity 0.2s",
                    }}
                    aria-label={`Toggle ${p.name}`}
                  >
                    <i className={`ti ${p.icon}`} style={{ fontSize: 14, color: activePlatforms.includes(p.id) ? p.color : "#9ca3af" }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Month Nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#e8eaf0" }}>
              {MONTHS[month]} {year}
            </h2>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
                style={{ background: "#1e2130", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#e8eaf0" }}
                aria-label="Previous month"
              >
                <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true" />
              </button>
              <button
                onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
                style={{ background: "#1e2130", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#e8eaf0", fontSize: 12 }}
              >
                Today
              </button>
              <button
                onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
                style={{ background: "#1e2130", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#e8eaf0" }}
                aria-label="Next month"
              >
                <i className="ti ti-chevron-right" style={{ fontSize: 14 }} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8, paddingLeft: 164 }}>
            {DAYS.map(d => (
              <span key={d} style={{ fontSize: 10, color: "#4b5563", width: 22, textAlign: "center", letterSpacing: 0.5 }}>{d}</span>
            ))}
          </div>

          {/* Platform Calendar Rows */}
          <div>
            {PLATFORMS.filter(p => activePlatforms.includes(p.id)).map(platform => (
              <div key={platform.id}>
                {renderCalendarRow(platform)}
              </div>
            ))}
          </div>

          {activePlatforms.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
              <i className="ti ti-eye-off" style={{ fontSize: 40, display: "block", marginBottom: 12 }} aria-hidden="true" />
              <p style={{ margin: 0 }}>No platforms selected. Tap platform icons above to enable them.</p>
            </div>
          )}
        </main>
      )}

      {/* Accounts View */}
      {view === "accounts" && (
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#e8eaf0" }}>My Accounts</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PLATFORMS.map(platform => {
              const acc = accounts.find(a => a.id === platform.id);
              return (
                <div key={platform.id} style={{
                  background: "#111318", border: "1px solid #1e2130", borderRadius: 14,
                  padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: platform.bg, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <i className={`ti ${platform.icon}`} style={{ fontSize: 20, color: platform.color }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 500, color: "#e8eaf0" }}>{platform.name}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Username</label>
                        <input
                          type="text"
                          placeholder="@yourusername"
                          value={acc?.username || ""}
                          onChange={e => setAccounts(prev => prev.map(a => a.id === platform.id ? { ...a, username: e.target.value } : a))}
                          style={{
                            width: "100%", background: "#1a1d27", border: "1px solid #2a2f45",
                            borderRadius: 8, padding: "7px 10px", color: "#e8eaf0", fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Profile URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={acc?.url || ""}
                          onChange={e => setAccounts(prev => prev.map(a => a.id === platform.id ? { ...a, url: e.target.value } : a))}
                          style={{
                            width: "100%", background: "#1a1d27", border: "1px solid #2a2f45",
                            borderRadius: 8, padding: "7px 10px", color: "#e8eaf0", fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Notes</label>
                      <textarea
                        placeholder="Target audience, content pillars, posting schedule..."
                        value={acc?.notes || ""}
                        onChange={e => setAccounts(prev => prev.map(a => a.id === platform.id ? { ...a, notes: e.target.value } : a))}
                        rows={2}
                        style={{
                          width: "100%", background: "#1a1d27", border: "1px solid #2a2f45",
                          borderRadius: 8, padding: "7px 10px", color: "#e8eaf0", fontSize: 13,
                          outline: "none", resize: "vertical", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {acc?.url && (
                      <a
                        href={acc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: platform.color, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}
                      >
                        <i className="ti ti-external-link" style={{ fontSize: 12 }} aria-hidden="true" />
                        Open profile
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* AI Floating Chat Bubble */}
      <AiChat
        messages={aiMessages}
        input={aiInput}
        setInput={setAiInput}
        onSend={sendAiMessage}
        loading={aiLoading}
        aiEndRef={aiEndRef}
      />
    </div>
  );
}

function AiChat({ messages, input, setInput, onSend, loading, aiEndRef }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 24, width: 340, height: 460,
          background: "#0e1017", border: "1px solid #1e2130", borderRadius: 16,
          display: "flex", flexDirection: "column", zIndex: 999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e2130", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 50%, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-sparkles" style={{ fontSize: 13, color: "#fff" }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#e8eaf0" }}>AI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }} aria-label="Close AI chat">
              <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                  background: msg.role === "user" ? "#4f46e5" : "#1e2130",
                  color: "#e8eaf0",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: 50%, background: "#6b7280",
                    animation: `bounce 1s ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={aiEndRef} />
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1e2130", display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onSend()}
              placeholder="Ask anything..."
              style={{
                flex: 1, background: "#1a1d27", border: "1px solid #2a2f45", borderRadius: 8,
                padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none",
              }}
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              style={{
                background: "#4f46e5", border: "none", borderRadius: 8, padding: "8px 12px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                color: "#fff", opacity: loading || !input.trim() ? 0.5 : 1,
              }}
              aria-label="Send message"
            >
              <i className="ti ti-send" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: 50%,
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(79,70,229,0.5)", zIndex: 1000,
          transition: "transform 0.2s",
        }}
        aria-label="Toggle AI assistant"
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <i className={`ti ${open ? "ti-x" : "ti-sparkles"}`} style={{ fontSize: 20, color: "#fff" }} aria-hidden="true" />
      </button>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
