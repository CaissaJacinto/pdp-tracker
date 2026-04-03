import { useState, useReducer, useEffect } from "react";

const ADMIN_CODE = "admin2024";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const CCM_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/CCM_logo.svg/1200px-CCM_logo.svg.png";

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

const C = {
  primary: "#1a1a2e", accent: "#4f46e5", accentLight: "#eef2ff", accentMid: "#c7d2fe",
  success: "#059669", successLight: "#ecfdf5", warning: "#d97706", warningLight: "#fffbeb",
  danger: "#dc2626", border: "#e5e7eb", muted: "#6b7280", bg: "#f9fafb", white: "#ffffff",
  red: "#e53e3e",
};

function getToday() { return new Date().toISOString().split("T")[0]; }
function getDayNumber(s) { if (!s) return 1; return Math.max(1, Math.floor((new Date()-new Date(s))/(86400000))+1); }

async function dbGet(email) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&limit=1`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const d = await r.json(); return d?.[0] || null;
}
async function dbCreate(u) {
  await fetch(`${SUPABASE_URL}/rest/v1/users`, { method:"POST", headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal" }, body:JSON.stringify(u) });
}
async function dbUpdate(email, fields) {
  await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, { method:"PATCH", headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal" }, body:JSON.stringify(fields) });
}
async function dbGetAll() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.asc`, { headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` } });
  return await r.json();
}

function reducer(state, action) {
  switch(action.type) {
    case "LOGIN": return {...state, view:"app", user:action.user};
    case "ADMIN_LOGIN": return {...state, view:"admin"};
    case "LOGOUT": return {...state, view:"login", user:null};
    default: return state;
  }
}

// ── PDF Generator ──
function generatePDF(data, isComplete=false) {
  const day = getDayNumber(data.start_date);
  const checkinCount = Object.keys(data.checkins||{}).length;
  const rate = day > 1 ? Math.round((checkinCount/(day-1))*100) : 0;
  const habits = data.plan?.habits || [];

  const lines = [];
  const add = (txt, size=12, bold=false, indent=0, color="#1a1a2e") =>
    lines.push({txt, size, bold, indent, color});

  add("PERSONAL DEVELOPMENT PLAN", 18, true, 0, C.accent);
  add("90-Day Habit & Reflection Journal", 12, false, 0, C.muted);
  add("─".repeat(60), 10, false, 0, "#ddd");
  add(`Participant: ${data.name}`, 12, true);
  add(`Workshop Attended: ${data.cohort}`, 11);
  add(`Start Date: ${data.start_date}   |   Day: ${day} of 90`, 11);
  if (isComplete) add(`Completion Rate: ${rate}%   |   Check-ins: ${checkinCount}`, 11);
  add(" ");

  add("KEY LEARNINGS & INSIGHTS", 13, true, 0, C.accent);
  add("What are 3 key learnings from your workshop that resonated most strongly?", 10, false, 0, C.muted);
  add(data.plan?.keyLearnings || "(not completed)", 11, false, 10);
  add(" ");

  add("DESIRED IDENTITY SHIFT", 13, true, 0, C.accent);
  add("Based on these insights, what kind of person do you want to become?", 10, false, 0, C.muted);
  add(data.plan?.identityShift || "(not completed)", 11, false, 10);
  add(" ");

  add("SUPPORTING STRENGTHS", 13, true, 0, C.accent);
  add("Current strengths that align with your desired identity:", 10, false, 0, C.muted);
  add(data.plan?.strengths || "(not completed)", 11, false, 10);
  add(" ");

  add("POTENTIAL GAPS", 13, true, 0, C.accent);
  add("New skills or behaviours you may need to cultivate:", 10, false, 0, C.muted);
  add(data.plan?.gaps || "(not completed)", 11, false, 10);
  add(" ");

  add("OVERCOMING OBSTACLES", 13, true, 0, C.accent);
  ["obstacles","solutions"].forEach((f,i)=>{
    add(i===0?"Potential obstacles:":"Proactive solutions:", 10, false, 0, C.muted);
    add(data.plan?.[f] || "(not completed)", 11, false, 10);
  });
  add(" ");

  add("TRACKING & ACCOUNTABILITY", 13, true, 0, C.accent);
  add("How will you track your progress visually?", 10, false, 0, C.muted);
  add(data.plan?.tracking || "(not completed)", 11, false, 10);
  add("Accountability partner & check-in plan:", 10, false, 0, C.muted);
  add(data.plan?.accountability || "(not completed)", 11, false, 10);
  add(" ");

  habits.filter(h=>h.action).forEach((h,i)=>{
    add(`HABIT ${i+1}`, 13, true, 0, C.accent);
    add(h.action, 12, true, 10);
    [["Make it Obvious (Cue)",h.cue],["Make it Attractive (Craving)",h.craving],["Make it Easy (Response)",h.response],["Make it Satisfying (Reward)",h.reward]].forEach(([l,v])=>{
      if(v) { add(l+":", 10, true, 10, C.muted); add(v, 11, false, 20); }
    });
    add(" ");
  });

  if (isComplete && Object.keys(data.reflections||{}).length > 0) {
    add("MILESTONE REFLECTIONS", 13, true, 0, C.accent);
    Object.entries(data.reflections).forEach(([day,r])=>{
      add(`Day ${day} Reflection (${r.date||""})`, 12, true);
      REFLECTION_QUESTIONS.forEach((q,i)=>{
        if(r.answers?.[i]) { add(q, 10, true, 10, C.muted); add(r.answers[i], 11, false, 20); }
      });
      add(" ");
    });
  }

  // Build HTML for print
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDP - ${data.name}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#1a1a2e;max-width:750px;margin:0 auto;padding:40px 50px;font-size:12px;line-height:1.6;}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #e53e3e;padding-bottom:20px;margin-bottom:24px;}
    .logo{font-size:28px;font-weight:900;color:#e53e3e;letter-spacing:-1px;}
    .title{text-align:right;}
    .title h1{font-size:18px;color:#4f46e5;margin:0;font-weight:700;}
    .title p{font-size:11px;color:#6b7280;margin:4px 0 0;}
    .meta{background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:6px;}
    .meta p{margin:0;font-size:11px;color:#6b7280;} .meta strong{color:#1a1a2e;}
    .section{margin-bottom:20px;} 
    .section-title{font-size:13px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;border-left:4px solid #4f46e5;padding-left:10px;margin:0 0 8px;}
    .hint{font-size:10px;color:#6b7280;margin:0 0 6px;}
    .answer{background:#f9fafb;border-radius:6px;padding:10px 14px;font-size:11px;color:#1a1a2e;white-space:pre-wrap;margin-bottom:8px;}
    .habit-card{background:#eef2ff;border-radius:8px;padding:14px;margin-bottom:12px;}
    .habit-title{font-size:13px;font-weight:700;color:#4f46e5;margin:0 0 10px;}
    .law{margin-bottom:6px;} .law-label{font-size:10px;font-weight:700;color:#6b7280;} .law-val{font-size:11px;}
    .reflection-card{background:#f0fdf4;border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid #059669;}
    .day-badge{font-size:11px;font-weight:700;color:#059669;margin:0 0 8px;}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af;}
    @media print{body{padding:20px 30px;}}
  </style></head><body>
  <div class="header">
    <div class="logo">CCM</div>
    <div class="title"><h1>Personal Development Plan</h1><p>90-Day Habit & Reflection Journal</p></div>
  </div>
  <div class="meta">
    <p><strong>Participant:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Workshop:</strong> ${data.cohort}</p>
    <p><strong>Start Date:</strong> ${data.start_date}</p>
    <p><strong>Day:</strong> ${day} of 90</p>
    ${isComplete?`<p><strong>Completion Rate:</strong> ${rate}%</p>`:""}
  </div>
  <div class="section"><div class="section-title">Key Learnings & Insights</div><p class="hint">3 key learnings from your workshop that resonated most strongly</p><div class="answer">${data.plan?.keyLearnings||"(not completed)"}</div></div>
  <div class="section"><div class="section-title">Desired Identity Shift</div><p class="hint">The kind of person these learnings inspire you to become</p><div class="answer">${data.plan?.identityShift||"(not completed)"}</div></div>
  <div class="section"><div class="section-title">Supporting Strengths</div><p class="hint">Current strengths that align with your desired identity</p><div class="answer">${data.plan?.strengths||"(not completed)"}</div></div>
  <div class="section"><div class="section-title">Potential Gaps</div><p class="hint">New skills or behaviours you may need to cultivate</p><div class="answer">${data.plan?.gaps||"(not completed)"}</div></div>
  <div class="section"><div class="section-title">Overcoming Obstacles</div><p class="hint">Potential obstacles</p><div class="answer">${data.plan?.obstacles||"(not completed)"}</div><p class="hint">Proactive solutions</p><div class="answer">${data.plan?.solutions||"(not completed)"}</div></div>
  <div class="section"><div class="section-title">Tracking & Accountability</div><p class="hint">How you will track progress visually</p><div class="answer">${data.plan?.tracking||"(not completed)"}</div><p class="hint">Accountability partner & check-in plan</p><div class="answer">${data.plan?.accountability||"(not completed)"}</div></div>
  ${habits.filter(h=>h.action).map((h,i)=>`
  <div class="habit-card">
    <div class="habit-title">Habit ${i+1}: ${h.action}</div>
    ${h.cue?`<div class="law"><div class="law-label">Make it Obvious (Cue)</div><div class="law-val">${h.cue}</div></div>`:""}
    ${h.craving?`<div class="law"><div class="law-label">Make it Attractive (Craving)</div><div class="law-val">${h.craving}</div></div>`:""}
    ${h.response?`<div class="law"><div class="law-label">Make it Easy (Response)</div><div class="law-val">${h.response}</div></div>`:""}
    ${h.reward?`<div class="law"><div class="law-label">Make it Satisfying (Reward)</div><div class="law-val">${h.reward}</div></div>`:""}
  </div>`).join("")}
  ${isComplete && Object.keys(data.reflections||{}).length>0?`
  <div class="section"><div class="section-title">Milestone Reflections</div>
  ${Object.entries(data.reflections).map(([day,r])=>`
    <div class="reflection-card"><div class="day-badge">Day ${day} Reflection — ${r.date||""}</div>
    ${REFLECTION_QUESTIONS.map((q,i)=>r.answers?.[i]?`<p class="hint">${q}</p><div class="answer">${r.answers[i]}</div>`:"").join("")}
    </div>`).join("")}
  </div>`:""}
  <div class="footer">Generated by CCM · Personal Development Plan · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
  </body></html>`;

  const w = window.open("","_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(), 500);
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, {view:"login", user:null});
  if (state.view==="login") return <LoginScreen dispatch={dispatch}/>;
  if (state.view==="admin") return <AdminScreen dispatch={dispatch}/>;
  return <ParticipantApp user={state.user} dispatch={dispatch}/>;
}

