const $=(id)=>document.getElementById(id);
const els={
qty:$("qty"),vat:$("vat"),
neutralCost:$("neutralCost"),neutralBasis:$("neutralBasis"),neutralMode:$("neutralMode"),
persCost:$("persCost"),persBasis:$("persBasis"),persMode:$("persMode"),
mode:$("mode"),
targetBox:$("targetBox"),profit:$("profit"),
simulateBox:$("simulateBox"),simPrice:$("simPrice"),simMode:$("simMode"),
totalSellNet:$("totalSellNet"),totalSellGross:$("totalSellGross"),netProfit:$("netProfit"),
unitSellNet:$("unitSellNet"),unitSellGross:$("unitSellGross"),
unitCostNet:$("unitCostNet"),unitCostGross:$("unitCostGross"),
vatOnSales:$("vatOnSales"),vatToPay:$("vatToPay"),vatCredit:$("vatCredit"),
neutralBreak:$("neutralBreak"),persBreak:$("persBreak"),
statusPill:$("statusPill"),profitBadge:$("profitBadge"),pdfDate:$("pdfDate"),checkLine:$("checkLine"),
toast:$("toast"),copyBtn:$("copyBtn"),copyBtn2:$("copyBtn2"),pdfBtn:$("pdfBtn"),pdfBtn2:$("pdfBtn2"),resetBtn:$("resetBtn"),
};
// PWA standalone detection (iOS/Android)
(function(){
  const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
  if(isStandalone) document.body.classList.add("standalone");
})();

// Persistenza dati (salva/recupera automaticamente)
const STORAGE_KEY = "calcolatoreIVA_state_v1";
function saveState(){
  try{
    const state = {
      qty: els.qty.value, vat: els.vat.value,
      neutralCost: els.neutralCost.value, neutralMode: els.neutralMode.value, neutralBasis: els.neutralBasis.value,
      persCost: els.persCost.value, persMode: els.persMode.value, persBasis: els.persBasis.value,
      mode: els.mode.value,
      profit: els.profit.value,
      simPrice: els.simPrice.value, simMode: els.simMode.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){}
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const s = JSON.parse(raw);
    if(s.qty!=null) els.qty.value=s.qty;
    if(s.vat!=null) els.vat.value=s.vat;
    if(s.neutralCost!=null) els.neutralCost.value=s.neutralCost;
    if(s.neutralMode!=null) els.neutralMode.value=s.neutralMode;
    if(s.neutralBasis!=null) els.neutralBasis.value=s.neutralBasis;
    if(s.persCost!=null) els.persCost.value=s.persCost;
    if(s.persMode!=null) els.persMode.value=s.persMode;
    if(s.persBasis!=null) els.persBasis.value=s.persBasis;
    if(s.mode!=null) els.mode.value=s.mode;
    if(s.profit!=null) els.profit.value=s.profit;
    if(s.simPrice!=null) els.simPrice.value=s.simPrice;
    if(s.simMode!=null) els.simMode.value=s.simMode;
  }catch(e){}
}

function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>els.toast.classList.remove("show"),1600);}
function parseEuro(s){if(!s)return 0;s=String(s).trim().replace("€","").replace(/\s+/g,"");const hasComma=s.includes(","),hasDot=s.includes(".");if(hasComma&&hasDot){s=s.replace(/\./g,"").replace(",",".");}else{s=s.replace(",",".");}const n=Number(s);return Number.isFinite(n)?n:NaN;}
function fmtEUR(n){if(!Number.isFinite(n))return "—";return n.toLocaleString("it-IT",{style:"currency",currency:"EUR"});}
function breakdownCost(amount,mode,vatRate){
 if(!Number.isFinite(amount)||amount<0)return null;
 if(mode==="IVA incl."){const net=amount/(1+vatRate);const vat=amount-net;return{net,vat,gross:amount};}
 if(mode==="IVA escl."){const net=amount;const vat=amount*vatRate;return{net,vat,gross:net+vat};}
 if(mode==="Nero"){return{net:amount,vat:0,gross:amount};}
 return null;
}

function setProfitBadge(netProfit){
  // reset classes
  els.profitBadge.classList.remove("good","warn","bad");
  if(!Number.isFinite(netProfit)){
    els.profitBadge.textContent = "—";
    return;
  }
  const eps = 0.0005;
  if(netProfit < -eps){
    els.profitBadge.classList.add("bad");
    els.profitBadge.textContent = "PREZZO IN PERDITA";
  }else if(Math.abs(netProfit) <= eps){
    els.profitBadge.classList.add("warn");
    els.profitBadge.textContent = "PAREGGIO";
  }else{
    els.profitBadge.classList.add("good");
    els.profitBadge.textContent = "PREZZO SOSTENIBILE";
  }
}

