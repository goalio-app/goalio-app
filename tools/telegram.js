// Canal Telegram Goalio. Usage : node tools/telegram.js daily|push
//   daily : les 3 paris du jour (1 fois par jour)
//   push  : compos tombées (paris joueurs), paris en direct, pronos modifiés — chaque nouveauté une seule fois
// env : TELEGRAM_TOKEN, TELEGRAM_CHAT, STATE (telegram_state.json), DRY=1 pour afficher sans envoyer
const fs=require('fs');
const mode=process.argv[2]||'daily';
const realFetch=global.fetch;
const h=fs.readFileSync('index.html','utf8');const s=h.split('<script>\n')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync('data.json','utf8'));
const mk=()=>({innerHTML:'',textContent:'',hidden:false,clientWidth:800,clientHeight:300,style:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],focus(){}});
const els={};global.window={};global.document={getElementById:id=>els[id]||(els[id]=mk()),querySelector:()=>mk(),querySelectorAll:()=>[],addEventListener:()=>{},body:{style:{}}};
global.matchMedia=()=>({matches:true});global.addEventListener=()=>{};global.ResizeObserver=class{observe(){}};global.IntersectionObserver=class{observe(){}};
global.setInterval=()=>{};global.requestAnimationFrame=()=>{};global.fetch=()=>Promise.resolve({json:()=>data});global.navigator={};
eval(s);
const URL='https://goalio-app.github.io/goalio-app/',TZ='Europe/Paris';
const e=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fx=o=>(+o).toFixed(2).replace('.',',');
const hm=d=>d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:TZ}).replace(':','h');
const day=d=>d.toLocaleDateString('fr-FR',{timeZone:TZ});
const wd=d=>d.toLocaleDateString('fr-FR',{weekday:'long',timeZone:TZ});
const FOOT="\n\n<i>18+. Jouer comporte des risques : endettement, dépendance… Besoin d'aide : 09 74 75 13 13.</i>";
// petite variation de formulation, stable pour un même message
const pickv=(arr,seed)=>{let h=0;for(const c of String(seed))h=(h*31+c.charCodeAt(0))>>>0;return arr[h%arr.length]};
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
// mettre un pari dans une phrase : « Victoire Lens » -> « la victoire de Lens », « Plus de 2,5 buts » -> « plus de 2,5 buts »
const lc=t=>{t=String(t);
  if(/^Victoire /.test(t))return 'la victoire de '+t.slice(9);
  if(/^Match nul/.test(t))return 'le nul';
  if(/^(Plus|Moins|Les|But|Exactement|Prochain|Aucun|Mi-temps|Score|Premier|Dernier|Buteur|Passeur|Doublé|Décisif)\b/.test(t))return t.charAt(0).toLowerCase()+t.slice(1);
  return t};
