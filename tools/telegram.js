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
const FOOT='';
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
  const today0=day(now),out=[];
  // combinés du jour figés (mêmes règles que l'onglet Combinés), pour en donner le résultat le lendemain
  const iso=d=>d.toLocaleDateString('sv-SE',{timeZone:TZ}),nm=m=>`${m.h} – ${m.a}`,isoT=iso(now);
  state.combos=state.combos||{};
  {const td=all.filter(m=>m.ph!=null&&!m.bo&&iso(m.k)===isoT);
   if(!state.combos[isoT]&&td.length>=2&&td.every(m=>Date.now()<m.k.getTime())){
     const pk=td.map(m=>({m,...C.picks(m)}));
     state.combos[isoT]={safe:[...pk].sort((a,b)=>b.fia.p-a.fia.p).slice(0,3).map(o=>nm(o.m)),fun:[...pk].sort((a,b)=>b.fun.p-a.fun.p).slice(0,3).map(o=>nm(o.m))};
   }}
  // filet de sécurité si le cron GitHub ne part pas : le premier push après 11h envoie le bilan et les paris du jour
  const hP=+now.toLocaleTimeString('fr-FR',{hour:'2-digit',hour12:false,timeZone:TZ}).slice(0,2);
  const doDaily=mode==='daily'||(mode==='push'&&hP>=11&&state.daily!==today0);
  if(doDaily||mode==='results'){
    const H=(data.history||[]).filter(r=>r&&r.length>=6&&(r[5]===1||r[5]===0));
    const keyOf=r=>'res|'+r[0]+'|'+r[1]+'|'+r[2];
    const fresh=H.filter(r=>!sent.has(keyOf(r))&&/fiable|fun/.test(String(r[4])));
    const extra=[],marks=[];
    // pari fun du jour et combinés
    Object.entries(state.combos).forEach(([d,c])=>{
      if(d>=isoT||sent.has('cb|'+d))return;
      const row=(n,ty)=>H.find(r=>r[0]===d&&r[1]===n&&r[4]===ty);
      const old=(Date.parse(isoT)-Date.parse(d))/864e5>3;
      let done=true;
      if(c.ff&&c.ft){const r=row(c.ff,'fun');if(r&&r[2]!==c.ft){}else if(r)extra.push(`🔥 Le fun : ${e(r[2])} · ${fx(r[3])} ${r[5]?'✅':'❌'}`);else done=false}
      [['safe','fiable','Combiné fiable'],['fun','fun','Combiné fun']].forEach(([k,ty,lab])=>{
        const legs=(c[k]||[]).map(n=>row(n,ty));if((c[k]||[]).length<2)return;
        const lost=legs.some(r=>r&&r[5]===0),all1=legs.every(r=>r&&r[5]===1);
        if(lost||all1)extra.push(`🧩 ${lab} · ${fx(legs.filter(Boolean).reduce((a,r)=>a*r[3],1))} ${all1?'✅':'❌'}`);else done=false;
      });
      if(done||old)marks.push('cb|'+d);
      if(old)delete state.combos[d];
    });
    // montante
    const mo=data.montante;
    if(mo&&mo.steps){let bank=mo.start,n=0;
      mo.steps.forEach((st,i)=>{if(st[4]!==1&&st[4]!==0)return;n++;
        const won=st[4]===1;bank=won?bank*st[3]:mo.start;
        const key='mo|'+st[0]+'|'+i;if(sent.has(key)||st[0]>=isoT){if(!won)n=0;return}
        extra.push(won?`📈 Montante étape ${n} ✅ · ${fx(bank)} € (objectif ${mo.target} €)`:`📈 Montante étape ${n} ❌ · on repart à ${mo.start} €`);
        marks.push(key);if(!won)n=0;
      });
    }
    if(fresh.length||extra.length){
      let t='';
      if(fresh.length){
        const ok=fresh.filter(r=>r[5]===1).length,order=[...fresh].sort((a,b)=>b[5]-a[5]||b[3]-a[3]);
        t=`Hier : ${ok}/${fresh.length} ${ok/fresh.length>=.6?'✅':''}\n`+order.slice(0,4).map(r=>`${r[5]===1?'✅':'❌'} ${e(r[2])} · ${fx(r[3])}`).join('\n');
      }
      if(extra.length)t+=(t?'\n\n':'')+extra.join('\n');
      const tot=H.filter(r=>/fiable|fun/.test(String(r[4]))),tw=tot.filter(r=>r[5]===1).length;
      if(tot.length>fresh.length)t+=`\n\nDepuis le début : ${Math.round(100*tw/tot.length)} %`;
      await send(t);fresh.forEach(r=>sent.add(keyOf(r)));marks.forEach(k=>sent.add(k));
    }else console.log('Pas de nouveaux résultats.');
  }
  if(doDaily){
    const today=fut.filter(m=>day(m.k)===today0);
    if(!today.length||state.daily===today0)console.log('Paris du jour : rien à publier.');
    else{
      let sure=null,fun=null;today.forEach(m=>{const p=C.picks(m);if(!sure||p.fia.p>sure.x.p)sure={m,x:p.fia};if(!fun||p.fun.p>fun.x.p)fun={m,x:p.fun}});
      const soir=today.every(m=>+hm(m.k).slice(0,2)>=18);
      const mo=data.montante,st=mo&&mo.steps&&mo.steps[mo.steps.length-1];
      let t=`${pickv(['Salut à tous','Hello','Salut la team'],today0)} ⚽ ${today.length} matchs ${soir?'ce soir':'aujourd\'hui'}.\n\n`;
      t+=`✅ <b>${e(sure.x.t)}</b> · ${fx(sure.x.o)}\n<i>${short(sure.m)}, ${hm(sure.m.k)}</i>\n\n`;
      t+=`🔥 <b>${e(fun.x.t)}</b> · ${fx(fun.x.o)}\n<i>${short(fun.m)}, ${hm(fun.m.k)}</i>`;
      if(st&&st[4]==null&&st[0]===now.toISOString().slice(0,10))t+=`\n\n📈 Montante : ${e(st[2])} · ${fx(st[3])}`;
      t+=`\n\nButeurs dès les compos.`+LINK('Tout sur l\'appli');
      await send(t);state.daily=today0;
      if(state.combos[isoT])Object.assign(state.combos[isoT],{ff:nm(fun.m),ft:fun.x.t});
    }
  }
  if(mode==='push'){
    all.filter(m=>Date.now()<m.k.getTime()&&(data.lineups||{})[m.id]).forEach(m=>{
      const key='lu|'+m.id;if(sent.has(key))return;
      const P=C.players(m).filter(p=>p.st==='in');if(!P.length)return;
      const best=lab=>P.map(p=>({p,x:p.mk.find(k=>k.t===lab)})).filter(o=>o.x).sort((a,b)=>b.x.p-a.x.p)[0];
      const b=best('Buteur'),a=best('Passeur décisif'),c=best('Décisif 2 fois ou plus')||best('Doublé (2 buts ou plus)');
      let t=`📋 ${short(m)}, ${hm(m.k)}`;
      if(b)t+=`\n⚽ ${e(b.p.n)} buteur · ${fx(b.x.o)}`;
      if(a&&(!b||a.p.n!==b.p.n))t+=`\n🅰️ ${e(a.p.n)} passeur · ${fx(a.x.o)}`;
      if(c)t+=`\n🔥 ${e(c.p.n)} ${c.x.t==='Doublé (2 buts ou plus)'?'doublé':'décisif x2'} · ${fx(c.x.o)}`;
      out.push({key,t});
    });
    Object.entries(data.live||{}).forEach(([id,L])=>{const m=all.find(x=>x.id===id);if(!m)return;
      (L||[]).forEach(l=>{const key='lv|'+id+'|'+l.t;if(sent.has(key)||Date.now()-new Date(l.t)>40*60e3)return;
        let t=`🔴 ${l.min}' ${e(m.h)} ${e(l.score)} ${e(m.a)}`;
        if(l.fia)t+=`\n✅ ${e(l.fia.t)} · ${fx(l.fia.o)}`;
        if(l.fun)t+=`\n🔥 ${e(l.fun.t)} · ${fx(l.fun.o)}`;
        out.push({key,t});
      })});
    fut.forEach(m=>((data.changes||{})[m.id]||[]).forEach(c=>{const key='chg|'+m.id+'|'+c.t;if(sent.has(key))return;
      const p=C.picks(m),same=!c.before||!c.before.fia||c.before.fia===p.fia.t;if(same)return;
      out.push({key,t:`🔄 ${short(m)} : je passe sur <b>${e(p.fia.t)}</b> · ${fx(p.fia.o)}`+(c.why&&c.why.length<=90?`\n<i>${e(c.why)}</i>`:'')});
    }));
    for(const o of out){await send(o.t);sent.add(o.key)}
    if(!out.length)console.log('Rien de nouveau.');
  }
  state.sent=[...sent].slice(-500);
  if(!process.env.DRY)fs.writeFileSync(stateFile,JSON.stringify(state,null,1));
},150);