// ── Shared UI ──
function Card({children, style}) { return <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,padding:"1.5rem",...style}}>{children}</div>; }
function Badge({children, color=C.accent, bg=C.accentLight}) { return <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color,letterSpacing:0.5,textTransform:"uppercase"}}>{children}</span>; }
function Btn({children, onClick, disabled, variant="primary", style}) {
  const st = {primary:{background:C.accent,color:"#fff",border:"none"},outline:{background:"transparent",color:C.accent,border:`1.5px solid ${C.accent}`},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},dark:{background:C.primary,color:"#fff",border:"none"},red:{background:C.red,color:"#fff",border:"none"}};
  return <button onClick={onClick} disabled={disabled} style={{padding:"10px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:disabled?"default":"pointer",opacity:disabled?0.6:1,fontFamily:"inherit",...st[variant],...style}}>{children}</button>;
}
function Inp({label, hint, value, onChange, placeholder}) {
  return <div style={{marginBottom:14}}>
    {label && <label style={{fontSize:13,fontWeight:600,color:C.primary,display:"block",marginBottom:3}}>{label}</label>}
    {hint && <p style={{fontSize:11,color:C.muted,margin:"0 0 5px",lineHeight:1.5}}>{hint}</p>}
    <input value={value} onChange={onChange} placeholder={placeholder} style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",color:C.primary,outline:"none"}}/>
  </div>;
}
function TA({label, hint, value, onChange, placeholder, rows=3, disabled}) {
  return <div style={{marginBottom:14}}>
    {label && <label style={{fontSize:13,fontWeight:600,color:C.primary,display:"block",marginBottom:3}}>{label}</label>}
    {hint && <p style={{fontSize:11,color:C.muted,margin:"0 0 5px",lineHeight:1.5}}>{hint}</p>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} disabled={disabled} style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",color:C.primary,background:disabled?C.bg:C.white,resize:"vertical",outline:"none"}}/>
  </div>;
}

function Logo({size=32, white=false}) {
  return <div style={{display:"flex",alignItems:"center",gap:8}}>
    <div style={{background:white?"rgba(255,255,255,0.15)":"#fff1f1",borderRadius:8,padding:"4px 10px"}}>
      <span style={{fontSize:size*0.6,fontWeight:900,color:C.red,letterSpacing:-1}}>CCM</span>
    </div>
  </div>;
}

// ── Login ──
function LoginScreen({dispatch}) {
  const [mode, setMode] = useState("register");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [workshop, setWorkshop] = useState(""); const [adminCode, setAdminCode] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (adminCode===ADMIN_CODE) { dispatch({type:"ADMIN_LOGIN"}); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    setLoading(true); const u = await dbGet(email); setLoading(false);
    if (!u) { setError("No account found. Please register first."); return; }
    dispatch({type:"LOGIN", user:email});
  };

  const handleRegister = async () => {
    if (!name.trim()||!email.trim()||!workshop.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true); const ex = await dbGet(email);
    if (ex) { setLoading(false); setError("An account already exists for this email."); return; }
    await dbCreate({email,name,cohort:workshop,start_date:getToday(),onboarded:false,plan:{keyLearnings:"",identityShift:"",strengths:"",gaps:"",obstacles:"",solutions:"",tracking:"",accountability:"",habits:[{action:"",cue:"",craving:"",response:"",reward:""},{action:"",cue:"",craving:"",response:"",reward:""},{action:"",cue:"",craving:"",response:"",reward:""}]},checkins:{},reflections:{}});
    setLoading(false); dispatch({type:"LOGIN",user:email});
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg, ${C.primary} 0%, #16213e 60%, #0f3460 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem"}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <Logo size={40} white/>
          <h1 style={{fontSize:26,fontWeight:700,color:"#fff",margin:"1rem 0 6px"}}>Personal Development Plan</h1>
          <p style={{fontSize:14,color:"#a5b4fc",margin:0}}>90-Day Habit & Reflection Journal</p>
        </div>
        <Card style={{padding:"2rem"}}>
          <div style={{display:"flex",gap:6,marginBottom:"1.5rem",background:C.bg,borderRadius:12,padding:4}}>
            {["register","login"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"8px",background:mode===m?C.white:"transparent",border:mode===m?`1px solid ${C.border}`:"1px solid transparent",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:mode===m?600:400,color:mode===m?C.primary:C.muted,fontFamily:"inherit",boxShadow:mode===m?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
                {m==="register"?"Register":"Sign in"}
              </button>
            ))}
          </div>
          {mode==="register" && <>
            <Inp label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/>
            <Inp label="Email address" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/>
            <Inp label="Workshop attended" value={workshop} onChange={e=>setWorkshop(e.target.value)} placeholder="e.g. Authentic Leadership – April 2026"/>
          </>}
          {mode==="login" && <>
            <Inp label="Email address" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/>
            <Inp label="Admin code (admins only)" value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Leave blank if participant"/>
          </>}
          {error && <p style={{fontSize:13,color:C.danger,margin:"0 0 12px",padding:"10px 14px",background:"#fef2f2",borderRadius:8}}>{error}</p>}
          <Btn onClick={mode==="register"?handleRegister:handleLogin} disabled={loading} style={{width:"100%"}}>{loading?"Please wait…":mode==="register"?"Create my account":"Sign in"}</Btn>
          {mode==="login" && <p style={{fontSize:12,color:C.muted,textAlign:"center",margin:"12px 0 0"}}>No password needed — just your email address.</p>}
        </Card>
      </div>
    </div>
  );
}

