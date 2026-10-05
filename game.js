(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const screens = ['loading','splash','story','select','gameScreen'];
  const chars = {
    mushroom:{id:'mushroom',name:'Mimi Mushroom',short:'Mimi'},
    blossom:{id:'blossom',name:'Posy Blossom',short:'Posy'}
  };
  const app = {screen:'loading',selected:null,story:[],storyIndex:0,onStoryEnd:null};

  const ART=window.FAIRY_ART||{};
  const assets=Object.values(ART);
  document.querySelectorAll('[data-art]').forEach(el=>{const key=el.dataset.art;if(ART[key])el.src=ART[key];});

  const intro = [
    {eyebrow:'Welcome',title:'Welcome to Fairy High',text:'Deep in the enchanted forest stands Fairy High, a magical school where young fairies learn, make friends and uncover delightful mysteries.',art:ART.academy},
    {eyebrow:'The Entry Challenge',title:'Every fairy begins with a challenge',text:'Before a new student can enter Fairy High, they must show courage, kindness and clever thinking in the Entry Garden.',art:ART.garden}
  ];

  function show(name){ screens.forEach(id=>$(id).classList.toggle('active',id===name)); app.screen=name; }
  function preload(){return Promise.all(assets.map(src=>new Promise(resolve=>{const im=new Image();im.onload=im.onerror=resolve;im.src=src;})));}
  function startStory(slides,onEnd){app.story=slides;app.storyIndex=0;app.onStoryEnd=onEnd;renderStory();show('story');}
  function renderStory(){const s=app.story[app.storyIndex];$('storyEyebrow').textContent=s.eyebrow;$('storyTitle').textContent=s.title;$('storyText').textContent=s.text;$('storyArt').src=s.art;$('storyBack').disabled=app.storyIndex===0;$('storyNext').textContent=app.storyIndex===app.story.length-1?'Continue':'Next';}
  function selection(){show('select');}
  function preGame(){const c=chars[app.selected];return [
    {eyebrow:'Headmistress Hazel',title:`Good morning, ${c.short}`,text:'“Welcome to Fairy High. Today is your chance to begin something wonderful.”',art:ART.headmistress},
    {eyebrow:'Your first task',title:'The Entry Garden awaits',text:'Gather three glowing petals, repair the broken bridge and reach the Fairy High gates. You may even meet a new friend along the way.',art:ART.garden}
  ];}

  $('startBtn').addEventListener('click',()=>startStory(intro,selection));
  $('storyNext').addEventListener('click',()=>{if(app.storyIndex<app.story.length-1){app.storyIndex++;renderStory();}else app.onStoryEnd();});
  $('storyBack').addEventListener('click',()=>{if(app.storyIndex>0){app.storyIndex--;renderStory();}});
  $('selectBack').addEventListener('click',()=>startStory(intro,selection));
  document.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{
    app.selected=btn.dataset.character;
    document.querySelectorAll('.choice').forEach(x=>x.classList.toggle('selected',x===btn));
    $('selectedText').textContent=`${chars[app.selected].name} selected.`;
    $('selectNext').disabled=false;
  }));
  $('selectNext').addEventListener('click',()=>startStory(preGame(),startGame));
  $('restartStory').addEventListener('click',()=>startStory(intro,selection));
  $('playAgain').addEventListener('click',()=>startStory(intro,selection));

  const canvas=$('game'),ctx=canvas.getContext('2d');
  const SCALE=2,W=320,H=180; canvas.width=W*SCALE;canvas.height=H*SCALE;ctx.imageSmoothingEnabled=false;
  const sv=v=>Math.round(v*SCALE), keys=new Set(), touch=new Set();
  const C={grass:'#82cd68',grass2:'#65b755',path:'#e6cf99',path2:'#c7a971',river:'#5cb5e7',river2:'#358bc7',foam:'#a5e4ff',bridge:'#9a6738',bridge2:'#694223',outline:'#3e2c28',white:'#fff6e6',cream:'#ffe4b0',yellow:'#f6ca3b',red:'#d94b3f',red2:'#9d2f34',skin:'#ffd0a6',blush:'#e78d8b',brown:'#9a6738',wing:'#ffe9a6',wing2:'#f3bf4c',pink:'#ff7faf',pink2:'#bb4b7c',green:'#3f9d4f',green2:'#266b35',purple:'#9b72d2',blue:'#547bce',black:'#1f1b1a',muted:'#7a5b4d'};
  let state=null,last=performance.now();

  function other(id){return id==='mushroom'?'blossom':'mushroom';}
  function freshState(){return {player:{x:39,y:132,dir:'down',speed:54,bob:0},friend:{x:116,y:103,joined:false},petals:[{x:48,y:72,taken:false},{x:83,y:137,taken:false},{x:118,y:45,taken:false}],petalsCollected:0,bridgeRepaired:false,won:false,message:'Welcome to the Entry Garden. Collect the glowing petals.',messageTimer:3.8,time:0,selected:app.selected||'mushroom',friendId:other(app.selected||'mushroom')};}
  function startGame(){state=freshState();$('winOverlay').classList.add('hidden');$('gameLead').textContent=`Help ${chars[state.selected].short} reach Fairy High.`;updateHud();show('gameScreen');}
  function setMsg(t,s=3){state.message=t;state.messageTimer=s;}
  function updateHud(){ $('statusText').textContent=`Petals: ${state.petalsCollected} / 3`; $('questText').textContent=state.won?'Quest complete: welcome to Fairy High.':(!state.bridgeRepaired?(state.petalsCollected<3?'Quest: collect 3 glowing petals.':'Quest: repair the broken bridge.'):'Quest: reach the Fairy High gates.');}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function near(a,b,r){return Math.hypot(a.x-b.x,a.y-b.y)<=r;}
  function canStand(x,y){if(x<8||x>W-8||y<17||y>H-10)return false;const river=x>144&&x<166, bridge=y>83&&y<112;if(river&&!(state.bridgeRepaired&&bridge))return false;return true;}
  function update(dt){if(!state||state.won)return;state.time+=dt;if(state.messageTimer>0)state.messageTimer-=dt;let dx=0,dy=0;const input=new Set([...keys,...touch]);if(input.has('arrowleft')||input.has('a'))dx--;if(input.has('arrowright')||input.has('d'))dx++;if(input.has('arrowup')||input.has('w'))dy--;if(input.has('arrowdown')||input.has('s'))dy++;if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;if(Math.abs(dx)>Math.abs(dy))state.player.dir=dx<0?'left':'right';else state.player.dir=dy<0?'up':'down';state.player.bob+=dt*12;}const nx=state.player.x+dx*state.player.speed*dt,ny=state.player.y+dy*state.player.speed*dt;if(canStand(nx,state.player.y))state.player.x=nx;if(canStand(state.player.x,ny))state.player.y=ny;state.player.x=clamp(state.player.x,8,W-8);state.player.y=clamp(state.player.y,17,H-10);for(const p of state.petals){if(!p.taken&&near(state.player,p,9)){p.taken=true;state.petalsCollected++;setMsg(`You found a glowing petal. ${state.petalsCollected} of 3 collected.`,2.2);updateHud();}}if(state.bridgeRepaired&&state.friend.joined){const tx=state.player.x-(state.player.dir==='left'?-13:state.player.dir==='right'?13:0),ty=state.player.y+15;state.friend.x+=(tx-state.friend.x)*Math.min(1,dt*3);state.friend.y+=(ty-state.friend.y)*Math.min(1,dt*3);}}
  function interact(){if(!state||state.won)return;const p=state.player,bridge={x:155,y:97},gate={x:284,y:88};if(near(p,state.friend,18)&&!state.friend.joined){setMsg(`${chars[state.friendId].short}: “The bridge is broken. Three glowing petals can mend it.”`,3.8);return;}if(near(p,bridge,18)&&!state.bridgeRepaired){if(state.petalsCollected>=3){state.bridgeRepaired=true;state.friend.joined=true;setMsg(`The petals sparkle. The bridge repairs itself. ${chars[state.friendId].short} joins you.`,4);updateHud();}else setMsg('The bridge needs three glowing petals.',2.8);return;}if(near(p,gate,18)){if(state.bridgeRepaired){state.won=true;updateHud();const a=chars[state.selected].short,b=chars[state.friendId].short;setMsg(`${a} and ${b} pass the Entry Challenge together.`,99);$('winText').textContent=`${a} and ${b} step through the gates together and soon settle into neighbouring mushroom dorms.`;$('winOverlay').classList.remove('hidden');}else setMsg('Repair the bridge first.',2.3);return;}setMsg('Nothing to use here yet.',1.4);}

  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(sv(x),sv(y),Math.max(1,sv(w)),Math.max(1,sv(h)));}
  function text(t,x,y,c=C.outline,align='left',size=7){ctx.save();ctx.font=`${Math.max(10,sv(size))}px monospace`;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillStyle=c;ctx.fillText(t,sv(x),sv(y));ctx.restore();}
  function path(x1,y1,x2,y2,r){ctx.save();ctx.lineCap='round';ctx.strokeStyle=C.path2;ctx.lineWidth=sv(r+4);ctx.beginPath();ctx.moveTo(sv(x1),sv(y1));ctx.lineTo(sv(x2),sv(y2));ctx.stroke();ctx.strokeStyle=C.path;ctx.lineWidth=sv(r);ctx.beginPath();ctx.moveTo(sv(x1),sv(y1));ctx.lineTo(sv(x2),sv(y2));ctx.stroke();ctx.restore();}
  function ground(){rect(0,0,W,H,C.grass);for(let i=0;i<170;i++){const x=(i*47+13)%W,y=(i*31+19)%H;rect(x,y,1,2,i%3?C.grass2:'#a4df7d');}path(18,132,130,97,18);path(169,97,285,89,18);path(278,89,302,72,16);rect(145,0,21,H,C.river2);rect(148,0,16,H,C.river);for(let y=4;y<H;y+=16){rect(151,y,7,2,C.foam);rect(158,y+7,4,1,C.foam);}bridge();rect(248,61,58,48,'rgba(255,242,173,.35)');}
  function bridge(){if(state.bridgeRepaired){rect(139,87,32,22,C.bridge2);for(let x=140;x<=166;x+=6)rect(x,88,4,20,C.bridge);rect(138,91,34,2,C.cream);rect(138,103,34,2,C.cream);}else{rect(137,90,10,18,C.bridge2);rect(137,90,8,4,C.bridge);rect(137,101,8,4,C.bridge);rect(165,90,10,18,C.bridge2);rect(167,90,8,4,C.bridge);rect(167,101,8,4,C.bridge);}}
  function tree(x,y,k=0){rect(x-3,y+7,6,8,'#7b4a27');const c1=k?'#4d9d44':'#3e8c3c',c2=k?'#6bb65a':'#55a84b';rect(x-10,y-4,20,11,C.outline);rect(x-9,y-5,18,10,c1);rect(x-14,y+2,28,12,C.outline);rect(x-13,y+1,26,11,c2);rect(x-8,y+10,16,8,C.outline);rect(x-7,y+9,14,7,c1);}
  function dorm(x,y,tint='red'){const cap=tint==='purple'?C.purple:C.red;rect(x-10,y-10,20,9,C.outline);rect(x-9,y-12,18,11,cap);rect(x-15,y-4,30,10,C.outline);rect(x-14,y-6,28,10,cap);rect(x-10,y+4,20,18,C.outline);rect(x-9,y+3,18,18,'#f6d9a9');rect(x-3,y+12,6,9,'#75503a');rect(x-12,y-2,4,3,C.white);rect(x-2,y-8,4,3,C.white);rect(x+6,y-3,5,3,C.white);}
  function gate(){const x=284,y=76;rect(x-22,y-7,44,5,C.outline);rect(x-21,y-8,42,5,C.red2);rect(x-18,y-17,6,38,C.outline);rect(x-17,y-16,4,36,'#805331');rect(x+12,y-17,6,38,C.outline);rect(x+13,y-16,4,36,'#805331');rect(x-15,y-16,30,10,C.outline);rect(x-14,y-17,28,10,'#ffe0a7');text('FAIRY',x,y-15,C.red2,'center',5);text('HIGH',x,y-9,C.red2,'center',5);rect(x-7,y+13,14,8,'#cb9a60');}
  function petal(p){if(p.taken)return;const y=p.y+Math.sin(state.time*6+p.x)*1.2;rect(p.x-1,y-7,3,3,'#fff6bc');rect(p.x-3,y-5,7,7,C.pink2);rect(p.x-2,y-6,5,8,C.pink);rect(p.x,y-2,2,2,C.white);}
  function wing(l,t,kind){const main=kind==='blossom'?'#ffd0dd':C.wing,edge=kind==='blossom'?'#f28fb5':C.wing2;rect(l-3,t+4,6,10,edge);rect(l-2,t+5,5,8,main);rect(l+13,t+4,6,10,edge);rect(l+13,t+5,5,8,main);}
  function fairy(x,y,kind,dir,frame){const bob=Math.sin(frame)>.25?1:0,l=Math.round(x-8),t=Math.round(y-15+bob);rect(x-6,y+4,12,3,'rgba(0,0,0,.16)');wing(l,t,kind);if(kind==='mushroom'){rect(l+3,t+5,10,8,C.outline);rect(l+4,t+6,8,7,'#f4c75c');rect(l+1,t+1,14,7,C.outline);rect(l+2,t,12,7,C.red);rect(l+4,t+1,3,2,C.white);rect(l+10,t+2,3,2,C.white);rect(l+5,t+8,6,5,C.skin);if(dir!=='up'){rect(l+5,t+9,1,1,C.black);rect(l+10,t+9,1,1,C.black);rect(l+7,t+11,3,1,C.blush);}rect(l+4,t+13,8,7,C.outline);rect(l+5,t+12,6,7,C.red2);rect(l+4,t+15,8,4,C.red);rect(l+6,t+13,4,2,C.white);}else{rect(l+3,t+2,10,9,C.outline);rect(l+4,t+2,8,8,C.pink);rect(l+9,t,4,4,C.yellow);rect(l+5,t+7,6,5,C.skin);if(dir!=='up'){rect(l+5,t+8,1,1,C.black);rect(l+10,t+8,1,1,C.black);}rect(l+4,t+12,8,7,C.outline);rect(l+5,t+12,6,6,C.pink2);rect(l+4,t+15,8,4,C.pink);}rect(l+4,t+19,2,3,C.skin);rect(l+10,t+19,2,3,C.skin);rect(l+3,t+22,4,2,C.outline);rect(l+9,t+22,4,2,C.outline);}
  function world(){tree(28,38);tree(96,24,1);tree(40,160,1);tree(236,31);tree(294,152,1);dorm(251,139,'red');dorm(281,136,'purple');gate();for(const p of state.petals)petal(p);text('Dorms',266,159,C.outline,'center',5);}
  function dialogue(){if(state.messageTimer<=0&&!state.won)return;const lines=wrap(state.message,40),lh=10,bh=16+lines.length*lh;rect(8,H-bh-8,W-16,bh,C.outline);rect(10,H-bh-10,W-20,bh,'#fff8ec');lines.forEach((ln,i)=>text(ln,16,H-bh-4+i*lh,C.outline,'left',7));}
  function wrap(t,max){const out=[];let line='';for(const w of t.split(' ')){const n=line?`${line} ${w}`:w;if(n.length>max){if(line)out.push(line);line=w;}else line=n;}if(line)out.push(line);return out;}
  function draw(){if(!state)return;ctx.clearRect(0,0,canvas.width,canvas.height);ground();world();const ents=[{y:state.friend.y,fn:()=>fairy(state.friend.x,state.friend.y,state.friendId,state.friend.joined?state.player.dir:'down',state.time*8)},{y:state.player.y,fn:()=>fairy(state.player.x,state.player.y,state.selected,state.player.dir,state.player.bob)}];ents.sort((a,b)=>a.y-b.y).forEach(e=>e.fn());dialogue();}
  function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(app.screen==='gameScreen'){update(dt);draw();}requestAnimationFrame(loop);}

  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','e'].includes(k))e.preventDefault();if(k==='e'&&app.screen==='gameScreen')interact();else keys.add(k);},{passive:false});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.querySelectorAll('.move').forEach(btn=>{const k=btn.dataset.key;const on=e=>{e.preventDefault();touch.add(k);btn.classList.add('is-held')};const off=e=>{e.preventDefault();touch.delete(k);btn.classList.remove('is-held')};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off)});
  $('interactBtn').addEventListener('pointerdown',e=>{e.preventDefault();interact()});

  preload().finally(()=>{show('splash');requestAnimationFrame(loop);});
})();