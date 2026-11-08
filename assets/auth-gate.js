/* LSA DSCG : écran de connexion devant la webapp.
   Vérifie la session auprès du Worker avant d'afficher la page. C'est un frein, pas un coffre-fort. */
(function(){
var API="https://lsa-dscg-acces.cemonprive.workers.dev";
var KEY="lsa-dscg-session",OKKEY="lsa-dscg-ok",de=document.documentElement;
var file=decodeURIComponent(location.pathname.split("/").pop()||"index.html");
if(!/\.html$/.test(file))file="index.html";

/* Accès enseignant : jeton transmis dans le fragment par la console */
try{var pm=/[#&]prof=([a-f0-9]{64})/.exec(location.hash);
if(pm){localStorage.setItem(KEY,pm[1]);history.replaceState(null,"",location.pathname+location.search)}}catch(e){}

/* Page masquée tant que la session n'est pas vérifiée */
de.classList.add("lsa-lock");
var css=document.createElement("style");
css.textContent="html.lsa-lock body{visibility:hidden!important}html.lsa-lock{overflow:hidden}"+
"#lg{position:fixed;inset:0;z-index:2147483647;visibility:visible!important;overflow:auto;-webkit-overflow-scrolling:touch;background:linear-gradient(135deg,#e8a01a 0%,#e0910b 45%,#c97905 100%);font:16px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a2520;display:flex;align-items:flex-start;justify-content:center;padding:calc(24px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))}"+
"#lg *{box-sizing:border-box}#lg .box{width:100%;max-width:380px;margin:auto 0}"+
"#lg .logo{display:block;width:92px;height:92px;border-radius:20px;margin:0 auto 14px;box-shadow:0 6px 20px rgba(0,0,0,.25)}"+
"#lg h1{color:#fff;text-align:center;font-size:24px;margin:0 0 4px;letter-spacing:.02em}"+
"#lg .sub{color:rgba(255,255,255,.92);text-align:center;margin:0 0 20px;font-size:15px}"+
"#lg .card{background:#fff;border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.22)}"+
"#lg .card h2{font-size:17px;margin:0 0 12px;color:#1a2744}"+
"#lg .tile{display:block;width:100%;text-align:center;font:inherit;font-size:20px;font-weight:700;letter-spacing:.04em;color:#8a5200;background:#fdf1d8;border:2px solid #e0910b;border-radius:14px;padding:16px;margin:0 0 10px;cursor:pointer}"+
"#lg select,#lg input{font:inherit;width:100%;border:1.5px solid #ddd5c5;border-radius:10px;padding:12px;background:#fff;color:#2a2520;margin:0 0 10px}"+
"#lg input.code{text-align:center;font-size:26px;letter-spacing:.5em;-webkit-text-security:disc}"+
"#lg label{display:block;font-size:13px;color:#6f6555;margin:0 0 4px}"+
"#lg .btn{display:block;width:100%;font:inherit;font-weight:700;color:#fff;background:#1a2744;border:0;border-radius:12px;padding:14px;cursor:pointer}"+
"#lg .btn[disabled]{opacity:.4;cursor:not-allowed}"+
"#lg .lnk{display:block;width:100%;background:none;border:0;font:inherit;font-size:14px;color:#6f6555;margin-top:10px;padding:6px;cursor:pointer;text-decoration:underline}"+
"#lg .msg{margin:0 0 12px;padding:10px 12px;border-radius:10px;font-size:14.5px}"+
"#lg .msg.err{background:#fbe4e1;color:#8c2019}#lg .msg.info{background:#fdf1d8;color:#6a4300}"+
"#lg .hint{font-size:13px;color:#6f6555;margin:-2px 0 12px}"+
"#lg .warn p{margin:0 0 10px;font-size:15.5px}#lg .warn .chk{display:flex;gap:10px;align-items:flex-start;margin:14px 0;font-size:15px;cursor:pointer}"+
"#lg .warn .chk input{width:22px;height:22px;margin:2px 0 0;flex:none}"+
"#lsa-logout{text-align:center;margin:26px 0 96px;font-size:13px}#lsa-logout button{background:none;border:0;color:#6f6555;text-decoration:underline;font:inherit;cursor:pointer;padding:8px}";
(document.head||de).appendChild(css);

function tok(){try{return localStorage.getItem(KEY)||""}catch(e){return""}}
function setTok(t){try{localStorage.setItem(KEY,t)}catch(e){}}
function clearTok(){try{localStorage.removeItem(KEY)}catch(e){}}
function post(path,body){
  return fetch(API+path,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(body)})
    .then(function(r){return r.json().then(function(j){j._s=r.status;return j})})
    .catch(function(){return{error:"reseau"}});
}
function get(path){return fetch(API+path).then(function(r){return r.json()}).catch(function(){return{error:"reseau"}})}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

/* ---------- vérification de la session ---------- */
function unlock(){de.classList.remove("lsa-lock");var o=document.getElementById("lg");if(o)o.remove()}
function check(){
  var t=tok();
  if(!t){return login()}
  post("/api/session",{token:t,page:file,titre:document.title}).then(function(j){
    if(j.error==="reseau"){
      var ok=0;try{ok=+localStorage.getItem(OKKEY)||0}catch(e){}
      if(Date.now()-ok<7*864e5){unlock();return}
      return login({msg:"Connexion au serveur impossible. Vérifie ta connexion Internet puis réessaie.",retry:true});
    }
    if(j.ok){
      try{localStorage.setItem(OKKEY,String(Date.now()))}catch(e){}
      unlock();
      if(j.role==="eleve"){track(t,j.vue);addLogout(j.nom)}
      return;
    }
    clearTok();
    var m=j.reason==="replaced"?"Ton compte a été ouvert sur un autre appareil. Si ce n'est pas toi, préviens ton professeur.":
          (j.reason==="revoked"||j.reason==="expired")?"Ta session n'est plus valide. Connecte-toi à nouveau.":"";
    login(m?{msg:m,kind:j.reason==="replaced"?"err":"info"}:null);
  });
}
function track(t,vue){
  if(!vue)return;
  var t0=Date.now(),acc=0,vis=!document.hidden;
  function tick(){if(vis)acc+=Date.now()-t0;t0=Date.now()}
  function send(){tick();try{navigator.sendBeacon(API+"/api/fin",new Blob([JSON.stringify({token:t,vue:vue,sec:Math.round(acc/1000)})],{type:"text/plain"}))}catch(e){}}
  document.addEventListener("visibilitychange",function(){tick();vis=!document.hidden;if(document.hidden)send()});
  addEventListener("pagehide",send);
}
function addLogout(nom){
  if(file!=="index.html"||document.getElementById("lsa-logout"))return;
  var d=document.createElement("div");d.id="lsa-logout";
  d.innerHTML='<button type="button">Se déconnecter ('+esc(nom)+')</button>';
  d.firstChild.onclick=function(){post("/api/deconnexion",{token:tok()}).then(function(){clearTok();location.reload()})};
  document.body.appendChild(d);
}

/* ---------- écran de connexion ---------- */
var S={};
function shell(inner){
  var o=document.getElementById("lg");
  if(!o){o=document.createElement("div");o.id="lg";(document.body||de).appendChild(o)}
  o.innerHTML='<div class="box"><img class="logo" src="assets/dscg-icon-192.png" alt=""><h1>LSA DSCG</h1><p class="sub">Accès réservé aux étudiants</p>'+inner+'</div>';
  return o;
}
function login(opt){
  S.opt=opt||null;
  if(!document.body){document.addEventListener("DOMContentLoaded",function(){login(opt)});return}
  var banner=opt&&opt.msg?'<p class="msg '+(opt.kind==="info"?"info":"err")+'">'+esc(opt.msg)+'</p>':"";
  if(opt&&opt.retry){var o=shell('<div class="card">'+banner+'<button class="btn" id="rt">Réessayer</button></div>');o.querySelector("#rt").onclick=function(){check()};return}
  var o=shell('<div class="card">'+banner+'<h2>Choisis ta classe</h2><div id="tiles"><p class="hint">Chargement…</p></div></div>');
  get("/api/classes").then(function(j){
    var box=o.querySelector("#tiles");
    if(!j.classes){box.innerHTML='<p class="msg err">Connexion au serveur impossible.</p><button class="btn" id="rt2">Réessayer</button>';box.querySelector("#rt2").onclick=function(){login(S.opt)};return}
    box.innerHTML=j.classes.map(function(c){return'<button type="button" class="tile" data-c="'+esc(c)+'">'+esc(c)+'</button>'}).join("")||'<p class="hint">Aucune classe disponible.</p>';
    box.querySelectorAll(".tile").forEach(function(b){b.onclick=function(){classe(b.dataset.c)}});
  });
}
function classe(c){
  S.classe=c;
  var o=shell('<div class="card"><h2>'+esc(c)+'</h2><p class="hint">Chargement…</p></div>');
  get("/api/eleves?classe="+encodeURIComponent(c)).then(function(j){
    if(!j.eleves){login({msg:"Connexion au serveur impossible.",kind:"err"});return}
    S.eleves=j.eleves;
    var opts='<option value="">Choisis ton nom</option>'+j.eleves.map(function(e){return'<option value="'+e.id+'">'+esc(e.nom)+'</option>'}).join("");
    o=shell('<div class="card"><h2>'+esc(c)+'</h2><label for="lgs">Ton nom</label><select id="lgs">'+opts+'</select><div id="lgp"></div><button class="lnk" id="bk">← Changer de classe</button></div>');
    o.querySelector("#bk").onclick=function(){login(null)};
    o.querySelector("#lgs").onchange=function(){pick(+this.value)};
  });
}
function pick(id){
  var o=document.getElementById("lg"),p=o.querySelector("#lgp");
  var e=(S.eleves||[]).filter(function(x){return x.id===id})[0];
  if(!e){p.innerHTML="";return}
  S.id=id;S.nom=e.nom;
  if(e.actif){
    p.innerHTML='<label for="lgc">Ton code (4 chiffres)</label><input class="code" id="lgc" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" autocapitalize="off"><p class="msg err" id="lge" style="display:none"></p><button class="btn" id="lgo" disabled>Se connecter</button>';
    var c=p.querySelector("#lgc"),b=p.querySelector("#lgo");
    c.oninput=function(){c.value=c.value.replace(/\D/g,"").slice(0,4);b.disabled=c.value.length!==4};
    c.onkeydown=function(ev){if(ev.key==="Enter"&&!b.disabled)b.click()};
    b.onclick=function(){
      b.disabled=true;
      post("/api/connexion",{classe:S.classe,eleve_id:S.id,code:c.value}).then(function(j){
        if(j.token){setTok(j.token);location.reload();return}
        var m=j.error==="verrouille"?"Trop d'erreurs. Ce compte est bloqué pendant "+(j.minutes||15)+" minutes.":
              j.error==="code_incorrect"?"Code incorrect. Il te reste "+j.restants+" essai"+(j.restants>1?"s":"")+".":
              j.error==="reseau"?"Connexion au serveur impossible.":"Connexion impossible.";
        var er=p.querySelector("#lge");er.textContent=m;er.style.display="block";c.value="";b.disabled=true;c.focus();
      });
    };
  }else{
    p.innerHTML='<p class="msg info">Ton compte n\'est pas encore activé. Tu vas créer ton code personnel.</p><button class="btn" id="mk">Créer mon code</button>';
    p.querySelector("#mk").onclick=warning;
  }
}
function warning(){
  var o=shell('<div class="card warn"><h2>🔐 Ton code est personnel</h2>'+
  '<p>🤫 Ne le donne à personne.</p>'+
  '<p>⚠️ Si quelqu\'un se connecte avec ton code, tu seras déconnecté et tu ne pourras plus accéder à l\'application.</p>'+
  '<p>🙋 Si tu perds ton code ou si tu penses qu\'on l\'a utilisé, préviens ton professeur : il pourra le réinitialiser.</p>'+
  '<label class="chk"><input type="checkbox" id="ck"><span>☑️ J\'ai compris que mon code est strictement personnel.</span></label>'+
  '<button class="btn" id="go" disabled>✅ J\'ai compris, créer mon code</button><button class="lnk" id="bk">← Retour</button></div>');
  var ck=o.querySelector("#ck"),go=o.querySelector("#go");
  ck.onchange=function(){go.disabled=!ck.checked};
  go.onclick=creation;
  o.querySelector("#bk").onclick=function(){classe(S.classe)};
}
function creation(){
  var o=shell('<div class="card"><h2>Crée ton code</h2><p class="hint" style="margin-bottom:12px">4 chiffres exactement. Les codes trop faciles sont refusés : 0000, 1234, 1111, suites et répétitions.</p>'+
  '<label for="c1">Ton code</label><input class="code" id="c1" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off">'+
  '<label for="c2">Confirme ton code</label><input class="code" id="c2" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off">'+
  '<p class="msg err" id="er" style="display:none"></p><button class="btn" id="ok" disabled>Valider</button></div>');
  var c1=o.querySelector("#c1"),c2=o.querySelector("#c2"),b=o.querySelector("#ok"),er=o.querySelector("#er");
  function upd(){c1.value=c1.value.replace(/\D/g,"").slice(0,4);c2.value=c2.value.replace(/\D/g,"").slice(0,4);b.disabled=!(c1.value.length===4&&c2.value.length===4)}
  c1.oninput=c2.oninput=upd;
  function show(m){er.textContent=m;er.style.display="block"}
  b.onclick=function(){
    er.style.display="none";
    if(c1.value!==c2.value){show("Les deux codes ne sont pas identiques.");return}
    b.disabled=true;
    post("/api/activation",{classe:S.classe,eleve_id:S.id,code:c1.value,confirmation:c2.value}).then(function(j){
      if(j.token){setTok(j.token);location.reload();return}
      if(j.error==="evident")show("Ce code est trop évident, choisis-en un autre.");
      else if(j.error==="format")show("Le code doit comporter exactement 4 chiffres.");
      else if(j.error==="deja_actif"){login({msg:"Ce compte est déjà activé. Si ce n'est pas toi, préviens ton professeur.",kind:"err"});return}
      else show("Connexion au serveur impossible.");
      b.disabled=false;
    });
  };
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",check);else check();
})();
