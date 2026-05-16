import { useState, useEffect } from "react";

const C = {
  indigo:"#4F46E5",blue:"#2563EB",teal:"#059669",amber:"#D97706",
  red:"#DC2626",green:"#16A34A",gray:"#6B7280",coral:"#EA580C",purple:"#7C3AED",
};
const SENT = {positive:C.teal,neutral:C.amber,negative:C.red};
const PRI  = {critical:C.red,high:C.coral,medium:C.amber,low:C.teal};
const STAT = {open:C.blue,"in-progress":C.purple,resolved:C.teal,escalated:C.red,blocked:C.gray};

const JIRA_URL = "https://techqa1.translations.com";
const JIRA_PROJECTS = ["TPDI","TRL","STM","SPROJ"];

const ACCOUNTS = [
  {id:"tech",name:"Kelvin Wu",    email:"kewu@transperfect.com",   password:"tech123", role:"technician",roleLabel:"Technician",initials:"KW",color:C.blue,  jiraUser:"kewu", hint:"Jira + ManageEngine access"},
  {id:"mgr", name:"Rachel Moore", email:"rachel.moore@company.com", password:"mgr123",  role:"manager",   roleLabel:"Manager",   initials:"RM",color:C.purple,jiraUser:null,   hint:"Overview, reporting & AI insights"},
  {id:"adm", name:"AdminHub",     email:"admin@company.com",        password:"admin123",role:"admin",     roleLabel:"Admin",     initials:"AH",color:C.indigo,jiraUser:null,   hint:"User management & system settings"},
];

const J = JIRA_URL + "/browse/";

const MOCK_JIRA = [
  {id:"TPDI-1042",title:"Translation pipeline fails on UTF-16 files",         status:"in-progress",priority:"critical",assignee:"Kelvin Wu",      customer:"Internal",created:"2026-03-20",updated:"2026-03-25",source:"jira",sla:88, project:"TPDI",  summary:"UTF-16 encoded source files cause the pipeline to crash at segmentation. Affects 12 percent of daily jobs.",      linked:null,url:J+"TPDI-1042"},
  {id:"TPDI-1038",title:"Memory leak in TM lookup service under load",         status:"open",       priority:"high",    assignee:"Kelvin Wu",      customer:"Internal",created:"2026-03-18",updated:"2026-03-24",source:"jira",sla:62, project:"TPDI",  summary:"TM lookup service leaks memory under high concurrent load. Restart workaround in place.",                         linked:null,url:J+"TPDI-1038"},
  {id:"TRL-892", title:"Glossary enforcement not applied to MT output",        status:"open",       priority:"high",    assignee:"Kelvin Wu",      customer:"Internal",created:"2026-03-16",updated:"2026-03-23",source:"jira",sla:55, project:"TRL",   summary:"Machine translated segments bypass glossary rules. Customer deliveries showing incorrect terminology.",             linked:null,url:J+"TRL-892"},
  {id:"TRL-887", title:"Segment locking fails silently in CAT tool connector", status:"blocked",    priority:"medium",  assignee:"Kelvin Wu",      customer:"Internal",created:"2026-03-12",updated:"2026-03-21",source:"jira",sla:91, project:"TRL",   summary:"Locked segments can be overwritten without warning. Blocked pending CAT tool vendor response.",                    linked:null,url:J+"TRL-887"},
  {id:"STM-441", title:"Workflow skips approval step on job re-submit",        status:"in-progress",priority:"critical",assignee:"Kelvin Wu",      customer:"Internal",created:"2026-03-14",updated:"2026-03-25",source:"jira",sla:45, project:"STM",   summary:"When a job is rejected and resubmitted the approval workflow step is silently skipped. Compliance risk.",          linked:null,url:J+"STM-441"},
  {id:"STM-438", title:"Notification emails not sent on status transitions",   status:"open",       priority:"medium",  assignee:"Nadim Sharif",   customer:"Internal",created:"2026-03-10",updated:"2026-03-22",source:"jira",sla:78, project:"STM",   summary:"Email notifications fail when workflow transitions from Review to Approved. SMTP queue shows no errors.",          linked:null,url:J+"STM-438"},
  {id:"SPROJ-214",title:"Project creation API returns 500 for non-ASCII names",status:"resolved",   priority:"high",    assignee:"Monica Dayalani",customer:"Internal",created:"2026-03-05",updated:"2026-03-19",source:"jira",sla:100,project:"SPROJ", summary:"Fixed encoding issue in project name sanitiser. Deployed to production 2026-03-19.",                               linked:null,url:J+"SPROJ-214"},
  {id:"SPROJ-211",title:"Bulk project import drops duplicate entries silently", status:"open",       priority:"low",     assignee:"Kelvin Wu",      customer:"Internal",created:"2026-03-08",updated:"2026-03-20",source:"jira",sla:85, project:"SPROJ", summary:"CSV bulk import drops duplicate project codes without reporting which rows were skipped.",                          linked:null,url:J+"SPROJ-211"},
];

const MOCK_ME = [
  {id:"ME-3821",title:"Cannot login, token expired immediately",     status:"open",       priority:"critical",assignee:"Nadim Sharif",      customer:"Acme Corp",   sentiment:"negative",created:"2026-03-19",updated:"2026-03-25",source:"me",sla:94, summary:"Enterprise customer has full login failure for 3 users. Angry follow-ups every 2 hours.",  linked:"TPDI-1042",url:"#"},
  {id:"ME-3818",title:"Report export shows question marks",          status:"in-progress",priority:"high",    assignee:"Mohammad Irfanullah",customer:"Beta Systems",sentiment:"negative",created:"2026-03-18",updated:"2026-03-24",source:"me",sla:71, summary:"Customer frustrated after third contact. Workaround is exports under 1k rows.",           linked:null,url:"#"},
  {id:"ME-3810",title:"Dashboard unusable, spinner over 10 seconds", status:"open",       priority:"high",    assignee:"Nadim Sharif",      customer:"Globex Inc",  sentiment:"negative",created:"2026-03-16",updated:"2026-03-23",source:"me",sla:50, summary:"Large enterprise org escalated to CSM. Blocking daily standups.",                         linked:null,url:"#"},
  {id:"ME-3805",title:"Billing invoice shows wrong currency",        status:"resolved",   priority:"medium",  assignee:"Jamil Khan",        customer:"Initech Ltd", sentiment:"positive",created:"2026-03-12",updated:"2026-03-21",source:"me",sla:100,summary:"EUR shown instead of GBP. Fixed locale config. Customer satisfied.",                    linked:null,url:"#"},
  {id:"ME-3799",title:"SSO login broken for all Okta users",         status:"resolved",   priority:"critical",assignee:"Nadim Sharif",      customer:"Massive Dyn", sentiment:"positive",created:"2026-03-05",updated:"2026-03-19",source:"me",sla:100,summary:"Critical SSO outage resolved in 14 hours. Customer praised rapid response.",            linked:null,url:"#"},
  {id:"ME-3792",title:"API rate limits too aggressive for bulk ops",  status:"open",       priority:"medium",  assignee:"Kelvin Wu",         customer:"Synthex Corp",sentiment:"neutral", created:"2026-03-03",updated:"2026-03-18",source:"me",sla:75, summary:"Customer hitting rate limit errors on bulk import. Requesting limit increase.",           linked:null,url:"#"},
  {id:"ME-3788",title:"Mobile app crashes on iOS 17.4",              status:"open",       priority:"high",    assignee:"Kelvin Wu",         customer:"Pharmatek",   sentiment:"negative",created:"2026-03-01",updated:"2026-03-20",source:"me",sla:60, summary:"Crash on launch for all iOS 17.4 users. Affects over 200 users at this enterprise.",    linked:null,url:"#"},
];

const ALL_MOCK = [...MOCK_JIRA, ...MOCK_ME];

const TEAM = [
  {name:"Nadim Sharif",       ins:"NS",resolved:14,open:2,avg:"3.2h",sla:98},
  {name:"Monica Dayalani",    ins:"MD",resolved:11,open:3,avg:"5.1h",sla:91},
  {name:"Jamil Khan",         ins:"JK",resolved:9, open:2,avg:"4.7h",sla:94},
  {name:"Mohammad Irfanullah",ins:"MI",resolved:13,open:2,avg:"2.9h",sla:97},
  {name:"Raj Pravakar",       ins:"RP",resolved:7, open:3,avg:"6.8h",sla:82},
  {name:"Karthick Arul",      ins:"KA",resolved:10,open:2,avg:"4.2h",sla:95},
  {name:"Kelvin Wu",          ins:"KW",resolved:12,open:2,avg:"3.8h",sla:96},
  {name:"Pratik Parikh",      ins:"PP",resolved:8, open:2,avg:"4.4h",sla:93},
];

const TREND = [
  {w:"Feb W1",n:3,u:4,p:5},{w:"Feb W2",n:4,u:3,p:4},{w:"Feb W3",n:2,u:5,p:6},
  {w:"Feb W4",n:5,u:4,p:3},{w:"Mar W1",n:6,u:3,p:3},{w:"Mar W2",n:7,u:4,p:2},{w:"Mar W3",n:5,u:5,p:3},
];

