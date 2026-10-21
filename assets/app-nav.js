/* LSA Toolbox : navigation en mode "application" (site ajouté à l'écran d'accueil iPhone / Android) */
(function(){
var file=decodeURIComponent(location.pathname.split("/").pop()||"index.html");
if(!/\.html$/.test(file))file="index.html";
var isIndex=file==="index.html";
var standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true||/[?&]app=1/.test(location.search);

/* Page parente explicite (sinon : accueil) */
var H={"digital-currency.html":"1-Finance","accounting-auditing.html":"2-Accounting","governance-csr.html":"3-Governance","information-systems.html":"4-Information Systems","management-hr.html":"5-Management","production.html":"6-Production","marketing.html":"7-Marketing","green-revolution.html":"Green Revolution","general-knowledge.html":"General Knowledge","general-knowledge-dcg.html":"General Knowledge","general-knowledge-sio.html":"General Knowledge","general-knowledge-mco.html":"General Knowledge","general-knowledge-terminale.html":"General Knowledge","phonologie-ia-terminale.html":"Phonologie IA","phonologie-ia-mco.html":"Phonologie IA"};
var P={
"finance-fil-rouge.html":"digital-currency.html","cryptocurrencies.html":"digital-currency.html","Digital-currency-summary-trainer.html":"digital-currency.html","Digital-currency-essay-trainer.html":"digital-currency.html",
"accounting-auditing-fil-rouge.html":"accounting-auditing.html","Accounting-auditing-summary-trainer.html":"accounting-auditing.html","Accounting-auditing-essay-trainer.html":"accounting-auditing.html",
"governance-csr-fil-rouge.html":"governance-csr.html","green-revolution.html":"governance-csr.html",
"Green-revolution-summary-trainer.html":"green-revolution.html","Green-revolution-essay-trainer.html":"green-revolution.html",
"information-systems-fil-rouge.html":"information-systems.html","Information-systems-summary-trainer.html":"information-systems.html","Information-systems-essay-trainer.html":"information-systems.html",
"management-hr-fil-rouge.html":"management-hr.html","Management-hr-summary-trainer.html":"management-hr.html","Management-hr-essay-trainer.html":"management-hr.html",
"production-fil-rouge.html":"production.html","Production-summary-trainer.html":"production.html","Production-essay-trainer.html":"production.html",
"marketing-fil-rouge.html":"marketing.html","Marketing-summary-trainer.html":"marketing.html","Marketing-essay-trainer.html":"marketing.html",
"brexit.html":"general-knowledge.html","financial-crises.html":"general-knowledge.html",
"phono-ia.html":"phonologie-ia-terminale.html","phono-ia-mco.html":"phonologie-ia-mco.html"
};

/* Accueil : mémoriser / restaurer les rubriques ouvertes */
function indexState(){
var cats=[].slice.call(document.querySelectorAll(".cat")),subs=[].slice.call(document.querySelectorAll(".subcat"));
if(!cats.length)return;
try{var s=JSON.parse(sessionStorage.getItem("lsa-open")||"null");
if(s){(s.c||[]).forEach(function(i){var c=cats[i];if(c){c.classList.add("open");var h=c.querySelector(".cat-head");h&&h.setAttribute("aria-expanded","true")}});
(s.s||[]).forEach(function(i){var c=subs[i];if(c){c.classList.add("open");var h=c.querySelector(".sub-head");h&&h.setAttribute("aria-expanded","true")}});
if(s.y)setTimeout(function(){window.scrollTo(0,s.y)},60)}}catch(e){}
function save(){try{sessionStorage.setItem("lsa-open",JSON.stringify({c:cats.map(function(c,i){return c.classList.contains("open")?i:-1}).filter(function(i){return i>=0}),s:subs.map(function(c,i){return c.classList.contains("open")?i:-1}).filter(function(i){return i>=0}),y:window.scrollY}))}catch(e){}}
document.addEventListener("click",function(){setTimeout(save,0)});
window.addEventListener("pagehide",save);
}

var CSS=".lsa-appnav{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;gap:8px;justify-content:space-between;align-items:center;padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:#0f1a33;border-top:3px solid #f5b60f;font-family:'Quicksand',sans-serif;box-shadow:0 -4px 18px rgba(15,26,51,.25)}"+
".lsa-appnav a{display:flex;align-items:center;gap:7px;min-height:44px;padding:0 14px;border-radius:10px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;-webkit-tap-highlight-color:transparent;min-width:0}"+
".lsa-appnav a span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
".lsa-appnav a:active{background:rgba(255,255,255,.12)}"+
".lsa-appnav .lsa-home{background:#f5b60f;color:#0f1a33;flex-shrink:0}"+
".lsa-appnav svg{flex-shrink:0}.lsa-appnav .lsa-grp{display:flex;gap:8px;min-width:0}"+
"html.lsa-app body{padding-bottom:calc(72px + env(safe-area-inset-bottom))!important}"+
"@media print{.lsa-appnav{display:none!important}html.lsa-app body{padding-bottom:0!important}}";

function build(){
var parent=P[file]||"index.html";
if(/[?&]from=dcg/.test(location.search)&&parent==="general-knowledge.html")parent="general-knowledge-dcg.html";
if(/[?&]from=tle/.test(location.search)&&file==="prononciation-ia.html")parent="phonologie-ia-terminale.html";
if(/[?&]from=mco/.test(location.search)&&file==="prononciation-ia.html")parent="phonologie-ia-mco.html";
var label=parent==="index.html"?"Accueil":(H[parent]||"Retour");
var bar=document.createElement("nav");
bar.className="lsa-appnav";bar.setAttribute("aria-label","Navigation de l'application");
var back='<a class="lsa-back" href="'+parent+'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span>'+(parent==="index.html"?"Retour":label)+'</span></a>';
var home='<a class="lsa-home" href="index.html"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Accueil</span></a>';
var top='<a class="lsa-top" href="#" aria-label="Haut de page"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg><span>Haut</span></a>';
bar.innerHTML=(parent==="index.html"?home:'<div class="lsa-grp">'+back+home+'</div>')+top;
bar.querySelector(".lsa-top").addEventListener("click",function(e){e.preventDefault();window.scrollTo({top:0,behavior:"smooth"})});
return bar;
}
function ensure(){
document.documentElement.classList.add("lsa-app");
if(!document.getElementById("lsa-appnav-css")){var st=document.createElement("style");st.id="lsa-appnav-css";st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}
if(document.body&&!document.querySelector(".lsa-appnav"))document.body.appendChild(build());
}

/* Mode appli : notification de mise à jour (compare version.json à la version mémorisée) */
var UCSS=".lsa-update{position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:2147483001;max-width:520px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 14px;background:#0f1a33;color:#fff;border-bottom:3px solid #f5b60f;border-radius:12px;box-shadow:0 10px 30px rgba(15,26,51,.35);font-family:'Quicksand',sans-serif;animation:lsaUpd .35s ease both}"+
".lsa-update .lsa-u-txt{flex:1;min-width:0;font-size:14px;line-height:1.35}.lsa-update strong{display:block;color:#f5b60f;font-size:15px}"+
".lsa-update button{font-family:inherit;font-weight:700;font-size:14px;min-height:44px;padding:0 14px;border:none;border-radius:10px;cursor:pointer;flex-shrink:0}"+
".lsa-update .lsa-u-go{background:#f5b60f;color:#0f1a33}.lsa-update .lsa-u-x{background:transparent;color:#fff;padding:0 8px;font-size:20px}"+
"@keyframes lsaUpd{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}@media print{.lsa-update{display:none!important}}";
var KEY="dscg-version",shown=false;
function showUpdate(v,note){
if(shown||document.querySelector(".lsa-update"))return;shown=true;
if(!document.getElementById("lsa-update-css")){var st=document.createElement("style");st.id="lsa-update-css";st.textContent=UCSS;(document.head||document.documentElement).appendChild(st)}
var d=document.createElement("div");d.className="lsa-update";d.setAttribute("role","alert");
d.innerHTML='<div class="lsa-u-txt"><strong>Mise à jour disponible</strong>'+(note?note.replace(/</g,"&lt;"):"Le site a été mis à jour.")+'</div><button class="lsa-u-go" type="button">Mettre à jour</button><button class="lsa-u-x" type="button" aria-label="Plus tard">×</button>';
d.querySelector(".lsa-u-go").addEventListener("click",function(){try{localStorage.setItem(KEY,v)}catch(e){}var u=location.pathname+(location.search?location.search.replace(/([?&])_v=[^&]*&?/,"$1").replace(/[?&]$/,""):"");u+=(u.indexOf("?")>-1?"&":"?")+"_v="+encodeURIComponent(v)+location.hash;location.replace(u)});
d.querySelector(".lsa-u-x").addEventListener("click",function(){d.remove();shown=false;try{sessionStorage.setItem("dscg-update-later",v)}catch(e){}});
document.body.appendChild(d);
}
function checkUpdate(){
if(!standalone||!window.fetch)return;
fetch("version.json?t="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(j){
if(!j||!j.version)return;var v=String(j.version),cur=null;
try{cur=localStorage.getItem(KEY)}catch(e){}
if(!cur){try{localStorage.setItem(KEY,v)}catch(e){}return}
if(cur===v)return;
try{if(sessionStorage.getItem("dscg-update-later")===v)return}catch(e){}
showUpdate(v,j.note||"");
}).catch(function(){});
}
function init(){
checkUpdate();
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")checkUpdate()});
if(isIndex){indexState();return}
if(!standalone)return;
ensure();
/* pages reconstruites dynamiquement : réinsérer la barre si elle disparaît */
try{new MutationObserver(function(){if(!document.querySelector(".lsa-appnav")||!document.getElementById("lsa-appnav-css"))ensure()}).observe(document,{childList:true,subtree:true})}catch(e){}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