const LINK=t=>`\n\n<a href="${URL}">${t}</a>`;
const stateFile=process.env.STATE||'telegram_state.json';
const state=Object.assign({daily:null,sent:[]},fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{});
if(state.changes){state.sent=(state.sent||[]).concat(state.changes.map(k=>'chg|'+k));delete state.changes}
const sent=new Set(state.sent);
async function send(text){
  if(process.env.DRY){console.log(text+'\n-----');return}
  const r=await realFetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT,text,parse_mode:'HTML',disable_web_page_preview:true})});
  const j=await r.json();if(!j.ok)throw new Error('Telegram : '+(j.description||'erreur'));
}
const short=m=>`${e(m.h)} – ${e(m.a)}`;
setTimeout(async()=>{
  const C=window.__cdp,now=new Date(),all=C.all();
  const fut=all.filter(m=>m.ph!=null&&!m.bo&&Date.now()<m.k.getTime()).sort((a,b)=>a.k-b.k);
  const today0=day(now);
  const out=[];
  if(mode==='daily'||mode==='results'){
    const H=(data.history||[]).filter(r=>r&&r.length>=6&&(r[5]===1||r[5]===0));
    const keyOf=r=>'res|'+r[0]+'|'+r[1]+'|'+r[2];
    const fresh=H.filter(r=>!sent.has(keyOf(r))&&/fiable|fun/.test(String(r[4])));
    if(fresh.length){
      const won=fresh.filter(r=>r[5]===1),lost=fresh.filter(r=>r[5]===0),n=fresh.length,ok=won.length;
      const best=[...won].sort((a,b)=>b[3]-a[3])[0];
      const mood=ok/n>=.7?pickv(['Belle soirée hier.','Grosse soirée hier, ça a bien tourné.','Hier soir ça a souri.'],today0)
        :ok/n>=.45?pickv(['Soirée correcte hier, sans plus.','Hier c\'était moyen, mais on reste dans le vert sur les sûrs.','Hier, du bon et du moins bon.'],today0)
        :pickv(['Hier c\'était pas notre soir, je vous le cache pas.','Soirée compliquée hier.','Hier ça n\'a pas voulu, ça arrive.'],today0);
      let t=`${mood} Bilan : ${ok} sur ${n}.`;
      if(best&&best[3]>=2.5)t+=`\n🔥 ${pickv(['Le coup fun est passé','Le pari fun est rentré','Mention spéciale au fun'],today0)} : ${e(lc(best[2]))} sur ${e(best[1])}, à ${fx(best[3])}.`;
      const ln=r=>`${e(r[2])} (${e(r[1])}, ${fx(r[3])})`;
      if(won.length)t+=`\n\n✅ Gagnés :\n`+won.slice(0,8).map(r=>'– '+ln(r)).join('\n');
      if(lost.length)t+=`\n\n❌ Perdus :\n`+lost.slice(0,8).map(r=>'– '+ln(r)).join('\n');
      const tot=H.filter(r=>/fiable|fun/.test(String(r[4]))),tw=tot.filter(r=>r[5]===1).length;
      if(tot.length>fresh.length)t+=`\n\nDepuis le début : ${tw} sur ${tot.length}, soit ${Math.round(100*tw/tot.length)} %.`;
      t+=`\n\n${pickv(['Je mets tout ici, même quand ça perd.','Comme toujours, je publie tout, gagné ou perdu.','Rien de caché : tout est là.'],today0+'r')}`+FOOT;
      await send(t);fresh.forEach(r=>sent.add(keyOf(r)));
    }else console.log('Pas de nouveaux résultats.');
  }
  if(mode==='daily'){
    const today=fut.filter(m=>day(m.k)===today0);
    if(!today.length||state.daily===today0)console.log('Paris du jour : rien à publier.');
    else{
      let sure=null,fun=null;today.forEach(m=>{const p=C.picks(m);if(!sure||p.fia.p>sure.x.p)sure={m,x:p.fia};if(!fun||p.fun.p>fun.x.p)fun={m,x:p.fun}});
      const big=today.find(m=>m.star&&m!==sure.m&&m!==fun.m);
      const lgs=[...new Set(today.map(m=>data.leagues[m.lg].name))];
      const soir=today.every(m=>+hm(m.k).slice(0,2)>=18);
      const mo=data.montante,st=mo&&mo.steps&&mo.steps[mo.steps.length-1];
      const hello=pickv(['Salut à tous,','Hello tout le monde,','Bonjour à tous,','Salut la team,'],today0);
      const prog=lgs.length===1?`${today.length} matchs de ${lgs[0]} ${soir?'ce soir':'aujourd\'hui'}`:`${today.length} matchs ${soir?'ce soir':'aujourd\'hui'} (${lgs.slice(0,3).join(', ')}${lgs.length>3?'…':''})`;
      let t=`${hello}\n${cap(prog)} ⚽ ${pickv(['Voilà ce que je joue :','Voici ce que je retiens :','Mes choix du jour :'],today0)}\n\n`;
      t+=`✅ ${pickv(['Le plus sûr','Mon pari sûr','Le safe du jour'],today0)} : <b>${e(sure.x.t)}</b> sur ${short(sure.m)} (${hm(sure.m.k)}), à prendre à ${fx(sure.x.o)} minimum.\n\n`;
      t+=`🔥 ${pickv(['Le petit coup','Pour le fun','Le coup à cote'],today0)} : <b>${e(fun.x.t)}</b> sur ${short(fun.m)} (${hm(fun.m.k)}), ${fx(fun.x.o)} minimum.`;
      if(st&&st[4]==null&&st[0]===now.toISOString().slice(0,10))t+=`\n\n📈 Montante, étape ${mo.steps.length} : ${e(st[2])}, à ${fx(st[3])}.`;
      else if(big){const p=C.picks(big);t+=`\n\nEt je garde un œil sur ${short(big)} : ${e(lc(p.fia.t))}, ${fx(p.fia.o)}.`}
      t+=`\n\n${pickv(['Je vous envoie les buteurs dès que les compos tombent.','Les buteurs arrivent avec les compos, restez dans le coin.','Pour les buteurs, j\'attends les compos et je reviens.'],today0)}`;
      t+=LINK('Tous mes pronos du jour sur l\'appli')+FOOT;
      await send(t);state.daily=today0;
    }
  }else if(mode==='push'){
    // 1) compos tombées -> paris joueurs
    all.filter(m=>Date.now()<m.k.getTime()&&(data.lineups||{})[m.id]).forEach(m=>{
      const key='lu|'+m.id;if(sent.has(key))return;
      const P=C.players(m).filter(p=>p.st==='in');if(!P.length)return;
      const best=lab=>P.map(p=>({p,x:p.mk.find(k=>k.t===lab)})).filter(o=>o.x).sort((a,b)=>b.x.p-a.x.p)[0];
      const b=best('Buteur'),a=best('Passeur décisif'),c=best('Décisif 2 fois ou plus')||best('Doublé (2 buts ou plus)');
      let t=`📋 ${pickv(['Compos officielles pour','Les compos sont tombées pour','Compos dispo pour'],m.id)} ${short(m)} (${hm(m.k)}).`;
      if(b)t+=`\n\n⚽ ${e(b.p.n)} est titulaire, ${pickv(['je le prends buteur','je le joue buteur','je pars sur lui buteur'],m.id)} : ${fx(b.x.o)} minimum.`;
      if(a&&(!b||a.p.n!==b.p.n))t+=`\nPour le passeur, ${e(a.p.n)}, ${fx(a.x.o)}.`;
      if(c)t+=`\nEt pour ceux qui aiment le risque : ${e(c.p.n)} ${c.x.t==='Doublé (2 buts ou plus)'?'qui met un doublé':'décisif deux fois'}, ${fx(c.x.o)}.`;
      out.push({key,t:t+LINK('Tous les paris joueurs')+FOOT});
    });
    // 2) paris en direct
    Object.entries(data.live||{}).forEach(([id,L])=>{const m=all.find(x=>x.id===id);if(!m)return;
      (L||[]).forEach(l=>{const key='lv|'+id+'|'+l.t;if(sent.has(key)||Date.now()-new Date(l.t)>40*60e3)return;
        let t=`🔴 ${l.min}e minute, ${e(m.h)} ${e(l.score)} ${e(m.a)}.`;
        if(l.why)t+=` ${e(l.why)}`;
        if(l.fia)t+=`\n\nJe prends <b>${e(lc(l.fia.t))}</b> si votre appli paie au moins ${fx(l.fia.o)}.`;
        if(l.fun)t+=`\nPlus osé : ${e(lc(l.fun.t))}, ${fx(l.fun.o)}.`;
        t+=`\n\n${pickv(['En live ça bouge vite, vérifiez la cote avant.','Attention, les cotes live changent vite.','Allez-y seulement si la cote est encore là.'],key)}`;
        out.push({key,t:t+FOOT});
      })});
    // 3) pronos modifiés
    fut.forEach(m=>((data.changes||{})[m.id]||[]).forEach(c=>{const key='chg|'+m.id+'|'+c.t;if(sent.has(key))return;
      const p=C.picks(m),same=!c.before||!c.before.fia||c.before.fia===p.fia.t;if(same)return;
      out.push({key,t:`🔄 ${pickv(['Petit changement sur','Je change mon prono sur','Mise à jour sur'],key)} ${short(m)} (${hm(m.k)}).\nJe ne joue plus « ${e(c.before.fia)} », je passe sur <b>${e(p.fia.t)}</b>, ${fx(p.fia.o)} minimum.\n\nPourquoi : ${e(c.why.charAt(0).toLowerCase()+c.why.slice(1))}`+FOOT});
    }));
    for(const o of out){await send(o.t);sent.add(o.key)}
    if(!out.length)console.log('Rien de nouveau.');
  }
  state.sent=[...sent].slice(-500);
  if(!process.env.DRY)fs.writeFileSync(stateFile,JSON.stringify(state,null,1));
},150);