function setStatus(type,text){
 els.statusPill.textContent=text;
 els.statusPill.style.borderColor= type==="bad"?"rgba(248,113,113,.55)": type==="warn"?"rgba(251,191,36,.55)":"rgba(134,239,172,.45)";
 els.statusPill.style.background= type==="bad"?"rgba(248,113,113,.12)": type==="warn"?"rgba(251,191,36,.10)":"rgba(134,239,172,.10)";
}
function compute(){
 const qty=Math.trunc(parseEuro(els.qty.value));
 const vatPct=parseEuro(els.vat.value);
 let neutralInput=parseEuro(els.neutralCost.value);
 let persInput=parseEuro(els.persCost.value);

 if(!Number.isFinite(qty)||qty<=0){setStatus("bad","Quantità non valida");return null;}
 if(!Number.isFinite(vatPct)||vatPct<0){setStatus("bad","IVA non valida");return null;}
 if(!Number.isFinite(neutralInput)||neutralInput<0||!Number.isFinite(persInput)||persInput<0){setStatus("bad","Costi non validi");return null;}

 // if totals, convert to per-piece
 if(els.neutralBasis.value==="total") neutralInput = neutralInput / qty;
 if(els.persBasis.value==="total") persInput = persInput / qty;

 const vatRate=vatPct/100;
 const n=breakdownCost(neutralInput,els.neutralMode.value,vatRate);
 const p=breakdownCost(persInput,els.persMode.value,vatRate);
 if(!n||!p){setStatus("bad","Modalità costo non valida");return null;}

 const unitNetCost=n.net+p.net, unitVatCredit=n.vat+p.vat, unitGrossCost=n.gross+p.gross;
 const totalNetCost=unitNetCost*qty, totalVatCredit=unitVatCredit*qty;

 let unitSellNet, unitSellGross, label="";
 if(els.mode.value==="target"){
   const desiredProfit=parseEuro(els.profit.value);
   if(!Number.isFinite(desiredProfit)||desiredProfit<0){setStatus("bad","Guadagno non valido");return null;}
   unitSellNet=(totalNetCost+desiredProfit)/qty;
   unitSellGross=unitSellNet*(1+vatRate);
   label=`Prezzo calcolato per guadagnare ${fmtEUR(desiredProfit)} (netto IVA).`;
 }else{
   const simPrice=parseEuro(els.simPrice.value);
   if(!Number.isFinite(simPrice)||simPrice<0){setStatus("bad","Prezzo non valido");return null;}
   if(els.simMode.value==="gross"){unitSellGross=simPrice; unitSellNet=unitSellGross/(1+vatRate);}
   else{unitSellNet=simPrice; unitSellGross=unitSellNet*(1+vatRate);}
   label=`Simulazione su prezzo inserito.`;
 }

 const totalSellNet=unitSellNet*qty, totalSellGross=unitSellGross*qty;
 const vatOnSales=totalSellNet*vatRate;
 const vatToPay=Math.max(0, vatOnSales-totalVatCredit); // niente credito residuo mostrato
 const netProfit=totalSellNet-totalNetCost;

 const anyNero=(els.neutralMode.value==="Nero")||(els.persMode.value==="Nero");
 if(anyNero)setStatus("warn","Attenzione: voce “Nero” → IVA non recuperabile su quella parte"); else setStatus("ok","OK");

 return{qty,vatPct,vatRate,n,p,unitNetCost,unitGrossCost,totalNetCost,totalVatCredit,unitSellNet,unitSellGross,totalSellNet,totalSellGross,vatOnSales,vatToPay,netProfit,label};
}
function render(){
 const r=compute();
 if(!r){
  els.totalSellNet.textContent="—"; els.totalSellGross.textContent="—"; els.netProfit.textContent="—";
  els.unitSellNet.textContent="—"; els.unitSellGross.textContent="—"; els.unitCostGross.textContent="—"; els.unitCostNet.textContent="—";
  els.vatToPay.textContent="—"; els.vatCredit.textContent="—"; els.vatOnSales.textContent="—";
  els.checkLine.textContent="—";
  if(els.profitBadge) { els.profitBadge.textContent="—"; els.profitBadge.classList.remove("good","warn","bad"); }
  return;
 }
 els.totalSellNet.textContent=fmtEUR(r.totalSellNet);
 els.totalSellGross.textContent=fmtEUR(r.totalSellGross);
 els.netProfit.textContent=fmtEUR(r.netProfit);
 els.netProfit.style.color = "";
 setProfitBadge(r.netProfit);
 els.unitSellNet.textContent=fmtEUR(r.unitSellNet);
 els.unitSellGross.textContent=fmtEUR(r.unitSellGross);
 els.unitCostGross.textContent=fmtEUR(r.unitGrossCost);
 els.unitCostNet.textContent=fmtEUR(r.unitNetCost);

 els.vatOnSales.textContent=fmtEUR(r.vatOnSales);
 els.vatCredit.textContent=fmtEUR(r.totalVatCredit);
 els.vatToPay.textContent=fmtEUR(r.vatToPay);

 els.neutralBreak.textContent=`${fmtEUR(r.n.net)} / ${fmtEUR(r.n.vat)} / ${fmtEUR(r.n.gross)}`;
 els.persBreak.textContent=`${fmtEUR(r.p.net)} / ${fmtEUR(r.p.vat)} / ${fmtEUR(r.p.gross)}`;

 els.checkLine.textContent=`${r.label} Quantità: ${r.qty}. IVA: ${r.vatPct}%.`;
}
function getSummary(r){
 const mode = els.mode.value==="target" ? "QUANTO VUOI GUADAGNARE" : "QUANTO LO HAI VENDUTO";
 return [
 `RIEPILOGO — ${mode}`,
 `Quantità: ${r.qty} • IVA: ${r.vatPct}%`,
 ``,
 `Prezzo per pezzo: ${fmtEUR(r.unitSellGross)} (IVA incl.) / ${fmtEUR(r.unitSellNet)} (IVA escl.)`,
 `Totale vendita: ${fmtEUR(r.totalSellGross)} (IVA incl.) / ${fmtEUR(r.totalSellNet)} (IVA escl.)`,
 ``,
 `IVA scaricata (credito): ${fmtEUR(r.totalVatCredit)}`,
 `IVA sulle vendite (debito): ${fmtEUR(r.vatOnSales)}`,
 `IVA da versare: ${fmtEUR(r.vatToPay)}`,
 ``,
 `Guadagno netto (IVA esclusa): ${fmtEUR(r.netProfit)}`
 ].join("\n");
}
function syncModeUI(){
 const isTarget = els.mode.value==="target";
 els.targetBox.classList.toggle("hidden", !isTarget);
 els.simulateBox.classList.toggle("hidden", isTarget);
 render();
}