const CUST = [
  {name:"Acme Corp",   tier:"enterprise", sentiment:"negative",score:-0.82,tickets:3,trend:"down"},
  {name:"Globex Inc",  tier:"enterprise", sentiment:"negative",score:-0.74,tickets:2,trend:"down"},
  {name:"Pharmatek",   tier:"enterprise", sentiment:"negative",score:-0.65,tickets:1,trend:"down"},
  {name:"Beta Systems",tier:"mid-market", sentiment:"negative",score:-0.58,tickets:2,trend:"flat"},
  {name:"Synthex Corp",tier:"mid-market", sentiment:"neutral", score:-0.12,tickets:1,trend:"flat"},
  {name:"Initech Ltd", tier:"smb",        sentiment:"neutral", score:0.18, tickets:1,trend:"up"},
  {name:"Massive Dyn", tier:"enterprise", sentiment:"positive",score:0.78, tickets:1,trend:"up"},
];

const INSIGHTS = [
  {id:1,icon:"!",color:C.red,  title:"SLA breach predicted in 4h",    body:"STM-441 (Kelvin) — 45 percent SLA remaining. Approval workflow bug still open.",action:"Assign now"},
  {id:2,icon:"^",color:C.amber,title:"3 critical tickets open",        body:"TPDI-1042 and STM-441 both critical. No PRs raised in 48 hours.",              action:"Review now"},
  {id:3,icon:"v",color:C.coral,title:"Translation quality regression", body:"TRL-892 glossary enforcement issue affecting customer deliveries.",             action:"Escalate"},
  {id:4,icon:"*",color:C.teal, title:"KB article auto-drafted",        body:"SPROJ-214 resolved. Draft: Handling non-ASCII project names in API.",           action:"Review draft"},
];

const SLA7 = [
  {day:"Mon",met:24,b:2},{day:"Tue",met:28,b:1},{day:"Wed",met:22,b:4},
  {day:"Thu",met:31,b:2},{day:"Fri",met:19,b:3},{day:"Sat",met:12,b:1},{day:"Sun",met:8,b:0},
];

