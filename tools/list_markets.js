// Usage: node list_markets.js index.html data.json <idMatch> [<idMatch>...]  -> libellés exacts des marchés du site (pour remplir appodds)
const fs=require('fs');
const h=fs.readFileSync(process.argv[2],'utf8');const s=h.split('<script>\n')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const mk=()=>({innerHTML:'',textContent:'',clientWidth:800,clientHeight:300,style:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],focus(){}});
const els={};global.window={};global.document={getElementById:id=>els[id]||(els[id]=mk()),querySelectorAll:()=>[],addEventListener:()=>{},body:{style:{}}};
global.matchMedia=()=>({matches:true});global.addEventListener=()=>{};global.ResizeObserver=class{observe(){}};global.IntersectionObserver=class{observe(){}};
global.setInterval=()=>{};global.requestAnimationFrame=()=>{};global.fetch=()=>Promise.resolve({json:()=>data});
eval(s);
setTimeout(()=>{const C=window.__cdp;for(const id of process.argv.slice(4)){const m=C.all().find(x=>x.id===id);if(!m){console.log(id,'introuvable');continue}
console.log('== '+id+' '+m.h+' – '+m.a);if(m.ph==null){console.log('(pas de probabilités)');continue}
C.markets(m).forEach(x=>console.log(x.t+'\t'+x.o.toFixed(2)))}},100);
