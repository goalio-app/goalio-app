// Publie sur un canal Telegram à partir de index.html + data.json.
// Usage : node tools/telegram.js daily|changes   (env : TELEGRAM_TOKEN, TELEGRAM_CHAT, STATE=telegram_state.json, DRY=1 pour afficher sans envoyer)
const fs=require('fs');
const mode=process.argv[2]||'daily';
const h=fs.readFileSync('index.html','utf8');const s=h.split('<script>\n')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync('data.json','utf8'));
const realFetch=global.fetch;
const mk=()=>({innerHTML:'',textContent:'',hidden:false,clientWidth:800,clientHeight:300,style:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],focus(){}});
const els={};global.window={};global.document={getElementById:id=>els[id]||(els[id]=mk()),querySelector:()=>mk(),querySelectorAll:()=>[],addEventListener:()=>{},body:{style:{}}};
global.matchMedia=()=>({matches:true});global.addEventListener=()=>{};global.ResizeObserver=class{observe(){}};global.IntersectionObserver=class{observe(){}};
global.setInterval=()=>{};global.requestAnimationFrame=()=>{};global.fetch=()=>Promise.resolve({json:()=>data});global.navigator={};
eval(s);
const URL='https://goalio-app.github.io/goalio-app/';
const TZ='Europe/Paris';
const e=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fx=o=>o.toFixed(2).replace('.',',');
const hm=d=>d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:TZ});
const day=d=>d.toLocaleDateString('fr-FR',{timeZone:TZ});
const dlong=d=>d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:TZ});
const FOOT='\n\n🔞 18+ · Jouer comporte des risques : endettement, dépendance… Appelez le 09 74 75 13 13 (appel non surtaxé).';
const stateFile=process.env.STATE||'telegram_state.json';
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{daily:null,changes:[]};
async function send(text){
  if(process.env.DRY){console.log(text+'\n-----');return}
  const r=await realFetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT,text,parse_mode:'HTML',disable_web_page_preview:true})});
  const j=await r.json();if(!j.ok)throw new Error('Telegram : '+JSON.stringify(j));
}
setTimeout(async()=>{
  const C=window.__cdp,now=new Date();
  const fut=C.all().filter(m=>m.ph!=null&&Date.now()<m.k.getTime()).sort((a,b)=>a.k-b.k);
  if(mode==='daily'){
    const today=fut.filter(m=>day(m.k)===day(now));
    if(!today.length){console.log('Aucun match aujourd\'hui.');return}
    if(state.daily===day(now)){console.log('Déjà publié aujourd\'hui.');return}
    let sure=null,fun=null;today.forEach(m=>{const p=C.picks(m);if(!sure||p.fia.p>sure.x.p)sure={m,x:p.fia};if(!fun||p.fun.p>fun.x.p)fun={m,x:p.fun}});
    const mo=data.montante,st=mo&&mo.steps&&mo.steps[mo.steps.length-1];
    let t=`⚽ <b>Les paris du ${e(dlong(now))}</b>\n\n`;
    t+=`🟡 <b>Le prono sûr</b>\n${e(sure.x.t)} · cote mini <b>${fx(sure.x.o)}</b>\n<i>${e(sure.m.h)} – ${e(sure.m.a)} · ${hm(sure.m.k)}</i>\n\n`;
    t+=`🔴 <b>Le coup fun</b>\n${e(fun.x.t)} · cote mini <b>${fx(fun.x.o)}</b>\n<i>${e(fun.m.h)} – ${e(fun.m.a)} · ${hm(fun.m.k)}</i>\n\n`;
    if(st&&st[4]==null)t+=`📈 <b>Montante · étape ${mo.steps.length}</b>\n${e(st[2])} · ${fx(st[3])}\n<i>${e(st[1])}</i>\n\n`;
    t+=`📋 <b>À jouer aujourd'hui</b>\n`+today.slice(0,10).map(m=>{const p=C.picks(m);return`${hm(m.k)} · ${e(m.h)} – ${e(m.a)}\n   ➜ ${e(p.fia.t)} · <b>${fx(p.fia.o)}</b>`}).join('\n');
    t+=`\n\nLa cote mini, c'est le minimum à exiger sur ton appli. En dessous, passe ton tour.\n👉 <a href="${URL}">Tous les pronos, buteurs et combinés</a>`+FOOT;
    await send(t);state.daily=day(now);
  }else{
    const posted=new Set(state.changes||[]),out=[];
    fut.forEach(m=>((data.changes||{})[m.id]||[]).forEach(c=>{const key=m.id+'|'+c.t;if(posted.has(key))return;
      const p=C.picks(m),same=!c.before||!c.before.fia||c.before.fia===p.fia.t;
      out.push({key,t:`🔄 <b>${same?'Prono confirmé':'Prono modifié'}</b> · ${e(m.h)} – ${e(m.a)} (${hm(m.k)})\n`+(same?'':`<s>${e(c.before.fia)}</s>\n`)+`➜ <b>${e(p.fia.t)}</b> · cote mini ${fx(p.fia.o)}\n<i>${e(c.why)}</i>`});}));
    for(const o of out){await send(o.t+`\n👉 <a href="${URL}">Voir sur Goalio</a>`+FOOT);posted.add(o.key)}
    state.changes=[...posted].slice(-300);
    if(!out.length)console.log('Aucun changement à publier.');
  }
  if(!process.env.DRY)fs.writeFileSync(stateFile,JSON.stringify(state,null,1));
},150);
