import { useState, useReducer } from "react";

const ADMIN_CODE = "admin2024";

const REFLECTION_QUESTIONS = [
  "What progress have you made on your habits so far?",
  "What has been your biggest challenge and how did you handle it?",
  "What has shifted in how you see yourself as a leader?",
  "What will you focus on or adjust going forward?",
];

const PHASES = [
  { label: "Phase 1", days: "Days 1–30", range: [1, 30] },
  { label: "Phase 2", days: "Days 31–60", range: [31, 60] },
  { label: "Phase 3", days: "Days 61–90", range: [61, 90] },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDayNumber(startDate) {
  if (!startDate) return 1;
  const diff = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

function reducer(state, action) {
  switch (action.type) {
    case "LOGIN": return { ...state, view: "app", user: action.user };
    case "ADMIN_LOGIN": return { ...state, view: "admin", user: "admin" };
    case "LOGOUT": return { ...state, view: "login", user: null };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { view: "login", user: null });
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pdp_users") || "{}"); } catch { return {}; }
  });

  const saveUsers = (updated) => {
    setUsers(updated);
    localStorage.setItem("pdp_users", JSON.stringify(updated));
  };

  if (state.view === "login") return <LoginScreen dispatch={dispatch} users={users} saveUsers={saveUsers} />;
  if (state.view === "admin") return <AdminScreen users={users} dispatch={dispatch} />;
  return <ParticipantApp user={state.user} users={users} saveUsers={saveUsers} dispatch={dispatch} />;
}