// ── Shared UI ─────────────────────────────────────────────────────
const Bdg = ({label,color,sm}) => (
  <span style={{fontSize:sm?10:11,padding:sm?"2px 7px":"3px 9px",borderRadius:20,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",border:"1.5px solid "+color,background:color+"15",color:color,whiteSpace:"nowrap"}}>{label}</span>
);
const SlaBar = ({v}) => (
  <div style={{display:"flex",alignItems:"center",gap:8}}>
    <div style={{flex:1,height:5,background:"#e5e7eb",borderRadius:3}}>
      <div style={{height:"100%",width:v+"%",background:v>80?C.teal:v>50?C.amber:C.red,borderRadius:3}}/>
    </div>
    <span style={{fontSize:11,color:"#6b7280",minWidth:30,textAlign:"right"}}>{v}%</span>
  </div>
);
const Dot = ({color,size}) => <span style={{width:size||8,height:size||8,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>;
const Sc = ({label,value,color,sub}) => (
  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",borderTop:"3px solid "+color,minWidth:0}}>
    <div style={{fontSize:24,fontWeight:800,color:color}}>{value}</div>
    <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:"0.07em",textTransform:"uppercase",marginTop:2}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>{sub}</div>}
  </div>
);
const Pill = ({label,active,onClick,count}) => (
  <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,border:active?"none":"1px solid #e5e7eb",background:active?"#111827":"#fff",color:active?"#fff":"#374151",fontSize:13,fontWeight:active?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
    {label}{count!==undefined&&<span style={{background:active?"rgba(255,255,255,0.25)":"#f3f4f6",color:active?"#fff":"#6b7280",borderRadius:10,fontSize:11,padding:"0 5px",fontWeight:700}}>{count}</span>}
  </button>
);
const Tog = ({checked,onChange}) => (
  <div onClick={()=>onChange(!checked)} style={{width:38,height:20,borderRadius:10,background:checked?C.indigo:"#d1d5db",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
    <div style={{position:"absolute",top:2,left:checked?19:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
  </div>
);
const Inp = ({label,value,onChange,type,placeholder,hint,required,children}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>{label}{required&&<span style={{color:C.red,marginLeft:3}}>*</span>}</label>}
    {children||<input type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>}
    {hint&&<div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{hint}</div>}
  </div>
);
const Overlay = ({title,sub,onClose,width,children}) => (
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:width||500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"18px 24px 14px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontSize:16,fontWeight:700,color:"#111827"}}>{title}</div>{sub&&<div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{sub}</div>}</div>
        <button onClick={onClose} style={{background:"#f3f4f6",border:"none",borderRadius:8,width:30,height:30,fontSize:18,cursor:"pointer",color:"#6b7280",marginLeft:12}}>x</button>
      </div>
      <div style={{padding:"20px 24px"}}>{children}</div>
    </div>
  </div>
);

// ── Detail Modal ──────────────────────────────────────────────────
const DetailModal = ({ticket,onClose}) => {
  const [loading,setLoading] = useState(false);
  const [sug,setSug] = useState(null);
  const ask = async () => {
    setLoading(true); setSug(null);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
          system:"Return ONLY valid JSON with keys: engineerAction, riskLevel (LOW|MED|HIGH), riskReason.",
          messages:[{role:"user",content:"Ticket "+ticket.id+": "+ticket.title+"\nSummary: "+ticket.summary+"\nSLA: "+ticket.sla+"%"}]})});
      const d = await r.json();
      try { setSug(JSON.parse((d.content[0].text||"").replace(/```json|```/g,"").trim())); }
      catch(e) { setSug({engineerAction:d.content[0].text||""}); }
    } catch(e) { setSug({engineerAction:"AI unavailable."}); }
    setLoading(false);
  };
  const srcColor = ticket.source==="jira" ? C.blue : C.purple;
  return (
    <Overlay title={ticket.id} sub={ticket.title} onClose={onClose} width={520}>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        <Bdg label={ticket.status} color={STAT[ticket.status]}/>
        <Bdg label={ticket.priority} color={PRI[ticket.priority]}/>
        {ticket.sentiment&&<Bdg label={ticket.sentiment} color={SENT[ticket.sentiment]}/>}
        <Bdg label={ticket.source==="jira"?"Jira":"ManageEngine"} color={srcColor}/>
      </div>
      <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Summary</div>
        <div style={{fontSize:13,color:"#374151",lineHeight:1.7}}>{ticket.summary}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[["Assignee",ticket.assignee],["Customer",ticket.customer||"Internal"],["Created",ticket.created],["Updated",ticket.updated]].map(function(kv){
          return (
            <div key={kv[0]} style={{background:"#f9fafb",borderRadius:8,padding:"8px 12px",border:"1px solid #f0f0f0"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{kv[0]}</div>
              <div style={{fontSize:13,fontWeight:600}}>{kv[1]||"n/a"}</div>
            </div>
          );
        })}
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>SLA health</div>
        <SlaBar v={ticket.sla}/>
      </div>
      {ticket.linked&&<div style={{padding:"9px 12px",borderRadius:8,border:"1px solid #dbeafe",background:"#eff6ff",marginBottom:14,fontSize:13}}>Linked: <span style={{color:C.blue,fontWeight:700}}>{ticket.linked}</span></div>}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <a href={ticket.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",border:"1.5px solid "+srcColor,borderRadius:8,fontSize:12,fontWeight:700,color:srcColor,textDecoration:"none",background:ticket.source==="jira"?"#eff6ff":"#f5f3ff"}}>
          {ticket.source==="jira"?"Open in Jira":"Open in ME"}
        </a>
      </div>
      <button onClick={ask} disabled={loading} style={{width:"100%",padding:"10px 0",background:C.indigo,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",opacity:loading?0.75:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:sug?14:0}}>
        {loading?"Generating...":"AI: suggest action"}
      </button>
      {sug&&(
        <div style={{borderTop:"1px solid #f0f0f0",paddingTop:14}}>
          {sug.engineerAction&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Recommended action</div><div style={{background:"#f9fafb",borderRadius:8,padding:"8px 12px",fontSize:13}}>{sug.engineerAction}</div></div>}
          {sug.riskLevel&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,background:sug.riskLevel==="HIGH"?"#fef2f2":sug.riskLevel==="MED"?"#fffbeb":"#f0fdf4"}}><Bdg label={"Risk: "+sug.riskLevel} color={sug.riskLevel==="HIGH"?C.red:sug.riskLevel==="MED"?C.amber:C.teal} sm={true}/><span style={{fontSize:12,color:"#6b7280"}}>{sug.riskReason}</span></div>}
        </div>
      )}
    </Overlay>
  );
};

// ── Comment Modal ─────────────────────────────────────────────────
const CommentModal = ({ticket,onClose}) => {
  const [txt,setTxt] = useState("");
  const [loading,setLoading] = useState(false);
  const [sending,setSending] = useState(false);
  const [sent,setSent] = useState(false);
  const isJ = ticket.source==="jira";
  const aiDraft = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,
          system:isJ?"Write a concise internal Jira engineering comment (2-3 sentences). Plain text only.":"Write a professional empathetic customer reply (2-3 sentences). Plain text only.",
          messages:[{role:"user",content:"Ticket: "+ticket.title+"\nStatus: "+ticket.status+"\nSummary: "+ticket.summary}]})});
      const d = await r.json();
      setTxt(d.content[0].text||"");
    } catch(e) { setTxt("Investigating the issue. Will update with findings shortly."); }
    setLoading(false);
  };
  const send = () => {
    if(!txt.trim()) return;
    setSending(true);
    setTimeout(function(){ setSending(false); setSent(true); setTimeout(onClose,1400); },1000);
  };
  const srcColor = isJ ? C.blue : C.indigo;
  return (
    <Overlay title={ticket.id+" - "+(isJ?"Add comment":"Reply")} onClose={onClose} width={560}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        <Bdg label={ticket.status} color={STAT[ticket.status]} sm={true}/>
        <Bdg label={ticket.priority} color={PRI[ticket.priority]} sm={true}/>
        <a href={ticket.url} target="_blank" rel="noreferrer" style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4,padding:"5px 12px",border:"1.5px solid "+srcColor,borderRadius:8,fontSize:12,fontWeight:700,color:srcColor,textDecoration:"none",background:isJ?"#eff6ff":"#f5f3ff"}}>
          {isJ?"Open in Jira":"Open in ME"}
        </a>
      </div>
      <div style={{fontSize:13,color:"#374151",background:"#f9fafb",borderRadius:8,padding:"10px 12px",marginBottom:14,lineHeight:1.6}}>{ticket.summary}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{isJ?"Add internal comment":"Reply to "+ticket.customer}</span>
        <button onClick={aiDraft} disabled={loading} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:C.indigo,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:loading?"wait":"pointer",opacity:loading?0.75:1}}>
          {loading?"Generating...":"AI draft"}
        </button>
      </div>
      {isJ&&(
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[["Update","Update on progress: "],["Root cause","Found root cause: "],["Resolved","Issue resolved - "]].map(function(item){
            return <button key={item[0]} onClick={function(){ setTxt(item[1]); }} style={{padding:"4px 10px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:7,background:"#f9fafb",cursor:"pointer",color:"#374151",fontWeight:600}}>{item[0]}</button>;
          })}
        </div>
      )}
      <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={4} placeholder={isJ?"Add an internal comment...":"Type your reply..."}
        style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e5e7eb",borderRadius:10,fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.6}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
        <select style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:7,fontSize:12,background:"#fff",cursor:"pointer"}}>
          <option>Keep current status</option>
          <option>Mark in progress</option>
          <option>Mark resolved</option>
          <option>Escalate</option>
        </select>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {sent&&<span style={{fontSize:12,color:C.teal,fontWeight:700}}>Posted!</span>}
          <button onClick={onClose} style={{padding:"7px 14px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Cancel</button>
          <button onClick={send} disabled={sending||!txt.trim()||sent} style={{padding:"7px 18px",background:sent?C.teal:srcColor,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",opacity:sending?0.75:1}}>
            {sending?"Posting...":sent?"Done":isJ?"Post comment":"Send reply"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

// ── Ticket Card ───────────────────────────────────────────────────
const TCard = ({t,onD,onC}) => {
  const isJ = t.source==="jira";
  const ac = isJ ? C.blue : C.purple;
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderTop:"3px solid "+ac,borderRadius:12,padding:"14px 16px",transition:"box-shadow 0.15s"}}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,cursor:"pointer"}} onClick={()=>onD(t)}>
        <div style={{fontSize:14,fontWeight:700,color:"#111827",flex:1,paddingRight:8,lineHeight:1.4}}>{t.title}</div>
        <Bdg label={t.priority} color={PRI[t.priority]} sm={true}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 10px",marginBottom:12,cursor:"pointer"}} onClick={()=>onD(t)}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Source</div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><Dot color={ac}/><span style={{fontSize:12,fontWeight:600}}>{isJ?"Jira":"ManageEngine"}</span></div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Status</div>
          <span style={{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:5,border:"1px solid #e5e7eb",background:"#f9fafb"}}>{t.status}</span>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Assignee</div>
          <span style={{fontSize:12,fontWeight:600}}>{t.assignee}</span>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{isJ?"Ticket ID":"Customer"}</div>
          <span style={{fontSize:12,fontWeight:600}}>{isJ?t.id:t.customer}</span>
        </div>
      </div>
      <div style={{marginBottom:12,cursor:"pointer"}} onClick={()=>onD(t)}><SlaBar v={t.sla}/></div>
      <div style={{display:"flex",gap:7,paddingTop:10,borderTop:"1px solid #f3f4f6",alignItems:"center"}}>
        {t.sentiment ? <div style={{display:"flex",alignItems:"center",gap:4,marginRight:"auto"}}><Dot color={SENT[t.sentiment]}/><span style={{fontSize:11,fontWeight:600,color:SENT[t.sentiment]}}>{t.sentiment}</span></div> : <span style={{flex:1}}/>}
        <a href={t.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",border:"1px solid "+ac,borderRadius:7,fontSize:11,fontWeight:700,color:ac,textDecoration:"none",background:isJ?"#eff6ff":"#f5f3ff"}}>{isJ?"Jira":"ME"}</a>
        <button onClick={e=>{e.stopPropagation();onC(t);}} style={{padding:"5px 10px",border:"1px solid "+(isJ?C.blue:C.indigo),borderRadius:7,fontSize:11,fontWeight:700,color:"#fff",background:isJ?C.blue:C.indigo,cursor:"pointer"}}>{isJ?"Comment":"Reply"}</button>
        <button onClick={()=>onD(t)} style={{padding:"5px 10px",border:"1px solid #e5e7eb",borderRadius:7,fontSize:11,fontWeight:700,color:"#374151",background:"#fff",cursor:"pointer"}}>Details</button>
      </div>
    </div>
  );
};

// ── Login ─────────────────────────────────────────────────────────
const Login = ({onLogin}) => {
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [err,setErr]     = useState("");
  const [show,setShow]   = useState(false);
  const go = () => {
    const a = ACCOUNTS.find(x=>x.email===email.trim()&&x.password===pass);
    if(a){ setErr(""); onLogin(a); } else setErr("Invalid email or password.");
  };
  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32,justifyContent:"center"}}>
          <div style={{width:44,height:44,borderRadius:12,background:C.indigo,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,color:"#fff",fontWeight:800}}>US</span></div>
          <div><div style={{fontWeight:800,fontSize:20,color:"#111827"}}>UNIFIED SUPPORT</div><div style={{fontSize:13,color:"#9ca3af"}}>Sign in to your account</div></div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"32px 32px 28px",boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:13,fontWeight:700,color:"#374151",marginBottom:7}}>Email address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} type="email" placeholder="you@company.com"
              style={{width:"100%",padding:"10px 14px",border:"1px solid "+(err?C.red:"#e5e7eb"),borderRadius:9,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:8}}>
            <label style={{display:"block",fontSize:13,fontWeight:700,color:"#374151",marginBottom:7}}>Password</label>
            <div style={{position:"relative"}}>
              <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} type={show?"text":"password"} placeholder="..."
                style={{width:"100%",padding:"10px 44px 10px 14px",border:"1px solid "+(err?C.red:"#e5e7eb"),borderRadius:9,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
              <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#9ca3af",padding:0}}>{show?"Hide":"Show"}</button>
            </div>
          </div>
          {err&&<div style={{fontSize:13,color:C.red,marginBottom:12,padding:"8px 12px",background:"#fef2f2",borderRadius:8,border:"1px solid #fecaca"}}>{err}</div>}
          <button onClick={go} style={{width:"100%",padding:"11px 0",background:C.indigo,color:"#fff",border:"none",borderRadius:9,fontSize:15,fontWeight:700,cursor:"pointer",marginTop:err?0:16,marginBottom:20}}>Sign in</button>
          <div style={{borderTop:"1px solid #f3f4f6",paddingTop:20}}>
            <div style={{fontSize:12,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12,textAlign:"center"}}>Demo accounts</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {ACCOUNTS.map(a=>(
                <button key={a.id} onClick={()=>{setEmail(a.email);setPass(a.password);setErr("");}}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",border:"1px solid #f0f0f0",borderRadius:10,background:"#f9fafb",cursor:"pointer",textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=a.color}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#f0f0f0"}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:800,flexShrink:0}}>{a.initials}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{a.name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{a.hint}</div></div>
                  <span style={{fontSize:12,color:"#d1d5db"}}>-&gt;</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Technician View ───────────────────────────────────────────────
const TechView = ({user}) => {
  const [tickets,setTickets] = useState([]);
  const [loading,setLoading] = useState(true);
  const [tab,setTab]         = useState("all");
  const [pri,setPri]         = useState("all");
  const [q,setQ]             = useState("");
  const [sel,setSel]         = useState(null);
  const [com,setCom]         = useState(null);

  useEffect(()=>{
    const mine = ALL_MOCK.filter(t=>t.assignee===user.name);
    setTickets(mine.length ? mine : ALL_MOCK);
    setLoading(false);
  },[]);

  const mine = tickets.filter(t=>t.assignee===user.name);
  const base = tab==="mine" ? mine : tab==="jira" ? tickets.filter(t=>t.source==="jira") : tab==="me" ? tickets.filter(t=>t.source==="me") : tickets;
  const rows = base.filter(t=>(pri==="all"||t.priority===pri)&&(!q||t.title.toLowerCase().includes(q.toLowerCase())||t.id.toLowerCase().includes(q.toLowerCase())));

  const stats = [
    {label:"Assigned to me",value:mine.length,color:C.blue},
    {label:"Open",value:mine.filter(t=>["open","in-progress","blocked"].includes(t.status)).length,color:C.green},
    {label:"Critical",value:mine.filter(t=>t.priority==="critical").length,color:C.red},
    {label:"Jira tickets",value:mine.filter(t=>t.source==="jira").length,color:C.purple},
    {label:"ME tickets",value:mine.filter(t=>t.source==="me").length,color:C.teal},
  ];

  if(loading) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16}}>
      <div style={{width:36,height:36,border:"3px solid #e5e7eb",borderTop:"3px solid "+C.indigo,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontSize:14,color:"#6b7280",fontWeight:600}}>Loading tickets...</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return (
    <div style={{padding:"26px 28px",maxWidth:1180,margin:"0 auto"}}>
      <h1 style={{fontSize:26,fontWeight:800,color:"#111827",margin:"0 0 4px"}}>Ticket Queue</h1>
      <p style={{fontSize:14,color:"#6b7280",margin:"0 0 22px"}}>Manage and resolve Jira and ManageEngine tickets.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:22}}>
        {stats.map(s=><Sc key={s.label} {...s}/>)}
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",rowGap:8}}>
          <span style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em"}}>View</span>
          {[["all","All",ALL_MOCK.length],["mine","My tickets",mine.length],["jira","Jira",tickets.filter(t=>t.source==="jira").length],["me","ManageEngine",tickets.filter(t=>t.source==="me").length]].map(function(item){
            return <Pill key={item[0]} label={item[1]} active={tab===item[0]} count={item[2]} onClick={function(){ setTab(item[0]); }}/>;
          })}
          <div style={{width:1,height:24,background:"#e5e7eb"}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em"}}>Priority</span>
          {["all","critical","high","medium","low"].map(p=><Pill key={p} label={p==="all"?"All":p} active={pri===p} onClick={()=>setPri(p)}/>)}
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." style={{marginLeft:"auto",padding:"7px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",width:160,background:"#f9fafb"}}/>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <Dot color={C.green} size={10}/>
        <span style={{fontWeight:700,fontSize:14,color:"#111827"}}>{tab==="mine"?"My tickets":tab==="jira"?"Jira":tab==="me"?"ManageEngine":"All tickets"}</span>
        <span style={{marginLeft:"auto",fontSize:13,color:"#9ca3af"}}>{rows.length} tickets</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {rows.map(t=><TCard key={t.id} t={t} onD={setSel} onC={setCom}/>)}
        {rows.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:"#9ca3af",fontSize:14}}>No tickets match.</div>}
      </div>
      {sel&&<DetailModal ticket={sel} onClose={()=>setSel(null)}/>}
      {com&&<CommentModal ticket={com} onClose={()=>setCom(null)}/>}
    </div>
  );
};

