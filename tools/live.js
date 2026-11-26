// Paris en direct : node tools/live.js index.html data.json <id> <minute> <butsDom> <butsExt> [rougesDom] [rougesExt]
// -> JSON {match, minute, score, fia:{t,o,p}, fun:{t,o,p}, all:[...]}  (cote mini = 1,03 / p, comme sur le site)
const fs=require('fs');
const [,,html,json,id,minS,hS,aS,rhS='0',raS='0']=process.argv;
const h=fs.readFileSync(html,'utf8');const s=h.split('<script>\n')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync(json,'utf8'));
const mk=()=>({innerHTML:'',textContent:'',hidden:false,clientWidth:800,clientHeight:300,style:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],focus(){}});
const els={};global.window={};global.document={getElementById:k=>els[k]||(els[k]=mk()),querySelector:()=>mk(),querySelectorAll:()=>[],addEventListener:()=>{},body:{style:{}}};
global.matchMedia=()=>({matches:true});global.addEventListener=()=>{};global.ResizeObserver=class{observe(){}};global.IntersectionObserver=class{observe(){}};
global.setInterval=()=>{};global.requestAnimationFrame=()=>{};global.fetch=()=>Promise.resolve({json:()=>data});global.navigator={};
eval(s);
setTimeout(()=>{
  const C=window.__cdp,m=C.all().find(x=>x.id===id);
  if(!m||m.ph==null){console.log(JSON.stringify({error:'match sans probabilités'}));return}
  const [lh,la]=C.markets(m).lam,min=+minS,g1=+hS,g2=+aS;
  const left=Math.max(0,(95-min)/90);
  // carton rouge : l'équipe à 10 marque ~30 % de moins, l'autre ~20 % de plus
  const kh=Math.pow(.7,+rhS)*Math.pow(1.2,+raS),ka=Math.pow(.7,+raS)*Math.pow(1.2,+rhS);
  const rh=lh*left*kh,ra=la*left*ka,N=12;
  const pf=l=>{const o=[];let p=Math.exp(-l);for(let k=0;k<N;k++){o.push(p);p*=l/(k+1)}return o};
  const A=pf(rh),B=pf(ra);
  const sum=f=>{let t=0;for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(f(g1+i,g2+j,i,j))t+=A[i]*B[j];return t};
  const H=m.h,W=m.a,T=g1+g2,L=[];
  const add=(t,p)=>{if(p>.03&&p<.97)L.push({t,p,o:+(1.03/p).toFixed(2)})};
  add('Victoire '+H,sum((x,y)=>x>y));add('Match nul',sum((x,y)=>x===y));add('Victoire '+W,sum((x,y)=>x<y));
  add(H+' ou nul',sum((x,y)=>x>=y));add(W+' ou nul',sum((x,y)=>x<=y));add(H+' ou '+W,sum((x,y)=>x!==y));
  for(const k of [.5,1.5,2.5])add(`Plus de ${String(T+k).replace('.',',')} buts`,sum((x,y)=>x+y>T+k));
  for(const k of [.5,1.5,2.5])add(`Moins de ${String(T+k).replace('.',',')} buts`,sum((x,y)=>x+y<T+k));
  if(!(g1>0&&g2>0))add('Les deux équipes marquent',sum((x,y)=>x>0&&y>0));
  const none=Math.exp(-(rh+ra));add('Prochain but : '+H,(1-none)*rh/(rh+ra));add('Prochain but : '+W,(1-none)*ra/(rh+ra));add('Plus aucun but',none);
  add(H+' marque encore',1-Math.exp(-rh));add(W+' marque encore',1-Math.exp(-ra));
  const fia=L.filter(x=>x.p>=.7&&x.p<=.86&&x.o>=1.18).sort((a,b)=>b.p-a.p)[0]||null;
  const fun=L.filter(x=>x.p>=.22&&x.p<=.42).sort((a,b)=>b.p-a.p)[0]||null;
  console.log(JSON.stringify({match:m.h+' – '+m.a,minute:min,score:g1+'-'+g2,fia,fun,all:L.sort((a,b)=>b.p-a.p)},null,1));
},120);