/* ── Login ── */
function LoginScreen({ dispatch, users, saveUsers }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");

  const s = {
    wrap: { maxWidth: 440, margin: "4rem auto", padding: "0 1.5rem" },
    card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "2rem" },
    label: { fontSize: 13, color: "#666", display: "block", marginBottom: 4 },
    field: { marginBottom: 14 },
    btn: { width: "100%", padding: "10px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 4 },
    tabs: { display: "flex", gap: 8, marginBottom: "1.5rem" },
    tab: (a) => ({ flex: 1, padding: "8px", background: a ? "#f0f0ee" : "transparent", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer", fontSize: 14 }),
    err: { fontSize: 13, color: "#c0392b", marginBottom: 10 },
    hint: { fontSize: 12, color: "#888", marginTop: 12, textAlign: "center" },
  };

  const handleLogin = () => {
    if (adminCode === ADMIN_CODE) { dispatch({ type: "ADMIN_LOGIN" }); return; }
    if (!users[email]) { setError("No account found. Please register first."); return; }
    dispatch({ type: "LOGIN", user: email });
  };

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !cohort.trim()) { setError("Please fill in all fields."); return; }
    if (users[email]) { setError("An account already exists for this email."); return; }
    const u = {
      name, email, cohort, startDate: getToday(), onboarded: false,
      plan: { keyLearnings: "", identityShift: "", strengths: "", habits: [{ action:"",cue:"",craving:"",response:"",reward:"" },{ action:"",cue:"",craving:"",response:"",reward:"" }] },
      checkins: {}, reflections: {}
    };
    saveUsers({ ...users, [email]: u });
    dispatch({ type: "LOGIN", user: email });
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={{ fontSize: 11, color: "#999", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Workshop tool</p>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>Personal Development Tracker</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 1.5rem" }}>90-day habit & reflection tracker</p>

        <div style={s.tabs}>
          {["login","register"].map(m => <button key={m} style={s.tab(mode===m)} onClick={() => { setMode(m); setError(""); }}>{m==="login"?"Sign in":"Register"}</button>)}
        </div>

        {mode === "register" && (
          <>
            <div style={s.field}><label style={s.label}>Full name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></div>
            <div style={s.field}><label style={s.label}>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" /></div>
            <div style={s.field}>
              <label style={s.label}>Cohort</label>
              <input value={cohort} onChange={e=>setCohort(e.target.value)} placeholder="e.g. Cohort 1 – March 2026" />
            </div>
          </>
        )}

        {mode === "login" && (
          <>
            <div style={s.field}><label style={s.label}>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" /></div>
            <div style={s.field}><label style={s.label}>Admin code <span style={{ color:"#bbb" }}>(admins only — leave blank if participant)</span></label><input value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="admin code" /></div>
          </>
        )}

        {error && <p style={s.err}>{error}</p>}
        <button style={s.btn} onClick={mode==="login"?handleLogin:handleRegister}>{mode==="login"?"Sign in":"Create account"}</button>
        {mode === "login" && <p style={s.hint}>No password needed — just your email address to sign in.</p>}
      </div>
    </div>
  );
}

/* ── Participant App ── */
function ParticipantApp({ user, users, saveUsers, dispatch }) {
  const data = users[user];
  const [tab, setTab] = useState(data?.onboarded ? "checkin" : "plan");
  const [plan, setPlan] = useState(data?.plan || { keyLearnings:"", identityShift:"", strengths:"", habits:[{action:"",cue:"",craving:"",response:"",reward:""},{action:"",cue:"",craving:"",response:"",reward:""}] });
  const [saved, setSaved] = useState(false);

  const dayNum = getDayNumber(data?.startDate);
  const currentPhase = PHASES.find(p => dayNum >= p.range[0] && dayNum <= p.range[1]) || PHASES[2];
  const reflectionDue = [30,60,90].includes(dayNum) && !data?.reflections?.[dayNum];

  const streak = (() => {
    let s=0, d=new Date();
    while(true){ const k=d.toISOString().split("T")[0]; if(!data?.checkins?.[k]) break; s++; d.setDate(d.getDate()-1); }
    return s;
  })();

  const savePlan = () => {
    saveUsers({ ...users, [user]: { ...data, plan, onboarded: true } });
    setSaved(true);
    setTimeout(() => { setSaved(false); setTab("checkin"); }, 1000);
  };

  const updateHabit = (i, field, val) => {
    const habits = [...plan.habits];
    habits[i] = { ...habits[i], [field]: val };
    setPlan({ ...plan, habits });
  };

  const s = {
    wrap: { maxWidth: 560, margin: "0 auto", padding: "1.5rem 1rem" },
    tab: (a) => ({ fontSize: 13, padding: "6px 12px", borderRadius: 8, border: a?"1px solid #ccc":"1px solid transparent", background: a?"#f5f5f3":"none", cursor: "pointer" }),
    card: { padding: "12px 16px", border: "1px solid #e5e5e5", borderRadius: 10, marginBottom: 8 },
    label: { fontSize: 13, color: "#666", display: "block", marginBottom: 4 },
    textarea: { width:"100%", boxSizing:"border-box", resize:"vertical", padding:10, border:"1px solid #ddd", borderRadius:8, fontSize:14, fontFamily:"inherit", marginBottom:14 },
    btn: { width:"100%", padding:"10px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" },
    stat: { background:"#f5f5f3", borderRadius:8, padding:"12px", textAlign:"center" },
  };

  // Milestone progress bar
  const milestones = [30, 60, 90];

  return (
    <div style={s.wrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <p style={{ fontSize:11, color:"#999", margin:"0 0 2px", textTransform:"uppercase", letterSpacing:1 }}>Day {dayNum} · {currentPhase.label} · {data?.cohort}</p>
          <h2 style={{ fontSize:18, fontWeight:500, margin:0 }}>Hi, {data?.name?.split(" ")[0]}</h2>
        </div>
        <button onClick={() => dispatch({ type:"LOGOUT" })} style={{ fontSize:13, color:"#999", background:"none", border:"none", cursor:"pointer" }}>Sign out</button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:"1rem" }}>
        {[["Day", dayNum],["Streak", streak+" days"],["Check-ins", Object.keys(data?.checkins||{}).length]].map(([l,v]) => (
          <div key={l} style={s.stat}><p style={{ fontSize:11, color:"#999", margin:"0 0 4px" }}>{l}</p><p style={{ fontSize:18, fontWeight:500, margin:0 }}>{v}</p></div>
        ))}
      </div>

      {/* Milestone tracker */}
      <div style={{ background:"#f5f5f3", borderRadius:10, padding:"12px 16px", marginBottom:"1.5rem" }}>
        <p style={{ fontSize:12, color:"#888", margin:"0 0 10px", textTransform:"uppercase", letterSpacing:1 }}>Milestones</p>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {milestones.map((m, i) => {
            const done = dayNum >= m;
            const hasRefl = !!data?.reflections?.[m];
            return (
              <div key={m} style={{ display:"flex", alignItems:"center", flex: i < milestones.length - 1 ? 1 : "none" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background: hasRefl?"#1a1a1a": done?"#e8e8e8":"#fff", border:"2px solid", borderColor: done?"#1a1a1a":"#ddd", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {hasRefl
                      ? <svg width="14" height="14" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <span style={{ fontSize:11, fontWeight:500, color: done?"#1a1a1a":"#ccc" }}>{m}</span>
                    }
                  </div>
                  <span style={{ fontSize:11, color: done?"#1a1a1a":"#bbb", whiteSpace:"nowrap" }}>Day {m}{hasRefl?" ✓":done?" due":""}</span>
                </div>
                {i < milestones.length - 1 && <div style={{ flex:1, height:2, background: dayNum > m?"#1a1a1a":"#e0e0e0", margin:"0 4px", marginBottom:16 }}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:"1.5rem", borderBottom:"1px solid #eee", paddingBottom:"1rem" }}>
        {[["plan","My plan"],["checkin","Daily check-in"],["history","History"]].map(([t,l]) => (
          <button key={t} style={s.tab(tab===t)} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {reflectionDue && tab !== "reflect" && (
        <div style={{ background:"#fffbe6", border:"1px solid #f0d060", borderRadius:8, padding:"12px 16px", marginBottom:"1rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ margin:0, fontSize:14, color:"#7a6000" }}>Day {dayNum} reflection is due!</p>
          <button onClick={() => setTab("reflect")} style={{ fontSize:13, color:"#7a6000", background:"none", border:"1px solid #d4b000", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Do it now</button>
        </div>
      )}

      {tab === "plan" && (
        <div>
          <p style={{ fontSize:14, color:"#666", marginTop:0 }}>Fill this in once. It guides your 90-day journey.</p>
          {[["keyLearnings","3 key learnings from the workshop","What stood out most to you?"],["identityShift","Who do you want to become?","e.g. A leader who listens before reacting"],["strengths","Strengths you'll build on","What do you already do well that supports this?"]].map(([field,label,ph]) => (
            <div key={field}><label style={s.label}>{label}</label><textarea style={s.textarea} value={plan[field]} onChange={e=>setPlan({...plan,[field]:e.target.value})} placeholder={ph} rows={3}/></div>
          ))}
          {[0,1].map(i => (
            <div key={i} style={{ ...s.card, marginBottom:"1.25rem" }}>
              <p style={{ fontSize:14, fontWeight:500, margin:"0 0 12px" }}>Habit {i+1}</p>
              {[["action","What is the habit?","e.g. Listen fully before responding"],["cue","Make it obvious — what triggers it?","e.g. When a meeting starts"],["craving","Make it attractive — what motivates you?","e.g. I want to be known as a great listener"],["response","Make it easy — how will you simplify it?","e.g. Put phone face-down"],["reward","Make it satisfying — your immediate reward","e.g. Note one thing I learned"]].map(([f,l,ph]) => (
                <div key={f}><label style={s.label}>{l}</label><input value={plan.habits[i][f]} onChange={e=>updateHabit(i,f,e.target.value)} placeholder={ph} style={{ marginBottom:10 }}/></div>
              ))}
            </div>
          ))}
          <button style={s.btn} onClick={savePlan}>{saved?"Saved!":"Save my plan"}</button>
        </div>
      )}

      {tab === "checkin" && <DailyCheckin habits={plan.habits} todayCheckin={data?.checkins?.[getToday()]} onSave={c => saveUsers({...users,[user]:{...data,checkins:{...data.checkins,[getToday()]:c}}})} />}
      {tab === "history" && <History checkins={data?.checkins||{}} habits={plan.habits} reflections={data?.reflections||{}} />}
      {tab === "reflect" && <Reflection dayNum={dayNum} onSave={r => { saveUsers({...users,[user]:{...data,reflections:{...data.reflections,[dayNum]:r}}}); setTab("history"); }} existing={data?.reflections?.[dayNum]} />}
    </div>
  );
}

function DailyCheckin({ habits, todayCheckin, onSave }) {
  const [checks, setChecks] = useState(todayCheckin?.habits || habits.map(() => false));
  const [note, setNote] = useState(todayCheckin?.note || "");
  const [done, setDone] = useState(!!todayCheckin);
  const activeHabits = habits.filter(h => h.action);

  return (
    <div>
      <p style={{ fontSize:14, color:"#666", marginTop:0 }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</p>
      {activeHabits.map((h,i) => (
        <div key={i} onClick={() => !done && setChecks(c=>{ const n=[...c]; n[i]=!n[i]; return n; })} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", border:"1px solid #e5e5e5", borderRadius:10, marginBottom:10, cursor:done?"default":"pointer", background:checks[i]?"#f0faf5":"#fff" }}>
          <div style={{ width:20, height:20, borderRadius:"50%", border:checks[i]?"none":"1.5px solid #ccc", background:checks[i]?"#2ecc71":"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {checks[i] && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:500 }}>Habit {i+1}</p>
            <p style={{ margin:0, fontSize:13, color:"#666" }}>{h.action}</p>
          </div>
        </div>
      ))}
      <div style={{ marginTop:"1rem", marginBottom:"1rem" }}>
        <label style={{ fontSize:13, color:"#666", display:"block", marginBottom:6 }}>Any notes for today? (optional)</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} disabled={done} placeholder="Wins, blockers, observations..." rows={3} style={{ width:"100%", boxSizing:"border-box", resize:"vertical", padding:10, border:"1px solid #ddd", borderRadius:8, fontSize:14, fontFamily:"inherit" }}/>
      </div>
      {!done
        ? <button onClick={() => { onSave({habits:checks,note,date:getToday()}); setDone(true); }} style={{ width:"100%", padding:"10px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" }}>Save today's check-in</button>
        : <p style={{ textAlign:"center", fontSize:14, color:"#27ae60", fontWeight:500 }}>Check-in saved for today!</p>
      }
    </div>
  );
}

function Reflection({ dayNum, onSave, existing }) {
  const [answers, setAnswers] = useState(existing?.answers || REFLECTION_QUESTIONS.map(()=>""));
  const [done, setDone] = useState(!!existing);
  return (
    <div>
      <p style={{ fontSize:14, fontWeight:500, margin:"0 0 4px" }}>Day {dayNum} Reflection</p>
      <p style={{ fontSize:13, color:"#666", marginTop:0, marginBottom:"1.25rem" }}>Take a few minutes to reflect on your journey so far.</p>
      {REFLECTION_QUESTIONS.map((q,i) => (
        <div key={i} style={{ marginBottom:"1.25rem" }}>
          <label style={{ fontSize:14, display:"block", marginBottom:6 }}>{q}</label>
          <textarea value={answers[i]} onChange={e=>{ const a=[...answers]; a[i]=e.target.value; setAnswers(a); }} disabled={done} rows={3} style={{ width:"100%", boxSizing:"border-box", resize:"vertical", padding:10, border:"1px solid #ddd", borderRadius:8, fontSize:14, fontFamily:"inherit" }}/>
        </div>
      ))}
      {!done
        ? <button onClick={() => { onSave({answers,day:dayNum,date:getToday()}); setDone(true); }} style={{ width:"100%", padding:"10px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" }}>Submit reflection</button>
        : <p style={{ textAlign:"center", fontSize:14, color:"#27ae60", fontWeight:500 }}>Reflection saved!</p>
      }
    </div>
  );
}

function History({ checkins, habits, reflections }) {
  const dates = Object.keys(checkins).sort().reverse().slice(0,14);
  const activeHabits = habits.filter(h=>h.action);
  return (
    <div>
      <p style={{ fontSize:14, color:"#666", marginTop:0 }}>Last 14 check-ins</p>
      {dates.length === 0 && <p style={{ fontSize:14, color:"#999" }}>No check-ins yet. Start today!</p>}
      {dates.map(date => {
        const c = checkins[date];
        const done = c.habits?.filter(Boolean).length || 0;
        return (
          <div key={date} style={{ padding:"10px 14px", border:"1px solid #e5e5e5", borderRadius:10, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ margin:0, fontSize:14, fontWeight:500 }}>{new Date(date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</p>
              {c.note && <p style={{ margin:"2px 0 0", fontSize:12, color:"#888" }}>{c.note.slice(0,60)}{c.note.length>60?"…":""}</p>}
            </div>
            <span style={{ fontSize:13, color:done===activeHabits.length?"#27ae60":"#999" }}>{done}/{activeHabits.length} habits</span>
          </div>
        );
      })}
      {Object.keys(reflections).length > 0 && (
        <>
          <p style={{ fontSize:14, fontWeight:500, marginTop:"1.5rem" }}>Milestone reflections</p>
          {Object.entries(reflections).map(([day,r]) => (
            <div key={day} style={{ padding:"10px 14px", border:"1px solid #e5e5e5", borderRadius:10, marginBottom:8 }}>
              <p style={{ margin:"0 0 8px", fontSize:14, fontWeight:500 }}>Day {day} reflection</p>
              {REFLECTION_QUESTIONS.map((q,i) => r.answers?.[i] && <div key={i} style={{ marginBottom:6 }}><p style={{ margin:0, fontSize:12, color:"#888" }}>{q}</p><p style={{ margin:"2px 0 0", fontSize:13 }}>{r.answers[i]}</p></div>)}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Admin ── */
function AdminScreen({ users, dispatch }) {
  const [view, setView] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState("");
  const [cohortFilter, setCohortFilter] = useState("All");
  const [cohortReport, setCohortReport] = useState("");
  const [generatingCohort, setGeneratingCohort] = useState(false);

  const participants = Object.values(users);
  const cohorts = ["All", ...Array.from(new Set(participants.map(u=>u.cohort).filter(Boolean)))];
  const filtered = cohortFilter === "All" ? participants : participants.filter(u=>u.cohort===cohortFilter);

  const totalCheckins = filtered.reduce((sum,u) => sum+Object.keys(u.checkins||{}).length, 0);
  const avgRate = filtered.length === 0 ? 0 : Math.round(filtered.reduce((sum,u) => {
    const day = getDayNumber(u.startDate);
    return sum + (day > 1 ? Math.round((Object.keys(u.checkins||{}).length/(day-1))*100) : 0);
  }, 0) / filtered.length);

  const callAI = async (prompt) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.map(c=>c.text||"").join("\n") || "Unable to generate report.";
  };

  const generateIndividualReport = async (u) => {
    setGenerating(true); setReport("");
    const day = getDayNumber(u.startDate);
    const checkinCount = Object.keys(u.checkins||{}).length;
    const possibleDays = Math.max(day - 1, 1);
    const rate = Math.round((checkinCount / possibleDays) * 100);
    const summary = `Participant: ${u.name}\nCohort: ${u.cohort}\nDay: ${day} of 90\nCheck-ins completed: ${checkinCount}/${possibleDays} (${rate}%)\nKey learnings: ${u.plan?.keyLearnings}\nIdentity shift: ${u.plan?.identityShift}\nStrengths: ${u.plan?.strengths}\nHabit 1: ${u.plan?.habits?.[0]?.action}\nHabit 2: ${u.plan?.habits?.[1]?.action}\nDay 30 reflection: ${JSON.stringify(u.reflections?.[30]||{})}\nDay 60 reflection: ${JSON.stringify(u.reflections?.[60]||{})}\nDay 90 reflection: ${JSON.stringify(u.reflections?.[90]||{})}\nDaily notes: ${Object.values(u.checkins||{}).map(c=>c.note).filter(Boolean).join(" | ")}`;
    try {
      const text = await callAI(`You are a warm and professional learning & development coach writing a personal progress report for a workshop participant named ${u.name}. Address them directly (second person). Format your response using markdown with these exact sections:\n\n# 90-Day Progress Report: ${u.name}\n\n## Quantitative Summary\n(bullet points with key numbers — days completed, check-in rate, milestones reached, reflections submitted)\n\n## Qualitative Insights\n(2-3 paragraphs of warm, personalised insights based on their reflections, notes, and habit data)\n\n## Recommended Next Steps\n(3 specific, numbered, actionable next steps with bold titles)\n\nEnd with an encouraging closing line and note when the next review is. Data:\n\n${summary}`);
      setReport(text);
    } catch { setReport("Error generating report. Please try again."); }
    setGenerating(false);
  };

  const generateCohortReport = async () => {
    setGeneratingCohort(true); setCohortReport("");
    const cohortName = cohortFilter === "All" ? "All Participants" : cohortFilter;
    const summaries = filtered.map(u => {
      const day = getDayNumber(u.startDate);
      const checkinCount = Object.keys(u.checkins||{}).length;
      const rate = day > 1 ? Math.round((checkinCount/(day-1))*100) : 0;
      return `- ${u.name}: Day ${day}, ${checkinCount} check-ins (${rate}%), ${Object.keys(u.reflections||{}).length} reflections. Habits: "${u.plan?.habits?.[0]?.action}" and "${u.plan?.habits?.[1]?.action}". Identity shift: "${u.plan?.identityShift}". Notes: ${Object.values(u.checkins||{}).map(c=>c.note).filter(Boolean).slice(0,3).join(" | ")}`;
    }).join("\n");
    try {
      const text = await callAI(`You are a learning & development consultant writing a cohort-level progress report for a client. Write entirely in third person (refer to participants as "participants", "the cohort", "they", never "you"). Format using markdown:\n\n# Cohort Report: ${cohortName}\n\n## Overview\n(cohort size, average participation rate, milestone completion)\n\n## Quantitative Summary\n(key numbers across the cohort — participation rates, habit completion trends, reflection submissions)\n\n## Qualitative Themes\n(2-3 paragraphs identifying common themes, patterns, shared challenges, and strengths across the cohort based on their data)\n\n## Individual Highlights\n(brief 1-line note on each participant's standout progress or area of focus)\n\n## Recommended Next Steps for the Cohort\n(3 specific recommendations for the facilitator or client on how to support this cohort going forward)\n\nCohort data:\n${summaries}`);
      setCohortReport(text);
    } catch { setCohortReport("Error generating cohort report. Please try again."); }
    setGeneratingCohort(false);
  };

  const exportCSV = () => {
    const rows = [["Name","Email","Cohort","Start Date","Day","Check-ins","Reflections","Habit 1","Habit 2"]];
    filtered.forEach(u => rows.push([u.name,u.email,u.cohort,u.startDate,getDayNumber(u.startDate),Object.keys(u.checkins||{}).length,Object.keys(u.reflections||{}).length,u.plan?.habits?.[0]?.action,u.plan?.habits?.[1]?.action]));
    const csv = rows.map(r=>r.map(c=>`"${c||""}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`${cohortFilter}-participants.csv`; a.click();
  };

  const s = {
    wrap: { maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem" },
    card: { padding: "12px 16px", border: "1px solid #e5e5e5", borderRadius: 10, marginBottom: 8 },
    btn: { fontSize: 13, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 8, background: "none", cursor: "pointer" },
    bigBtn: { width: "100%", padding: "10px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: "1rem" },
    stat: { background: "#f5f5f3", borderRadius: 8, padding: "12px", textAlign: "center" },
    report: { padding: "1.25rem", border: "1px solid #e5e5e5", borderRadius: 10, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" },
  };

  // Simple markdown renderer
  const renderReport = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h2 key={i} style={{ fontSize:18, fontWeight:600, margin:"0 0 12px" }}>{line.slice(2)}</h2>;
      if (line.startsWith("## ")) return <h3 key={i} style={{ fontSize:15, fontWeight:600, margin:"16px 0 6px", borderBottom:"1px solid #eee", paddingBottom:4 }}>{line.slice(3)}</h3>;
      if (line.startsWith("### ")) return <h4 key={i} style={{ fontSize:14, fontWeight:600, margin:"12px 0 4px" }}>{line.slice(4)}</h4>;
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, (_,t) => `<strong>${t}</strong>`);
        return <li key={i} style={{ marginBottom:4, fontSize:14 }} dangerouslySetInnerHTML={{__html:content}}/>;
      }
      if (/^\d+\./.test(line)) {
        const content = line.replace(/\*\*(.*?)\*\*/g, (_,t) => `<strong>${t}</strong>`);
        return <p key={i} style={{ margin:"6px 0", fontSize:14 }} dangerouslySetInnerHTML={{__html:content}}/>;
      }
      if (line.trim() === "") return <br key={i}/>;
      const content = line.replace(/\*\*(.*?)\*\*/g, (_,t) => `<strong>${t}</strong>`);
      return <p key={i} style={{ margin:"4px 0", fontSize:14 }} dangerouslySetInnerHTML={{__html:content}}/>;
    });
  };

  return (
    <div style={s.wrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <p style={{ fontSize:11, color:"#999", margin:"0 0 2px", textTransform:"uppercase", letterSpacing:1 }}>Admin</p>
          <h2 style={{ fontSize:18, fontWeight:500, margin:0 }}>Participant dashboard</h2>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={s.btn} onClick={exportCSV}>Export CSV</button>
          <button onClick={() => dispatch({type:"LOGOUT"})} style={{ fontSize:13, color:"#999", background:"none", border:"none", cursor:"pointer" }}>Sign out</button>
        </div>
      </div>

      {/* Cohort filter */}
      <div style={{ display:"flex", gap:8, marginBottom:"1.25rem", flexWrap:"wrap" }}>
        {cohorts.map(c => (
          <button key={c} onClick={() => { setCohortFilter(c); setView("dashboard"); setReport(""); setCohortReport(""); }} style={{ fontSize:13, padding:"5px 12px", borderRadius:20, border:"1px solid", borderColor: cohortFilter===c?"#1a1a1a":"#ddd", background: cohortFilter===c?"#1a1a1a":"transparent", color: cohortFilter===c?"#fff":"#333", cursor:"pointer" }}>{c}</button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:"1.5rem" }}>
        {[["Participants",filtered.length],["Total check-ins",totalCheckins],["Avg completion",avgRate+"%"]].map(([l,v]) => (
          <div key={l} style={s.stat}><p style={{ fontSize:11, color:"#999", margin:"0 0 4px" }}>{l}</p><p style={{ fontSize:18, fontWeight:500, margin:0 }}>{v}</p></div>
        ))}
      </div>

      {view === "dashboard" && (
        <>
          {/* Cohort AI report */}
          <div style={{ ...s.card, marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:500 }}>Cohort report</p>
                <p style={{ margin:"2px 0 0", fontSize:13, color:"#888" }}>{cohortFilter === "All" ? "All participants" : cohortFilter}</p>
              </div>
              <button style={{ ...s.btn, background: generatingCohort?"#f5f5f3":"#1a1a1a", color: generatingCohort?"#999":"#fff", borderColor:"#1a1a1a" }} onClick={generateCohortReport} disabled={generatingCohort || filtered.length === 0}>
                {generatingCohort ? "Generating…" : "Generate AI cohort report"}
              </button>
            </div>
            {cohortReport && <div style={{ marginTop:"1rem", borderTop:"1px solid #eee", paddingTop:"1rem" }}>{renderReport(cohortReport)}</div>}
          </div>

          <p style={{ fontSize:14, color:"#666", margin:"0 0 12px" }}>Click a participant to view their progress and generate an individual report.</p>
          {filtered.length === 0 && <p style={{ fontSize:14, color:"#999" }}>No participants in this cohort yet.</p>}
          {filtered.map(u => {
            const day = getDayNumber(u.startDate);
            const rate = day > 1 ? Math.round((Object.keys(u.checkins||{}).length/(day-1))*100) : 0;
            const reflCount = Object.keys(u.reflections||{}).length;
            return (
              <div key={u.email} onClick={() => { setSelected(u); setView("detail"); setReport(""); }} style={{ ...s.card, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:500 }}>{u.name}</p>
                  <p style={{ margin:"2px 0 0", fontSize:13, color:"#888" }}>{u.cohort} · Day {day}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:500, color:rate>=70?"#27ae60":rate>=40?"#e67e22":"#e74c3c" }}>{rate}%</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:"#999" }}>{reflCount}/3 reflections</p>
                </div>
              </div>
            );
          })}
        </>
      )}

      {view === "detail" && selected && (
        <div>
          <button onClick={() => { setView("dashboard"); setReport(""); }} style={{ ...s.btn, border:"none", padding:"0 0 12px", color:"#666" }}>← Back</button>
          <h3 style={{ fontSize:16, fontWeight:500, margin:"0 0 2px" }}>{selected.name}</h3>
          <p style={{ fontSize:13, color:"#888", margin:"0 0 1.5rem" }}>{selected.email} · {selected.cohort}</p>

          {/* Milestone checklist */}
          <div style={{ ...s.card, marginBottom:"1.25rem" }}>
            <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:500 }}>Milestone reflections</p>
            <div style={{ display:"flex", gap:12 }}>
              {[30,60,90].map(m => {
                const done = !!selected.reflections?.[m];
                return (
                  <div key={m} style={{ flex:1, padding:"10px", background: done?"#f0faf5":"#fafafa", border:"1px solid", borderColor: done?"#a8e6c8":"#e5e5e5", borderRadius:8, textAlign:"center" }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:500, color: done?"#27ae60":"#999" }}>Day {m}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, color: done?"#27ae60":"#bbb" }}>{done?"Completed":"Not yet"}</p>
                  </div>
                );
              })}
            </div>
            {Object.entries(selected.reflections||{}).map(([day,r]) => (
              <div key={day} style={{ marginTop:12, borderTop:"1px solid #eee", paddingTop:10 }}>
                <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:500 }}>Day {day} responses</p>
                {REFLECTION_QUESTIONS.map((q,i) => r.answers?.[i] && <div key={i} style={{ marginBottom:8 }}><p style={{ margin:0, fontSize:12, color:"#888" }}>{q}</p><p style={{ margin:"2px 0 0", fontSize:13 }}>{r.answers[i]}</p></div>)}
              </div>
            ))}
          </div>

          {[["Key learnings",selected.plan?.keyLearnings],["Identity shift",selected.plan?.identityShift],["Strengths",selected.plan?.strengths]].map(([l,v]) => v && (
            <div key={l} style={{ marginBottom:12 }}><p style={{ margin:0, fontSize:12, color:"#888" }}>{l}</p><p style={{ margin:"2px 0 0", fontSize:14 }}>{v}</p></div>
          ))}

          {selected.plan?.habits?.filter(h=>h.action).map((h,i) => (
            <div key={i} style={{ ...s.card, marginBottom:10 }}>
              <p style={{ margin:"0 0 6px", fontSize:14, fontWeight:500 }}>Habit {i+1}: {h.action}</p>
              {[["Cue",h.cue],["Motivation",h.craving],["Simplification",h.response],["Reward",h.reward]].map(([l,v]) => v && <p key={l} style={{ margin:"2px 0", fontSize:12, color:"#666" }}><strong>{l}:</strong> {v}</p>)}
            </div>
          ))}

          <button style={{ ...s.bigBtn, opacity:generating?0.6:1 }} onClick={() => generateIndividualReport(selected)} disabled={generating}>
            {generating ? "Generating AI report…" : "Generate individual AI report"}
          </button>

          {report && <div style={s.report}>{renderReport(report)}</div>}
        </div>
      )}
    </div>
  );
}
