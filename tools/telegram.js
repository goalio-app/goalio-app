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
const FOOT='\n\n<i>🔞 18+ · Jouer comporte des risques : endettement, dépendance… 09 74 75 13 13</i>';
const LINK=t=>`\n\n👉 <a href="${URL}">${t}</a>`;
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
  const out=[];
  if(mode==='daily'||mode==='results'){
    // Résultats : chaque prono noté dans history (gagné 1 / perdu 0), publié une seule fois
    const H=(data.history||[]).filter(r=>r&&r.length>=6&&(r[5]===1||r[5]===0));
    const keyOf=r=>'res|'+r[0]+'|'+r[1]+'|'+r[2];
    const fresh=H.filter(r=>!sent.has(keyOf(r))&&/fiable|fun/.test(String(r[4])));
    if(fresh.length){
      const ok=fresh.filter(r=>r[5]===1).length,sf=fresh.filter(r=>/fiable/.test(r[4])),fn=fresh.filter(r=>/fun/.test(r[4]));
      const line=r=>`${r[5]===1?'✅':'❌'} ${e(r[2])} @${fx(r[3])} <i>· ${e(r[1])}</i>`;
      const order=[...fresh].sort((a,b)=>b[5]-a[5]||b[3]-a[3]);
      let t=`📊 <b>Résultats d'hier : ${ok}/${fresh.length}</b>`;
      const best=order.find(r=>r[5]===1&&r[3]>=2.5);
      if(best)t+=`
🔥 Le fun est passé : <b>${e(best[2])} @${fx(best[3])}</b>`;
      t+=`

`+order.slice(0,10).map(line).join('\n')+(order.length>10?`\n… et ${order.length-10} autres sur l'appli`:'');
      const tot=H.filter(r=>/fiable|fun/.test(String(r[4]))),tw=tot.filter(r=>r[5]===1).length;
      const pct=a=>a.length?Math.round(100*a.filter(r=>r[5]===1).length/a.length)+' %':'–';
      t+=`

🟡 Sûrs : ${sf.filter(r=>r[5]===1).length}/${sf.length} · 🔴 Fun : ${fn.filter(r=>r[5]===1).length}/${fn.length}`;
      if(tot.length>fresh.length)t+=`
📈 Depuis le début : ${tw}/${tot.length} (${pct(tot)})`;
      t+=`

On publie tout, même quand ça perd.`+FOOT;
      await send(t);fresh.forEach(r=>sent.add(keyOf(r)));
    }else console.log('Pas de nouveaux résultats.');
  }
  if(mode==='daily'){
    const today=fut.filter(m=>day(m.k)===day(now));
    if(!today.length||state.daily===day(now)){console.log('Paris du jour : rien à publier (pas de match ou déjà fait).')}
    else{
    let sure=null,fun=null;today.forEach(m=>{const p=C.picks(m);if(!sure||p.fia.p>sure.x.p)sure={m,x:p.fia};if(!fun||p.fun.p>fun.x.p)fun={m,x:p.fun}});
    const big=today.find(m=>m.star)||today[0];
    const lgs=[...new Set(today.map(m=>data.leagues[m.lg].name))];
    const mo=data.montante,st=mo&&mo.steps&&mo.steps[mo.steps.length-1];
    let t=`⚽ <b>${e(wd(now)[0].toUpperCase()+wd(now).slice(1))} : ${today.length} matchs au programme</b>\n${e(lgs.slice(0,3).join(', '))}${lgs.length>3?'…':''}\n\nNos 3 coups du jour 👇\n\n`;
    t+=`🟡 <b>LE SÛR</b> · ${e(sure.x.t)} <b>@${fx(sure.x.o)}</b>\n<i>${short(sure.m)} · ${hm(sure.m.k)}</i>\n\n`;
    t+=`🔴 <b>LE FUN</b> · ${e(fun.x.t)} <b>@${fx(fun.x.o)}</b>\n<i>${short(fun.m)} · ${hm(fun.m.k)}</i>`;
    if(st&&st[4]==null&&st[0]===now.toISOString().slice(0,10))t+=`\n\n📈 <b>MONTANTE</b> · étape ${mo.steps.length} · ${e(st[2])} <b>@${fx(st[3])}</b>`;
    else if(big&&big!==sure.m&&big!==fun.m){const p=C.picks(big);t+=`\n\n⭐ <b>L'AFFICHE</b> · ${short(big)} (${hm(big.k)})\n${e(p.fia.t)} <b>@${fx(p.fia.o)}</b>`}
    t+=`\n\n🎯 Les buteurs arrivent ici dès que les compos tombent.`+LINK('Tous les pronos')+FOOT;
    await send(t);state.daily=day(now);}
  }else if(mode==='push'){
    // 1) compos tombées -> paris joueurs
    all.filter(m=>Date.now()<m.k.getTime()&&(data.lineups||{})[m.id]).forEach(m=>{
      const key='lu|'+m.id;if(sent.has(key))return;
      const P=C.players(m).filter(p=>p.st==='in');if(!P.length)return;
      const best=(lab)=>P.map(p=>({p,x:p.mk.find(k=>k.t===lab)})).filter(o=>o.x).sort((a,b)=>b.x.p-a.x.p)[0];
      const b=best('Buteur'),a=best('Passeur décisif'),c=best('Décisif 2 fois ou plus')||best('Doublé (2 buts ou plus)');
      let t=`📋 <b>Compos tombées</b> · ${short(m)} (${hm(m.k)})\n`;
      if(b)t+=`\n🎯 Buteur : <b>${e(b.p.n)}</b> @${fx(b.x.o)}`;
      if(a&&(!b||a.p.n!==b.p.n||P.length===1))t+=`\n🅰️ Passeur : <b>${e(a.p.n)}</b> @${fx(a.x.o)}`;
      if(c)t+=`\n💥 Le coup : <b>${e(c.p.n)}</b> ${c.x.t==='Doublé (2 buts ou plus)'?'doublé':'décisif 2 fois'} @${fx(c.x.o)}`;
      out.push({key,t:t+LINK('Tous les paris joueurs')+FOOT});
    });
    // 2) paris en direct
    Object.entries(data.live||{}).forEach(([id,L])=>{const m=all.find(x=>x.id===id);if(!m)return;
      (L||[]).forEach(l=>{const key='lv|'+id+'|'+l.t;if(sent.has(key)||Date.now()-new Date(l.t)>40*60e3)return;
        let t=`🔴 <b>EN DIRECT ${l.min}'</b> · ${e(m.h)} <b>${e(l.score)}</b> ${e(m.a)}\n`;
        if(l.why)t+=`<i>${e(l.why)}</i>\n`;
        if(l.fia)t+=`\n✅ ${e(l.fia.t)} @${fx(l.fia.o)}`;
        if(l.fun)t+=`\n🎲 ${e(l.fun.t)} @${fx(l.fun.o)}`;
        out.push({key,t:t+`\n\n⏱ Ça bouge vite : prends-le seulement si ton appli paie au moins cette cote.`+FOOT});
      })});
    // 3) pronos modifiés
    fut.forEach(m=>((data.changes||{})[m.id]||[]).forEach(c=>{const key='chg|'+m.id+'|'+c.t;if(sent.has(key))return;
      const p=C.picks(m),same=!c.before||!c.before.fia||c.before.fia===p.fia.t;if(same)return;
      out.push({key,t:`🔄 <b>On change !</b> ${short(m)} (${hm(m.k)})\n<s>${e(c.before.fia)}</s> → <b>${e(p.fia.t)}</b> @${fx(p.fia.o)}\n<i>${e(c.why)}</i>`+FOOT});
    }));
    for(const o of out){await send(o.t);sent.add(o.key)}
    if(!out.length)console.log('Rien de nouveau.');
  }
  state.sent=[...sent].slice(-500);
  if(!process.env.DRY)fs.writeFileSync(stateFile,JSON.stringify(state,null,1));
},150);
