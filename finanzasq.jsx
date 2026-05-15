import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

const KEY = "finanzasq-v1";
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const NOW = new Date();
const $ = (n) => {
  const abs = Math.abs(n || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  return (n < 0 ? "-" : "") + "$" + abs;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

const CATS = {
  ingreso: ["Salario","Freelance","Comisiones","Inversiones","Ventas","Transferencia","Otro"],
  pago:    ["Servicios","Suscripciones","Alimentación","Transporte","Salud","Educación","Vivienda","Entretenimiento","Otro"],
  deuda:   ["Tarjeta de crédito","Préstamo personal","Hipoteca","Auto","Préstamo familiar","Otro"],
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07101f;--surf:#0d1a2d;--card:#0f1e33;
  --b0:rgba(255,255,255,0.04);--b1:rgba(255,255,255,0.08);--b2:rgba(255,255,255,0.14);
  --gold:#c9a84c;--gold2:#e8c96e;
  --green:#22c55e;--orange:#fb923c;--red:#f87171;--blue:#60a5fa;
  --t0:#e8e8e8;--t1:#8a9ab5;--t2:#4a5a72;
}
body{background:var(--bg);font-family:'Outfit',sans-serif;color:var(--t0)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
.mono{font-family:'DM Mono',monospace}
.serif{font-family:'Cinzel',serif}
input,select,textarea{
  background:var(--b0);border:1px solid var(--b1);color:var(--t0);
  border-radius:7px;padding:9px 12px;
  font-family:'Outfit',sans-serif;font-size:0.875rem;width:100%;outline:none;
  transition:border-color .2s
}
input:focus,select:focus,textarea:focus{border-color:var(--gold)}
select option{background:#0d1a2d}
textarea{resize:vertical;min-height:68px}
button{cursor:pointer;font-family:'Outfit',sans-serif}
.btn{border:none;border-radius:7px;font-weight:500;transition:all .18s;font-size:0.875rem}
.gold{background:var(--gold);color:#07101f;padding:8px 18px}
.gold:hover{background:var(--gold2);transform:translateY(-1px)}
.ghost{background:transparent;border:1px solid var(--b2);color:var(--t1);padding:7px 16px}
.ghost:hover{border-color:var(--gold);color:var(--gold)}
.sm{padding:5px 12px;font-size:0.8rem}
.icon-btn{background:transparent;border:1px solid var(--b1);color:var(--t1);border-radius:5px;padding:5px 9px;font-size:0.8rem;transition:all .15s}
.icon-btn:hover{border-color:var(--b2);color:var(--t0)}
.del-btn{border-color:rgba(248,113,113,.2);color:var(--red)}
.del-btn:hover{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.4)}
.tab{background:transparent;border:none;color:var(--t2);padding:10px 22px;font-size:0.875rem;
  font-weight:500;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.tab:hover{color:var(--t1)}
.tab.on{color:var(--gold);border-bottom-color:var(--gold)}
.row{display:grid;gap:10px;padding:11px 16px;border-bottom:1px solid var(--b1);align-items:center;transition:background .15s}
.row:hover{background:rgba(255,255,255,.02)}
.row:last-child{border-bottom:none}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:500}
.pill{border:1px solid;border-radius:5px;padding:3px 8px;font-size:0.76rem;cursor:pointer;transition:all .15s}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes ms{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes ti{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fi .28s ease}
.ms{animation:ms .22s ease}
.ti{animation:ti .25s ease}
`;

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ mes: NOW.getMonth()+1, año: NOW.getFullYear(), q: NOW.getDate()<=15?1:2 });
  const [tab, setTab] = useState("resumen");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [delId, setDelId] = useState(null);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(KEY); if (r) setEntries(JSON.parse(r.value)); }
      catch {}
      setLoading(false);
    })();
  }, []);

  const save = async (data) => {
    setEntries(data);
    try { await window.storage.set(KEY, JSON.stringify(data)); } catch {}
  };

  const toast_ = (msg, err) => { setToast({msg,err}); setTimeout(()=>setToast(null),3000); };

  const pEntries = entries.filter(e => {
    if (e.año !== period.año || e.mes !== period.mes) return false;
    return e.freq === "mensual" || e.q === period.q;
  });

  const ing = pEntries.filter(e => e.tipo==="ingreso");
  const pag = pEntries.filter(e => e.tipo==="pago");
  const deu = pEntries.filter(e => e.tipo==="deuda");
  const tIng = ing.reduce((s,e)=>s+(e.monto||0),0);
  const tPag = pag.reduce((s,e)=>s+(e.monto||0),0);
  const tDeu = deu.reduce((s,e)=>s+(e.monto||0),0);
  const tDPend = deu.filter(d=>!d.paid).reduce((s,e)=>s+(e.monto||0),0);
  const bal = tIng - tPag - tDPend;

  const openAdd = (tipo="ingreso") => {
    setForm({ tipo, concepto:"", monto:"", freq:"quincenal", q:period.q, mes:period.mes, año:period.año, cat:"", acreedor:"", detalles:"", paid:false });
    setModal({ mode:"add" });
  };
  const openEdit = (item) => { setForm({...item}); setModal({ mode:"edit", id:item.id }); };
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.concepto?.trim()) return toast_("El concepto es requerido", true);
    const monto = parseFloat(form.monto);
    if (!monto || monto<=0) return toast_("Ingresa un monto válido", true);
    if (modal.mode==="add") {
      await save([...entries, {...form, monto, id:uid(), createdAt:new Date().toISOString()}]);
    } else {
      await save(entries.map(e => e.id===modal.id ? {...form, monto, id:modal.id} : e));
    }
    toast_(modal.mode==="add" ? "Registro agregado ✓" : "Cambios guardados ✓");
    setModal(null);
  };

  const handleDel = async (id) => { await save(entries.filter(e=>e.id!==id)); setDelId(null); toast_("Eliminado"); };
  const togglePaid = async (id) => await save(entries.map(e=>e.id===id?{...e,paid:!e.paid}:e));

  const prevP = () => setPeriod(p=>{
    if(p.q===2) return {...p,q:1};
    const m=p.mes===1?12:p.mes-1, y=p.mes===1?p.año-1:p.año;
    return {mes:m,año:y,q:2};
  });
  const nextP = () => setPeriod(p=>{
    if(p.q===1) return {...p,q:2};
    const m=p.mes===12?1:p.mes+1, y=p.mes===12?p.año+1:p.año;
    return {mes:m,año:y,q:1};
  });

  const exportXLSX = () => {
    const rows = [["Tipo","Concepto","Monto","Frecuencia","Quincena","Mes","Año","Categoría","Acreedor","Estado","Detalles","Fecha"]];
    entries.forEach(e => rows.push([e.tipo,e.concepto,e.monto,e.freq,e.q===1?"1-15":"16-31",MONTHS[e.mes-1],e.año,e.cat||"",e.acreedor||"",e.paid?"Pagado":"Pendiente",e.detalles||"",e.createdAt||""]));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "FinanzasQ");
    XLSX.writeFile(wb, `finanzasq_${period.año}_${MONTHS[period.mes-1].toLowerCase()}.xlsx`);
  };

  const importXLSX = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target.result, {type:"binary"});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1}).slice(1);
        const imported = rows.filter(r=>r[0]).map(r=>({
          id:uid(), tipo:r[0], concepto:r[1], monto:parseFloat(r[2])||0,
          freq:r[3], q:r[4]==="1-15"?1:2,
          mes:MONTHS.indexOf(r[5])+1||1, año:parseInt(r[6])||2025,
          cat:r[7]||"", acreedor:r[8]||"", paid:r[9]==="Pagado",
          detalles:r[10]||"", createdAt:r[11]||new Date().toISOString(),
        }));
        await save([...entries, ...imported]);
        toast_(`${imported.length} registros importados ✓`);
      } catch { toast_("Error al importar el archivo", true); }
    };
    reader.readAsBinaryString(file);
    ev.target.value="";
  };

  const plabel = `${MONTHS[period.mes-1]} ${period.año} · Q${period.q} (${period.q===1?"1–15":"16–31"})`;
  const tabs = [
    {id:"resumen", l:"Resumen"},
    {id:"ingresos", l:`Ingresos (${ing.length})`},
    {id:"pagos", l:`Pagos (${pag.length})`},
    {id:"deudas", l:`Deudas (${deu.length})`},
  ];

  if (loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <style>{CSS}</style>
      <span className="mono" style={{color:"var(--gold)",fontSize:"1rem",letterSpacing:"0.2em"}}>CARGANDO...</span>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{background:"var(--bg)",minHeight:"100vh",fontFamily:"'Outfit',sans-serif"}}>

        {/* ── Header ── */}
        <header style={{background:"var(--surf)",borderBottom:"1px solid var(--b1)",padding:"0 28px",position:"sticky",top:0,zIndex:30}}>
          <div style={{maxWidth:1080,margin:"0 auto",height:58,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:10}}>
              <span className="serif" style={{fontSize:"1.3rem",fontWeight:700,color:"var(--gold)",letterSpacing:"0.06em"}}>FINANZAS</span>
              <span className="mono" style={{fontSize:"0.68rem",color:"var(--t2)",letterSpacing:"0.14em"}}>QUINCENAL</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn ghost sm" onClick={()=>fileRef.current.click()}>↑ Importar</button>
              <button className="btn ghost sm" onClick={exportXLSX}>↓ Excel</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importXLSX}/>
            </div>
          </div>
        </header>

        <div style={{maxWidth:1080,margin:"0 auto",padding:"26px 28px 80px"}}>

          {/* ── Period navigator ── */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
            <button className="btn ghost sm" onClick={prevP} style={{padding:"6px 16px"}}>‹</button>
            <div style={{flex:1,textAlign:"center"}}>
              <span className="serif" style={{fontSize:"1rem",color:"var(--gold)",letterSpacing:"0.1em"}}>{plabel}</span>
            </div>
            <button className="btn ghost sm" onClick={nextP} style={{padding:"6px 16px"}}>›</button>
          </div>

          {/* ── Summary cards ── */}
          <div className="fi" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
            {[
              {l:"Ingresos",v:tIng,c:"var(--green)",sub:`${ing.length} registros`},
              {l:"Pagos",v:tPag,c:"var(--orange)",sub:`${pag.length} registros`},
              {l:"Deudas",v:tDeu,c:"var(--red)",sub:`${deu.filter(d=>!d.paid).length} pendientes`},
              {l:"Balance",v:bal,c:bal>=0?"var(--green)":"var(--red)",sub:`Pend: ${$(tDPend)}`},
            ].map((card,i)=>(
              <div key={i} style={{background:"var(--card)",border:"1px solid var(--b1)",borderRadius:11,padding:"18px 20px",borderTop:`2px solid ${card.c}`}}>
                <div style={{fontSize:"0.7rem",color:"var(--t2)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>{card.l}</div>
                <div className="mono" style={{fontSize:"1.35rem",fontWeight:500,color:card.c,marginBottom:3}}>{$(card.v)}</div>
                <div style={{fontSize:"0.72rem",color:"var(--t2)"}}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div style={{borderBottom:"1px solid var(--b1)",marginBottom:22,display:"flex",overflowX:"auto"}}>
            {tabs.map(t=>(
              <button key={t.id} className={`tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
            ))}
          </div>

          {/* ── Content ── */}
          <div className="fi" key={tab+period.mes+period.año+period.q}>
            {tab==="resumen" && <Resumen ing={ing} pag={pag} deu={deu} tIng={tIng} tPag={tPag} tDeu={tDeu} bal={bal} tDPend={tDPend} onAdd={openAdd}/>}
            {tab==="ingresos" && <Entries entries={ing} tipo="ingreso" onAdd={()=>openAdd("ingreso")} onEdit={openEdit} onDel={setDelId} onToggle={togglePaid}/>}
            {tab==="pagos"    && <Entries entries={pag} tipo="pago"    onAdd={()=>openAdd("pago")}    onEdit={openEdit} onDel={setDelId} onToggle={togglePaid}/>}
            {tab==="deudas"   && <Entries entries={deu} tipo="deuda"   onAdd={()=>openAdd("deuda")}   onEdit={openEdit} onDel={setDelId} onToggle={togglePaid}/>}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setModal(null)}>
          <div className="ms" style={{background:"var(--card)",border:"1px solid var(--b2)",borderRadius:14,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",padding:28}} onClick={e=>e.stopPropagation()}>
            <h2 className="serif" style={{fontSize:"1.05rem",color:"var(--gold)",marginBottom:22}}>
              {modal.mode==="add"?"Nuevo Registro":"Editar Registro"}
            </h2>
            <FormFields form={form} sf={sf}/>
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
              <button className="btn ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn gold" onClick={handleSave}>{modal.mode==="add"?"+ Agregar":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {delId && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div className="ms" style={{background:"var(--card)",border:"1px solid rgba(248,113,113,.3)",borderRadius:12,padding:28,maxWidth:360,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:"2.2rem",marginBottom:10,opacity:.7}}>⚠</div>
            <h3 className="serif" style={{color:"var(--red)",marginBottom:8,fontSize:"1rem"}}>Eliminar registro</h3>
            <p style={{color:"var(--t1)",fontSize:"0.875rem",marginBottom:22}}>Esta acción no se puede deshacer.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button className="btn ghost" onClick={()=>setDelId(null)}>Cancelar</button>
              <button className="btn" style={{background:"rgba(248,113,113,.12)",border:"1px solid rgba(248,113,113,.35)",color:"var(--red)",padding:"7px 18px",borderRadius:7}} onClick={()=>handleDel(delId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="ti" style={{position:"fixed",bottom:24,right:24,zIndex:200,background:toast.err?"rgba(248,113,113,.12)":"rgba(34,197,94,.12)",border:`1px solid ${toast.err?"rgba(248,113,113,.4)":"rgba(34,197,94,.4)"}`,color:toast.err?"var(--red)":"var(--green)",padding:"11px 20px",borderRadius:8,fontSize:"0.875rem",backdropFilter:"blur(8px)"}}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

/* ══════════════ FORM ══════════════ */
function FormFields({ form, sf }) {
  const cats = CATS[form.tipo] || [];
  const btnStyle = (active, color) => ({
    flex:1, padding:"8px", fontSize:"0.85rem", cursor:"pointer", fontFamily:"'Outfit',sans-serif",
    fontWeight:500, borderRadius:7, border:`1px solid ${active ? color+"80" : "rgba(255,255,255,0.08)"}`,
    background: active ? color+"1a" : "rgba(255,255,255,0.03)",
    color: active ? color : "var(--t1)", transition:"all .15s",
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Tipo */}
      <div>
        <Label>Tipo *</Label>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button style={btnStyle(form.tipo==="ingreso","#22c55e")} onClick={()=>sf("tipo","ingreso")}>↑ Ingreso</button>
          <button style={btnStyle(form.tipo==="pago","#fb923c")}    onClick={()=>sf("tipo","pago")}>↓ Pago</button>
          <button style={btnStyle(form.tipo==="deuda","#f87171")}   onClick={()=>sf("tipo","deuda")}>⚠ Deuda</button>
        </div>
      </div>
      {/* Concepto */}
      <div>
        <Label>Concepto *</Label>
        <input type="text" placeholder="Ej: Salario quincenal" value={form.concepto||""} onChange={e=>sf("concepto",e.target.value)} style={{marginTop:6}}/>
      </div>
      {/* Monto + Cat */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <Label>Monto (USD) *</Label>
          <input type="number" step="0.01" placeholder="0.00" value={form.monto||""} onChange={e=>sf("monto",e.target.value)} style={{marginTop:6}}/>
        </div>
        <div>
          <Label>Categoría</Label>
          <select value={form.cat||""} onChange={e=>sf("cat",e.target.value)} style={{marginTop:6}}>
            <option value="">— Sin categoría</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {/* Frecuencia */}
      <div>
        <Label>Frecuencia</Label>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button style={btnStyle(form.freq==="quincenal","#c9a84c")} onClick={()=>sf("freq","quincenal")}>📅 Quincenal</button>
          <button style={btnStyle(form.freq==="mensual","#c9a84c")}   onClick={()=>sf("freq","mensual")}>🗓 Mensual</button>
        </div>
      </div>
      {/* Quincena */}
      {form.freq==="quincenal" && (
        <div>
          <Label>Quincena</Label>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button style={btnStyle(form.q===1,"#c9a84c")} onClick={()=>sf("q",1)}>Q1 · Días 1–15</button>
            <button style={btnStyle(form.q===2,"#c9a84c")} onClick={()=>sf("q",2)}>Q2 · Días 16–31</button>
          </div>
        </div>
      )}
      {/* Mes + Año */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <Label>Mes</Label>
          <select value={form.mes||1} onChange={e=>sf("mes",parseInt(e.target.value))} style={{marginTop:6}}>
            {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label>Año</Label>
          <input type="number" value={form.año||2025} onChange={e=>sf("año",parseInt(e.target.value))} style={{marginTop:6}}/>
        </div>
      </div>
      {/* Acreedor */}
      {form.tipo==="deuda" && (
        <div>
          <Label>Acreedor</Label>
          <input type="text" placeholder="Ej: Banco Nacional" value={form.acreedor||""} onChange={e=>sf("acreedor",e.target.value)} style={{marginTop:6}}/>
        </div>
      )}
      {/* Estado toggle */}
      {(form.tipo==="pago"||form.tipo==="deuda") && (
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:22,borderRadius:11,background:form.paid?"var(--green)":"var(--b2)",cursor:"pointer",position:"relative",transition:"background .2s"}} onClick={()=>sf("paid",!form.paid)}>
            <div style={{position:"absolute",top:3,left:form.paid?21:3,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
          </div>
          <span style={{fontSize:"0.875rem",color:"var(--t1)"}}>
            {form.tipo==="deuda" ? (form.paid?"Deuda pagada":"Deuda pendiente") : (form.paid?"Pago realizado":"Pago pendiente")}
          </span>
        </div>
      )}
      {/* Detalles */}
      <div>
        <Label>Detalles</Label>
        <textarea placeholder="Notas adicionales..." value={form.detalles||""} onChange={e=>sf("detalles",e.target.value)} style={{marginTop:6}}/>
      </div>
    </div>
  );
}

function Label({children}){
  return <div style={{fontSize:"0.72rem",color:"var(--t2)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{children}</div>;
}

/* ══════════════ RESUMEN ══════════════ */
function Resumen({ ing, pag, deu, tIng, tPag, tDeu, bal, tDPend, onAdd }) {
  const max = Math.max(tIng, tPag, tDeu, 1);
  const pend = deu.filter(d=>!d.paid);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
      {/* Distribución */}
      <div style={{background:"var(--card)",border:"1px solid var(--b1)",borderRadius:12,padding:24}}>
        <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--t2)",marginBottom:20}}>Distribución del período</div>
        {[
          {l:"Ingresos",v:tIng,c:"var(--green)"},
          {l:"Pagos",v:tPag,c:"var(--orange)"},
          {l:"Deudas totales",v:tDeu,c:"var(--red)"},
          {l:"Deudas pendientes",v:tDPend,c:"#fb7185"},
        ].map(item=>(
          <div key={item.l} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:"0.8rem",color:"var(--t1)"}}>{item.l}</span>
              <span className="mono" style={{fontSize:"0.82rem",color:item.c}}>{$(item.v)}</span>
            </div>
            <div style={{height:5,background:"var(--b1)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,(item.v/max)*100)}%`,background:item.c,borderRadius:3,transition:"width .6s ease"}}/>
            </div>
          </div>
        ))}
        <div style={{marginTop:22,paddingTop:18,borderTop:"1px solid var(--b1)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.1em",color:"var(--t2)"}}>Balance neto</span>
          <span className="mono" style={{fontSize:"1.25rem",fontWeight:500,color:bal>=0?"var(--green)":"var(--red)"}}>{$(bal)}</span>
        </div>
      </div>

      {/* Deudas pendientes */}
      <div style={{background:"var(--card)",border:"1px solid var(--b1)",borderRadius:12,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--t2)"}}>Deudas pendientes</div>
          <span className="mono" style={{fontSize:"0.9rem",color:"var(--red)"}}>{$(tDPend)}</span>
        </div>
        {pend.length===0 ? (
          <div style={{textAlign:"center",padding:"28px 0",color:"var(--t2)",fontSize:"0.875rem"}}>
            <div style={{fontSize:"2rem",marginBottom:8,opacity:.4}}>✓</div>
            Sin deudas pendientes
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {pend.slice(0,7).map(d=>(
              <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"rgba(248,113,113,.04)",borderRadius:7,border:"1px solid rgba(248,113,113,.08)"}}>
                <div>
                  <div style={{fontSize:"0.85rem",color:"var(--t0)"}}>{d.concepto}</div>
                  {d.acreedor && <div style={{fontSize:"0.72rem",color:"var(--t2)"}}>{d.acreedor}</div>}
                </div>
                <span className="mono" style={{fontSize:"0.85rem",color:"var(--red)",marginLeft:10}}>{$(d.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{gridColumn:"1/-1",background:"var(--card)",border:"1px solid var(--b1)",borderRadius:12,padding:24}}>
        <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--t2)",marginBottom:16}}>Acciones rápidas</div>
        <div style={{display:"flex",gap:12}}>
          {[
            {tipo:"ingreso",l:"+ Agregar ingreso",bg:"rgba(34,197,94,.1)",bdr:"rgba(34,197,94,.25)",c:"var(--green)"},
            {tipo:"pago",   l:"+ Agregar pago",   bg:"rgba(251,146,60,.1)",bdr:"rgba(251,146,60,.25)",c:"var(--orange)"},
            {tipo:"deuda",  l:"+ Agregar deuda",  bg:"rgba(248,113,113,.1)",bdr:"rgba(248,113,113,.25)",c:"var(--red)"},
          ].map(a=>(
            <button key={a.tipo} onClick={()=>onAdd(a.tipo)} style={{flex:1,padding:"14px",background:a.bg,border:`1px solid ${a.bdr}`,borderRadius:9,color:a.c,fontFamily:"'Outfit',sans-serif",fontWeight:500,fontSize:"0.9rem",cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              {a.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════ ENTRIES TABLE ══════════════ */
function Entries({ entries, tipo, onAdd, onEdit, onDel, onToggle }) {
  const COL = { ingreso:"var(--green)", pago:"var(--orange)", deuda:"var(--red)" };
  const c = COL[tipo];
  const total = entries.reduce((s,e)=>s+(e.monto||0),0);
  const isD = tipo==="deuda", isP = tipo==="pago";
  const cols = isD ? "2fr 1fr 1fr 1fr 1fr 90px" : isP ? "2fr 1fr 1fr 1fr 90px" : "2fr 1fr 1fr 1fr 70px";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{fontSize:"1rem",fontWeight:600,color:c}}>
          {tipo==="ingreso"?"Ingresos":tipo==="pago"?"Pagos":"Deudas"}
          <span className="mono" style={{fontSize:"0.78rem",color:"var(--t2)",marginLeft:10}}>Total {$(total)}</span>
        </h2>
        <button className="btn gold sm" onClick={onAdd}>+ Nuevo</button>
      </div>

      <div style={{background:"var(--card)",border:"1px solid var(--b1)",borderRadius:12,overflow:"hidden"}}>
        {/* Head */}
        <div style={{display:"grid",gridTemplateColumns:cols,gap:10,padding:"9px 16px",background:"var(--b0)",borderBottom:"1px solid var(--b1)",fontSize:"0.7rem",textTransform:"uppercase",letterSpacing:"0.1em",color:"var(--t2)"}}>
          <span>Concepto</span><span>Monto</span><span>Frecuencia</span><span>Categoría</span>
          {isD && <span>Acreedor</span>}
          {(isP||isD) && <span>Estado</span>}
          <span>Acc.</span>
        </div>

        {entries.length===0 ? (
          <div style={{textAlign:"center",padding:"44px",color:"var(--t2)"}}>
            <div style={{fontSize:"2.5rem",marginBottom:12,opacity:.25}}>◈</div>
            <p style={{fontSize:"0.875rem"}}>No hay registros en este período</p>
            <button className="btn gold sm" style={{marginTop:16}} onClick={onAdd}>+ Agregar</button>
          </div>
        ) : entries.map(e=>(
          <div key={e.id} className="row" style={{display:"grid",gridTemplateColumns:cols,gap:10}}>
            <div>
              <div style={{fontSize:"0.875rem",fontWeight:500,color:"var(--t0)"}}>{e.concepto}</div>
              {e.detalles && <div style={{fontSize:"0.72rem",color:"var(--t2)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{e.detalles}</div>}
            </div>
            <div className="mono" style={{fontSize:"0.875rem",color:c,display:"flex",alignItems:"center"}}>{$(e.monto)}</div>
            <div style={{display:"flex",alignItems:"center"}}>
              <span className="badge" style={{background:"rgba(201,168,76,.1)",color:"var(--gold)"}}>
                {e.freq==="quincenal"?`Q${e.q}`:"Mensual"}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center"}}>
              <span style={{fontSize:"0.78rem",color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.cat||"—"}</span>
            </div>
            {isD && <div style={{display:"flex",alignItems:"center"}}><span style={{fontSize:"0.78rem",color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.acreedor||"—"}</span></div>}
            {(isP||isD) && (
              <div style={{display:"flex",alignItems:"center"}}>
                <button className="pill" onClick={()=>onToggle(e.id)} style={{borderColor:e.paid?"rgba(34,197,94,.4)":"rgba(248,113,113,.4)",color:e.paid?"var(--green)":"var(--red)",background:e.paid?"rgba(34,197,94,.07)":"rgba(248,113,113,.07)"}}>
                  {e.paid?"✓ Pagado":"· Pend."}
                </button>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button className="icon-btn" onClick={()=>onEdit(e)} title="Editar">✎</button>
              <button className="icon-btn del-btn" onClick={()=>onDel(e.id)} title="Eliminar">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