// ── Sentiment Tab ─────────────────────────────────────────────────
const SentTab = () => {
  const [sf,setSf]     = useState("all");
  const [sel,setSel]   = useState(null);
  const [loading,setLoading] = useState(false);
  const [sum,setSum]   = useState("");
  const neg=3; const neu=2; const pos=2; const tot=7;
  const mx = Math.max.apply(null, TREND.map(function(d){ return d.n+d.u+d.p; }));
  const rows = sf==="all" ? MOCK_ME : MOCK_ME.filter(t=>t.sentiment===sf);
  const genSum = async () => {
    setLoading(true); setSum("");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,
          system:"Write a 4-bullet sentiment briefing (plain text, use bullet symbol). Cover overall health, top at-risk accounts, trend direction, one recommended action.",
          messages:[{role:"user",content:neg+" negative, "+neu+" neutral, "+pos+" positive. At-risk: Acme -0.82, Globex -0.74, Pharmatek -0.65. Negative up over 6 weeks."}]})});
      const d = await r.json();
      setSum(d.content[0].text||"Unable to generate.");
    } catch(e) { setSum("AI unavailable."); }
    setLoading(false);
  };
  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:6}}>Sentiment analysis</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",background:C.purple+"15",border:"1px solid "+C.purple+"40",borderRadius:20}}>
            <Dot color={C.purple} size={6}/><span style={{fontSize:12,fontWeight:600,color:C.purple}}>ManageEngine tickets only</span>
          </div>
          <span style={{fontSize:12,color:"#9ca3af"}}>Jira tickets are internal</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
        <Sc label="Negative" value={neg} color={C.red}   sub={Math.round(neg/tot*100)+"% of ME tickets"}/>
        <Sc label="Neutral"  value={neu} color={C.amber} sub={Math.round(neu/tot*100)+"% of ME tickets"}/>
        <Sc label="Positive" value={pos} color={C.teal}  sub={Math.round(pos/tot*100)+"% of ME tickets"}/>
        <Sc label="At-risk enterprise" value={CUST.filter(c=>c.tier==="enterprise"&&c.sentiment==="negative").length} color={C.coral} sub="accounts need attention"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:2}}>Trend - 7 weeks</div>
          <div style={{fontSize:12,color:C.red,fontWeight:600,marginBottom:14}}>Negative trending upward</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100,marginBottom:10}}>
            {TREND.map(d=>(
              <div key={d.w} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:84,gap:1}}>
                  <div style={{width:"100%",height:(d.n/mx*100)+"%",background:C.red,  borderRadius:"2px 2px 0 0",opacity:0.85,minHeight:3}}/>
                  <div style={{width:"100%",height:(d.u/mx*100)+"%",background:C.amber,opacity:0.7, minHeight:2}}/>
                  <div style={{width:"100%",height:(d.p/mx*100)+"%",background:C.teal, opacity:0.7, minHeight:2}}/>
                </div>
                <span style={{fontSize:9,color:"#9ca3af",textAlign:"center",lineHeight:1.2}}>{d.w.split(" ")[1]}<br/>{d.w.split(" ")[0].slice(0,3)}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:14,fontSize:11,color:"#6b7280"}}>
            {[[C.red,"Neg"],[C.amber,"Neutral"],[C.teal,"Pos"]].map(function(item){
              return <span key={item[1]} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:item[0],display:"inline-block"}}/>{item[1]}</span>;
            })}
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><div style={{fontSize:14,fontWeight:700,color:"#111827"}}>AI briefing</div><div style={{fontSize:12,color:"#9ca3af"}}>AI-generated analysis</div></div>
            <button onClick={genSum} disabled={loading} style={{padding:"7px 14px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:loading?"wait":"pointer",opacity:loading?0.75:1,display:"flex",alignItems:"center",gap:6}}>
              {loading?"Generating...":"Generate"}
            </button>
          </div>
          {sum ? <div style={{fontSize:13,color:"#374151",lineHeight:2,whiteSpace:"pre-line"}}>{sum}</div>
               : <div style={{fontSize:13,color:"#9ca3af",fontStyle:"italic"}}>Click Generate for an AI-powered analysis.</div>}
        </div>
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>Per-customer breakdown</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f9fafb",borderBottom:"1px solid #f0f0f0"}}>
            {["Customer","Tier","Sentiment","Score","Trend","Tickets","Risk"].map(h=>(
              <th key={h} style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {CUST.map(c=>{
              const risk = c.score<-0.7?"High":c.score<-0.3?"Medium":"Low";
              const rc   = c.score<-0.7?C.red:c.score<-0.3?C.amber:C.teal;
              const sc   = SENT[c.sentiment];
              const barW = Math.abs(c.score)*100;
              return (
                <tr key={c.name} style={{borderBottom:"1px solid #f9fafb"}}>
                  <td style={{padding:"11px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Dot color={sc}/><span style={{fontSize:14,fontWeight:600}}>{c.name}</span></div></td>
                  <td style={{padding:"11px 12px"}}><Bdg label={c.tier} color={c.tier==="enterprise"?C.indigo:c.tier==="mid-market"?C.blue:C.gray} sm={true}/></td>
                  <td style={{padding:"11px 12px"}}><Bdg label={c.sentiment} color={sc} sm={true}/></td>
                  <td style={{padding:"11px 12px",minWidth:130}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:80,height:6,background:"#f3f4f6",borderRadius:3,position:"relative"}}>
                        <div style={{position:"absolute",height:"100%",width:barW+"%",background:c.score<0?C.red:C.teal,borderRadius:3,right:c.score<0?0:"auto",left:c.score>=0?0:"auto"}}/>
                        <div style={{position:"absolute",left:"50%",top:-1,width:1,height:8,background:"#e5e7eb"}}/>
                      </div>
                      <span style={{fontSize:12,color:c.score<0?C.red:C.teal,fontWeight:700}}>{c.score>0?"+":""}{c.score.toFixed(2)}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 12px",fontSize:16,color:c.trend==="down"?C.red:c.trend==="up"?C.teal:C.amber}}>{c.trend==="down"?"v":c.trend==="up"?"^":"="}</td>
                  <td style={{padding:"11px 12px",fontSize:14,color:"#374151"}}>{c.tickets}</td>
                  <td style={{padding:"11px 12px"}}><Bdg label={risk} color={rc} sm={true}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>Sentiment by category</div>
          {[["Auth/SSO",5,1,1],["Performance",4,1,0],["Data export",2,1,1],["Billing",0,1,1],["API/Webhooks",1,1,0]].map(function(item){
            const cat=item[0]; const n=item[1]; const u=item[2]; const p=item[3]; const total=n+u+p;
            return (
              <div key={cat} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#374151"}}>{cat}</span>
                  <span style={{fontSize:12,color:"#9ca3af"}}>{total} tickets</span>
                </div>
                <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",gap:1}}>
                  {n>0&&<div style={{flex:n,background:C.red,  opacity:0.85}}/>}
                  {u>0&&<div style={{flex:u,background:C.amber,opacity:0.75}}/>}
                  {p>0&&<div style={{flex:p,background:C.teal, opacity:0.75}}/>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>Tickets by sentiment</div>
            <div style={{display:"flex",gap:4}}>
              {["all","negative","neutral","positive"].map(s=>(
                <button key={s} onClick={()=>setSf(s)} style={{padding:"4px 10px",borderRadius:12,border:"none",background:sf===s?(s==="negative"?C.red:s==="neutral"?C.amber:s==="positive"?C.teal:"#111827"):"#f3f4f6",color:sf===s?"#fff":"#6b7280",fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>
                  {s==="all"?"All":s}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto"}}>
            {rows.map(t=>(
              <div key={t.id} onClick={()=>setSel(t)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",border:"1px solid #f0f0f0",borderLeft:"3px solid "+(SENT[t.sentiment]||C.gray),borderRadius:8,cursor:"pointer",background:"#fff",transition:"background 0.12s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                <Dot color={SENT[t.sentiment]||C.gray}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue}}>{t.id}</div>
                  <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <Bdg label={t.sentiment} color={SENT[t.sentiment]||C.gray} sm={true}/>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{t.customer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:"16px 20px"}}>
        <div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:12}}>At-risk enterprise accounts</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {CUST.filter(c=>c.sentiment==="negative"&&c.tier==="enterprise").map(c=>(
            <div key={c.name} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #fecaca"}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{c.name}</div>
              <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>Score: <span style={{color:C.red,fontWeight:700}}>{c.score.toFixed(2)}</span> - {c.tickets} tickets</div>
              <div style={{display:"flex",justifyContent:"space-between"}}><Bdg label="Enterprise" color={C.indigo} sm={true}/><span style={{fontSize:11,fontWeight:700,color:C.red}}>Declining</span></div>
            </div>
          ))}
        </div>
      </div>
      {sel&&<DetailModal ticket={sel} onClose={()=>setSel(null)}/>}
    </div>
  );
};

// ── Manager View ──────────────────────────────────────────────────
const MgrView = () => {
  const [tab,setTab]       = useState("overview");
  const [dis,setDis]       = useState([]);
  const [loading,setLoading] = useState(false);
  const [brief,setBrief]   = useState("");
  const [sel,setSel]       = useState(null);
  const active = INSIGHTS.filter(i=>!dis.includes(i.id));
  const tickets = ALL_MOCK;
  const ms = [
    {label:"Total tickets",value:tickets.length,color:C.indigo},
    {label:"Open",value:tickets.filter(t=>["open","in-progress","blocked"].includes(t.status)).length,color:C.green},
    {label:"Critical",value:tickets.filter(t=>t.priority==="critical").length,color:C.red},
    {label:"Negative sentiment",value:MOCK_ME.filter(t=>t.sentiment==="negative").length,color:C.coral},
    {label:"Avg SLA",value:Math.round(tickets.reduce(function(a,t){return a+t.sla;},0)/tickets.length)+"%",color:C.teal},
    {label:"SLA breach risk",value:2,color:C.amber},
  ];
  const genBrief = async () => {
    setLoading(true); setBrief("");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,
          system:"Generate an executive support briefing as 5 bullet points (plain text). Cover top risks, SLA health, sentiment, team highlights, one recommended action.",
          messages:[{role:"user",content:ms[1].value+" open tickets, "+ms[2].value+" critical, avg SLA "+ms[4].value+", 2 breach risks."}]})});
      const d = await r.json();
      setBrief(d.content[0].text||"Unable to generate.");
    } catch(e) { setBrief("AI unavailable."); }
    setLoading(false);
  };
  const tabs = [
    {id:"overview",  label:"Overview"},
    {id:"sentiment", label:"Sentiment analysis", badge:MOCK_ME.filter(t=>t.sentiment==="negative").length},
    {id:"insights",  label:"AI insights",        badge:active.length},
    {id:"reporting", label:"Reporting"},
    {id:"team",      label:"Team"},
  ];
  return (
    <div style={{padding:"26px 28px",maxWidth:1180,margin:"0 auto"}}>
      <h1 style={{fontSize:26,fontWeight:800,color:"#111827",margin:"0 0 4px"}}>Management Dashboard</h1>
      <p style={{fontSize:14,color:"#6b7280",margin:"0 0 22px"}}>Overview, sentiment, reporting and AI insights.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:22}}>
        {ms.map(s=><Sc key={s.label} {...s}/>)}
      </div>
      <div style={{display:"flex",marginBottom:24,borderBottom:"2px solid #f3f4f6"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 18px",background:"none",border:"none",borderBottom:tab===t.id?"3px solid "+C.indigo:"3px solid transparent",fontSize:14,fontWeight:tab===t.id?700:500,color:tab===t.id?C.indigo:"#6b7280",cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:-2,whiteSpace:"nowrap"}}>
            {t.label}{t.badge>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,fontSize:11,padding:"1px 6px",fontWeight:700}}>{t.badge}</span>}
          </button>
        ))}
      </div>
      {tab==="sentiment"&&<SentTab/>}
      {tab==="overview"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{gridColumn:"1/-1",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div><div style={{fontSize:15,fontWeight:700}}>Morning briefing</div><div style={{fontSize:13,color:"#6b7280"}}>AI-generated summary</div></div>
              <button onClick={genBrief} disabled={loading} style={{padding:"8px 16px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:loading?"wait":"pointer",opacity:loading?0.75:1,display:"flex",alignItems:"center",gap:6}}>
                {loading?"Generating...":"Generate AI briefing"}
              </button>
            </div>
            {brief ? <div style={{fontSize:14,color:"#374151",lineHeight:2,whiteSpace:"pre-line"}}>{brief}</div>
                   : <div style={{fontSize:14,color:"#9ca3af",fontStyle:"italic"}}>Click Generate AI briefing for today's summary.</div>}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>Ticket status</div>
            {[["Open",tickets.filter(t=>t.status==="open").length,C.blue],["In progress",tickets.filter(t=>t.status==="in-progress").length,C.purple],["Blocked",tickets.filter(t=>t.status==="blocked").length,C.amber],["Resolved",tickets.filter(t=>t.status==="resolved").length,C.teal]].map(function(item){
              return (
                <div key={item[0]} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <span style={{fontSize:13,color:"#6b7280",width:80}}>{item[0]}</span>
                  <div style={{flex:1,height:8,background:"#f3f4f6",borderRadius:4}}><div style={{height:"100%",width:(item[1]/tickets.length*100)+"%",background:item[2],borderRadius:4}}/></div>
                  <span style={{fontSize:13,fontWeight:700,color:item[2],minWidth:20,textAlign:"right"}}>{item[1]}</span>
                </div>
              );
            })}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>At-risk tickets</div>
            {tickets.filter(t=>t.sla<70||t.priority==="critical").slice(0,4).map(t=>(
              <div key={t.id} onClick={()=>setSel(t)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f9fafb",cursor:"pointer"}}>
                <span style={{fontSize:12,color:C.blue,fontWeight:700,minWidth:90}}>{t.id}</span>
                <span style={{fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
                <Bdg label={t.priority} color={PRI[t.priority]} sm={true}/>
                <div style={{width:80}}><SlaBar v={t.sla}/></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==="insights"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {active.map(ins=>(
            <div key={ins.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderLeft:"4px solid "+ins.color,borderRadius:12,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,color:ins.color}}>{ins.icon}</span><span style={{fontSize:14,fontWeight:700,color:ins.color}}>{ins.title}</span></div>
                <button onClick={()=>setDis(d=>[...d,ins.id])} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:18,padding:0}}>x</button>
              </div>
              <div style={{fontSize:13,color:"#6b7280",lineHeight:1.7,marginBottom:12}}>{ins.body}</div>
              <button style={{fontSize:12,padding:"5px 12px",border:"1.5px solid "+ins.color,background:"transparent",color:ins.color,borderRadius:7,cursor:"pointer",fontWeight:700}}>{ins.action}</button>
            </div>
          ))}
          {active.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:"#9ca3af"}}>All insights reviewed.</div>}
        </div>
      )}
      {tab==="reporting"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:16}}>SLA compliance - 7 days</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:90}}>
              {SLA7.map(d=>(
                <div key={d.day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:74,gap:1}}>
                    <div style={{width:"100%",height:(d.b/4*100)+"%",background:C.red, borderRadius:"2px 2px 0 0",opacity:0.75,minHeight:d.b?4:0}}/>
                    <div style={{width:"100%",height:(d.met/31*100)+"%",background:C.teal,borderRadius:"2px 2px 0 0",opacity:0.8}}/>
                  </div>
                  <span style={{fontSize:11,color:"#9ca3af"}}>{d.day}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:14,marginTop:10,fontSize:12,color:"#6b7280"}}>
              {[[C.teal,"Met"],[C.red,"Breached"]].map(function(item){
                return <span key={item[1]} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:item[0],display:"inline-block"}}/>{item[1]}</span>;
              })}
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>Avg resolution time</div>
            {TEAM.map(p=>(
              <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:12,color:"#6b7280",width:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name.split(" ")[0]}</span>
                <div style={{flex:1,height:8,background:"#f3f4f6",borderRadius:4}}><div style={{height:"100%",width:(parseFloat(p.avg)/6.8*100)+"%",background:parseFloat(p.avg)<4?C.teal:C.amber,borderRadius:4}}/></div>
                <span style={{fontSize:12,minWidth:34,textAlign:"right",color:"#6b7280"}}>{p.avg}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>Enterprise account health</div>
            {CUST.filter(c=>c.tier==="enterprise").map(c=>(
              <div key={c.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f9fafb"}}>
                <Dot color={SENT[c.sentiment]}/><span style={{fontSize:13,fontWeight:600,flex:1}}>{c.name}</span>
                <Bdg label={c.sentiment} color={SENT[c.sentiment]} sm={true}/><span style={{fontSize:12,color:"#9ca3af"}}>{c.tickets} tickets</span>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:14}}>Backlog trend</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
              {[12,15,18,14,16,19,17,21,18,16,14,17,19,10].map(function(v,i){
                return <div key={i} style={{flex:1,height:(v/21*100)+"%",background:i>10?C.purple:C.blue,borderRadius:"2px 2px 0 0",opacity:0.75}}/>;
              })}
            </div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:6}}>Recent drop: auth fix resolved</div>
          </div>
        </div>
      )}
      {tab==="team"&&(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f9fafb",borderBottom:"1px solid #f0f0f0"}}>
              {["Technician","Resolved","Open","Avg resolution","SLA health","Status"].map(h=>(
                <th key={h} style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {TEAM.map(p=>(
                <tr key={p.name} style={{borderBottom:"1px solid #f9fafb"}}>
                  <td style={{padding:"13px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:C.indigo,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700}}>{p.ins}</div>
                      <span style={{fontSize:14,fontWeight:600}}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{padding:"13px 14px",fontSize:14,color:C.teal,fontWeight:700}}>{p.resolved}</td>
                  <td style={{padding:"13px 14px",fontSize:14,color:p.open>2?C.amber:"#374151"}}>{p.open}</td>
                  <td style={{padding:"13px 14px",fontSize:14}}>{p.avg}</td>
                  <td style={{padding:"13px 14px",width:130}}><SlaBar v={p.sla}/></td>
                  <td style={{padding:"13px 14px"}}><Bdg label={p.sla>=95?"On track":p.sla>=85?"Watch":"Needs review"} color={p.sla>=95?C.teal:p.sla>=85?C.amber:C.red} sm={true}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sel&&<DetailModal ticket={sel} onClose={()=>setSel(null)}/>}
    </div>
  );
};

// ── Admin View ────────────────────────────────────────────────────
const AdminView = () => {
  const [aTab,setATab] = useState("users");
  const [toast,setToast] = useState(null);
  const st = (msg,type) => { setToast({msg,type:type||"success"}); setTimeout(()=>setToast(null),3000); };
  const [users,setUsers] = useState([
    {id:1, name:"Nadim Sharif",        email:"nadim.sharif@company.com",   role:"technician",status:"active",ins:"NS"},
    {id:2, name:"Monica Dayalani",     email:"monica.dayalani@company.com", role:"technician",status:"active",ins:"MD"},
    {id:3, name:"Jamil Khan",          email:"jamil.khan@company.com",      role:"technician",status:"active",ins:"JK"},
    {id:4, name:"Mohammad Irfanullah", email:"m.irfanullah@company.com",    role:"technician",status:"active",ins:"MI"},
    {id:5, name:"Raj Pravakar",        email:"raj.pravakar@company.com",    role:"technician",status:"active",ins:"RP"},
    {id:6, name:"Karthick Arul",       email:"karthick.arul@company.com",   role:"technician",status:"active",ins:"KA"},
    {id:7, name:"Kelvin Wu",           email:"kewu@transperfect.com",       role:"technician",status:"active",ins:"KW"},
    {id:8, name:"Pratik Parikh",       email:"pratik.parikh@company.com",   role:"technician",status:"active",ins:"PP"},
    {id:9, name:"Rachel Moore",        email:"rachel.moore@company.com",    role:"manager",   status:"active",ins:"RM"},
    {id:10,name:"Maya Rao",            email:"maya.rao@company.com",        role:"manager",   status:"active",ins:"MR"},
  ]);
  const [invOpen,setInvOpen] = useState(false);
  const [editU,setEditU]     = useState(null);
  const [delId,setDelId]     = useState(null);
  const [inv,setInv]         = useState({fn:"",ln:"",email:"",role:"technician",dept:"",welcome:true});
  const [invErr,setInvErr]   = useState({});
  const RC = {technician:C.blue,manager:C.purple,admin:C.indigo};
  const valInv = () => {
    const e = {};
    if(!inv.fn.trim()) e.fn="Required";
    if(!inv.ln.trim()) e.ln="Required";
    if(!inv.email.trim()) e.email="Required";
    else if(!/\S+@\S+\.\S+/.test(inv.email)) e.email="Invalid email";
    else if(users.find(u=>u.email===inv.email.trim())) e.email="Already exists";
    return e;
  };
  const doInv = () => {
    const e = valInv();
    if(Object.keys(e).length){ setInvErr(e); return; }
    setUsers(us=>[...us,{id:Date.now(),name:inv.fn.trim()+" "+inv.ln.trim(),email:inv.email.trim(),role:inv.role,status:"active",ins:(inv.fn[0]+inv.ln[0]).toUpperCase()}]);
    setInvOpen(false); setInv({fn:"",ln:"",email:"",role:"technician",dept:"",welcome:true}); setInvErr({});
    st("Invitation sent to "+inv.email.trim()+".");
  };
  const [jira,setJira] = useState({
    serverEnabled:true, serverUrl:JIRA_URL, serverPAT:"", serverProject:JIRA_PROJECTS.join(","),
    cloudEnabled:false, cloudUrl:"https://yoursite.atlassian.net", cloudEmail:"", cloudToken:"", cloudProject:"SUPP",
  });
  const [showPAT,setShowPAT] = useState(false);
  const [showCT,setShowCT]   = useState(false);
  const [jTest,setJTest]     = useState(null);
  const testJ = (type) => {
    setJTest(type+"-testing");
    setTimeout(function(){
      setJTest(type+"-cors");
      st("Browser CORS restriction. Use proxy server for live data.","info");
      setTimeout(function(){ setJTest(null); },3000);
    },1800);
  };
  const [me,setMe]     = useState({enabled:false,url:"https://helpdesk.company.com",apiKey:""});
  const [smtp,setSmtp] = useState({enabled:true,host:"smtp.sendgrid.net",port:"587",enc:"tls",user:"apikey",pass:"",fromName:"UnifiedSupport Alerts",fromEmail:"alerts@company.com"});

  const ATABS = [{id:"users",label:"Users"},{id:"jira",label:"Jira"},{id:"me",label:"ManageEngine"},{id:"smtp",label:"SMTP"},{id:"health",label:"Health"}];

  return (
    <div style={{padding:"26px 28px",maxWidth:1180,margin:"0 auto"}}>
      <h1 style={{fontSize:26,fontWeight:800,color:"#111827",margin:"0 0 4px"}}>Admin Panel</h1>
      <p style={{fontSize:14,color:"#6b7280",margin:"0 0 22px"}}>Manage users, integrations, SMTP and system settings.</p>
      <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:"2px solid #f3f4f6"}}>
        {ATABS.map(t=>(
          <button key={t.id} onClick={()=>setATab(t.id)} style={{padding:"9px 18px",background:"none",border:"none",borderBottom:aTab===t.id?"3px solid "+C.indigo:"3px solid transparent",fontSize:13,fontWeight:aTab===t.id?700:500,color:aTab===t.id?C.indigo:"#6b7280",cursor:"pointer",marginBottom:-2,whiteSpace:"nowrap"}}>{t.label}</button>
        ))}
      </div>

      {aTab==="users"&&(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:15,fontWeight:700,color:"#111827"}}>User accounts</div><div style={{fontSize:13,color:"#6b7280"}}>{users.length} users</div></div>
            <button onClick={()=>{setInv({fn:"",ln:"",email:"",role:"technician",dept:"",welcome:true});setInvErr({});setInvOpen(true);}} style={{padding:"8px 16px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Invite user</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f9fafb",borderBottom:"1px solid #f0f0f0"}}>
              {["User","Role","Status","Actions"].map(h=><th key={h} style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}>
                  <td style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:RC[u.role]||C.indigo,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0}}>{u.ins}</div>
                      <div><div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{u.name}</div><div style={{fontSize:12,color:"#9ca3af"}}>{u.email}</div></div>
                    </div>
                  </td>
                  <td style={{padding:"12px 16px"}}><Bdg label={u.role} color={RC[u.role]||C.indigo} sm={true}/></td>
                  <td style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Tog checked={u.status==="active"} onChange={()=>setUsers(us=>us.map(x=>x.id===u.id?{...x,status:x.status==="active"?"inactive":"active"}:x))}/>
                      <Bdg label={u.status} color={u.status==="active"?C.teal:C.gray} sm={true}/>
                    </div>
                  </td>
                  <td style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditU({...u})} style={{fontSize:12,padding:"5px 12px",border:"1px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:"pointer",fontWeight:600}}>Edit</button>
                      <button onClick={()=>setDelId(u.id)} style={{fontSize:12,padding:"5px 12px",border:"1px solid "+C.red,borderRadius:7,background:"#fff",cursor:"pointer",fontWeight:600,color:C.red}}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aTab==="jira"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:6,background:"#172B4D",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:"#fff",fontWeight:800}}>J</span></div>
                  <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>Jira Server / Data Center</span>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#f3f4f6",color:C.gray,fontWeight:700}}>Self-hosted</span>
                </div>
                <div style={{fontSize:13,color:"#6b7280",marginTop:4}}>{jira.serverUrl}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:600,color:jira.serverEnabled?C.teal:C.gray}}>{jira.serverEnabled?"Enabled":"Disabled"}</span><Tog checked={jira.serverEnabled} onChange={v=>setJira(j=>({...j,serverEnabled:v}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
              <Inp label="Server URL" required value={jira.serverUrl} onChange={v=>setJira(j=>({...j,serverUrl:v}))}/>
              <Inp label="Projects" value={jira.serverProject} onChange={v=>setJira(j=>({...j,serverProject:v}))} hint="TPDI, TRL, STM, SPROJ"/>
              <div style={{marginBottom:14,gridColumn:"1/-1"}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>Personal Access Token (PAT)</label>
                <div style={{display:"flex",gap:8}}>
                  <input type={showPAT?"text":"password"} value={jira.serverPAT} onChange={e=>setJira(j=>({...j,serverPAT:e.target.value}))} placeholder="Paste your Jira Server PAT"
                    style={{flex:1,padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none"}}/>
                  <button onClick={()=>setShowPAT(s=>!s)} style={{padding:"0 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>{showPAT?"Hide":"Show"}</button>
                </div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Profile menu - Personal Access Tokens - Create token</div>
              </div>
            </div>
            <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Webhook endpoint</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <code style={{flex:1,fontSize:12,color:C.indigo,background:"#eff6ff",padding:"7px 12px",borderRadius:6}}>https://unifiedsupport.company.com/api/webhooks/jira-server</code>
                <button onClick={()=>st("URL copied.")} style={{padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>Copy</button>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>st("Jira Server settings saved.")} style={{padding:"9px 18px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save settings</button>
              <button onClick={()=>testJ("server")} disabled={jTest&&jTest.includes("testing")} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff",color:jTest==="server-cors"?C.amber:"#374151",opacity:jTest&&jTest.includes("testing")?0.7:1}}>
                {jTest==="server-testing"?"Testing...":jTest==="server-cors"?"CORS (use proxy)":"Test connection"}
              </button>
              <button onClick={()=>st("Sync triggered.","info")} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Sync now</button>
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:6,background:"#0052CC",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:"#fff",fontWeight:800}}>J</span></div>
                  <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>Jira Cloud</span>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#eff6ff",color:C.blue,fontWeight:700}}>atlassian.net</span>
                </div>
                <div style={{fontSize:13,color:"#6b7280",marginTop:4}}>Email + API token authentication</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:600,color:jira.cloudEnabled?C.teal:C.gray}}>{jira.cloudEnabled?"Enabled":"Disabled"}</span><Tog checked={jira.cloudEnabled} onChange={v=>setJira(j=>({...j,cloudEnabled:v}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
              <Inp label="Cloud URL" value={jira.cloudUrl} onChange={v=>setJira(j=>({...j,cloudUrl:v}))} placeholder="https://yoursite.atlassian.net"/>
              <Inp label="Admin email" value={jira.cloudEmail} onChange={v=>setJira(j=>({...j,cloudEmail:v}))} placeholder="admin@company.com"/>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>API token</label>
                <div style={{display:"flex",gap:8}}>
                  <input type={showCT?"text":"password"} value={jira.cloudToken} onChange={e=>setJira(j=>({...j,cloudToken:e.target.value}))} placeholder="Paste Atlassian API token"
                    style={{flex:1,padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none"}}/>
                  <button onClick={()=>setShowCT(s=>!s)} style={{padding:"0 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>{showCT?"Hide":"Show"}</button>
                </div>
              </div>
              <Inp label="Project key" value={jira.cloudProject} onChange={v=>setJira(j=>({...j,cloudProject:v}))} placeholder="SUPP"/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>st("Jira Cloud settings saved.")} style={{padding:"9px 18px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save settings</button>
              <button onClick={()=>testJ("cloud")} disabled={jTest&&jTest.includes("testing")} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff",opacity:jTest&&jTest.includes("testing")?0.7:1}}>
                {jTest==="cloud-testing"?"Testing...":"Test connection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aTab==="me"&&(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div><div style={{fontSize:15,fontWeight:700,color:"#111827"}}>ManageEngine ServiceDesk Plus</div><div style={{fontSize:13,color:"#6b7280"}}>On-Premise - API key authentication</div></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:600,color:me.enabled?C.teal:C.gray}}>{me.enabled?"Enabled":"Disabled"}</span><Tog checked={me.enabled} onChange={v=>setMe(m=>({...m,enabled:v}))}/></div>
          </div>
          <div style={{padding:"10px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,marginBottom:16,fontSize:13,color:"#92400e"}}>ManageEngine integration not yet configured. Add your server URL and API key to enable it.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
            <Inp label="Server URL" value={me.url} onChange={v=>setMe(m=>({...m,url:v}))} placeholder="https://helpdesk.company.com"/>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>API key (admin technician)</label>
              <input type="password" value={me.apiKey} onChange={e=>setMe(m=>({...m,apiKey:e.target.value}))} placeholder="Paste your admin API key"
                style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Admin - Technician - admin account - Generate API key</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>st("ManageEngine settings saved.")} style={{padding:"9px 18px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save settings</button>
            <button onClick={()=>st("Add URL and API key first.","info")} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Test connection</button>
          </div>
        </div>
      )}

      {aTab==="smtp"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div><div style={{fontSize:15,fontWeight:700,color:"#111827"}}>SMTP configuration</div><div style={{fontSize:13,color:"#6b7280"}}>Mail server for notifications</div></div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:600,color:smtp.enabled?C.teal:C.gray}}>{smtp.enabled?"Enabled":"Disabled"}</span><Tog checked={smtp.enabled} onChange={v=>setSmtp(s=>({...s,enabled:v}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
              <Inp label="SMTP host" required value={smtp.host} onChange={v=>setSmtp(s=>({...s,host:v}))}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
                <Inp label="Port" value={smtp.port} onChange={v=>setSmtp(s=>({...s,port:v}))}/>
                <div style={{marginBottom:14}}>
                  <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>Encryption</label>
                  <select value={smtp.enc} onChange={e=>setSmtp(s=>({...s,enc:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,background:"#fff"}}>
                    <option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option>
                  </select>
                </div>
              </div>
              <Inp label="Username" value={smtp.user} onChange={v=>setSmtp(s=>({...s,user:v}))}/>
              <Inp label="Password" type="password" value={smtp.pass} onChange={v=>setSmtp(s=>({...s,pass:v}))} placeholder="..."/>
              <Inp label="From name" value={smtp.fromName} onChange={v=>setSmtp(s=>({...s,fromName:v}))}/>
              <Inp label="From email" value={smtp.fromEmail} onChange={v=>setSmtp(s=>({...s,fromEmail:v}))}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>st("SMTP settings saved.")} style={{padding:"9px 18px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save settings</button>
              <button onClick={()=>st("Test email sent.","info")} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Send test email</button>
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:14}}>Notification rules</div>
            {[
              {name:"Negative sentiment alert",trigger:"Negative sentiment on any ME ticket",color:C.red,enabled:true,to:"rachel.moore@company.com"},
              {name:"Critical ticket alert",trigger:"Critical priority ticket created",color:C.red,enabled:true,to:"rachel.moore@company.com"},
              {name:"SLA breach warning",trigger:"SLA threshold reached 80 percent",color:C.amber,enabled:true,to:"rachel.moore@company.com"},
              {name:"Enterprise escalation",trigger:"Enterprise customer with negative sentiment",color:C.coral,enabled:false,to:"rachel.moore@company.com"},
            ].map(r=>(
              <div key={r.name} style={{border:"1px solid #f0f0f0",borderLeft:"4px solid "+(r.enabled?r.color:"#e5e7eb"),borderRadius:10,padding:"12px 16px",marginBottom:10,background:r.enabled?"#fff":"#fafafa"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{r.name}</span><Bdg label={r.enabled?"Active":"Paused"} color={r.enabled?C.teal:C.gray} sm={true}/></div>
                    <div style={{fontSize:12,color:"#6b7280"}}>{r.trigger}</div>
                    <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>To: {r.to}</div>
                  </div>
                  <button onClick={()=>st("Rule saved.")} style={{fontSize:12,padding:"5px 12px",border:"1px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:"pointer",fontWeight:600,marginLeft:12}}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aTab==="health"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
          {[
            {label:"Jira Server",ok:jira.serverEnabled,detail:jira.serverUrl,sub:"PAT auth - Projects: "+JIRA_PROJECTS.join(", ")},
            {label:"Jira Cloud", ok:jira.cloudEnabled, detail:jira.cloudEnabled?"Connected":"Not configured",sub:"Email + API token"},
            {label:"ManageEngine",ok:me.enabled,detail:me.enabled?"Connected":"Not configured",sub:"On-Premise - API key"},
            {label:"SMTP",ok:smtp.enabled,detail:smtp.enabled?"Operational":"Disabled",sub:"Host: "+smtp.host},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",border:"1px solid "+(s.ok?"#bbf7d0":"#fecaca"),borderRadius:12,padding:"18px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:s.ok?"#f0fdf4":"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center"}}><Dot color={s.ok?C.teal:C.red} size={10}/></div>
                <div><div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{s.label}</div><div style={{fontSize:12,color:s.ok?C.teal:C.red,fontWeight:600}}>{s.ok?"Operational":"Offline"}</div></div>
              </div>
              <div style={{fontSize:12,color:"#374151",marginBottom:3,wordBreak:"break-all"}}>{s.detail}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {invOpen&&(
        <Overlay title="Invite new user" sub="An invitation email will be sent with login instructions." onClose={()=>setInvOpen(false)} width={540}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>First name *</label>
              <input value={inv.fn} onChange={e=>setInv(f=>({...f,fn:e.target.value}))} placeholder="Jane"
                style={{width:"100%",padding:"9px 12px",border:"1px solid "+(invErr.fn?C.red:"#e5e7eb"),borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              {invErr.fn&&<div style={{fontSize:11,color:C.red,marginTop:3}}>{invErr.fn}</div>}
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>Last name *</label>
              <input value={inv.ln} onChange={e=>setInv(f=>({...f,ln:e.target.value}))} placeholder="Smith"
                style={{width:"100%",padding:"9px 12px",border:"1px solid "+(invErr.ln?C.red:"#e5e7eb"),borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              {invErr.ln&&<div style={{fontSize:11,color:C.red,marginTop:3}}>{invErr.ln}</div>}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>Work email *</label>
            <input type="email" value={inv.email} onChange={e=>setInv(f=>({...f,email:e.target.value}))} placeholder="jane.smith@company.com"
              style={{width:"100%",padding:"9px 12px",border:"1px solid "+(invErr.email?C.red:"#e5e7eb"),borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            {invErr.email&&<div style={{fontSize:11,color:C.red,marginTop:3}}>{invErr.email}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>Role *</label>
              <select value={inv.role} onChange={e=>setInv(f=>({...f,role:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer"}}>
                <option value="technician">Technician</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Inp label="Department" value={inv.dept} onChange={v=>setInv(f=>({...f,dept:v}))} placeholder="Support Engineering"/>
          </div>
          <div style={{background:"#f9fafb",borderRadius:10,border:"1px solid #f0f0f0",padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:4}}>Access for {inv.role}</div>
            {inv.role==="technician"&&<div style={{fontSize:12,color:"#6b7280",lineHeight:1.8}}>Jira tickets, ME tickets, AI reply suggestions. No reporting access.</div>}
            {inv.role==="manager"&&<div style={{fontSize:12,color:"#6b7280",lineHeight:1.8}}>Overview, sentiment analysis, AI insights, reporting. No ticket editing.</div>}
            {inv.role==="admin"&&<div style={{fontSize:12,color:"#6b7280",lineHeight:1.8}}>Full access including user management, integrations and SMTP.</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"10px 14px",background:"#eff6ff",borderRadius:8}}>
            <input type="checkbox" checked={inv.welcome} onChange={e=>setInv(f=>({...f,welcome:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}}/>
            <span style={{fontSize:13,color:"#1e40af"}}>Send welcome email with login instructions</span>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>setInvOpen(false)} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Cancel</button>
            <button onClick={doInv} style={{padding:"9px 20px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Send invitation</button>
          </div>
        </Overlay>
      )}
      {editU&&(
        <Overlay title="Edit user" onClose={()=>setEditU(null)} width={440}>
          <Inp label="Full name" required value={editU.name} onChange={v=>setEditU(u=>({...u,name:v}))}/>
          <Inp label="Email" type="email" required value={editU.email} onChange={v=>setEditU(u=>({...u,email:v}))}/>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>Role</label>
            <select value={editU.role} onChange={e=>setEditU(u=>({...u,role:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,background:"#fff"}}>
              <option value="technician">Technician</option><option value="manager">Manager</option><option value="admin">Admin</option>
            </select>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>setEditU(null)} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Cancel</button>
            <button onClick={()=>{setUsers(us=>us.map(u=>u.id===editU.id?{...u,...editU}:u));setEditU(null);st(editU.name+" updated.");}}
              style={{padding:"9px 18px",background:C.indigo,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save changes</button>
          </div>
        </Overlay>
      )}
      {delId&&(
        <Overlay title="Remove user" onClose={()=>setDelId(null)} width={400}>
          <div style={{fontSize:14,color:"#374151",lineHeight:1.7,marginBottom:20}}>Remove <strong>{(users.find(u=>u.id===delId)||{}).name}</strong>? They will immediately lose access.</div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>setDelId(null)} style={{padding:"9px 18px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"#fff"}}>Cancel</button>
            <button onClick={()=>{setUsers(us=>us.filter(u=>u.id!==delId));setDelId(null);st("User removed.","info");}} style={{padding:"9px 18px",background:C.red,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Remove user</button>
          </div>
        </Overlay>
      )}
      {toast&&(
        <div style={{position:"fixed",bottom:24,right:24,background:toast.type==="success"?C.teal:toast.type==="error"?C.red:C.amber,color:"#fff",padding:"11px 18px",borderRadius:10,fontSize:14,fontWeight:600,zIndex:3000,display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
          <span>{toast.type==="success"?"ok":"!"}</span>{toast.msg}
          <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:16,padding:0,marginLeft:6,opacity:0.8}}>x</button>
        </div>
      )}
    </div>
  );
};

// ── Header + Root ─────────────────────────────────────────────────
const Header = ({user,onLogout}) => (
  <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 28px",display:"flex",alignItems:"center",height:58,position:"sticky",top:0,zIndex:200}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:32,height:32,borderRadius:8,background:C.indigo,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:"#fff",fontWeight:800}}>US</span></div>
      <div><div style={{fontWeight:800,fontSize:14,color:"#111827",letterSpacing:"0.02em"}}>UNIFIED SUPPORT</div><div style={{fontSize:11,color:"#9ca3af"}}>Welcome, {user.name}</div></div>
    </div>
    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:user.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:800}}>{user.initials}</div>
        <div><div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{user.name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{user.roleLabel}</div></div>
      </div>
      <div style={{width:1,height:24,background:"#e5e7eb"}}/>
      <button onClick={onLogout} style={{fontSize:13,fontWeight:700,color:C.red,background:"none",border:"1px solid #fecaca",borderRadius:7,cursor:"pointer",padding:"5px 12px"}}>Logout</button>
    </div>
  </div>
);

export default function App(){
  const [user,setUser] = useState(null);
  if(!user) return <Login onLogin={setUser}/>;
  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",color:"#111827",minHeight:"100vh",background:"#f9fafb"}}>
      <Header user={user} onLogout={()=>setUser(null)}/>
      {user.role==="technician"&&<TechView user={user}/>}
      {user.role==="manager"&&<MgrView/>}
      {user.role==="admin"&&<AdminView/>}
    </div>
  );
}