// ── Participant App ──
function ParticipantApp({user, dispatch}) {
  const [data, setData] = useState(null); const [tab, setTab] = useState("checkin"); const [loading, setLoading] = useState(true);
  useEffect(()=>{ dbGet(user).then(u=>{setData(u);setTab(u?.onboarded?"checkin":"plan");setLoading(false);}); },[user]);
  const refresh = async () => { const u = await dbGet(user); setData(u); };

  if (loading) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:C.muted}}>Loading your journal…</p></div>;

  const dayNum = getDayNumber(data.start_date);
  const currentPhase = PHASES.find(p=>dayNum>=p.range[0]&&dayNum<=p.range[1])||PHASES[2];
  const reflectionDue = [30,60,90].includes(dayNum) && !data.reflections?.[dayNum];
  const streak = (()=>{ let s=0,d=new Date(); while(true){const k=d.toISOString().split("T")[0];if(!data.checkins?.[k])break;s++;d.setDate(d.getDate()-1);}return s; })();
  const isComplete = dayNum >= 90;
  const isFirstDay = dayNum === 1;
  const greeting = isFirstDay ? `Welcome, ${data.name?.split(" ")[0]}! 🎉` : `Welcome back, ${data.name?.split(" ")[0]}! 👋`;

  return (
    <div style={{minHeight:"100vh",background:C.bg}}>
      <div style={{background:C.primary,padding:"0 1rem"}}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Logo size={28} white/>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:"#fff",margin:0,lineHeight:1.2}}>Personal Development Plan</p>
              <p style={{fontSize:11,color:"#a5b4fc",margin:0}}>{data.cohort}</p>
            </div>
          </div>
          <button onClick={()=>dispatch({type:"LOGOUT"})} style={{fontSize:12,color:"#a5b4fc",background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"1.5rem 1rem"}}>
        <div style={{background:`linear-gradient(135deg, ${C.accent}, #7c3aed)`,borderRadius:16,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",color:"#fff"}}>
          <p style={{margin:"0 0 2px",fontSize:12,opacity:0.8,textTransform:"uppercase",letterSpacing:1}}>{currentPhase.label} · Day {dayNum} of 90</p>
          <h2 style={{margin:"0 0 10px",fontSize:20,fontWeight:700}}>{greeting}</h2>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[["🔥 Streak",streak+" days"],["✅ Check-ins",Object.keys(data.checkins||{}).length],["📝 Reflections",Object.keys(data.reflections||{}).length+"/3"]].map(([l,v])=>(
              <div key={l}><p style={{margin:0,fontSize:11,opacity:0.75}}>{l}</p><p style={{margin:0,fontSize:16,fontWeight:700}}>{v}</p></div>
            ))}
          </div>
          <button onClick={()=>generatePDF(data,isComplete)} style={{marginTop:10,fontSize:12,padding:"6px 14px",background:"rgba(255,255,255,0.2)",color:"#fff",border:"1px solid rgba(255,255,255,0.4)",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            {isComplete?"⬇ Download completed PDP":"⬇ Download my PDP"}
          </button>
        </div>

        <Card style={{marginBottom:"1.25rem",padding:"1rem 1.25rem"}}>
          <p style={{fontSize:12,fontWeight:700,color:C.muted,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>Your 90-Day Milestones</p>
          <div style={{display:"flex",alignItems:"center"}}>
            {[30,60,90].map((m,i)=>{
              const reached=dayNum>=m, hasRefl=!!data.reflections?.[m];
              return <div key={m} style={{display:"flex",alignItems:"center",flex:i<2?1:"none"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:hasRefl?C.success:reached?C.accent:C.bg,border:`2.5px solid`,borderColor:hasRefl?C.success:reached?C.accent:C.border,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {hasRefl?<svg width="16" height="16" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>:<span style={{fontSize:11,fontWeight:700,color:reached?"#fff":C.muted}}>{m}</span>}
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:reached?C.primary:C.muted,whiteSpace:"nowrap"}}>Day {m}{hasRefl?" ✓":reached?" due":""}</span>
                </div>
                {i<2&&<div style={{flex:1,height:3,background:dayNum>m?C.accent:C.border,margin:"0 6px",marginBottom:18,borderRadius:2}}/>}
              </div>;
            })}
          </div>
        </Card>

        {reflectionDue && tab!=="reflect" && (
          <div style={{background:C.warningLight,border:`1.5px solid #fcd34d`,borderRadius:12,padding:"12px 16px",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={{margin:0,fontSize:14,fontWeight:600,color:"#92400e"}}>📋 Day {dayNum} reflection is due!</p><p style={{margin:"2px 0 0",fontSize:12,color:"#b45309"}}>Take a few minutes to reflect on your progress.</p></div>
            <Btn onClick={()=>setTab("reflect")} variant="outline" style={{borderColor:"#d97706",color:"#d97706",padding:"6px 14px",fontSize:13}}>Start</Btn>
          </div>
        )}

        <div style={{display:"flex",gap:6,marginBottom:"1.25rem",background:C.white,borderRadius:14,padding:5,border:`1px solid ${C.border}`}}>
          {[["plan","My Plan"],["checkin","Check-in"],["history","History"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px",background:tab===t?C.accent:"transparent",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:tab===t?700:500,color:tab===t?"#fff":C.muted,fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>

        {tab==="plan" && <PlanTab data={data} user={user} onSave={()=>{refresh();setTab("checkin");}}/>}
        {tab==="checkin" && <DailyCheckin habits={data.plan?.habits||[]} todayCheckin={data.checkins?.[getToday()]} onSave={async c=>{await dbUpdate(user,{checkins:{...data.checkins,[getToday()]:c}});refresh();}}/>}
        {tab==="history" && <History checkins={data.checkins||{}} habits={data.plan?.habits||[]} reflections={data.reflections||{}}/>}
        {tab==="reflect" && <Reflection dayNum={dayNum} onSave={async r=>{await dbUpdate(user,{reflections:{...data.reflections,[dayNum]:r}});refresh();setTab("history");}} existing={data.reflections?.[dayNum]}/>}
      </div>
    </div>
  );
}

function PlanTab({data, user, onSave}) {
  const defaultHabit = {action:"",cue:"",craving:"",response:"",reward:""};
  const [plan, setPlan] = useState(data.plan||{keyLearnings:"",identityShift:"",strengths:"",gaps:"",obstacles:"",solutions:"",tracking:"",accountability:"",habits:[{...defaultHabit},{...defaultHabit},{...defaultHabit}]});
  const [saving, setSaving] = useState(false);

  const updateHabit = (i,f,v) => { const h=[...plan.habits]; h[i]={...h[i],[f]:v}; setPlan({...plan,habits:h}); };

  const savePlan = async () => { setSaving(true); await dbUpdate(user,{plan,onboarded:true}); setSaving(false); onSave(); };

  return <div>
    <Card style={{marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem"}}>
        <Logo size={28}/>
        <div><p style={{margin:0,fontSize:15,fontWeight:700,color:C.primary}}>My Action Plan</p><p style={{margin:0,fontSize:12,color:C.muted}}>Complete once — this guides your 90-day journey</p></div>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.accentLight},#faf5ff)`,borderRadius:12,padding:"14px 16px",marginBottom:"1rem",border:`1px solid ${C.accentMid}`}}>
        <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:C.accent}}>🎉 Congratulations on completing your workshop!</p>
        <p style={{margin:"0 0 10px",fontSize:13,color:C.primary,lineHeight:1.7}}>Learning is valuable — but <strong>applying your insights consistently</strong> is what drives real growth. This Action Plan uses principles from James Clear's <strong>Atomic Habits</strong> to help you translate your key takeaways into small, actionable steps. Focus on building effective systems, shaping your desired identity, and harnessing the power of tiny gains.</p>
        <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:C.primary}}>To make the most of this plan:</p>
        <ul style={{margin:0,paddingLeft:20,fontSize:13,color:C.primary,lineHeight:2}}>
          <li>Be specific and <strong>start small</strong> — choose 1–3 tiny, achievable habits.</li>
          <li>Prioritise <strong>consistent daily action</strong> over focusing on the end goal.</li>
          <li>Share your plan with <strong>colleagues</strong> participating in the same programme.</li>
          <li>Discuss your Action Plan with your <strong>line manager</strong> when you return to work.</li>
          <li>Bring your plan to your <strong>tele-mentoring sessions</strong> for deeper insights and commitment.</li>
          <li>Keep this plan <strong>visible</strong>, review it regularly, adapt as needed, and be kind to yourself.</li>
        </ul>
      </div>

      <TA label="Key Learnings & Insights" hint='What are 3 key learnings, concepts, skills, or ideas from "Authentic Leadership & Performance" that resonated most strongly with you and that you want to actively integrate at work?' value={plan.keyLearnings||""} onChange={e=>setPlan({...plan,keyLearnings:e.target.value})} placeholder="e.g. 1. The power of psychological safety in teams&#10;2. How my own biases affect my leadership style&#10;3. The importance of consistent small actions over grand gestures" rows={4}/>
      <TA label="Desired Identity Shift" hint="Based on these insights, what kind of person do these learnings inspire you to become? Describe the identity you want to embody — not just a goal, but a way of being." value={plan.identityShift||""} onChange={e=>setPlan({...plan,identityShift:e.target.value})} placeholder="e.g. I want to become a leader who listens with full presence, responds with empathy, and creates space for others to thrive." rows={3}/>
      <TA label="Supporting Strengths" hint="What current skills, habits, or strengths do you already possess that align with this desired identity and can help you implement your insights?" value={plan.strengths||""} onChange={e=>setPlan({...plan,strengths:e.target.value})} placeholder="e.g. I am naturally curious and ask good questions. I have strong relationships with my team and they trust me." rows={3}/>
      <TA label="Potential Gaps" hint="What potential new skills, behaviours, or knowledge might you need to cultivate to fully embody this identity and sustain the actions you plan to take?" value={plan.gaps||""} onChange={e=>setPlan({...plan,gaps:e.target.value})} placeholder="e.g. I need to develop more patience in high-pressure situations and improve my ability to give constructive feedback." rows={3}/>
    </Card>

    <Card style={{marginBottom:"1rem"}}>
      <p style={{margin:"0 0 4px",fontSize:15,fontWeight:700,color:C.primary}}>Overcoming Obstacles & Staying Consistent</p>
      <p style={{margin:"0 0 14px",fontSize:12,color:C.muted}}>Anticipating challenges helps you prepare solutions in advance — this dramatically increases your chances of staying consistent.</p>
      <TA label="Potential obstacles" hint="What might prevent you from sticking to your plan? (e.g. lack of time, forgetting, losing motivation, unexpected workload, travel)" value={plan.obstacles||""} onChange={e=>setPlan({...plan,obstacles:e.target.value})} placeholder="e.g. Back-to-back meetings making it hard to find reflection time. Forgetting to check in when travelling." rows={3}/>
      <TA label="Proactive solutions" hint="For each obstacle above, what is your plan to overcome or minimise it?" value={plan.solutions||""} onChange={e=>setPlan({...plan,solutions:e.target.value})} placeholder="e.g. Block 10 minutes each morning for my check-in before the day gets busy. Set a phone reminder." rows={3}/>
    </Card>

    <Card style={{marginBottom:"1rem"}}>
      <p style={{margin:"0 0 4px",fontSize:15,fontWeight:700,color:C.primary}}>Tracking & Accountability</p>
      <p style={{margin:"0 0 14px",fontSize:12,color:C.muted}}>What gets measured gets done. A visual tracker and an accountability partner significantly boost follow-through.</p>
      <TA label="How will you track your progress visually?" hint="Beyond this app, consider a physical habit tracker, journal, wall calendar, or whiteboard visible in your workspace." value={plan.tracking||""} onChange={e=>setPlan({...plan,tracking:e.target.value})} placeholder="e.g. I will use a printed habit tracker on my desk and mark each day with a tick." rows={2}/>
      <TA label="Accountability partner" hint="Who can you check in with to keep yourself on track? Name them, agree on a frequency, and decide how you'll connect (e.g. weekly WhatsApp message, monthly coffee)." value={plan.accountability||""} onChange={e=>setPlan({...plan,accountability:e.target.value})} placeholder="e.g. My colleague Sara. We'll send each other a short voice note every Friday to share one win and one challenge." rows={2}/>
    </Card>

    <Card style={{marginBottom:"1rem"}}>
      <p style={{margin:"0 0 4px",fontSize:15,fontWeight:700,color:C.primary}}>Designing Your Atomic Habits</p>
      <p style={{margin:"0 0 10px",fontSize:12,color:C.muted}}>Start small. Identify 1–3 key actions derived from your workshop insights and desired identity. Use James Clear's <strong>Four Laws of Behaviour Change</strong> to make each habit stick:</p>
      <div style={{background:C.accentLight,borderRadius:10,padding:"12px 14px",marginBottom:"1rem"}}>
        {[["🎯 Make it Obvious (Cue)","How will you clearly trigger this action? Link it to an existing routine or place it in your environment."],["✨ Make it Attractive (Craving)","How will you increase your motivation? Pair it with something you enjoy or remind yourself of the deeper reason."],["⚡ Make it Easy (Response)","How will you reduce friction? Simplify the habit so it takes 2 minutes or less to start."],["🏆 Make it Satisfying (Reward)","How will you create an immediate feeling of success? Track it, celebrate it, or reward yourself right after."]].map(([t,d])=>(
          <div key={t} style={{marginBottom:8}}><p style={{margin:"0 0 1px",fontSize:12,fontWeight:700,color:C.accent}}>{t}</p><p style={{margin:0,fontSize:12,color:C.primary,lineHeight:1.5}}>{d}</p></div>
        ))}
      </div>
    </Card>

    {[0,1,2].map(i=>(
      <Card key={i} style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"1rem"}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{i+1}</span></div>
          <p style={{margin:0,fontSize:15,fontWeight:700,color:C.primary}}>Habit {i+1} {i===2?"(optional)":""}</p>
        </div>
        {[["action","What is the habit? (small & specific)","e.g. Before responding in any meeting, I will pause for 3 seconds"],["cue","Make it Obvious — what will trigger this habit?","e.g. Every time a meeting starts, I will put my phone face-down"],["craving","Make it Attractive — why does this matter to you?","e.g. I want to be known as someone who makes others feel heard"],["response","Make it Easy — how will you reduce friction?","e.g. I'll keep a notebook open to jot down thoughts instead of interrupting"],["reward","Make it Satisfying — how will you reward yourself?","e.g. After each meeting, I'll note one thing I learned from listening"]].map(([f,l,ph])=>(
          <div key={f}>
            <label style={{fontSize:13,fontWeight:600,color:C.primary,display:"block",marginBottom:4}}>{l}</label>
            <input value={plan.habits[i]?.[f]||""} onChange={e=>updateHabit(i,f,e.target.value)} placeholder={ph} style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"inherit",color:C.primary,marginBottom:10,outline:"none"}}/>
          </div>
        ))}
      </Card>
    ))}

    <Btn onClick={savePlan} disabled={saving} style={{width:"100%",padding:"12px"}}>{saving?"Saving…":"Save my plan & start tracking →"}</Btn>
  </div>;
}

function DailyCheckin({habits, todayCheckin, onSave}) {
  const [checks, setChecks] = useState(todayCheckin?.habits||habits.map(()=>false));
  const [note, setNote] = useState(todayCheckin?.note||"");
  const [done, setDone] = useState(!!todayCheckin);
  const [saving, setSaving] = useState(false);
  const active = habits.filter(h=>h.action);
  const allDone = checks.slice(0,active.length).every(Boolean);

  return <div>
    <div style={{marginBottom:"1rem"}}>
      <p style={{fontSize:15,fontWeight:700,color:C.primary,margin:"0 0 2px"}}>Today's Check-in</p>
      <p style={{fontSize:13,color:C.muted,margin:0}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
    </div>
    {active.length===0&&<Card><p style={{fontSize:14,color:C.muted,textAlign:"center",margin:0}}>Complete your action plan first to start tracking habits.</p></Card>}
    {active.map((h,i)=>(
      <div key={i} onClick={()=>!done&&setChecks(c=>{const n=[...c];n[i]=!n[i];return n;})} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",border:`1.5px solid`,borderColor:checks[i]?C.success:C.border,borderRadius:14,marginBottom:10,cursor:done?"default":"pointer",background:checks[i]?C.successLight:C.white}}>
        <div style={{width:26,height:26,borderRadius:"50%",border:`2.5px solid`,borderColor:checks[i]?C.success:C.border,background:checks[i]?C.success:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {checks[i]&&<svg width="13" height="13" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,color:C.primary}}>Habit {i+1}</p><p style={{margin:"2px 0 0",fontSize:13,color:C.muted}}>{h.action}</p></div>
        {checks[i]&&<Badge color={C.success} bg={C.successLight}>Done</Badge>}
      </div>
    ))}
    {active.length>0&&<>
      {allDone&&!done&&<div style={{background:`linear-gradient(135deg,${C.success},#10b981)`,borderRadius:12,padding:"12px 16px",marginBottom:"1rem",textAlign:"center"}}><p style={{margin:0,fontSize:14,fontWeight:700,color:"#fff"}}>🎉 All habits completed today!</p></div>}
      <TA label="Notes for today (optional)" value={note} onChange={e=>setNote(e.target.value)} disabled={done} placeholder="What went well? Any challenges? Observations or wins to remember…" rows={3}/>
      {!done
        ?<Btn onClick={async()=>{setSaving(true);await onSave({habits:checks,note,date:getToday()});setDone(true);setSaving(false);}} disabled={saving} style={{width:"100%",padding:"12px"}}>{saving?"Saving…":"Save today's check-in"}</Btn>
        :<div style={{background:C.successLight,border:`1.5px solid ${C.success}`,borderRadius:12,padding:"14px",textAlign:"center"}}><p style={{margin:0,fontSize:14,fontWeight:700,color:C.success}}>✓ Check-in saved for today. See you tomorrow!</p></div>
      }
    </>}
  </div>;
}

function Reflection({dayNum, onSave, existing}) {
  const [answers, setAnswers] = useState(existing?.answers||REFLECTION_QUESTIONS.map(()=>""));
  const [done, setDone] = useState(!!existing); const [saving, setSaving] = useState(false);
  return <div>
    <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.accent},#7c3aed)`,border:"none"}}>
      <p style={{margin:"0 0 4px",fontSize:12,color:"#c7d2fe",textTransform:"uppercase",letterSpacing:1}}>Milestone Reflection</p>
      <p style={{margin:"0 0 6px",fontSize:18,fontWeight:700,color:"#fff"}}>Day {dayNum} Reflection</p>
      <p style={{margin:0,fontSize:13,color:"#c7d2fe",lineHeight:1.6}}>Take 10–15 minutes to reflect honestly on your journey. Your responses shape your progress report and help you grow intentionally.</p>
    </Card>
    {REFLECTION_QUESTIONS.map((q,i)=>(
      <Card key={i} style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:C.accent}}>{i+1}</span></div>
          <p style={{margin:0,fontSize:14,fontWeight:600,color:C.primary,lineHeight:1.5}}>{q}</p>
        </div>
        <textarea value={answers[i]} onChange={e=>{const a=[...answers];a[i]=e.target.value;setAnswers(a);}} disabled={done} rows={3} placeholder="Take your time and be honest with yourself…" style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",background:done?C.bg:C.white}}/>
      </Card>
    ))}
    {!done
      ?<Btn onClick={async()=>{setSaving(true);await onSave({answers,day:dayNum,date:getToday()});setDone(true);setSaving(false);}} disabled={saving} style={{width:"100%",padding:"12px"}}>{saving?"Saving…":"Submit my reflection"}</Btn>
      :<div style={{background:C.successLight,border:`1.5px solid ${C.success}`,borderRadius:12,padding:"14px",textAlign:"center"}}><p style={{margin:0,fontSize:14,fontWeight:700,color:C.success}}>✓ Reflection saved. Great work!</p></div>
    }
  </div>;
}

function History({checkins, habits, reflections}) {
  const dates = Object.keys(checkins).sort().reverse().slice(0,14);
  const active = habits.filter(h=>h.action);
  return <div>
    <p style={{fontSize:15,fontWeight:700,color:C.primary,margin:"0 0 1rem"}}>Recent Activity</p>
    {dates.length===0&&<Card><p style={{fontSize:14,color:C.muted,textAlign:"center",margin:0}}>No check-ins yet. Start today!</p></Card>}
    {dates.map(date=>{
      const c=checkins[date], done=c.habits?.filter(Boolean).length||0, pct=active.length>0?Math.round((done/active.length)*100):0;
      return <div key={date} style={{padding:"12px 16px",border:`1.5px solid`,borderColor:pct===100?C.success:C.border,borderRadius:14,marginBottom:8,background:pct===100?C.successLight:C.white,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><p style={{margin:0,fontSize:14,fontWeight:600,color:C.primary}}>{new Date(date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</p>{c.note&&<p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>{c.note.slice(0,60)}{c.note.length>60?"…":""}</p>}</div>
        <Badge color={pct===100?C.success:C.muted} bg={pct===100?C.successLight:C.bg}>{done}/{active.length} habits</Badge>
      </div>;
    })}
    {Object.keys(reflections).length>0&&<>
      <p style={{fontSize:15,fontWeight:700,color:C.primary,margin:"1.5rem 0 1rem"}}>Milestone Reflections</p>
      {Object.entries(reflections).map(([day,r])=>(
        <Card key={day} style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"0.75rem"}}><Badge>Day {day}</Badge><span style={{fontSize:12,color:C.muted}}>{r.date}</span></div>
          {REFLECTION_QUESTIONS.map((q,i)=>r.answers?.[i]&&<div key={i} style={{marginBottom:10}}><p style={{margin:"0 0 3px",fontSize:12,fontWeight:600,color:C.muted}}>{q}</p><p style={{margin:0,fontSize:14,color:C.primary,lineHeight:1.6}}>{r.answers[i]}</p></div>)}
        </Card>
      ))}
    </>}
  </div>;
}

// ── Admin ──
function AdminScreen({dispatch}) {
  const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard"); const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false); const [report, setReport] = useState("");
  const [cohortFilter, setCohortFilter] = useState("All");
  const [cohortReport, setCohortReport] = useState(""); const [generatingCohort, setGeneratingCohort] = useState(false);

  useEffect(()=>{dbGetAll().then(d=>{setUsers(d||[]);setLoading(false);});},[]);
  const refresh = ()=>{setLoading(true);dbGetAll().then(d=>{setUsers(d||[]);setLoading(false);});};

  const cohorts = ["All",...Array.from(new Set(users.map(u=>u.cohort).filter(Boolean)))];
  const filtered = cohortFilter==="All"?users:users.filter(u=>u.cohort===cohortFilter);
  const totalCheckins = filtered.reduce((s,u)=>s+Object.keys(u.checkins||{}).length,0);
  const avgRate = filtered.length===0?0:Math.round(filtered.reduce((s,u)=>{const d=getDayNumber(u.start_date);return s+(d>1?Math.round((Object.keys(u.checkins||{}).length/(d-1))*100):0);},0)/filtered.length);

  const callAI = async (prompt) => {
    const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:prompt}]})});
    const d=await r.json(); return d.content?.map(c=>c.text||"").join("\n")||"Unable to generate report.";
  };

  const generateIndividualReport = async (u) => {
    setGenerating(true); setReport("");
    const day=getDayNumber(u.start_date),count=Object.keys(u.checkins||{}).length,possible=Math.max(day-1,1),rate=Math.round((count/possible)*100);
    const summary=`Participant: ${u.name}\nWorkshop: ${u.cohort}\nDay: ${day}/90\nCheck-ins: ${count}/${possible} (${rate}%)\nKey learnings: ${u.plan?.keyLearnings}\nIdentity shift: ${u.plan?.identityShift}\nStrengths: ${u.plan?.strengths}\nGaps: ${u.plan?.gaps}\nObstacles: ${u.plan?.obstacles}\nSolutions: ${u.plan?.solutions}\nHabit 1: ${u.plan?.habits?.[0]?.action}\nHabit 2: ${u.plan?.habits?.[1]?.action}\nHabit 3: ${u.plan?.habits?.[2]?.action}\nDay 30: ${JSON.stringify(u.reflections?.[30]||{})}\nDay 60: ${JSON.stringify(u.reflections?.[60]||{})}\nDay 90: ${JSON.stringify(u.reflections?.[90]||{})}\nNotes: ${Object.values(u.checkins||{}).map(c=>c.note).filter(Boolean).join(" | ")}`;
    try { const t=await callAI(`You are a warm and professional L&D coach writing a personal progress report for ${u.name}. Address them directly (second person). Use markdown:\n\n# 90-Day Progress Report: ${u.name}\n\n## Quantitative Summary\n(bullet points: days, check-in rate, milestones, reflections)\n\n## Qualitative Insights\n(2-3 warm personalised paragraphs based on their data)\n\n## Recommended Next Steps\n(3 specific numbered steps with bold titles)\n\nEnd with encouragement and next review date.\n\nData:\n${summary}`); setReport(t); }
    catch { setReport("Error generating report."); }
    setGenerating(false);
  };

  const generateCohortReport = async () => {
    setGeneratingCohort(true); setCohortReport("");
    const name=cohortFilter==="All"?"All Participants":cohortFilter;
    const summaries=filtered.map(u=>{
      const d=getDayNumber(u.start_date),c=Object.keys(u.checkins||{}).length,r=d>1?Math.round((c/(d-1))*100):0;
      return `- ${u.name}: Day ${d}, ${c} check-ins (${r}%), ${Object.keys(u.reflections||{}).length} reflections. Identity: "${u.plan?.identityShift}". Habits: "${u.plan?.habits?.[0]?.action}", "${u.plan?.habits?.[1]?.action}", "${u.plan?.habits?.[2]?.action}". Notes: ${Object.values(u.checkins||{}).map(c=>c.note).filter(Boolean).slice(0,3).join(" | ")}`;
    }).join("\n");
    try { const t=await callAI(`You are an L&D consultant writing a cohort progress report for a client. Third person throughout. Markdown:\n\n# Cohort Report: ${name}\n\n## Overview\n## Quantitative Summary\n## Qualitative Themes\n## Individual Highlights\n## Recommended Next Steps for the Cohort\n\nData:\n${summaries}`); setCohortReport(t); }
    catch { setCohortReport("Error."); }
    setGeneratingCohort(false);
  };

  const exportFullCSV = () => {
    const headers = ["Name","Email","Workshop","Start Date","Day","Check-ins","Completion %","Reflections","Key Learnings","Identity Shift","Strengths","Gaps","Obstacles","Solutions","Tracking","Accountability","Habit 1 Action","Habit 1 Cue","Habit 1 Craving","Habit 1 Response","Habit 1 Reward","Habit 2 Action","Habit 2 Cue","Habit 2 Craving","Habit 2 Response","Habit 2 Reward","Habit 3 Action","Habit 3 Cue","Habit 3 Craving","Habit 3 Response","Habit 3 Reward","Day 30 Q1","Day 30 Q2","Day 30 Q3","Day 30 Q4","Day 60 Q1","Day 60 Q2","Day 60 Q3","Day 60 Q4","Day 90 Q1","Day 90 Q2","Day 90 Q3","Day 90 Q4"];
    const rows = [headers];
    filtered.forEach(u=>{
      const day=getDayNumber(u.start_date),count=Object.keys(u.checkins||{}).length,rate=day>1?Math.round((count/(day-1))*100):0;
      const h=u.plan?.habits||[];
      const r30=u.reflections?.[30]?.answers||[],r60=u.reflections?.[60]?.answers||[],r90=u.reflections?.[90]?.answers||[];
      rows.push([u.name,u.email,u.cohort,u.start_date,day,count,rate+"%",Object.keys(u.reflections||{}).length,u.plan?.keyLearnings,u.plan?.identityShift,u.plan?.strengths,u.plan?.gaps,u.plan?.obstacles,u.plan?.solutions,u.plan?.tracking,u.plan?.accountability,h[0]?.action,h[0]?.cue,h[0]?.craving,h[0]?.response,h[0]?.reward,h[1]?.action,h[1]?.cue,h[1]?.craving,h[1]?.response,h[1]?.reward,h[2]?.action,h[2]?.cue,h[2]?.craving,h[2]?.response,h[2]?.reward,r30[0],r30[1],r30[2],r30[3],r60[0],r60[1],r60[2],r60[3],r90[0],r90[1],r90[2],r90[3]]);
    });
    const csv=rows.map(r=>r.map(c=>`"${(c||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`${cohortFilter}-full-data.csv`;a.click();
  };

  const renderReport = (text) => {
    if(!text)return null;
    return text.split("\n").map((line,i)=>{
      if(line.startsWith("# "))return <h2 key={i} style={{fontSize:18,fontWeight:700,margin:"0 0 12px",color:C.primary}}>{line.slice(2)}</h2>;
      if(line.startsWith("## "))return <h3 key={i} style={{fontSize:15,fontWeight:700,margin:"16px 0 8px",color:C.primary,borderBottom:`2px solid ${C.accentLight}`,paddingBottom:6}}>{line.slice(3)}</h3>;
      if(line.startsWith("- ")||line.startsWith("* ")){const c=line.slice(2).replace(/\*\*(.*?)\*\*/g,(_,t)=>`<strong>${t}</strong>`);return <li key={i} style={{marginBottom:5,fontSize:14,color:C.primary,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:c}}/>;}
      if(/^\d+\./.test(line)){const c=line.replace(/\*\*(.*?)\*\*/g,(_,t)=>`<strong>${t}</strong>`);return <p key={i} style={{margin:"6px 0",fontSize:14,color:C.primary}} dangerouslySetInnerHTML={{__html:c}}/>;}
      if(line.trim()==="")return <br key={i}/>;
      const c=line.replace(/\*\*(.*?)\*\*/g,(_,t)=>`<strong>${t}</strong>`);
      return <p key={i} style={{margin:"4px 0",fontSize:14,color:C.primary,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:c}}/>;
    });
  };

  if(loading)return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:C.muted}}>Loading…</p></div>;

  return <div style={{minHeight:"100vh",background:C.bg}}>
    <div style={{background:C.primary,padding:"0 1rem"}}>
      <div style={{maxWidth:740,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Logo size={28} white/>
          <p style={{fontSize:14,fontWeight:700,color:"#fff",margin:0}}>Admin Dashboard</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={refresh} style={{fontSize:12,color:"#a5b4fc",background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
          <button onClick={exportFullCSV} style={{fontSize:12,color:"#a5b4fc",background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>Export Full CSV</button>
          <button onClick={()=>dispatch({type:"LOGOUT"})} style={{fontSize:12,color:"#a5b4fc",background:"none",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
        </div>
      </div>
    </div>

    <div style={{maxWidth:740,margin:"0 auto",padding:"1.5rem 1rem"}}>
      <div style={{display:"flex",gap:8,marginBottom:"1.25rem",flexWrap:"wrap"}}>
        {cohorts.map(c=><button key={c} onClick={()=>{setCohortFilter(c);setView("dashboard");setReport("");setCohortReport("");}} style={{fontSize:13,padding:"6px 14px",borderRadius:20,border:"1.5px solid",borderColor:cohortFilter===c?C.accent:C.border,background:cohortFilter===c?C.accent:"transparent",color:cohortFilter===c?"#fff":C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:cohortFilter===c?600:400}}>{c}</button>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:"1.5rem"}}>
        {[["Participants",filtered.length,"👥"],["Total check-ins",totalCheckins,"✅"],["Avg completion",avgRate+"%","📊"]].map(([l,v,e])=>(
          <Card key={l} style={{textAlign:"center",padding:"1rem"}}><p style={{fontSize:20,margin:"0 0 4px"}}>{e}</p><p style={{fontSize:22,fontWeight:700,margin:"0 0 2px",color:C.primary}}>{v}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{l}</p></Card>
        ))}
      </div>

      {view==="dashboard"&&<>
        <Card style={{marginBottom:"1.25rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={{margin:0,fontSize:15,fontWeight:700,color:C.primary}}>AI Cohort Report</p><p style={{margin:"2px 0 0",fontSize:13,color:C.muted}}>{cohortFilter==="All"?"All participants":cohortFilter} · Third-person format</p></div>
            <Btn onClick={generateCohortReport} disabled={generatingCohort||filtered.length===0} variant="dark" style={{padding:"8px 16px",fontSize:13}}>{generatingCohort?"Generating…":"Generate"}</Btn>
          </div>
          {cohortReport&&<div style={{marginTop:"1rem",borderTop:`1px solid ${C.border}`,paddingTop:"1rem"}}>{renderReport(cohortReport)}</div>}
        </Card>
        <p style={{fontSize:13,color:C.muted,margin:"0 0 10px"}}>Click a participant to view their full profile and generate an individual report.</p>
        {filtered.length===0&&<Card><p style={{fontSize:14,color:C.muted,textAlign:"center",margin:0}}>No participants yet.</p></Card>}
        {filtered.map(u=>{
          const day=getDayNumber(u.start_date),rate=day>1?Math.round((Object.keys(u.checkins||{}).length/(day-1))*100):0;
          return <div key={u.email} onClick={()=>{setSelected(u);setView("detail");setReport("");}} style={{padding:"14px 16px",border:`1.5px solid ${C.border}`,borderRadius:14,marginBottom:8,cursor:"pointer",background:C.white,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:14,fontWeight:700,color:C.accent}}>{u.name?.[0]}</span></div>
              <div><p style={{margin:0,fontSize:14,fontWeight:700,color:C.primary}}>{u.name}</p><p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>{u.cohort} · Day {day}</p></div>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:14,fontWeight:700,color:rate>=70?C.success:rate>=40?C.warning:C.danger}}>{rate}%</p>
              <p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>{Object.keys(u.reflections||{}).length}/3 reflections</p>
            </div>
          </div>;
        })}
      </>}

      {view==="detail"&&selected&&<div>
        <button onClick={()=>{setView("dashboard");setReport("");}} style={{fontSize:13,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:"0 0 12px",fontFamily:"inherit",fontWeight:600}}>← Back to dashboard</button>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,fontWeight:700,color:C.accent}}>{selected.name?.[0]}</span></div>
            <div><h3 style={{fontSize:18,fontWeight:700,margin:"0 0 2px",color:C.primary}}>{selected.name}</h3><p style={{fontSize:13,color:C.muted,margin:0}}>{selected.email} · {selected.cohort}</p></div>
          </div>
          <Btn onClick={()=>generatePDF(selected,getDayNumber(selected.start_date)>=90)} variant="ghost" style={{fontSize:12,padding:"6px 12px"}}>⬇ Download PDP</Btn>
        </div>

        <Card style={{marginBottom:"1rem"}}>
          <p style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:C.primary}}>Milestone Reflections</p>
          <div style={{display:"flex",gap:10}}>
            {[30,60,90].map(m=>{const done=!!selected.reflections?.[m];return <div key={m} style={{flex:1,padding:"10px",background:done?C.successLight:C.bg,border:`1.5px solid`,borderColor:done?C.success:C.border,borderRadius:10,textAlign:"center"}}><p style={{margin:0,fontSize:13,fontWeight:700,color:done?C.success:C.muted}}>Day {m}</p><p style={{margin:"2px 0 0",fontSize:11,color:done?C.success:C.muted}}>{done?"✓ Done":"Not yet"}</p></div>;})}
          </div>
          {Object.entries(selected.reflections||{}).map(([day,r])=>(
            <div key={day} style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:C.primary}}>Day {day} responses</p>
              {REFLECTION_QUESTIONS.map((q,i)=>r.answers?.[i]&&<div key={i} style={{marginBottom:8}}><p style={{margin:"0 0 2px",fontSize:12,fontWeight:600,color:C.muted}}>{q}</p><p style={{margin:0,fontSize:13,color:C.primary,lineHeight:1.6}}>{r.answers[i]}</p></div>)}
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <p style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:C.primary}}>Action Plan</p>
          {[["Key learnings",selected.plan?.keyLearnings],["Identity shift",selected.plan?.identityShift],["Strengths",selected.plan?.strengths],["Gaps",selected.plan?.gaps],["Obstacles",selected.plan?.obstacles],["Solutions",selected.plan?.solutions],["Tracking",selected.plan?.tracking],["Accountability",selected.plan?.accountability]].map(([l,v])=>v&&(
            <div key={l} style={{marginBottom:10}}><p style={{margin:"0 0 2px",fontSize:12,fontWeight:600,color:C.muted}}>{l}</p><p style={{margin:0,fontSize:13,color:C.primary,lineHeight:1.6}}>{v}</p></div>
          ))}
          {selected.plan?.habits?.filter(h=>h.action).map((h,i)=>(
            <div key={i} style={{marginTop:10,padding:"10px 14px",background:C.accentLight,borderRadius:10}}>
              <p style={{margin:"0 0 6px",fontSize:13,fontWeight:700,color:C.accent}}>Habit {i+1}: {h.action}</p>
              {[["Cue",h.cue],["Motivation",h.craving],["Simplification",h.response],["Reward",h.reward]].map(([l,v])=>v&&<p key={l} style={{margin:"2px 0",fontSize:12,color:C.primary}}><strong>{l}:</strong> {v}</p>)}
            </div>
          ))}
        </Card>

        <Btn onClick={()=>generateIndividualReport(selected)} disabled={generating} style={{width:"100%",padding:"12px",marginBottom:"1rem"}}>{generating?"Generating AI report…":"Generate individual AI report"}</Btn>
        {report&&<Card style={{lineHeight:1.8}}>{renderReport(report)}</Card>}
      </div>}
    </div>
  </div>;
}