function updatePdfDate(){
  const d = new Date();
  const ds = d.toLocaleString("it-IT", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  if(els.pdfDate) els.pdfDate.textContent = ds;
}

function bind(){
 const inputs=[
   els.qty,els.vat,
   els.neutralCost,els.neutralBasis,els.neutralMode,
   els.persCost,els.persBasis,els.persMode,
   els.mode,els.profit,els.simPrice,els.simMode
 ];
  // Quick actions (mobile) -> same funzioni
  els.copyBtn2 && els.copyBtn2.addEventListener("click", ()=> els.copyBtn.click());
  els.pdfBtn2 && els.pdfBtn2.addEventListener("click", ()=> (els.pdfBtn ? els.pdfBtn.click() : window.print()));

 inputs.forEach(el=>el.addEventListener("input", ()=>{ render(); saveState(); }));
 inputs.forEach(el=>el.addEventListener("change", ()=>{ render(); saveState(); }));
 els.mode.addEventListener("change", syncModeUI);

 els.copyBtn.addEventListener("click", async ()=>{
   const r=compute(); if(!r) return;
   const text=getSummary(r);
   try{await navigator.clipboard.writeText(text); toast("Riepilogo copiato ✅");}
   catch(e){
     const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select();
     document.execCommand("copy"); document.body.removeChild(ta); toast("Riepilogo copiato ✅");
   }
 });

  els.pdfBtn && els.pdfBtn.addEventListener("click", ()=>{
    updatePdfDate();
    // Aprirà la finestra di stampa: su macOS scegli “Salva come PDF”
    window.print();
  });


 els.resetBtn.addEventListener("click", ()=>{
   els.qty.value="1"; els.vat.value="22";
   els.neutralCost.value="0"; els.neutralBasis.value="unit"; els.neutralMode.value="IVA incl.";
   els.persCost.value="0"; els.persBasis.value="unit"; els.persMode.value="IVA incl.";
   els.mode.value="target"; els.profit.value="50";
   els.simPrice.value="0"; els.simMode.value="gross";
   syncModeUI(); toast("Reset fatto");
 });
}
loadState();
updatePdfDate();
bind(); syncModeUI();
render();





// ===== Bottom bar (mobile) =====
(function(){
  const bDati = document.getElementById("btabDati");
  const bRis = document.getElementById("btabRisultati");
  const bPdf = document.getElementById("btabPDF");

  function setView(view){
    document.body.setAttribute("data-view", view);
    bDati && bDati.classList.toggle("active", view==="dati");
    bRis && bRis.classList.toggle("active", view==="risultati");
    // pdf tab is a button action, not a view
  }

  function isMobile(){
    return window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  }

  if(isMobile()) setView("dati"); else document.body.removeAttribute("data-view");

  bDati && bDati.addEventListener("click", ()=>setView("dati"));
  bRis && bRis.addEventListener("click", ()=>{ setView("risultati"); try{ render(); }catch(e){} });
  bPdf && bPdf.addEventListener("click", ()=>{
    // If on dati, switch to risultati first so PDF è bello
    if(isMobile()) setView("risultati");
    setTimeout(()=>{ try{ updatePdfDate(); window.print(); }catch(e){} }, 50);
  });

  window.addEventListener("resize", ()=>{
    if(isMobile()){
      if(!document.body.getAttribute("data-view")) setView("dati");
    }else{
      document.body.removeAttribute("data-view");
      bDati && bDati.classList.add("active");
      bRis && bRis.classList.remove("active");
    }
  });
})();

