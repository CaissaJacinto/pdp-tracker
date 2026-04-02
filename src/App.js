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
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const s = {
    wrap: { maxWidth: 420, margin: "4rem auto", padding: "0 1.5rem" },
    card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "2rem" },
    label: { fontSize: 13, color: "#666", display: "block", marginBottom: 4 },
    input: { marginBottom: 14 },
    btn: { width: "100%", padding: "10px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 4 },
    tabs: { display: "flex", gap: 8, marginBottom: "1.5rem" },
    tab: (active) => ({ flex: 1, padding: "8px", background: active ? "#f0f0ee" : "transparent", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer", fontSize: 14 }),
    err: { fontSize: 13, color: "#c0392b", marginBottom: 10 },
    title: { fontSize: 22, fontWeight: 500, margin: "0 0 4px" },
    sub: { fontSize: 14, color: "#666", margin: "0 0 1.5rem" },
  };

  const handleLogin = () => {
    if (code === ADMIN_CODE) { dispatch({ type: "ADMIN_LOGIN" }); return; }
    if (!users[email]) { setError("No account found. Please register first."); return; }
    dispatch({ type: "LOGIN", user: email });
  };

  const handleRegister = () => {
    if (!name.trim() || !email.trim()) { setError("Please fill in all fields."); return; }
    if (users[email]) { setError("An account already exists for this email."); return; }
    const u = { name, email, startDate: getToday(), onboarded: false, plan: { keyLearnings: "", identityShift: "", strengths: "", habits: [{ action:"",cue:"",craving:"",response:"",reward:"" },{ action:"",cue:"",craving:"",response:"",reward:"" }] }, checkins: {}, reflections: {} };
    saveUsers({ ...users, [email]: u });
    dispatch({ type: "LOGIN", user: email });
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={{ fontSize: 11, color: "#999", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Workshop tool</p>
        <h1 style={s.title}>Personal Development Tracker</h1>
        <p style={s.sub}>90-day habit & reflection tracker</p>

        <div style={s.tabs}>
          {["login","register"].map(m => <button key={m} style={s.tab(mode===m)} onClick={() => {setMode(m);setError("");}}>{m==="login"?"Sign in":"Register"}</button>)}
        </div>

        {mode === "register" && <div style={s.input}><label style={s.label}>Full name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></div>}
        <div style={s.input}><label style={s.label}>{mode==="login"?"Email":"Email"}</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" /></div>
        {mode === "login" && <div style={s.input}><label style={s.label}>Admin code (admins only)</label><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Leave blank if participant" /></div>}
        {error && <p style={s.err}>{error}</p>}
        <button style={s.btn} onClick={mode==="login"?handleLogin:handleRegister}>{mode==="login"?"Sign in":"Create account"}</button>
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
    tabs: { display: "flex", gap: 6, marginBottom: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "1rem" },
    tab: (active) => ({ fontSize: 13, padding: "6px 12px", borderRadius: 8, border: active?"1px solid #ccc":"1px solid transparent", background: active?"#f5f5f3":"none", cursor: "pointer" }),
    card: { padding: "12px 16px", border: "1px solid #e5e5e5", borderRadius: 10, marginBottom: 8 },
    label: { fontSize: 13, color: "#666", display: "block", marginBottom: 4 },
    textarea: { width:"100%", boxSizing:"border-box", resize:"vertical", padding:10, border:"1px solid #ddd", borderRadius:8, fontSize:14, fontFamily:"inherit", marginBottom:14 },
    btn: { width:"100%", padding:"10px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" },
    statGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:"1.5rem" },
    stat: { background:"#f5f5f3", borderRadius:8, padding:"12px", textAlign:"center" },
  };

  return (
    <div style={s.wrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <p style={{ fontSize:11, color:"#999", margin:"0 0 2px", textTransform:"uppercase", letterSpacing:1 }}>Day {dayNum} · {currentPhase.label}</p>
          <h2 style={{ fontSize:18, fontWeight:500, margin:0 }}>Hi, {data?.name?.split(" ")[0]}</h2>
        </div>
        <button onClick={() => dispatch({ type:"LOGOUT" })} style={{ fontSize:13, color:"#999", background:"none", border:"none", cursor:"pointer" }}>Sign out</button>
      </div>

      <div style={s.statGrid}>
        {[["Day", dayNum],["Streak", streak+" days"],["Check-ins", Object.keys(data?.checkins||{}).length]].map(([l,v]) => (
          <div key={l} style={s.stat}><p style={{ fontSize:11, color:"#999", margin:"0 0 4px" }}>{l}</p><p style={{ fontSize:18, fontWeight:500, margin:0 }}>{v}</p></div>
        ))}
      </div>

      <div style={s.tabs}>
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
      {dates.length === 0 && <p style={{ fontSize:14, color:"#666" }}>No check-ins yet. Start today!</p>}
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
          <p style={{ fontSize:14, fontWeight:500, marginTop:"1.5rem" }}>Reflections</p>
          {Object.entries(reflections).map(([day,r]) => (
            <div key={day} style={{ padding:"10px 14px", border:"1px solid #e5e5e5", borderRadius:10, marginBottom:8 }}>
              <p style={{ margin:"0 0 8px", fontSize:14, fontWeight:500 }}>Day {day} reflection</p>
              {REFLECTION_QUESTIONS.map((q,i) => r.answers?.[i] && (
                <div key={i} style={{ marginBottom:6 }}>
                  <p style={{ margin:0, fontSize:12, color:"#888" }}>{q}</p>
                  <p style={{ margin:"2px 0 0", fontSize:13 }}>{r.answers[i]}</p>
                </div>
              ))}
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

  const participants = Object.values(users);
  const totalCheckins = participants.reduce((sum,u) => sum + Object.keys(u.checkins||{}).length, 0);
  const avgRate = participants.length === 0 ? 0 : Math.round(participants.reduce((sum,u) => {
    const day = getDayNumber(u.startDate);
    return sum + (day > 1 ? Math.round((Object.keys(u.checkins||{}).length / (day-1)) * 100) : 0);
  }, 0) / participants.length);

  const generateReport = async (u) => {
    setGenerating(true); setReport("");
    const summary = `Participant: ${u.name}\nDay: ${getDayNumber(u.startDate)}\nTotal check-ins: ${Object.keys(u.checkins||{}).length}\nKey learnings: ${u.plan?.keyLearnings}\nIdentity shift: ${u.plan?.identityShift}\nHabit 1: ${u.plan?.habits?.[0]?.action}\nHabit 2: ${u.plan?.habits?.[1]?.action}\nReflections: ${JSON.stringify(u.reflections||{})}\nNotes: ${Object.values(u.checkins||{}).map(c=>c.note).filter(Boolean).join(" | ")}`;
    try {
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
          max_tokens: 1000,
          messages: [{ role: "user", content: `You are a learning & development coach. Based on this participant's 90-day tracker data, write a concise progress report with: (1) quantitative summary, (2) qualitative insights from reflections and notes, (3) 3 specific recommended next steps. Be warm, professional, and actionable.\n\n${summary}` }]
        })
      });
      const data = await res.json();
      setReport(data.content?.map(c=>c.text||"").join("\n") || "Unable to generate report.");
    } catch { setReport("Error generating report. Please try again."); }
    setGenerating(false);
  };

  const exportCSV = () => {
    const rows = [["Name","Email","Start Date","Day","Check-ins","Reflections","Habit 1","Habit 2"]];
    participants.forEach(u => rows.push([u.name,u.email,u.startDate,getDayNumber(u.startDate),Object.keys(u.checkins||{}).length,Object.keys(u.reflections||{}).length,u.plan?.habits?.[0]?.action,u.plan?.habits?.[1]?.action]));
    const csv = rows.map(r=>r.map(c=>`"${c||""}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="participants.csv"; a.click();
  };

  const s = {
    wrap: { maxWidth:680, margin:"0 auto", padding:"1.5rem 1rem" },
    card: { padding:"12px 16px", border:"1px solid #e5e5e5", borderRadius:10, marginBottom:8 },
    btn: { fontSize:13, padding:"6px 12px", border:"1px solid #ddd", borderRadius:8, background:"none", cursor:"pointer" },
    bigBtn: { width:"100%", padding:"10px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer", marginBottom:"1rem" },
    stat: { background:"#f5f5f3", borderRadius:8, padding:"12px", textAlign:"center" },
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

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:"1.5rem" }}>
        {[["Participants",participants.length],["Total check-ins",totalCheckins],["Avg completion",avgRate+"%"]].map(([l,v]) => (
          <div key={l} style={s.stat}><p style={{ fontSize:11, color:"#999", margin:"0 0 4px" }}>{l}</p><p style={{ fontSize:18, fontWeight:500, margin:0 }}>{v}</p></div>
        ))}
      </div>

      {view === "dashboard" && (
        <>
          <p style={{ fontSize:14, color:"#666", margin:"0 0 12px" }}>Click a participant to view their progress and generate a report.</p>
          {participants.length === 0 && <p style={{ fontSize:14, color:"#999" }}>No participants registered yet.</p>}
          {participants.map(u => {
            const day = getDayNumber(u.startDate);
            const rate = day > 1 ? Math.round((Object.keys(u.checkins||{}).length/(day-1))*100) : 0;
            return (
              <div key={u.email} onClick={() => { setSelected(u); setView("detail"); setReport(""); }} style={{ ...s.card, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:500 }}>{u.name}</p>
                  <p style={{ margin:"2px 0 0", fontSize:13, color:"#888" }}>{u.email} · Day {day}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:500, color:rate>=70?"#27ae60":rate>=40?"#e67e22":"#e74c3c" }}>{rate}%</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:"#999" }}>{Object.keys(u.reflections||{}).length} reflections</p>
                </div>
              </div>
            );
          })}
        </>
      )}

      {view === "detail" && selected && (
        <div>
          <button onClick={() => { setView("dashboard"); setReport(""); }} style={{ ...s.btn, border:"none", padding:"0 0 12px", color:"#666", background:"none" }}>← Back</button>
          <h3 style={{ fontSize:16, fontWeight:500, margin:"0 0 2px" }}>{selected.name}</h3>
          <p style={{ fontSize:13, color:"#888", margin:"0 0 1.5rem" }}>{selected.email}</p>

          {[["Key learnings",selected.plan?.keyLearnings],["Identity shift",selected.plan?.identityShift],["Strengths",selected.plan?.strengths]].map(([l,v]) => v && (
            <div key={l} style={{ marginBottom:12 }}>
              <p style={{ margin:0, fontSize:12, color:"#888" }}>{l}</p>
              <p style={{ margin:"2px 0 0", fontSize:14 }}>{v}</p>
            </div>
          ))}

          {selected.plan?.habits?.filter(h=>h.action).map((h,i) => (
            <div key={i} style={{ ...s.card, marginBottom:10 }}>
              <p style={{ margin:"0 0 6px", fontSize:14, fontWeight:500 }}>Habit {i+1}: {h.action}</p>
              {[["Cue",h.cue],["Motivation",h.craving],["Simplification",h.response],["Reward",h.reward]].map(([l,v]) => v && <p key={l} style={{ margin:"2px 0", fontSize:12, color:"#666" }}><strong>{l}:</strong> {v}</p>)}
            </div>
          ))}

          {Object.entries(selected.reflections||{}).map(([day,r]) => (
            <div key={day} style={{ ...s.card, marginBottom:10 }}>
              <p style={{ margin:"0 0 8px", fontSize:14, fontWeight:500 }}>Day {day} reflection</p>
              {REFLECTION_QUESTIONS.map((q,i) => r.answers?.[i] && <div key={i} style={{ marginBottom:6 }}><p style={{ margin:0, fontSize:12, color:"#888" }}>{q}</p><p style={{ margin:"2px 0 0", fontSize:13 }}>{r.answers[i]}</p></div>)}
            </div>
          ))}

          <button style={{ ...s.bigBtn, opacity:generating?0.6:1 }} onClick={() => generateReport(selected)} disabled={generating}>
            {generating ? "Generating AI report…" : "Generate AI report"}
          </button>

          {report && <div style={{ padding:"1rem", border:"1px solid #e5e5e5", borderRadius:10, whiteSpace:"pre-wrap", fontSize:14, lineHeight:1.7 }}>{report}</div>}
        </div>
      )}
    </div>
  );
}
