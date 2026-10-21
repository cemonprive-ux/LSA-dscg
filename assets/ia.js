/* LSA Toolbox, retour IA partagé. Usage : <div class="ia-box" data-ia="outil" data-ia-texte="Label=#sel|..." data-ia-ctx="Label=sel|..." data-ia-consigne="..." data-ia-min="30"></div> */
(function(){
var URL_IA="https://lsa-ia.cemonprive.workers.dev",COOLDOWN=20000;
var css=".ia-box{margin:1rem 0;padding:1rem 1.1rem;background:#fff;border:1px solid #e3ddd0;border-top:3px solid #f5b60f;border-radius:10px;font-family:'Quicksand',sans-serif;color:#1a2744}.ia-box .ia-t{font-weight:700;font-size:.95rem;margin-bottom:.2rem}.ia-box .ia-n{font-size:.82rem;color:#5b6577;margin-bottom:.7rem;text-wrap:pretty}.ia-btn{font-family:'Quicksand',sans-serif;font-weight:700;font-size:.85rem;background:#f5b60f;color:#1a2744;border:none;border-radius:8px;padding:.6rem 1.1rem;cursor:pointer}.ia-btn:hover{background:#c98f00;color:#fff}.ia-btn:disabled{opacity:.55;cursor:default;background:#f5b60f;color:#1a2744}.ia-out{display:none;margin-top:.9rem;background:#f5f3ef;border-radius:8px;padding:.9rem 1rem;font-size:.9rem;line-height:1.6;color:#1a2744}.ia-out p{margin:0 0 .6rem}.ia-out ul{margin:.3rem 0 .6rem 1.2rem}.ia-out strong{color:#0f1a33}@media print{.ia-btn,.ia-n{display:none}}";
var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
function esc(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function fmt(t){t=esc(t).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/^#{1,4}\s*(.+)$/gm,"<strong>$1</strong>");var re=/^\s*([-*•]|\d+[.)])\s+/;return t.split(/\n{2,}/).map(function(p){var l=p.split("\n");if(l.every(function(x){return re.test(x)}))return "<ul>"+l.map(function(x){return "<li>"+x.replace(re,"")+"</li>"}).join("")+"</ul>";return "<p>"+l.join("<br>")+"</p>"}).join("")}
function read(sel){var out=[];document.querySelectorAll(sel).forEach(function(e){var v=("value" in e&&e.tagName!=="BUTTON")?e.value:e.innerText;if(v&&v.trim())out.push(v.trim())});return out.join("\n\n")}
function gather(spec,sep){if(!spec)return "";return spec.split("|").map(function(p){var i=p.indexOf("="),lab=i>0?p.slice(0,i):"",v=read(i>0?p.slice(i+1):p);if(!v)return "";return lab?lab.toUpperCase()+" :\n"+v:v}).filter(Boolean).join(sep)}
function words(t){return t.split(/\s+/).filter(Boolean).length}
document.querySelectorAll(".ia-box[data-ia]").forEach(function(box){
  var titre=box.getAttribute("data-ia-titre")||"Retour de l'IA";
  box.innerHTML='<div class="ia-t">'+titre+'</div><div class="ia-n">Une IA commente ton travail. Ses remarques sont indicatives, elles ne remplacent pas la correction de ton professeur.</div><button type="button" class="ia-btn">Obtenir un retour de l\'IA</button><div class="ia-out" aria-live="polite"></div>';
  var b=box.querySelector(".ia-btn"),out=box.querySelector(".ia-out");
  b.onclick=async function(){
    var texte=gather(box.getAttribute("data-ia-texte"),"\n\n"),min=+(box.getAttribute("data-ia-min")||15);
    out.style.display="block";
    if(words(texte)<min){out.innerHTML="<p>Écris au moins "+min+" mots avant de demander un retour.</p>";return}
    var ctx=[box.getAttribute("data-ia-consigne")?"CONSIGNE :\n"+box.getAttribute("data-ia-consigne"):"",gather(box.getAttribute("data-ia-ctx"),"\n\n")].filter(Boolean).join("\n\n").slice(0,14000);
    b.disabled=true;b.textContent="Analyse en cours…";out.innerHTML="<p><em>L'IA lit ton travail, cela prend quelques secondes…</em></p>";
    try{var r=await fetch(URL_IA,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({outil:box.getAttribute("data-ia"),contexte:ctx,texte:texte.slice(0,6000)})});var d=await r.json();out.innerHTML=d.reponse?fmt(d.reponse):"<p>"+esc(d.error||"Réponse vide.")+"</p>"}
    catch(e){out.innerHTML="<p>Impossible de joindre l'IA. Vérifie ta connexion et réessaie.</p>"}
    b.textContent="Patiente quelques secondes…";setTimeout(function(){b.disabled=false;b.textContent="Obtenir un nouveau retour"},COOLDOWN);
  };
});
})();
