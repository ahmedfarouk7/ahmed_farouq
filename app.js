/* RoomGenius — functional browser-first room planner.
 * Pure JavaScript + Canvas. No frameworks or server required.
 * Model coordinates are meters; rotation is degrees around each object's centre.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const CATALOG = [
    {type:'sofa',name:'أريكة عصرية',category:'seating',group:'الجلوس',emoji:'🛋️',w:2.1,d:.86,h:.85,color:'#8faac5'},
    {type:'bed',name:'سرير مزدوج',category:'sleep',group:'النوم',emoji:'🛏️',w:1.65,d:2.05,h:.73,color:'#c9b9aa'},
    {type:'table',name:'طاولة وسط',category:'seating',group:'الجلوس',emoji:'☕',w:1.15,d:1.0,h:.45,color:'#d4ad88'},
    {type:'chair',name:'كرسي مريح',category:'seating',group:'الجلوس',emoji:'🪑',w:.62,d:.62,h:.85,color:'#d8b58b'},
    {type:'desk',name:'مكتب عمل',category:'work',group:'العمل',emoji:'💻',w:1.5,d:.72,h:.76,color:'#c4a384'},
    {type:'wardrobe',name:'دولاب ملابس',category:'storage',group:'التخزين',emoji:'🚪',w:1.45,d:.58,h:1.96,color:'#9dabb7'},
    {type:'shelf',name:'وحدة أرفف',category:'storage',group:'التخزين',emoji:'📚',w:1.1,d:.4,h:1.75,color:'#b69c89'},
    {type:'plant',name:'نبات داخلي',category:'decor',group:'الديكور',emoji:'🪴',w:.46,d:.46,h:1.12,color:'#8cc6a0'},
    {type:'rug',name:'سجادة',category:'decor',group:'الديكور',emoji:'🧶',w:2.2,d:1.7,h:.012,color:'#e7cbb6',soft:true},
    {type:'nightstand',name:'كومود جانبي',category:'sleep',group:'النوم',emoji:'▣',w:.55,d:.45,h:.52,color:'#bc9977'},
    {type:'tvunit',name:'وحدة تلفاز',category:'storage',group:'التخزين',emoji:'▤',w:1.55,d:.43,h:.52,color:'#baa28c'},
    {type:'lamp',name:'مصباح أرضي',category:'decor',group:'الإضاءة',emoji:'◉',w:.32,d:.32,h:1.7,color:'#d1bd99'}
  ];
  const META = Object.fromEntries(CATALOG.map(x=>[x.type,x]));
  const PALETTE = ['#c9b9aa','#a7b49e','#d4ad88','#a4aea7','#d1a5a5','#8cc6a0','#8899b3'];
  const STORAGE_KEY = 'roomgenius-layout-v1';
  const PHOTOS = {sofa:'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=350&q=75&fit=crop',bed:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=350&q=75&fit=crop',table:'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=350&q=75&fit=crop',chair:'https://images.unsplash.com/photo-1503602642458-232111445657?w=350&q=75&fit=crop',desk:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=350&q=75&fit=crop',wardrobe:'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=350&q=75&fit=crop',shelf:'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=350&q=75&fit=crop',plant:'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=350&q=75&fit=crop',rug:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=350&q=75&fit=crop',nightstand:'https://images.unsplash.com/photo-1499933374294-4584851497cc?w=350&q=75&fit=crop',tvunit:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=350&q=75&fit=crop',lamp:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=350&q=75&fit=crop'};
  const PRICES={sofa:16000,bed:14500,table:3600,chair:4200,desk:7500,wardrobe:12000,shelf:4300,plant:700,rug:2600,nightstand:2700,tvunit:6100,lamp:2200};
  const DEFAULT_ROOM = {width:6,height:4.8,doorX:.55,doorW:.9,style:'natural',floor:'oak',light:68,walls:true};
  const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
  const round = (x,n=2) => Number(x.toFixed(n));
  const clamp = (x,min,max) => Math.max(min,Math.min(max,x));
  const mk = (type,x,y,rotation=0,overrides={}) => ({id:uid(),type,x,y,rotation,w:META[type].w,d:META[type].d,color:META[type].color,price:PRICES[type]||0,...overrides});
  const demo = () => ({
    version:1,name:'شقتي الجديدة',room:{...DEFAULT_ROOM},
    items:[
      mk('rug',1.65,2.25,0), mk('sofa',1.55,.95,0),mk('table',1.67,2.23,0),
      mk('shelf',5.52,1.1,90),mk('plant',4.67,.55,0),mk('desk',4.65,3.88,0),mk('chair',4.61,2.91,0)
    ]
  });
  function validateLayout(raw){
    if(!raw||typeof raw!=='object'||!raw.room||!Array.isArray(raw.items))throw Error('صيغة الملف غير صحيحة');
    const w=Number(raw.room.width),h=Number(raw.room.height);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<2||h<2||w>15||h>15||raw.items.length>100)throw Error('أبعاد الغرفة أو عدد القطع غير صالح');
    const items=raw.items.map(it=>{
      if(!it||!META[it.type])throw Error('نوع قطعة غير مدعوم');
      const o={id:String(it.id||uid()).slice(0,60),type:it.type};
      for(const key of ['x','y','w','d','rotation']){
        o[key]=Number(it[key]);if(!Number.isFinite(o[key])||Math.abs(o[key])>10000)throw Error('قيمة عددية غير صحيحة');
      }
      if(o.w<.2||o.d<.2||o.w>10||o.d>10)throw Error('مقاس قطعة غير مقبول');
      o.rotation=((o.rotation%360)+360)%360;
      o.color=/^#[a-fA-F0-9]{6}$/.test(it.color||'')?it.color:META[o.type].color;
      o.price=Number.isFinite(Number(it.price))?clamp(Number(it.price),0,10000000):(PRICES[o.type]||0);
      return o;
    });
    return {version:1,name:String(raw.name||'تصميم جديد').slice(0,48),room:{width:w,height:h,doorX:clamp(Number.isFinite(Number(raw.room.doorX))?Number(raw.room.doorX):.55,0,Math.max(0,w-clamp(Number(raw.room.doorW)||.9,.7,1.8))),doorW:clamp(Number(raw.room.doorW)||.9,.7,Math.min(1.8,w)),style:['natural','modern','dark'].includes(raw.room.style)?raw.room.style:'natural',floor:['oak','marble','concrete'].includes(raw.room.floor)?raw.room.floor:'oak',light:Math.max(0,Math.min(100,Number.isFinite(Number(raw.room.light))?Number(raw.room.light):68)),walls:raw.room.walls!==false},items};
  }
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{}
  let state;
  try{state= saved?validateLayout(saved):demo();}catch{state=demo();}
  let selectedId=null,category='all',searchText='',view='2d',grid=true,snap=true,zoom=1;
  let measureMode=false, measureStart=null, measureEnd=null;
  let past=[],future=[],toastTimer=null,drag=null,canvasGeom=null,isoCamera=null,rotationAnchor=null;
  const canvas=$('designCanvas'), ctx=canvas.getContext('2d');
  function selected(){return state.items.find(it=>it.id===selectedId)||null;}
  function remember(){past.push(JSON.stringify(state));if(past.length>55)past.shift();future=[];updateHistoryButtons();}
  function restore(s){state=validateLayout(JSON.parse(s));selectedId=null;saveLocal();refresh();window.dispatchEvent(new Event('rg:change'));}
  function undo(){if(!past.length)return;future.push(JSON.stringify(state));restore(past.pop());updateHistoryButtons();notify('تم التراجع');}
  function redo(){if(!future.length)return;past.push(JSON.stringify(state));restore(future.pop());updateHistoryButtons();notify('تمت الإعادة');}
  function updateHistoryButtons(){$('undoBtn').disabled=!past.length;$('redoBtn').disabled=!future.length;}
  function saveLocal(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}}
  function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2400);}
  const radians = degrees => degrees*Math.PI/180;
  const poly = it => {
    const c=Math.cos(radians(it.rotation)),s=Math.sin(radians(it.rotation));
    return [[-it.w/2,-it.d/2],[it.w/2,-it.d/2],[it.w/2,it.d/2],[-it.w/2,it.d/2]]
      .map(([x,y])=>({x:it.x+x*c-y*s,y:it.y+x*s+y*c}));
  };
  const minmax = (points,axis) => points.reduce((a,p)=>{const n=p.x*axis.x+p.y*axis.y;a[0]=Math.min(a[0],n);a[1]=Math.max(a[1],n);return a;},[Infinity,-Infinity]);
  function polygonsOverlap(a,b){
    for(const p of [a,b])for(let i=0;i<p.length;i++){
      const e={x:p[(i+1)%p.length].x-p[i].x,y:p[(i+1)%p.length].y-p[i].y};
      const axis={x:-e.y,y:e.x},aa=minmax(a,axis),bb=minmax(b,axis);
      if(aa[1]<=bb[0]+.0005||bb[1]<=aa[0]+.0005)return false;
    }
    return true;
  }
  function doorPoly(){const r=state.room;return [{x:r.doorX,y:r.height-.78},{x:r.doorX+r.doorW,y:r.height-.78},{x:r.doorX+r.doorW,y:r.height+.01},{x:r.doorX,y:r.height+.01}];}
  function itemIssue(it,others=state.items){
    const vertices=poly(it);
    // Rugs may overlap furniture, but still must remain within room boundaries.
    if(META[it.type].soft)return vertices.some(p=>p.x<0||p.y<0||p.x>state.room.width||p.y>state.room.height)?'outside':null;
    if(vertices.some(p=>p.x<.065||p.y<.065||p.x>state.room.width-.065||p.y>state.room.height-.065))return 'outside';
    if(polygonsOverlap(vertices,doorPoly()))return 'door';
    for(const b of others){if(b.id===it.id||META[b.type].soft)continue;if(polygonsOverlap(vertices,poly(b)))return 'collision';}
    return null;
  }
  function getIssues(){const result={};for(const it of state.items){const issue=itemIssue(it);if(issue)result[it.id]=issue;}return result;}
  function pointIn(it,x,y){const theta=-radians(it.rotation),dx=x-it.x,dy=y-it.y;
    const lx=dx*Math.cos(theta)-dy*Math.sin(theta),ly=dx*Math.sin(theta)+dy*Math.cos(theta);
    return Math.abs(lx)<=it.w/2+.015&&Math.abs(ly)<=it.d/2+.015;}
  function hitTest(x,y){return [...state.items].reverse().find(it=>pointIn(it,x,y))||null;}
  function resizeCanvas(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  function workspace(){const w=canvas.clientWidth,h=canvas.clientHeight,s=clamp(Math.min((w-(w<650?38:148))/state.room.width,(h-(h<550?80:138))/state.room.height),20,130)*zoom;
    return {w,h,s,ox:(w-state.room.width*s)/2,oy:(h-state.room.height*s)/2};}
  function worldToScreen(x,y){const g=canvasGeom||workspace();return {x:g.ox+x*g.s,y:g.oy+y*g.s};}
  function clientToWorld(clientX,clientY){const r=canvas.getBoundingClientRect(),g=canvasGeom||workspace();return {x:(clientX-r.left-g.ox)/g.s,y:(clientY-r.top-g.oy)/g.s};}
  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
  function mix(hex,other,ratio){const a=rgb(hex),b=rgb(other);return '#'+a.map((n,i)=>Math.round(n*(1-ratio)+b[i]*ratio).toString(16).padStart(2,'0')).join('');}
  function bg(){const {width:w,height:h}=canvas.getBoundingClientRect();ctx.fillStyle='#f3f3ec';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#bbc8b7';for(let x=17;x<w;x+=26)for(let y=14;y<h;y+=26){ctx.beginPath();ctx.arc(x,y,1.05,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function draw2D(){const g=workspace();canvasGeom=g;bg();ctx.save();ctx.shadowColor='#4c60472a';ctx.shadowBlur=35;ctx.shadowOffsetY=19;rr(g.ox,g.oy,state.room.width*g.s,state.room.height*g.s,5,'#ffffff');ctx.restore();
    // floor texture + accurate metre grid
    ctx.save();ctx.beginPath();ctx.rect(g.ox,g.oy,state.room.width*g.s,state.room.height*g.s);ctx.clip();
    if(grid){for(let x=0;x<=state.room.width+.001;x+=.5){ctx.beginPath();ctx.moveTo(g.ox+x*g.s,g.oy);ctx.lineTo(g.ox+x*g.s,g.oy+state.room.height*g.s);ctx.strokeStyle='#e7ede3';ctx.lineWidth=1;ctx.stroke();}
      for(let y=0;y<=state.room.height+.001;y+=.5){ctx.beginPath();ctx.moveTo(g.ox,g.oy+y*g.s);ctx.lineTo(g.ox+state.room.width*g.s,g.oy+y*g.s);ctx.strokeStyle='#e7ede3';ctx.lineWidth=1;ctx.stroke();}}
    // Optional accessibility heatmap: cells reachable from the entrance.
    window.RoomGeniusInsights?.drawOverlay?.(ctx,g,state);
    // room door clearance zone
    ctx.fillStyle='#fff4e7';ctx.fillRect(g.ox+state.room.doorX*g.s,g.oy+(state.room.height-.78)*g.s,state.room.doorW*g.s,.78*g.s);
    ctx.setLineDash([4,4]);ctx.strokeStyle='#e5ba8b';ctx.lineWidth=1;ctx.strokeRect(g.ox+state.room.doorX*g.s,g.oy+(state.room.height-.78)*g.s,state.room.doorW*g.s,.78*g.s);ctx.setLineDash([]);ctx.restore();
    // walls and door opening
    ctx.lineWidth=8;ctx.strokeStyle='#7b9280';ctx.lineCap='square';ctx.beginPath();ctx.moveTo(g.ox,g.oy+state.room.height*g.s);ctx.lineTo(g.ox,g.oy);ctx.lineTo(g.ox+state.room.width*g.s,g.oy);ctx.lineTo(g.ox+state.room.width*g.s,g.oy+state.room.height*g.s);ctx.lineTo(g.ox+(state.room.doorX+state.room.doorW)*g.s,g.oy+state.room.height*g.s);ctx.moveTo(g.ox+state.room.doorX*g.s,g.oy+state.room.height*g.s);ctx.lineTo(g.ox,g.oy+state.room.height*g.s);ctx.stroke();
    const hinge=worldToScreen(state.room.doorX,state.room.height),r=state.room.doorW*g.s;
    ctx.beginPath();ctx.arc(hinge.x,hinge.y,r,-Math.PI/2,0);ctx.strokeStyle='#d9aa7b';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(hinge.x,hinge.y);ctx.lineTo(hinge.x,hinge.y-r);ctx.stroke();
    // dimensions
    ctx.fillStyle='#748976';ctx.font='700 12px "Manrope", sans-serif';ctx.textAlign='center';ctx.direction='ltr';ctx.fillText(state.room.width.toFixed(1)+' m',g.ox+state.room.width*g.s/2,g.oy-25);
    ctx.save();ctx.translate(g.ox-35,g.oy+state.room.height*g.s/2);ctx.rotate(-Math.PI/2);ctx.fillText(state.room.height.toFixed(1)+' m',0,0);ctx.restore();
    const issues=getIssues();
    // floor rugs first
    const items=[...state.items].sort((a,b)=>Number(!!META[b.type].soft)-Number(!!META[a.type].soft));
    for(const it of items)drawFurniture2D(it,g,issues[it.id]);
    drawMeasureOverlay(g);
    ctx.restore();
  }
  function drawMeasureOverlay(g){
    if(!measureStart)return;
    const a=worldToScreen(measureStart.x,measureStart.y);
    const b=measureEnd?worldToScreen(measureEnd.x,measureEnd.y):a;
    ctx.save();ctx.lineWidth=2.7;ctx.strokeStyle='#477458';ctx.fillStyle='#477458';ctx.setLineDash([8,5]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
    for(const p of [a,b]){ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();}
    if(measureEnd){const length=Math.hypot(measureEnd.x-measureStart.x,measureEnd.y-measureStart.y).toFixed(2)+' m';
      ctx.font='700 14px Manrope';ctx.textAlign='center';ctx.fillStyle='#335b3d';ctx.fillText(length,(a.x+b.x)/2,(a.y+b.y)/2-13);}
    ctx.restore();
  }
  function drawFurniture2D(it,g,issue){const x=g.ox+it.x*g.s,y=g.oy+it.y*g.s,w=it.w*g.s,d=it.d*g.s;
    ctx.save();ctx.translate(x,y);ctx.rotate(radians(it.rotation));
    ctx.shadowColor='#354b6620';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
    rr(-w/2,-d/2,w,d,Math.min(12,Math.min(w,d)*.17),it.color);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.save();ctx.beginPath();ctx.roundRect(-w/2,-d/2,w,d,Math.min(12,Math.min(w,d)*.17));ctx.clip();
    ctx.strokeStyle=mix(it.color,'#ffffff',.53);ctx.fillStyle=mix(it.color,'#ffffff',.36);ctx.lineWidth=Math.max(1,g.s*.035);
    const pad=Math.min(8,w*.1,d*.1);
    switch(it.type){
      case 'sofa':rr(-w/2+pad,-d/2+pad,w-2*pad,d*.31,5,mix(it.color,'#ffffff',.42));ctx.strokeRect(-w/2+pad,-d/2+d*.35,w-2*pad,d*.53);ctx.beginPath();ctx.moveTo(-w*.17,-d*.15);ctx.lineTo(-w*.17,d*.39);ctx.moveTo(w*.17,-d*.15);ctx.lineTo(w*.17,d*.39);ctx.stroke();break;
      case 'bed': {
        rr(-w*.46,-d*.47,w*.92,d*.94,8,'#916f5d');
        rr(-w*.43,-d*.43,w*.86,d*.84,8,'#f4eee6');
        rr(-w*.41,-d*.12,w*.82,d*.5,8,mix(it.color,'#ffffff',.22));
        for(const xx of [-w*.43,-w*.01]){rr(xx,-d*.39,w*.39,d*.27,8,'#fffefa');rr(xx+w*.03,-d*.355,w*.33,d*.06,3,'#ebe3d8');}
        ctx.strokeStyle='#ffffff90';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.36,d*.29);ctx.bezierCurveTo(-w*.08,d*.33,w*.04,d*.26,w*.37,d*.31);ctx.stroke();break;}
      
      case 'desk': {
        rr(-w*.46,-d*.42,w*.92,d*.84,5,'#c39f79');
        rr(-w*.27,-d*.32,w*.37,d*.32,3,'#384b46');
        rr(-w*.24,-d*.30,w*.31,d*.25,2,'#a4bcb8');
        rr(-w*.21,d*.16,w*.3,d*.12,3,'#edece6');
        rr(w*.19,d*.12,w*.09,d*.11,4,'#deded9');
        ctx.strokeStyle='#8d6b4b';ctx.lineWidth=1;ctx.strokeRect(w*.26,-d*.30,w*.14,d*.30);break;}
      
      case 'table':rr(-w*.43,-d*.43,w*.86,d*.86,7,mix(it.color,'#ffffff',.27));ctx.strokeRect(-w*.30,-d*.30,w*.6,d*.6);break;
      case 'chair':rr(-w*.4,-d*.39,w*.8,d*.75,7,mix(it.color,'#ffffff',.20));ctx.fillRect(-w*.38,-d*.38,w*.76,d*.22);break;
      case 'wardrobe':ctx.beginPath();ctx.moveTo(0,-d*.45);ctx.lineTo(0,d*.45);ctx.stroke();for(const p of [-.1,.1]){ctx.fillStyle='#faf5ee';ctx.beginPath();ctx.arc(p*w,d*.1,Math.max(1,w*.015),0,Math.PI*2);ctx.fill();}break;
      case 'shelf':for(let p=-.3;p<.45;p+=.25){ctx.beginPath();ctx.moveTo(-w*.44,d*p);ctx.lineTo(w*.44,d*p);ctx.stroke();}break;
      case 'plant':ctx.fillStyle='#4b936a';for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(Math.cos(i)*w*.16,Math.sin(i)*d*.16,w*.2,d*.13,i,0,Math.PI*2);ctx.fill();}break;
      case 'rug':ctx.strokeStyle=mix(it.color,'#ffffff',.6);ctx.lineWidth=3;ctx.strokeRect(-w*.45,-d*.42,w*.9,d*.84);for(let px=-w*.35;px<w*.4;px+=w*.14){ctx.beginPath();ctx.moveTo(px,-d*.35);ctx.lineTo(px,d*.35);ctx.stroke();}break;
      case 'nightstand': {rr(-w*.44,-d*.44,w*.88,d*.88,5,'#bc9771');rr(-w*.24,-d*.2,w*.48,d*.35,3,'#eadcca');ctx.fillStyle='#8f6d4f';ctx.beginPath();ctx.arc(0,d*.10,Math.max(2,g.s*.025),0,Math.PI*2);ctx.fill();break;}
      case 'tvunit': {rr(-w*.46,-d*.40,w*.92,d*.80,5,'#b39375');rr(-w*.40,-d*.35,w*.8,d*.52,3,'#ece8e0');ctx.strokeStyle='#806e59';ctx.beginPath();ctx.moveTo(0,-d*.34);ctx.lineTo(0,d*.18);ctx.stroke();break;}
      case 'lamp': {ctx.fillStyle='#e3d8bd';ctx.beginPath();ctx.arc(0,0,Math.min(w,d)*.4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ae977c';ctx.lineWidth=3;ctx.stroke();break;}

    }
    ctx.restore();
    if(issue||selectedId===it.id){ctx.strokeStyle=issue?'#bc6651':'#5b8465';ctx.lineWidth=selectedId===it.id?2.5:1.5;ctx.setLineDash(selectedId===it.id?[6,4]:[4,4]);ctx.strokeRect(-w/2-4,-d/2-4,w+8,d+8);ctx.setLineDash([]);
      if(selectedId===it.id){ctx.fillStyle='#fff';ctx.strokeStyle='#5b8465';for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.beginPath();ctx.arc(sx*(w/2+4),sy*(d/2+4),4.5,0,Math.PI*2);ctx.fill();ctx.stroke();}}}
    ctx.restore();
    if(!META[it.type].soft){ctx.fillStyle='#3a465c';ctx.font='700 10px "IBM Plex Sans Arabic", sans-serif';ctx.textAlign='center';ctx.direction='rtl';const txt=META[it.type].name;ctx.fillText(txt,x,y+d/2+18);}
  }
  function isoSettings(){const w=canvas.clientWidth,h=canvas.clientHeight,r=state.room,maxH=2;
    const s=clamp(Math.min((w-115)/(r.width+r.height),(h-180)/((r.width+r.height)*.54+maxH*.80)),17,84)*zoom;
    return {s,ox:w/2-(r.width-r.height)*s/2,oy:h/2-(r.width+r.height)*s*.54/2+44};}
  const iso=(x,y,z=0)=>({x:isoCamera.ox+(x-y)*isoCamera.s,y:isoCamera.oy+(x+y)*isoCamera.s*.54-z*isoCamera.s*.84});
  function polygonDraw(points,color,stroke=null,width=1){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function drawIsoDetail(it,height){
    const a=radians(it.rotation),c=Math.cos(a),sn=Math.sin(a);
    const p=(x,y,z)=>iso(it.x+x*c-y*sn,it.y+x*sn+y*c,z);
    const quad=(ax,ay,bx,by,z,color,stroke)=>polygonDraw([p(ax,ay,z),p(bx,ay,z),p(bx,by,z),p(ax,by,z)],color,stroke||null,1);
    if(it.type==='bed'){
      quad(-it.w*.46,-it.d*.43,it.w*.46,it.d*.43,height+.02,'#faf7f0','#b0a69a');
      quad(-it.w*.43,-it.d*.03,it.w*.43,it.d*.43,height+.045,'#b8b2a7');
      quad(-it.w*.42,it.d*.29,it.w*.42,it.d*.40,height+.051,'#728e81');
      for(const xx of [-it.w*.23,it.w*.23])quad(xx-it.w*.18,-it.d*.41,xx+it.w*.18,-it.d*.15,height+.06,'#fffefa','#dedbd2');
      const A=p(-it.w*.49,-it.d*.48,height),B=p(it.w*.49,-it.d*.48,height),C=p(it.w*.49,-it.d*.48,height+.65),D=p(-it.w*.49,-it.d*.48,height+.65);
      polygonDraw([A,B,C,D],'#ad988a','#8d7869',1);
    }else if(it.type==='desk'){
      quad(-it.w*.49,-it.d*.46,it.w*.49,it.d*.46,height+.02,'#ba936f','#806a54');
      quad(-it.w*.25,-it.d*.01,it.w*.25,it.d*.28,height+.03,'#5a6e61');
      quad(-it.w*.16,it.d*.12,it.w*.14,it.d*.24,height+.04,'#d8dcd4');
      const A=p(-it.w*.22,-it.d*.28,height+.04),B=p(it.w*.18,-it.d*.28,height+.04),C=p(it.w*.18,-it.d*.28,height+.4),D=p(-it.w*.22,-it.d*.28,height+.4);
      polygonDraw([A,B,C,D],'#425b56','#263b35',2);
    }else if(it.type==='sofa'){
      for(let n=0;n<3;n++){
        const x=(-1+n)*it.w*.28;
        quad(x-it.w*.125,-it.d*.18,x+it.w*.125,it.d*.34,height+.06,'#b8cabc','#809887');
      }
      polygonDraw([p(-it.w*.46,-it.d*.46,height),p(it.w*.46,-it.d*.46,height),p(it.w*.46,-it.d*.46,height+.38),p(-it.w*.46,-it.d*.46,height+.38)],'#819988','#59725e',1);
    }else if(it.type==='plant'){
      const center=p(0,0,height+.12);ctx.fillStyle='#62946b';for(let n=0;n<7;n++){
        ctx.beginPath();ctx.ellipse(center.x+Math.sin(n*1.8)*isoCamera.s*.15,center.y+Math.cos(n*1.8)*isoCamera.s*.14,isoCamera.s*.11,isoCamera.s*.055,n*.5,0,Math.PI*2);ctx.fill();}
    }else if(it.type==='lamp'){
      const a=p(0,0,height),b=p(0,0,height+.2);ctx.strokeStyle='#927d60';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  function drawIso(){canvasGeom=null;isoCamera=isoSettings();bg();const r=state.room;
    const floor=[iso(0,0),iso(r.width,0),iso(r.width,r.height),iso(0,r.height)];
    ctx.save();ctx.shadowColor='#23395228';ctx.shadowBlur=38;ctx.shadowOffsetY=19;polygonDraw(floor,'#fefefe');ctx.restore();polygonDraw(floor,'#ffffff','#c0cedc',3);
    if(grid){ctx.strokeStyle='#eef1f6';ctx.lineWidth=.8;for(let x=.5;x<r.width;x+=.5){const a=iso(x,0),b=iso(x,r.height);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}for(let y=.5;y<r.height;y+=.5){const a=iso(0,y),b=iso(r.width,y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
    // door drawn on floor
    polygonDraw([iso(r.doorX,r.height),iso(r.doorX+r.doorW,r.height),iso(r.doorX+r.doorW,r.height-.78),iso(r.doorX,r.height-.78)],'#fff2e4');
    const issues=getIssues();const furniture=[...state.items].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    for(const it of furniture){const p=poly(it),height=Math.min(META[it.type].h,2),top=p.map(pt=>iso(pt.x,pt.y,height)),bottom=p.map(pt=>iso(pt.x,pt.y,0));
      for(let i=0;i<4;i++){const next=(i+1)%4;
        polygonDraw([bottom[i],bottom[next],top[next],top[i]],mix(it.color,'#122538',i%2?.29:.13),'#fff5',.8);}
      polygonDraw(top,mix(it.color,'#ffffff',it.type==='rug'?.08:.22),issues[it.id]?'#e96e65':selectedId===it.id?'#ff824f':'#ffffffa6',issues[it.id]||selectedId===it.id?3:1);
      drawIsoDetail(it,height);
    }
    const label=iso(r.width/2,r.height,.01);ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle='#7f8a9d';ctx.textAlign='center';ctx.fillText(r.width.toFixed(1)+' × '+r.height.toFixed(1)+' m',label.x,label.y+37);
    $('canvasModeText').textContent='معاينة إيزومترية مبسطة';$('canvasHint').textContent='معاينة هندسية بديلة · افتح 2D لتعديل الأثاث';}
  function draw(){const dpr=Math.min(2,devicePixelRatio||1);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);if(view==='2d')draw2D();else drawIso();}
  function updateCatalog(){const data=CATALOG.filter(x=>(category==='all'||x.category===category)&&(!searchText||(x.name+' '+x.group+' '+x.type).toLowerCase().includes(searchText.toLowerCase())));$('catalogEmpty').hidden=data.length>0;$('catalogCount').textContent=CATALOG.length+' قطعة';$('furnitureList').innerHTML=data.map(f=>`<button class="furniture-card" data-type="${f.type}" draggable="true" title="اضغط للإضافة أو اسحب ${f.name} للمخطط"><span class="furniture-thumb photo-thumb"><img src="${PHOTOS[f.type]}" alt="صورة مرجعية لـ ${f.name}" loading="lazy" onerror="this.style.display='none'"/><span class="thumb-silhouette thumb-${f.type}" aria-hidden="true"></span></span><span class="furniture-info"><strong>${f.name}</strong><small>${f.w}m × ${f.d}m</small></span><span class="furniture-plus">+</span></button>`).join('');
    $('furnitureList').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>addItem(btn.dataset.type)));
    $('categoryTabs').querySelectorAll('.category-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.category===category));}
  function updateInspector(){const it=selected();$('selectionCount').textContent=it?'قطعة واحدة':'لم يتم التحديد';$('emptyInspector').classList.toggle('hidden',!!it);$('itemInspector').classList.toggle('hidden',!it);
    if(!it){updateMath();return;}const meta=META[it.type];$('selectedEmoji').innerHTML='<span class="thumb-silhouette thumb-'+it.type+'" aria-hidden="true"></span>';$('selectedName').textContent=meta.name;$('selectedCategory').textContent=meta.group;
    for(const [id,key] of [['itemX','x'],['itemY','y'],['itemW','w'],['itemD','d']])$(id).value=round(it[key],2);
    $('itemPrice').value=it.price??PRICES[it.type];
    $('rotateRange').value=it.rotation;$('rotateValue').textContent=round(it.rotation,0)+'°';
    $('colorSwatches').innerHTML=PALETTE.map(c=>`<button class="swatch ${it.color===c?'selected':''}" style="background:${c}" data-color="${c}" aria-label="لون ${c}" title="${c}"></button>`).join('');
    $('colorSwatches').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{remember();it.color=b.dataset.color;commit();}));updateMath();}
  function updateMath(){const it=selected();if(!it){$('mathHelp').textContent='حدد قطعة أثاث لرؤية مصفوفة تحويلها الحقيقية.';$('matrixValues').innerHTML='<span>1.00</span><span>0.00</span><span>0.00</span><span>1.00</span>';$('detValue').textContent='1.00';$('vectorValue').textContent='—';return;}
    const base=META[it.type],sx=it.w/base.w,sy=it.d/base.d,c=Math.cos(radians(it.rotation)),s=Math.sin(radians(it.rotation));const m=[c*sx,-s*sy,s*sx,c*sy];
    $('mathHelp').textContent=`تحويل «${base.name}» = دوران ${round(it.rotation,0)}° + تغيير الأبعاد.`;
    $('matrixValues').innerHTML=m.map(n=>`<span>${Math.abs(n)<.005?'0.00':n.toFixed(2)}</span>`).join('');$('detValue').textContent=(sx*sy).toFixed(2);$('vectorValue').textContent=`(${it.x.toFixed(1)}, ${it.y.toFixed(1)})`;}
  function updateStats(){const total=state.room.width*state.room.height,used=state.items.filter(x=>!META[x.type].soft).reduce((a,i)=>a+i.w*i.d,0),free=Math.max(0,total-used),issues=getIssues(),count=Object.keys(issues).length;
    $('totalBudget').textContent=new Intl.NumberFormat('ar-EG').format(state.items.reduce((a,i)=>a+(Number(i.price)||0),0))+' ج.م';
    $('roomArea').textContent=total.toFixed(1)+' م²';$('usedArea').textContent=used.toFixed(1)+' م²';$('freeArea').textContent=free.toFixed(1)+' م²';
    const status=$('statusPill');status.className='status-pill '+(count?'warning':'ok');status.innerHTML=count?`<svg><use href="#i-alert"/></svg><span>${count} قطع تحتاج تعديلًا</span>`:`<svg><use href="#i-check"/></svg><span>التصميم بدون تداخلات</span>`;
    $('roomWidth').value=state.room.width;$('roomHeight').value=state.room.height;$('doorPosition').value=state.room.doorX;$('doorWidth').value=state.room.doorW;$('doorPosition').max=Math.max(0,state.room.width-state.room.doorW);$('projectName').value=state.name;
    $('roomPresetRow').querySelectorAll('.preset-btn').forEach(btn=>{const preset=ROOM_PRESETS[btn.dataset.room];btn.classList.toggle('active',preset[0]===state.room.width&&preset[1]===state.room.height);});}
  function refresh(){updateStats();updateInspector();updateHistoryButtons();draw();}
  function commit(){saveLocal();refresh();window.dispatchEvent(new Event('rg:change'));}
  function choose(id){selectedId=id;refresh();window.dispatchEvent(new Event('rg:select'));}
  function findPlace(newItem){let best=null,score=Infinity;const rotations=[0,90];for(const angle of rotations){const it={...newItem,rotation:angle};const attempts=27;
    for(let ix=0;ix<attempts;ix++)for(let iy=0;iy<attempts;iy++){
      it.x=round(.2+ix*(state.room.width-.4)/(attempts-1),2);it.y=round(.2+iy*(state.room.height-.4)/(attempts-1),2);
      if(itemIssue(it))continue;
      const s=Math.hypot(it.x-state.room.width*.5,it.y-state.room.height*.45)+Math.abs(angle)*.004;
      if(s<score){score=s;best={x:it.x,y:it.y,rotation:angle};}
    }}return best;}
  function addItemAt(type,x,y){
    if(!META[type]||state.items.length>=100)return false;
    const it=mk(type,round(snap?Math.round(x*10)/10:x,2),round(snap?Math.round(y*10)/10:y,2));
    if(itemIssue(it)){notify('المكان المختار لا يناسب هذه القطعة؛ جرّب مساحة فارغة');return false;}
    remember();state.items.push(it);selectedId=it.id;commit();notify('تم وضع '+META[type].name);return true;
  }
  function addItem(type){if(state.items.length>=100){notify('الحد الأقصى 100 قطعة');return;}const it=mk(type,state.room.width/2,state.room.height/2);const place=findPlace(it);if(!place){notify('المساحة ممتلئة؛ أضِف القطعة بعد توسيع الغرفة');return;}remember();Object.assign(it,place);state.items.push(it);selectedId=it.id;commit();notify('تمت إضافة '+META[type].name);}
  const ROOM_PRESETS={bedroom:[4.5,4],living:[6,4.8],studio:[4.5,3.8]};
  function changeRoom(w,h){w=Number(w);h=Number(h);if(!Number.isFinite(w)||!Number.isFinite(h)||w<2||h<2||w>15||h>15){notify('أبعاد الغرفة بين 2 و15 متر');refresh();return;}
    if(w===state.room.width&&h===state.room.height)return;remember();state.room.width=w;state.room.height=h;state.room.doorX=Math.min(state.room.doorX,Math.max(0,w-state.room.doorW));commit();}
  function setRoomOption(key,value){
    if(!['style','floor','light','walls','doorX','doorW'].includes(key))return;
    const r=state.room;
    if(key==='style'&&!['natural','modern','dark'].includes(value))return;
    if(key==='floor'&&!['oak','marble','concrete'].includes(value))return;
    if(key==='light')value=clamp(Number(value)||0,0,100);
    if(key==='walls')value=Boolean(value);
    if(key==='doorW')value=clamp(Number(value)||.9,.7,Math.min(1.8,r.width));
    if(key==='doorX')value=clamp(Number(value)||0,0,Math.max(0,r.width-r.doorW));
    if(value===r[key])return;
    remember();r[key]=value;if(key==='doorW')r.doorX=Math.min(r.doorX,Math.max(0,r.width-r.doorW));commit();
  }
  function quickMove(action){
    const it=selected();if(!it)return;const old={x:it.x,y:it.y,rotation:it.rotation};
    if(action==='center'){it.x=round(state.room.width/2,2);it.y=round(state.room.height/2,2);}
    if(action==='wall'){
      const ps=poly(it),minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));
      const candidates=[{x:it.x+.11-minX,y:it.y,delta:Math.abs(.11-minX)},{x:it.x+state.room.width-.11-maxX,y:it.y,delta:Math.abs(state.room.width-.11-maxX)},{x:it.x,y:it.y+.11-minY,delta:Math.abs(.11-minY)},{x:it.x,y:it.y+state.room.height-.11-maxY,delta:Math.abs(state.room.height-.11-maxY)}].sort((a,b)=>a.delta-b.delta);
      const spot=candidates.find(p=>!itemIssue({...it,...p}));if(spot){it.x=round(spot.x,2);it.y=round(spot.y,2);}else{notify('لا يوجد مكان قرب الجدار دون تداخل');return;}
    }
    if(action==='rotate')it.rotation=(it.rotation+90)%360;
    if(itemIssue(it)){Object.assign(it,old);notify('هذا التعديل يتسبب في تداخل أو خروج عن الغرفة');return;}
    if(JSON.stringify(old)===JSON.stringify({x:it.x,y:it.y,rotation:it.rotation})){notify('القطعة في الموضع المطلوب بالفعل');return;}
    // Undo must capture the state prior to the quick transformation.
    const after={x:it.x,y:it.y,rotation:it.rotation};Object.assign(it,old);remember();Object.assign(it,after);commit();notify('تم تطبيق التعديل');
  }
  function duplicate(){const it=selected();if(!it)return;if(state.items.length>=100){notify('الحد الأقصى 100 قطعة');return;}const copy={...it,id:uid()};const p=findPlace(copy);if(!p){notify('لا توجد مساحة لنسخة إضافية');return;}remember();Object.assign(copy,p);state.items.push(copy);selectedId=copy.id;commit();}
  function deleteSelected(){if(!selected())return;remember();state.items=state.items.filter(x=>x.id!==selectedId);selectedId=null;commit();notify('تم حذف القطعة');}
  function updateItem(key,value){const it=selected();if(!it||!Number.isFinite(value))return;
    if(key==='w'||key==='d')value=clamp(value,.2,6);
    if(key==='price')value=clamp(value,0,10000000);
    if(key==='x'||key==='y')value=clamp(value,-4,20);
    if(key==='rotation')value=((value%360)+360)%360;
    if(it[key]===value)return;remember();it[key]=value;commit();}
  function optimize(){const old=JSON.stringify(state);let ordered=state.items.filter(it=>!META[it.type].soft).sort((a,b)=>(b.w*b.d)-(a.w*a.d));let placed=[];let result=[];const r=state.room;
    for(const it of ordered){let best=null,bestScore=Infinity;
      for(const angle of [0,90]){const test={...it,rotation:angle};const step=.22;
        for(let x=.15;x<=r.width-.15;x+=step)for(let y=.15;y<=r.height-.15;y+=step){test.x=round(x,3);test.y=round(y,3);if(itemIssue(test,placed))continue;
          const points=poly(test),xs=points.map(p=>p.x),ys=points.map(p=>p.y),wallDist=Math.min(Math.min(...xs),r.width-Math.max(...xs),Math.min(...ys),r.height-Math.max(...ys));
          let score=0;
          if(['sofa','bed','shelf','wardrobe','desk'].includes(it.type))score+=wallDist*4;
          else if(it.type==='table')score+=Math.hypot(test.x-r.width/2,test.y-r.height/2)*.7;
          else if(it.type==='plant')score+=wallDist*2;
          else score+=wallDist*.4;
          score+=Math.hypot(test.x-it.x,test.y-it.y)*.18;
          if(it.type==='chair'){const desk=placed.find(p=>p.type==='desk');if(desk)score+=Math.abs(Math.hypot(test.x-desk.x,test.y-desk.y)-.95)*2;}
          if(score<bestScore){bestScore=score;best={...test};}
        }}
      if(!best){notify('لا يمكن ترتيب كل القطع دون تداخل؛ جرّب توسيع الغرفة');return;}
      placed.push(best);result.push(best);
    }
    const byId=Object.fromEntries(result.map(x=>[x.id,x]));
    remember();state.items=state.items.map(it=>byId[it.id]?{...it,x:byId[it.id].x,y:byId[it.id].y,rotation:byId[it.id].rotation}:it);
    if(JSON.stringify(state)===old){past.pop();notify('الترتيب الحالي مناسب بالفعل');}else notify('تم اقتراح توزيع جديد دون تداخلات');commit();}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function safeName(){return (state.name||'RoomGenius').replace(/[\\/<>:"|?*]/g,'-').trim().slice(0,48)||'RoomGenius';}
  function exportPNG(){if(view==='3d'&&window.RoomGenius3D?.isReady()){window.RoomGenius3D.capture();return;} // export current Canvas2D / fallback
    try{canvas.toBlob(blob=>{if(!blob){notify('تعذر تصدير الصورة');return;}download(blob,safeName()+'.png');notify('تم تصدير الصورة بنجاح');},'image/png');}catch{notify('تعذر تصدير الصورة');}}
  function exportJSON(){download(new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'}),safeName()+'.json');notify('تم حفظ ملف المشروع');}
  function confirmAction(title,description,onAccept){const dlg=$('confirmDialog');$('dialogTitle').textContent=title;$('dialogText').textContent=description;dlg.showModal();const ok=$('dialogAccept'),cancel=$('dialogCancel');const yes=()=>{cleanup();dlg.close();onAccept();},no=()=>{cleanup();dlg.close();};function cleanup(){ok.removeEventListener('click',yes);cancel.removeEventListener('click',no);}ok.addEventListener('click',yes);cancel.addEventListener('click',no);}
  function startNew(){confirmAction('تصميم جديد؟','سيتم استبدال التصميم الموجود. يمكنك حفظه بصيغة JSON أولًا.',()=>{remember();state={...demo(),name:'تصميم جديد',items:[]};selectedId=null;zoom=1;commit();notify('تم إنشاء تصميم فارغ');});}
  function resetDemo(){confirmAction('استعادة التصميم التجريبي؟','سيتم استبدال توزيع الأثاث الحالي بالمثال الافتراضي.',()=>{remember();state=demo();selectedId=null;zoom=1;commit();notify('تم استعادة المثال');});}
  function initCanvasEvents(){canvas.addEventListener('pointerdown',e=>{
      if(view!=='2d')return;const w=clientToWorld(e.clientX,e.clientY);
      if(measureMode){if(w.x<0||w.x>state.room.width||w.y<0||w.y>state.room.height)return;
        if(!measureStart||measureEnd){measureStart={...w};measureEnd=null;$('measureReadout').textContent='حدد نقطة القياس الثانية داخل الغرفة.';}
        else{measureEnd={...w};$('measureReadout').textContent='المسافة المقاسة: '+Math.hypot(w.x-measureStart.x,w.y-measureStart.y).toFixed(2)+' متر. اضغط نقطة جديدة لبدء قياس آخر.';}
        draw();return;}
      const it=hitTest(w.x,w.y);
      if(!it){choose(null);return;}selectedId=it.id;drag={id:it.id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,itemX:it.x,itemY:it.y,started:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');refresh();});
    canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId||view!=='2d')return;const it=selected();if(!it||it.id!==drag.id)return;
      const dx=(e.clientX-drag.startX)/canvasGeom.s,dy=(e.clientY-drag.startY)/canvasGeom.s;
      if(!drag.started&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>2){remember();drag.started=true;}
      if(drag.started){it.x=round(snap?Math.round((drag.itemX+dx)*10)/10:drag.itemX+dx,2);it.y=round(snap?Math.round((drag.itemY+dy)*10)/10:drag.itemY+dy,2);updateStats();updateMath();draw();}});
    const finish=e=>{if(!drag)return;if(e.pointerId!==undefined&&e.pointerId!==drag.pointer)return;const moved=drag.started;drag=null;canvas.classList.remove('dragging');if(moved)commit();};
    canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
    canvas.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoom=clamp(round(zoom+(e.deltaY<0?.1:-.1),2),.6,1.6);$('zoomLabel').textContent=Math.round(zoom*100)+'%';draw();},{passive:false});
  }
  function wireEvents(){
    $('categoryTabs').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;updateCatalog();});
    $('catalogSearch').addEventListener('input',e=>{searchText=e.target.value.trim();updateCatalog();});
    $('furnitureList').addEventListener('dragstart',e=>{const card=e.target.closest('[data-type]');if(!card)return;e.dataTransfer.setData('text/plain',card.dataset.type);e.dataTransfer.effectAllowed='copy';});
    canvas.addEventListener('dragover',e=>{if(view==='2d'){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
    canvas.addEventListener('drop',e=>{if(view!=='2d')return;e.preventDefault();const type=e.dataTransfer.getData('text/plain');const pos=clientToWorld(e.clientX,e.clientY);addItemAt(type,pos.x,pos.y);});
    $('roomPresetRow').addEventListener('click',e=>{const b=e.target.closest('[data-room]');if(!b)return;changeRoom(...ROOM_PRESETS[b.dataset.room]);});
    ['roomWidth','roomHeight'].forEach(id=>$(id).addEventListener('change',()=>changeRoom($('roomWidth').value,$('roomHeight').value)));
    $('doorPosition').addEventListener('change',e=>setRoomOption('doorX',Number(e.target.value)));
    $('doorWidth').addEventListener('change',e=>setRoomOption('doorW',Number(e.target.value)));
    for(const [id,key] of [['itemX','x'],['itemY','y'],['itemW','w'],['itemD','d']])$(id).addEventListener('change',()=>updateItem(key,Number($(id).value)));
    $('itemPrice').addEventListener('change',()=>updateItem('price',Number($('itemPrice').value)));
    $('rotateRange').addEventListener('input',()=>{
      const it=selected();if(!it)return;
      if(!rotationAnchor||rotationAnchor.id!==it.id)rotationAnchor={id:it.id,before:JSON.stringify(state)};
      it.rotation=Number($('rotateRange').value);
      $('rotateValue').textContent=it.rotation+'°';draw();updateMath();
    });
    $('rotateRange').addEventListener('change',()=>{
      const it=selected();if(!it)return;
      const value=Number($('rotateRange').value);
      if(rotationAnchor&&rotationAnchor.id===it.id){
        if(JSON.stringify(state)!==rotationAnchor.before){past.push(rotationAnchor.before);if(past.length>55)past.shift();future=[];commit();}
        rotationAnchor=null;
      }else updateItem('rotation',value);
    });
    $('duplicateBtn').addEventListener('click',duplicate);$('deleteBtn').addEventListener('click',deleteSelected);
    $('centerItemBtn').addEventListener('click',()=>quickMove('center'));
    $('wallAlignBtn').addEventListener('click',()=>quickMove('wall'));
    $('quarterTurnBtn').addEventListener('click',()=>quickMove('rotate'));
    $('projectName').addEventListener('change',()=>{const value=$('projectName').value.trim().slice(0,48)||'تصميم جديد';if(value!==state.name){remember();state.name=value;commit();}});
    $('view2D').addEventListener('click',()=>switchView('2d'));$('view3D').addEventListener('click',()=>switchView('3d'));
    $('gridBtn').addEventListener('click',()=>{grid=!grid;$('gridBtn').classList.toggle('active',grid);draw();});
    $('measureBtn').addEventListener('click',()=>{measureMode=!measureMode;measureStart=null;measureEnd=null;
      $('measureBtn').classList.toggle('active',measureMode);$('measureBtn').setAttribute('aria-pressed',String(measureMode));
      $('measureReadout').hidden=!measureMode;$('measureReadout').textContent='اختر نقطتين داخل المخطط لقياس المسافة بينهما.';
      canvas.style.cursor=measureMode?'crosshair':'';if(measureMode&&view!=='2d')switchView('2d');draw();});
    $('snapBtn').addEventListener('click',()=>{snap=!snap;$('snapBtn').classList.toggle('active',snap);notify(snap?'تم تفعيل محاذاة الشبكة':'تم إيقاف محاذاة الشبكة');});
    $('zoomIn').addEventListener('click',()=>setZoom(zoom+.1));$('zoomOut').addEventListener('click',()=>setZoom(zoom-.1));
    $('undoBtn').addEventListener('click',undo);$('redoBtn').addEventListener('click',redo);
    $('optimizeBtn').addEventListener('click',optimize);$('newBtn').addEventListener('click',startNew);$('resetBtn').addEventListener('click',resetDemo);
    $('saveBtn').addEventListener('click',exportJSON);$('exportBtn').addEventListener('click',exportPNG);
    $('importBtn').addEventListener('click',()=>$('importInput').click());
    $('importInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;
      try{if(f.size>2_000_000)throw Error('الملف أكبر من الحد المسموح');const imported=validateLayout(JSON.parse(await f.text()));remember();state=imported;selectedId=null;commit();notify('تم استيراد التصميم بنجاح');}catch(err){notify('تعذر الاستيراد: '+err.message);}e.target.value='';});
    window.addEventListener('keydown',e=>{const active=document.activeElement;if(['INPUT','TEXTAREA','SELECT'].includes(active?.tagName))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return;}
      if(e.key==='Delete'||e.key==='Backspace'){deleteSelected();return;}
      if(e.key==='Escape'){choose(null);return;}
      if(e.key.toLowerCase()==='r'&&selected()){updateItem('rotation',round(selected().rotation+15,0));return;}
      const direction={ArrowUp:[0,-.1],ArrowDown:[0,.1],ArrowLeft:[-.1,0],ArrowRight:[.1,0]}[e.key];
      if(direction&&selected()){e.preventDefault();remember();const it=selected();it.x=round(it.x+direction[0],2);it.y=round(it.y+direction[1],2);commit();}
    });
    initCanvasEvents();window.addEventListener('resize',resizeCanvas);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeCanvas).observe($('canvasWrap'));
  }
  function switchView(to){view=to;$('view2D').classList.toggle('selected',to==='2d');$('view3D').classList.toggle('selected',to==='3d');$('canvasModeText').textContent=to==='2d'?'مساحة عمل تفاعلية':'عرض ثلاثي الأبعاد بكاميرا حقيقية';
    if(to==='2d')$('canvasHint').innerHTML='<svg><use href="#i-move"/></svg> اسحب القطع لتحريكها · انقر للتحديد · Delete للحذف';draw();window.dispatchEvent(new CustomEvent('rg:view',{detail:to}));}
  function setZoom(n){zoom=clamp(round(n,2),.6,1.6);$('zoomLabel').textContent=Math.round(zoom*100)+'%';draw();}
  function initialize(){updateCatalog();wireEvents();refresh();resizeCanvas();}
  initialize();
  // Lightweight hooks used by automated checks. The API is read-only by default.
  window.RoomGenius={getState:()=>structuredClone(state),getIssues:()=>({...getIssues()}),getView:()=>view,getSelectedId:()=>selectedId,selectItem:choose,setRoomOption,redraw:draw,notify,addItem,addItemAt,undo,redo,optimize};
  window.dispatchEvent(new Event('rg:ready'));
})();
