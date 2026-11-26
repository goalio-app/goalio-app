// Usage: node export_picks.js index.html data.json  -> prints JSON {matchId:{fia:[texte,cote_mini,proba],fun:[...]}} for matches still to play
const fs=require('fs');
const h=fs.readFileSync(process.argv[2],'utf8');const s=h.split('<script>\n')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const mk=()=>({innerHTML:'',textContent:'',clientWidth:800,clientHeight:300,style:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],focus(){}});
const els={};global.window={};global.document={getElementById:id=>els[id]||(els[id]=mk()),querySelector:()=>mk(),querySelectorAll:()=>[],addEventListener:()=>{},body:{style:{}}};
global.matchMedia=()=>({matches:true});global.addEventListener=()=>{};global.ResizeObserver=class{observe(){}};global.IntersectionObserver=class{observe(){}};
global.setInterval=()=>{};global.requestAnimationFrame=()=>{};global.fetch=()=>Promise.resolve({json:()=>data});
eval(s);
setTimeout(()=>{const C=window.__cdp,out={};C.all().filter(m=>m.ph!=null&&Date.now()<m.k.getTime()).forEach(m=>{const p=C.picks(m);out[m.id]={match:m.h+' – '+m.a,kickoff:m.k.toISOString(),fia:[p.fia.t,+p.fia.o.toFixed(2),+p.fia.p.toFixed(3)],fun:[p.fun.t,+p.fun.o.toFixed(2),+p.fun.p.toFixed(3)]}});console.log(JSON.stringify(out,null,1))},100);
