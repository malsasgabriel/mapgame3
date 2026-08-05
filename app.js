/* OSLOVILLE V2 - AAA Cozy Map Social */
const OSLO_CENTER = {lat:59.9139, lng:10.7522};
const MAP_SIZE = {w:2400, h:1800};

let currentUser = null;
let players = [];
let collectibles = [];
let quests = [];
let coinCount = 1240;
let xp = 620;
let level = 5;
let walkDistance = 0;
let mapOffset = {x: -700, y: -500};
let mapScale = 0.92;
let isDragging = false;
let dragStart = {x:0,y:0, offX:0, offY:0};
let hasDragged = false;
let useRealMap = false;
let nightMode = false;
let snowEnabled = false;
let leafletMap = null;
let leafletMarkers = {};
let audioEnabled = true;
let inventory = {};
let discovered = new Set(['palace','karljohan']);
let friends = new Set();
let avatarCustom = {hat:'', acc:'', color:'#2A9D8F'};

const LANDMARKS = [
  {id:'opera', name:'Opera House', emoji:'🎭', x:1380, y:1220, lat:59.9075, lng:10.7528, desc:'Walk on the roof!'},
  {id:'palace', name:'Royal Palace', emoji:'🏰', x:620, y:520, lat:59.9170, lng:10.7276, desc:'Guard change noon'},
  {id:'vigeland', name:'Vigeland Park', emoji:'🌳', x:380, y:680, lat:59.927, lng:10.700, desc:'212 sculptures'},
  {id:'akershus', name:'Akershus Fortress', emoji:'⚔️', x:1020, y:1020, lat:59.907, lng:10.737, desc:'Castle & history'},
  {id:'akerbrygge', name:'Aker Brygge', emoji:'⛵', x:800, y:1100, lat:59.908, lng:10.722, desc:'Fjord promenade'},
  {id:'karljohan', name:'Karl Johan Gate', emoji:'🛍️', x:900, y:780, lat:59.913, lng:10.739, desc:'Main street buzz'},
  {id:'holmenkollen', name:'Holmenkollen', emoji:'⛷️', x:420, y:220, lat:59.963, lng:10.668, desc:'Epic ski jump!'},
  {id:'gruner', name:'Grünerløkka', emoji:'☕', x:1280, y:580, lat:59.923, lng:10.757, desc:'Hip coffee district'},
];

const MOCK_NAMES = [
  {name:"Ingrid Ø.", status:"kaffe at Tim Wendelboe? ☕", color:"#FF8FA3"},
  {name:"Magnus L.", status:"coding near Aker Brygge 💻", color:"#7DD8C6"},
  {name:"Sofia K.", status:"Vigeland walk 🌿 so peaceful", color:"#A78BFA"},
  {name:"Jonas P.", status:"Ski waxing for Holmenkollen ⛷️", color:"#FBBF24"},
  {name:"Amara D.", status:"new in Oslo! hei! 👋", color:"#60A5FA"},
  {name:"Elias R.", status:"sunset at Opera 🌅", color:"#34D399"},
  {name:"Linnea S.", status:"flea market Grüner 🧶", color:"#F472B6"},
  {name:"Omar H.", status:"studying at Deichman 📚", color:"#FCD34D"},
  {name:"Freya W.", status:"hot choc + boller!", color:"#F87171"},
  {name:"Lars M.", status:"fishing in fjord 🎣", color:"#6EE7B7"},
  {name:"Zara N.", status:"photo walk 📸", color:"#C4B5FD"},
  {name:"Henrik T.", status:"sauna then swim 🧖‍♂️❄️", color:"#FDE68A"},
];

const SHOP_ITEMS = [
  {id:'hat_beanie', name:'Wool Beanie', emoji:'🧶', price:80, type:'hat', cat:'Keep warm!'},
  {id:'hat_cap', name:'Oslo Cap', emoji:'🧢', price:120, type:'hat'},
  {id:'hat_crown', name:'Viking Crown', emoji:'👑', price:400, type:'hat', cat:'Rare'},
  {id:'hat_helmet', name:'Ski Helmet', emoji:'⛑️', price:150, type:'hat'},
  {id:'hat_bow', name:'Cute Bow', emoji:'🎀', price:90, type:'hat'},
  {id:'acc_coffee', name:'Takeaway Coffee', emoji:'☕', price:60, type:'acc'},
  {id:'acc_scarf', name:'Knitted Scarf', emoji:'🧣', price:100, type:'acc'},
  {id:'acc_headphones', name:'Headphones', emoji:'🎧', price:180, type:'acc'},
  {id:'acc_book', name:'Book Stack', emoji:'📚', price:70, type:'acc'},
  {id:'acc_sunglass', name:'Sunnies', emoji:'🕶️', price:110, type:'acc'},
  {id:'acc_mitten', name:'Mittens', emoji:'🧤', price:85, type:'acc'},
];

const COLORS = ['#2A9D8F','#E76F51','#E9C46A','#264653','#A78BFA','#F472B6','#60A5FA','#34D399'];
const HATS = ['', '🧶','🧢','👑','⛑️','🎀','🎩'];
const ACCS = ['', '☕','🧣','🎧','📚','🕶️','🧤','🎒'];

const QUEST_TEMPLATES = [
  {id:'q1', icon:'👋', title:'Say hei to 3 locals', desc:'Wave at people on map', reward:120, progress:0, total:3, done:false},
  {id:'q2', icon:'☕', title:'Fika at Grünerløkka', desc:'Visit Grüner district', reward:80, progress:0, total:1, done:false},
  {id:'q3', icon:'🪙', title:'Collect 5 boller', desc:'Golden buns are treasure', reward:150, progress:0, total:5, done:false},
  {id:'q4', icon:'🎭', title:'Opera House selfie', desc:'Go to Opera House', reward:100, progress:0, total:1, done:false},
  {id:'q5', icon:'❄️', title:'Winter walk 1km', desc:'Walk in snow', reward:90, progress:0, total:1, done:false},
];

const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];
const loginScreen = $('#loginScreen');
const gameScreen = $('#gameScreen');
const loadingScreen = $('#loadingScreen');
const mapLayer = $('#mapLayer');
const mapViewport = $('#mapViewport');
const playersLayer = $('#playersLayer');
const collectiblesLayer = $('#collectiblesLayer');
const landmarksLayer = $('#landmarksLayer');
const FALLBACK_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23e2e9eb'/><text x='50' y='56' text-anchor='middle' font-size='38'>🙂</text></svg>";
function safeAvatar(url){ return url || FALLBACK_AVATAR; }

/* ---------- LOADING ---------- */
const tips = [
  "Waking up Vigeland sculptures...",
  "Brewing coffee at Grünerløkka...",
  "Waxing skis for Holmenkollen...",
  "Polishing Opera House roof...",
  "Feeding seagulls at Aker Brygge...",
  "Finding northern lights...",
];
let loadProgress = 0;
function initLoading(){
  const fill=$('#loaderFill'), tipEl=$('#loaderTip');
  let i=0;
  const interval=setInterval(()=>{
    loadProgress+= Math.random()*18+6;
    if(loadProgress>100) loadProgress=100;
    fill.style.width=loadProgress+'%';
    if(Math.random()<0.4){ tipEl.textContent=tips[Math.floor(Math.random()*tips.length)]; }
    if(loadProgress>=100){
      clearInterval(interval);
      setTimeout(()=>{
        loadingScreen.classList.remove('active'); loadingScreen.style.display='none';
        loginScreen.classList.add('active');
        // night preview toggle on login
        setInterval(()=>{ loginScreen.classList.toggle('night'); }, 6000);
      }, 600);
    }
  }, 180);
}
initLoading();

/* ---------- GOOGLE AUTH ---------- */
window.handleGoogleCredential = function(response){
  try{
    const payload = parseJwt(response.credential);
    loginAs({name: payload.name || payload.given_name, email: payload.email, avatar: payload.picture, id: payload.sub});
  }catch(e){ fallbackDemoLogin(); }
}
function parseJwt(token){
  const b64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const json = decodeURIComponent(atob(b64).split('').map(c=> '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  return JSON.parse(json);
}
let gsiInitialized = false;
function initGoogle(){
  try{
    if(window.google && google.accounts && google.accounts.id && !gsiInitialized){
      gsiInitialized = true;
      const saved = localStorage.getItem('oslo_client_id') || "1087815734233-xyz.apps.googleusercontent.com";
      google.accounts.id.initialize({client_id: saved, callback: handleGoogleCredential, auto_select:false});
      google.accounts.id.renderButton($('#googleBtnOfficial'), {theme:'outline', size:'large', width:380, shape:'pill', text:'continue_with'});
    }
  }catch{}
}
setTimeout(initGoogle,1200);
$('#customGoogleBtn').addEventListener('click', e=>{
  e.preventDefault();
  if(window.google?.accounts?.id && localStorage.getItem('oslo_client_id')){
    try{ google.accounts.id.prompt(); return;}catch{}
  }
  showChooser();
});
$('#demoLoginBtn').addEventListener('click', ()=> fallbackDemoLogin());
function showChooser(){
  const chooser=$('#googleChooser'); chooser.classList.remove('hidden');
  const accEl=$('#chooserAccounts'); accEl.innerHTML='';
  const fakes=[
    {name:'Alex Rivera', email:'alex.r@gmail.com', pic:'https://i.pravatar.cc/100?img=13'},
    {name:'Sanne Nilsen', email:'sanne.nilsen@gmail.com', pic:'https://i.pravatar.cc/100?img=26'},
    {name:'Demo Explorer', email:'demo@osloville.game', pic:'https://i.pravatar.cc/100?img=32'},
  ];
  fakes.forEach(acc=>{
    const d=document.createElement('div'); d.className='chooser-acc';
    d.innerHTML=`<img src="${acc.pic}"><div><b>${acc.name}</b><br><small>${acc.email}</small></div>`;
    d.onclick=()=>{ chooser.classList.add('hidden'); loginAs({name:acc.name, email:acc.email, avatar:acc.pic, id:acc.email}); };
    accEl.appendChild(d);
  });
}
$('#googleChooser').addEventListener('click', e=>{ if(e.target.id==='googleChooser') e.currentTarget.classList.add('hidden'); });
function fallbackDemoLogin(){
  const name="You • Explorer " + (Math.floor(Math.random()*90)+10);
  const avatar=`https://i.pravatar.cc/150?img=${Math.floor(Math.random()*60)+1}`;
  loginAs({name, email:'you@osloville.game', avatar, id:'me_demo_'+Date.now()});
}
$('#showClientId').addEventListener('click', e=>{ e.preventDefault(); $('#clientIdBox').classList.toggle('hidden');});
$('#openSettingsFromLogin').addEventListener('click', e=>{ e.preventDefault(); $('#settingsModal').classList.remove('hidden');});
$('#saveClientId').addEventListener('click', ()=>{
  const v=$('#clientIdInput').value.trim(); if(v){ localStorage.setItem('oslo_client_id', v); alert('Saved! Reload.'); $('#clientIdBox').classList.add('hidden'); initGoogle(); }
});

const savedUser = localStorage.getItem('oslo_user');
if(savedUser){
  try{
    const u=JSON.parse(savedUser);
    if(u?.name){ setTimeout(()=>{ if(loadProgress>=100) loginAs(u); else { const iv=setInterval(()=>{ if(loadProgress>=100){ clearInterval(iv); loginAs(u);} },200);} }, 800); }
  }catch{}
}

function loginAs(user){
  currentUser = {
    id: user.id || 'me',
    name: user.name || 'You',
    email: user.email,
    avatar: user.avatar,
    x: 950 + Math.random()*200,
    y: 800 + Math.random()*200,
    targetX:null, targetY:null,
    status: user.status || "Just arrived! Hei Oslo! 👋",
    level: user.level || 5,
    xp: user.xp || 620,
    coins: user.coins || 1240,
    walkKm: user.walkDistance || 0
  };
  avatarCustom = user.avatarCustom || {hat:'🧶', acc:'☕', color: COLORS[Math.floor(Math.random()*COLORS.length)]};
  inventory = user.inventory || {'hat_beanie':1, 'acc_coffee':1};
  discovered = new Set(user.discovered || ['palace','karljohan']);
  friends = new Set(user.friends || []);
  walkDistance = user.walkDistance || 0;
  coinCount = currentUser.coins;
  xp = currentUser.xp;
  level = currentUser.level;
  // Check first time
  const first = !localStorage.getItem('oslo_seen_customizer');
  localStorage.setItem('oslo_user', JSON.stringify({...currentUser, avatarCustom, inventory, discovered:[...discovered], friends:[...friends], walkDistance}));
  if(first) openCustomizer(true);
  else startGame();
}

function openCustomizer(first=false){
  $('#customizerModal').classList.remove('hidden');
  $('#customizerName').textContent=currentUser.name;
  renderCustomizer();
  if(first) localStorage.setItem('oslo_seen_customizer','1');
}
function renderCustomizer(){
  const wrap=$('#customizerAvatarWrap');
  wrap.innerHTML=`<div style="position:relative;width:100px;height:100px">
    <img src="${currentUser.avatar}" style="width:100px;height:100px;border-radius:50%;border:4px solid ${avatarCustom.color}">
    <div style="position:absolute;left:50%;top:-12px;transform:translateX(-50%);font-size:30px">${avatarCustom.hat}</div>
    <div style="position:absolute;right:-4px;bottom:-2px;background:white;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.15)">${avatarCustom.acc}</div>
  </div>`;
  const hatEl=$('#hatOptions'); hatEl.innerHTML='';
  HATS.forEach(h=>{
    const b=document.createElement('button'); b.textContent=h||'∅'; b.className= avatarCustom.hat===h?'active':''; b.onclick=()=>{avatarCustom.hat=h; renderCustomizer();};
    hatEl.appendChild(b);
  });
  const accEl=$('#accOptions'); accEl.innerHTML='';
  ACCS.forEach(a=>{
    const b=document.createElement('button'); b.textContent=a||'∅'; b.className= avatarCustom.acc===a?'active':''; b.onclick=()=>{avatarCustom.acc=a; renderCustomizer();};
    accEl.appendChild(b);
  });
  const cEl=$('#colorOptions'); cEl.innerHTML='';
  COLORS.forEach(c=>{
    const b=document.createElement('button'); b.className='color'+(avatarCustom.color===c?' active':''); b.style.background=c; b.onclick=()=>{avatarCustom.color=c; renderCustomizer();};
    cEl.appendChild(b);
  });
}
$('#customizerSave').addEventListener('click', ()=>{
  $('#customizerModal').classList.add('hidden');
  saveProgress(); startGame();
});

function startGame(){
  loginScreen.classList.remove('active');
  gameScreen.classList.add('active');
  $('#userNameTop').textContent=currentUser.name.split(' ')[0];
  $('#userAvatarTop').src=currentUser.avatar;
  $('#statusInput').value=currentUser.status;
  updateHUD();
  initGameData();
  initMap();
  initSnow();
  initEmojiPicker();
  initShop();
  initBag();
  initTutorial();
  requestAnimationFrame(loop);
  spawnConfetti();
  pushChat({name:"OsloVille", text:`Welcome ${currentUser.name.split(' ')[0]}! Drag to explore, click to walk 🎮`});
  setTimeout(()=>showToast('💡 Tip: Click 🌙 for northern lights night!'), 2000);
}

/* ---------- GAME DATA ---------- */
function initGameData(){
  players = MOCK_NAMES.map((m,i)=>({
    id:'p'+i, name:m.name, status:m.status, avatar:`https://i.pravatar.cc/100?img=${10+i}`, color:m.color,
    x: 200+Math.random()*(MAP_SIZE.w-400), y: 200+Math.random()*(MAP_SIZE.h-400), targetX:null, targetY:null, moving:false,
    hat: HATS[Math.floor(Math.random()*HATS.length)], acc: ACCS[Math.floor(Math.random()*ACCS.length)]
  }));
  collectibles=[];
  const icons=['🪙','💖','💎','☕','🧤'];
  for(let i=0;i<22;i++){
    const typeIdx=Math.floor(Math.random()*icons.length);
    const type=['coin','heart','gem','coffee','mitten'][typeIdx];
    collectibles.push({id:'c'+i, x:100+Math.random()*(MAP_SIZE.w-200), y:100+Math.random()*(MAP_SIZE.h-200), type, icon:icons[typeIdx], collected:false});
  }
  quests=JSON.parse(JSON.stringify(QUEST_TEMPLATES));
  // restore progress from storage?
  renderAllStatic(); renderLandmarksOnMap(); renderCollectibles(); renderPlayersDOM(); renderLeaderboard(); renderChatInitial();
  setInterval(aiMovePlayers, 2600);
  setInterval(aiUpdateStatuses, 9000);
}

function renderAllStatic(){
  // Restore saved quest progress if present.
  try {
    const savedQuests = JSON.parse(localStorage.getItem('oslo_quests')||'null');
    if(Array.isArray(savedQuests)){
      savedQuests.forEach(saved => {
        const q = quests.find(x => x.id === saved.id);
        if(q){ q.progress = saved.progress ?? q.progress; q.done = !!saved.done; }
      });
    }
  } catch {}

  const allForList=[currentUser, ...players].sort((a,b)=> Math.hypot(a.x-currentUser.x,a.y-currentUser.y)-Math.hypot(b.x-currentUser.x,b.y-currentUser.y));
  const list=$('#playerList'); list.innerHTML='';
  allForList.slice(0,30).forEach(p=>{
    const isMe=p.id===currentUser.id;
    const dist=Math.round(Math.hypot(p.x-currentUser.x,p.y-currentUser.y)/6);
    const row=document.createElement('div'); row.className='player-row'+(isMe?' me':'');
    row.innerHTML=`<img src="${safeAvatar(p.avatar)}"><div class="p-info"><div class="p-name">${p.name}${isMe?' (you)':''}</div><div class="p-status">${esc(p.status||'')}</div></div><div class="p-dist">${dist}m</div>`;
    row.onclick=()=>focusPlayer(p); list.appendChild(row);
  });
  $('#onlineCount').textContent=players.length+1;

  const lList=$('#landmarkList'); lList.innerHTML='';
  LANDMARKS.forEach(l=>{
    const disc=discovered.has(l.id);
    const div=document.createElement('div'); div.className='landmark-row'+(disc?' discovered':'');
    div.innerHTML=`<div class="landmark-icon">${l.emoji}</div><div class="landmark-meta"><b>${l.name}${disc?' ✓':''}</b><small>${l.desc}</small></div><div style="font-size:10px">${disc?'🟢':'⚪'}</div>`;
    div.onclick=()=>travelTo(l); lList.appendChild(div);
  });
  $('#discoveredCount').textContent=`${discovered.size}/${LANDMARKS.length}`;

  const fList=$('#friendsList'); fList.innerHTML='';
  if(friends.size===0){ fList.innerHTML='<small style="color:#8aa0ad">Wave at people to add friends 💛</small>'; }
  else{
    [...friends].forEach(fid=>{
      const p=players.find(x=>x.id===fid); if(!p) return;
      const chip=document.createElement('div'); chip.className='friend-chip';
      chip.innerHTML=`<img src="${p.avatar}"><span>${p.name.split(' ')[0]}</span>`;
      chip.onclick=()=>focusPlayer(p); fList.appendChild(chip);
    });
  }

  const qList=$('#questsList'); qList.innerHTML='';
  quests.forEach(q=>{
    const div=document.createElement('div'); div.className='quest-row'+(q.done?' done':'');
    div.innerHTML=`<div class="quest-icon">${q.icon}</div><div class="quest-meta"><b>${q.title}</b><small>${q.desc} — ${q.progress}/${q.total}</small></div><div class="quest-reward">+${q.reward}</div>`;
    qList.appendChild(div);
  });
  $('#questProgress').textContent=`${quests.filter(q=>q.done).length}/${quests.length}`;
  // streak
  const savedStreak = parseInt(localStorage.getItem('oslo_streak')||'0');
  const today = new Date().toISOString().slice(0,10);
  const lastClaim = localStorage.getItem('oslo_last_claim');
  let streak = isNaN(savedStreak) ? 0 : savedStreak;
  if(lastClaim !== today){
    streak = lastClaim ? streak + 1 : 1;
    localStorage.setItem('oslo_last_claim', today);
    localStorage.setItem('oslo_streak', String(streak));
  }
  $('#streakText').textContent=`Daily Streak: ${streak} days`;
}

function renderLandmarksOnMap(){
  landmarksLayer.innerHTML='';
  LANDMARKS.forEach(l=>{
    const d=document.createElement('div'); d.className='landmark-dot'+(discovered.has(l.id)?' discovered':'');
    d.style.left=l.x+'px'; d.style.top=l.y+'px'; d.setAttribute('data-name', l.name); d.textContent=l.emoji;
    d.onclick=(e)=>{ e.stopPropagation(); travelTo(l); showToast(`Travelling to ${l.name} ${l.emoji}`); };
    landmarksLayer.appendChild(d);
  });
}
function renderCollectibles(){
  collectiblesLayer.innerHTML='';
  collectibles.forEach(c=>{
    if(c.collected) return;
    const d=document.createElement('div'); d.className=`collectible ${c.type}`; d.style.left=c.x+'px'; d.style.top=c.y+'px'; d.textContent=c.icon; d.dataset.id=c.id;
    d.onclick=(e)=>{ e.stopPropagation(); collectItem(c.id); };
    collectiblesLayer.appendChild(d);
  });
}
function renderPlayersDOM(){
  playersLayer.innerHTML='';
  [...players, currentUser].filter(Boolean).forEach(p=>{
    const isMe=p.id===currentUser.id;
    const hat=isMe? avatarCustom.hat : (p.hat||'');
    const acc=isMe? avatarCustom.acc : (p.acc||'');
    const col=isMe? avatarCustom.color : (p.color||'#fff');
    const pin=document.createElement('div'); pin.className='player-pin'+(isMe?' me':''); pin.style.left=p.x+'px'; pin.style.top=p.y+'px'; pin.dataset.id=p.id;
    pin.innerHTML=`
      <div class="speech-bubble">${esc(p.status||'')}</div>
      <div class="avatar-wrap">
        <img class="avatar-img" src="${p.avatar}" style="border-color:${col}">
        <div class="avatar-hat">${hat}</div>
        <div class="avatar-acc" style="${acc?'':'display:none'}">${acc}</div>
        <div class="avatar-shadow"></div>
      </div>
      <div class="name-tag">${esc(p.name.split(' ')[0])}</div>
    `;
    pin.onclick=(e)=>{ e.stopPropagation(); openPlayerModal(p); if(!isMe) showReactionBar(p); };
    playersLayer.appendChild(pin);
    if(useRealMap && leafletMarkers[p.id]){
      const ll=xyToLatLng(p.x,p.y); leafletMarkers[p.id].setLatLng(ll);
    }
  });
}
function esc(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- MAP ---------- */
function initMap(){
  updateMapTransform();
  mapViewport.addEventListener('mousedown', e=>{
    if(e.target.closest('.player-pin') || e.target.closest('.collectible') || e.target.closest('.landmark-dot')) return;
    isDragging=true; hasDragged=false; dragStart.x=e.clientX; dragStart.y=e.clientY; dragStart.offX=mapOffset.x; dragStart.offY=mapOffset.y;
  });
  window.addEventListener('mousemove', e=>{
    if(!isDragging) return;
    const dx=e.clientX-dragStart.x, dy=e.clientY-dragStart.y;
    if(Math.abs(dx)>3||Math.abs(dy)>3) hasDragged=true;
    mapOffset.x=dragStart.offX+dx; mapOffset.y=dragStart.offY+dy; clampOffset(); updateMapTransform();
  });
  window.addEventListener('mouseup', e=>{
    if(!isDragging) return; isDragging=false;
    if(!hasDragged){
      const rect=mapViewport.getBoundingClientRect();
      const mx=(e.clientX-rect.left - mapOffset.x)/mapScale;
      const my=(e.clientY-rect.top - mapOffset.y)/mapScale;
      moveCurrentUserTo(mx,my);
      hideReactionBar();
    }
  });
  mapViewport.addEventListener('wheel', e=>{
    e.preventDefault();
    const delta=e.deltaY>0?-0.08:0.08;
    const newScale=Math.min(1.8, Math.max(0.45, mapScale+delta));
    const rect=mapViewport.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const ratio=newScale/mapScale;
    mapOffset.x=mx-(mx-mapOffset.x)*ratio; mapOffset.y=my-(my-mapOffset.y)*ratio;
    mapScale=newScale; clampOffset(); updateMapTransform();
  }, {passive:false});
  // touch
  let touchStartDist=0, touchStartScale=1;
  mapViewport.addEventListener('touchstart', e=>{
    if(e.touches.length===1){ isDragging=true; hasDragged=false; dragStart.x=e.touches[0].clientX; dragStart.y=e.touches[0].clientY; dragStart.offX=mapOffset.x; dragStart.offY=mapOffset.y; }
    else if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; touchStartDist=Math.hypot(dx,dy); touchStartScale=mapScale; }
  });
  mapViewport.addEventListener('touchmove', e=>{
    if(e.touches.length===1 && isDragging){
      const dx=e.touches[0].clientX-dragStart.x, dy=e.touches[0].clientY-dragStart.y;
      if(Math.hypot(dx,dy)>5) hasDragged=true;
      mapOffset.x=dragStart.offX+dx; mapOffset.y=dragStart.offY+dy; clampOffset(); updateMapTransform(); e.preventDefault();
    } else if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.hypot(dx,dy); mapScale=Math.min(1.8, Math.max(0.45, touchStartScale*dist/touchStartDist)); updateMapTransform(); e.preventDefault();
    }
  }, {passive:false});
  mapViewport.addEventListener('touchend', e=>{
    if(e.touches.length===0){ isDragging=false; if(!hasDragged && e.changedTouches[0]){ const ct=e.changedTouches[0]; const rect=mapViewport.getBoundingClientRect(); const mx=(ct.clientX-rect.left - mapOffset.x)/mapScale; const my=(ct.clientY-rect.top - mapOffset.y)/mapScale; moveCurrentUserTo(mx,my);} }
  });
  $('#zoomIn').onclick=()=>{ mapScale=Math.min(1.8, mapScale+0.15); updateMapTransform(); };
  $('#zoomOut').onclick=()=>{ mapScale=Math.max(0.45, mapScale-0.15); updateMapTransform(); };
  $('#centerMe').onclick=()=>centerOnPlayer(currentUser);
  $('#statusSave').onclick=saveStatus;
  $('#statusInput').addEventListener('keydown', e=>{ if(e.key==='Enter') saveStatus(); });
  $('#statusInput').addEventListener('input', e=>{
    currentUser.status=e.target.value.slice(0,48);
    const meBubble=playersLayer.querySelector(`[data-id="${currentUser.id}"] .speech-bubble`); if(meBubble) meBubble.textContent=currentUser.status;
  });
  $('#chatSend').onclick=sendChat;
  $('#chatInput').addEventListener('keydown', e=>{ if(e.key==='Enter') sendChat(); });
  $('#soundToggle').onclick=()=>{ audioEnabled=!audioEnabled; $('#soundToggle').textContent=audioEnabled?'🔊':'🔇'; };
  $('#mapToggleBtn').onclick=toggleRealMap;
  $('#nightToggle').onclick=toggleNight;
  $('#snowToggle').onclick=toggleSnow;
  $('#shopBtn').onclick=()=>$('#shopModal').classList.remove('hidden');
  $('#bagBtn').onclick=()=>{ renderBag(); $('#bagModal').classList.remove('hidden'); };
  $('#photoBtn').onclick=takePhoto;
  $('#userMenuBtn').onclick=()=>$('#settingsModal').classList.remove('hidden');
  $('#tutorialBtn').onclick=()=>openTutorial(0);
  $('#settingsSave').onclick=saveSettings;
  $('#logoutBtn').onclick=logout;
}

function clampOffset(){
  const vw=mapViewport.clientWidth, vh=mapViewport.clientHeight;
  mapOffset.x=Math.min(200, Math.max(vw - MAP_SIZE.w*mapScale -200, mapOffset.x));
  mapOffset.y=Math.min(200, Math.max(vh - MAP_SIZE.h*mapScale -200, mapOffset.y));
}
function updateMapTransform(){ mapLayer.style.transform=`translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapScale})`; if(leafletMap) leafletMap.invalidateSize(); }

function moveCurrentUserTo(x,y){
  x=Math.max(40, Math.min(MAP_SIZE.w-40, x)); y=Math.max(40, Math.min(MAP_SIZE.h-40, y));
  const prevDist=Math.hypot(currentUser.x - x, currentUser.y - y);
  walkDistance += prevDist/900; // approx km
  currentUser.targetX=x; currentUser.targetY=y; currentUser.moving=true;
  drawTrail(currentUser.x, currentUser.y, x, y);
  checkLandmarkProximity(x,y);
  updateHUD(); if(audioEnabled) playPop();
  hideReactionBar();
}
function centerOnPlayer(p){
  const vw=mapViewport.clientWidth, vh=mapViewport.clientHeight;
  mapOffset.x=vw/2 - p.x*mapScale; mapOffset.y=vh/2 - p.y*mapScale; clampOffset(); updateMapTransform();
}
function travelTo(l){ moveCurrentUserTo(l.x,l.y); centerOnPlayer(l); }
function drawTrail(x1,y1,x2,y2){
  const svg=$('#trailSvg');
  svg.innerHTML=`<path d="M ${x1} ${y1} Q ${(x1+x2)/2} ${y1-40} ${x2} ${y2}" stroke="rgba(38,70,83,0.18)" stroke-width="3" stroke-dasharray="8 8" fill="none" stroke-linecap="round"/>`;
  setTimeout(()=>{ if(svg.innerHTML.includes(`${x1}`)) svg.innerHTML=''; }, 2000);
}

/* ---------- LOOP ---------- */
function loop(){
  if(!currentUser) return;
  if(currentUser.moving && currentUser.targetX!=null){
    const dx=currentUser.targetX-currentUser.x, dy=currentUser.targetY-currentUser.y, dist=Math.hypot(dx,dy);
    if(dist<4){ currentUser.x=currentUser.targetX; currentUser.y=currentUser.targetY; currentUser.moving=false; currentUser.targetX=null; currentUser.targetY=null; $('#trailSvg').innerHTML=''; renderAllStatic(); }
    else{ const speed=Math.min(12, dist*0.14+2); currentUser.x+=dx/dist*speed; currentUser.y+=dy/dist*speed; updatePlayerPin(currentUser); checkCollectibleCollisions(); }
  }
  players.forEach(p=>{
    if(p.moving && p.targetX!=null){
      const dx=p.targetX-p.x, dy=p.targetY-p.y, d=Math.hypot(dx,dy);
      if(d<3){ p.moving=false; p.targetX=null; p.targetY=null; }
      else{ p.x+=dx/d*(0.7+Math.random()*0.6); p.y+=dy/d*(0.7+Math.random()*0.6); updatePlayerPin(p); }
    }
  });
  if(snowEnabled) updateSnowParticles();
  requestAnimationFrame(loop);
}
function updatePlayerPin(p){
  const el=playersLayer.querySelector(`[data-id="${p.id}"]`); if(el){ el.style.left=p.x+'px'; el.style.top=p.y+'px'; }
  if(Math.random()<0.018) renderAllStatic();
}
function checkCollectibleCollisions(){
  collectibles.forEach(c=>{ if(!c.collected && Math.hypot(c.x-currentUser.x,c.y-currentUser.y)<56) collectItem(c.id); });
}
function collectItem(id){
  const c=collectibles.find(x=>x.id===id); if(!c||c.collected) return;
  c.collected=true;
  const el=collectiblesLayer.querySelector(`[data-id="${id}"]`); if(el){ el.classList.add('collected'); setTimeout(()=>el.remove(),300); }
  const add = c.type==='coin'?20 : c.type==='heart'?40 : c.type==='gem'?80 : 30;
  coinCount+=add; xp+=15; inventory[c.type]=(inventory[c.type]||0)+1;
  const q=quests.find(q=>q.id==='q3'); if(q && !q.done){ q.progress=Math.min(q.total,q.progress+1); if(q.progress>=q.total){ q.done=true; coinCount+=q.reward; xp+=60; showToast(`Quest complete! +${q.reward} 🪙`); spawnConfetti(); } }
  // walk quest
  const qWalk=quests.find(q=>q.id==='q5'); if(qWalk && !qWalk.done){ qWalk.progress=Math.max(qWalk.progress, Math.floor(walkDistance)); if(qWalk.progress>=qWalk.total){ qWalk.done=true; qWalk.progress=qWalk.total; coinCount+=qWalk.reward; showToast(`Walked 1km! +${qWalk.reward} 🪙 ❄️`); } }
  updateHUD(); saveProgress(); if(audioEnabled) playCoin(); if(c.type==='gem') spawnConfetti();
}
function checkLandmarkProximity(x,y){
  LANDMARKS.forEach(l=>{
    const d=Math.hypot(l.x-x,l.y-y);
    if(d<120 && !discovered.has(l.id)){
      discovered.add(l.id); showToast(`Discovered ${l.name} ${l.emoji} +50 XP`);
      xp+=50; coinCount+=30; spawnConfetti(); renderAllStatic(); renderLandmarksOnMap();
    }
    if(d<110){
      if(l.id==='gruner'){ const q=quests.find(q=>q.id==='q2'); if(q&&!q.done){ q.done=true; q.progress=1; coinCount+=q.reward; xp+=40; showToast(`Fika at ${l.name}! +${q.reward} 🪙`); renderAllStatic(); } }
      if(l.id==='opera'){ const q=quests.find(q=>q.id==='q4'); if(q&&!q.done){ q.done=true; q.progress=1; coinCount+=q.reward; xp+=40; showToast(`Opera selfie! +${q.reward} 🪙`); renderAllStatic(); } }
    }
  });
}
function saveStatus(){
  const v=$('#statusInput').value.trim().slice(0,48); if(!v) return;
  currentUser.status=v; renderPlayersDOM(); pushChat({name:currentUser.name.split(' ')[0], text:v}); saveProgress(); showToast('Bubble updated 💬'); if(audioEnabled) playPop();
}
function sendChat(){
  const inp=$('#chatInput'); const t=inp.value.trim().slice(0,80); if(!t) return;
  currentUser.status=t; pushChat({name:currentUser.name.split(' ')[0], text:t, me:true}); inp.value=''; renderPlayersDOM(); saveProgress();
}

/* ---------- AI ---------- */
function aiMovePlayers(){
  players.forEach(p=>{ if(!p.moving && Math.random()<0.36){ const ang=Math.random()*Math.PI*2, dist=60+Math.random()*180; p.targetX=Math.max(40,Math.min(MAP_SIZE.w-40,p.x+Math.cos(ang)*dist)); p.targetY=Math.max(40,Math.min(MAP_SIZE.h-40,p.y+Math.sin(ang)*dist)); p.moving=true; }});
}
function aiUpdateStatuses(){
  if(Math.random()<0.55){ const p=players[Math.floor(Math.random()*players.length)]; const opts=["brunch? 🥞","just found a gem! 💎","who wants sauna? 🧖‍♀️","sun is out! ☀️","lost near palace 😅","coffee break ☕","skating at Spikersuppa! ⛸️","northern lights tonight? ✨"]; p.status=opts[Math.floor(Math.random()*opts.length)]; const b=playersLayer.querySelector(`[data-id="${p.id}"] .speech-bubble`); if(b){ b.textContent=p.status; b.style.animation='none'; b.offsetHeight; b.style.animation='bubbleIn .3s ease'; } if(Math.random()<0.4) pushChat({name:p.name.split(' ')[0], text:p.status}); }
}

/* ---------- HUD & UTILS ---------- */
function updateHUD(){
  $('#coinDisplay').textContent=coinCount.toLocaleString();
  $('#xpFill').style.width=(xp%1000)/10+'%';
  $('#xpText').textContent=`${xp%1000} / 1000 XP`;
  $('#levelDisplay').textContent=level+Math.floor(xp/1000);
  $('#walkDisplay').textContent=`• ${walkDistance.toFixed(1)}km walked`;
  if(currentUser){ currentUser.coins=coinCount; currentUser.xp=xp; currentUser.level=level+Math.floor(xp/1000); currentUser.walkDistance=walkDistance; }
}
function saveProgress(){
  if(currentUser) localStorage.setItem('oslo_user', JSON.stringify({...currentUser, avatarCustom, inventory, discovered:[...discovered], friends:[...friends], walkDistance}));
  localStorage.setItem('oslo_coins', coinCount); localStorage.setItem('oslo_xp', xp);
}
function saveSettings(){
  const name=$('#settingsName').value.trim(); const cid=$('#clientIdInput2').value.trim();
  if(name){ currentUser.name=name; $('#userNameTop').textContent=name.split(' ')[0]; }
  if(cid){ localStorage.setItem('oslo_client_id', cid); initGoogle(); }
  saveProgress(); $('#settingsModal').classList.add('hidden'); renderPlayersDOM(); renderAllStatic(); showToast('Settings saved ⚙️');
}
function logout(){
  localStorage.removeItem('oslo_user'); location.reload();
}

/* ---------- SHOP / BAG ---------- */
function initShop(){
  const grid=$('#shopGrid'); grid.innerHTML='';
  SHOP_ITEMS.forEach(item=>{
    const owned = inventory[item.id];
    const div=document.createElement('div'); div.className='shop-item';
    div.innerHTML=`<div class="shop-item-icon">${item.emoji}</div><div class="shop-item-meta"><b>${item.name}</b><small>${item.cat||item.type} • ${owned?'Owned':'New'}</small></div><button class="shop-item-buy">${owned?'👌':'🪙 '+item.price}</button>`;
    const btn=div.querySelector('button');
    btn.onclick=()=>{
      if(owned){ 
        if(item.type==='hat') avatarCustom.hat=item.emoji;
        if(item.type==='acc') avatarCustom.acc=item.emoji;
        renderCustomizer(); renderPlayersDOM(); showToast(`Equipped ${item.name} ${item.emoji}`); saveProgress();
        return;
      }
      if(coinCount < item.price){ showToast('Not enough coins 🪙'); return; }
      coinCount-=item.price; inventory[item.id]=1; updateHUD(); saveProgress(); renderShop(); renderCustomizer(); showToast(`Bought ${item.name}! ${item.emoji}`); if(audioEnabled) playCoin();
      if(item.type==='hat') avatarCustom.hat=item.emoji;
      if(item.type==='acc') avatarCustom.acc=item.emoji;
      renderPlayersDOM();
    };
    grid.appendChild(div);
  });
}
function renderShop(){ initShop(); }
function initBag(){ renderBag(); }
function renderBag(){
  const grid=$('#bagGrid'); if(!grid) return;
  grid.innerHTML='';
  const allKeys=Object.keys(inventory);
  const slots=16;
  for(let i=0;i<slots;i++){
    const key=allKeys[i];
    const div=document.createElement('div'); div.className='bag-slot'+(key?' has':'');
    if(key){
      const item=SHOP_ITEMS.find(s=>s.id===key) || {emoji: key.includes('coin')?'🪙': key.includes('heart')?'💖': key.includes('gem')?'💎':'🎁', name:key};
      const count=inventory[key];
      div.innerHTML=`${item.emoji||'🎁'}${count>1?`<span class="count">${count}</span>`:''}`;
      div.title=item.name;
    }
    grid.appendChild(div);
  }
  const stats=$('#bagStats'); if(stats) stats.textContent=`Items: ${allKeys.length} • Coins: ${coinCount} • Walked: ${walkDistance.toFixed(1)}km • Discovered: ${discovered.size}/${LANDMARKS.length}`;
}

/* ---------- EMOJI PICKER ---------- */
function initEmojiPicker(){
  const btn=$('#emojiBtn'), picker=$('#emojiPicker');
  const emojis=['😊','😂','❤️','🔥','👋','☕','⛷️','🌲','🎭','⛵','✨','❄️','🍩','🎧','📸','🙌','💎','🚀'];
  picker.innerHTML='';
  emojis.forEach(e=>{
    const b=document.createElement('button'); b.textContent=e; b.onclick=()=>{ $('#statusInput').value+=e; picker.classList.add('hidden'); $('#statusInput').focus(); const bubble=playersLayer.querySelector(`[data-id="${currentUser.id}"] .speech-bubble`); if(bubble) bubble.textContent=$('#statusInput').value; };
    picker.appendChild(b);
  });
  btn.onclick=()=>picker.classList.toggle('hidden');
  document.addEventListener('click', e=>{ if(!e.target.closest('.status-composer')) picker.classList.add('hidden'); });
}

/* ---------- SNOW ---------- */
let snowParticles=[];
function initSnow(){
  const canvas=$('#snowCanvas'); const ctx=canvas.getContext('2d');
  function resize(){ canvas.width=mapViewport.clientWidth; canvas.height=mapViewport.clientHeight; }
  resize(); window.addEventListener('resize', resize);
  snowParticles=Array.from({length:120}, ()=>({x:Math.random()*canvas.width, y:Math.random()*canvas.height, r:1+Math.random()*2.5, vy:0.5+Math.random()*2.2, vx:Math.random()*1-0.5, alpha:0.4+Math.random()*0.6}));
  window._snowCtx=ctx; window._snowCanvas=canvas;
}
function updateSnowParticles(){
  const ctx=window._snowCtx, canvas=window._snowCanvas;
  if(!ctx||!canvas||!snowEnabled) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  snowParticles.forEach(p=>{
    p.y+=p.vy; p.x+=p.vx+Math.sin(p.y*0.01)*0.3;
    if(p.y>canvas.height){ p.y=-10; p.x=Math.random()*canvas.width; }
    if(p.x<0||p.x>canvas.width) p.x=Math.random()*canvas.width;
    ctx.globalAlpha=p.alpha; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='white'; ctx.shadowBlur=6; ctx.shadowColor='white'; ctx.fill();
  });
}
function toggleSnow(){
  snowEnabled=!snowEnabled;
  const canvas=$('#snowCanvas'); const badge=$('#weatherBadge');
  if(snowEnabled){ canvas.classList.add('active'); badge.textContent='❄️ Oslo • -4°C • Snowing • Cozy time'; showToast('Snow enabled ❄️'); }
  else{ canvas.classList.remove('active'); badge.textContent='☀️ Oslo • -2°C • Golden hour • Tap 🌙 for night'; showToast('Snow off ☀️'); }
}

/* ---------- NIGHT ---------- */
function toggleNight(){
  nightMode=!nightMode;
  const overlay=$('#nightOverlay'); const badge=$('#weatherBadge'); const btn=$('#nightToggle');
  if(nightMode){ overlay.classList.remove('hidden'); badge.textContent='🌌 Oslo • -6°C • Aurora lights • Magic night'; btn.textContent='☀️'; document.body.style.filter='saturate(1.05) brightness(0.92)'; showToast('Northern lights ON ✨🌌'); }
  else{ overlay.classList.add('hidden'); badge.textContent='☀️ Oslo • -2°C • Golden hour • Tap 🌙 for night'; btn.textContent='🌙'; document.body.style.filter=''; showToast('Day mode ☀️'); }
}

/* ---------- PHOTO ---------- */
function takePhoto(){
  const flash=$('#photoFlash'); flash.classList.add('flash'); setTimeout(()=>flash.classList.remove('flash'), 380);
  showToast('📸 Photo saved to bag! (screenshot)');
  // fake save: add photo to inventory
  const id='photo_'+Date.now(); inventory[id]=1;
  renderBag();
  if(audioEnabled){ playTone(800,0.08,'square',0.2); setTimeout(()=>playTone(1200,0.15,'sine',0.2), 100); }
}

/* ---------- TUTORIAL ---------- */
const tutSteps=[
  {title:'Map drag & walk', text:'<b>Drag</b> the map to explore Oslo. <b>Click</b> anywhere to walk your avatar there. Try clicking near Opera House 🎭.'},
  {title:'Status bubble', text:'Type in the top bubble bar 💬 and hit Update. Your speech bubble appears above your head for everyone to see!'},
  {title:'Collect boller', text:'Golden boller 🪙 and gems 💎 are hidden around the map. Walk close to collect them. They give coins & XP.'},
  {title:'Shop & Style', text:'Click 🛍️ to buy hats 🧶, scarves 🧣, coffee ☕. Equip them to customize your map icon. Friends will see it!'},
  {title:'Night & Snow', text:'Toggle 🌙 for magical northern lights night, and ❄️ for cozy snowfall. Oslo is beautiful in every season.'},
];
let tutIndex=0;
function initTutorial(){
  $('#tutNext').onclick=()=>{ tutIndex++; if(tutIndex>=tutSteps.length){ $('#tutorialOverlay').classList.add('hidden'); localStorage.setItem('oslo_tut_done','1'); } else renderTutorial(); };
  $('#tutPrev').onclick=()=>{ tutIndex=Math.max(0,tutIndex-1); renderTutorial(); };
  if(!localStorage.getItem('oslo_tut_done')) setTimeout(()=>openTutorial(0), 2200);
}
function openTutorial(i){ tutIndex=i; renderTutorial(); $('#tutorialOverlay').classList.remove('hidden'); }
function renderTutorial(){
  const s=tutSteps[tutIndex]; $('#tutorialStep').innerHTML=`<div class="tutorial-step"><b>${s.title}</b><br>${s.text}<br><br><small>Step ${tutIndex+1} / ${tutSteps.length}</small></div>`;
  $('#tutPrev').style.visibility=tutIndex===0?'hidden':'visible';
  $('#tutNext').textContent=tutIndex===tutSteps.length-1?'Finish ✨':'Next';
}

/* ---------- MAP SWITCH ---------- */
function toggleRealMap(){
  useRealMap=!useRealMap;
  const leafContainer=$('#leafletMap');
  if(useRealMap){
    leafContainer.classList.remove('hidden'); mapLayer.style.backgroundImage='none'; $('#mapToggleBtn').textContent='🎨';
    if(!leafletMap){
      leafletMap=L.map('leafletMap', {zoomControl:false, attributionControl:false}).setView([OSLO_CENTER.lat, OSLO_CENTER.lng], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {maxZoom:19}).addTo(leafletMap);
      LANDMARKS.forEach(l=>{
        L.marker([l.lat,l.lng], {icon:L.divIcon({className:'', html:`<div style="width:44px;height:44px;background:white;border-radius:12px;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:22px">${l.emoji}</div>`, iconSize:[44,44], iconAnchor:[22,22]})}).addTo(leafletMap).bindPopup(`<b>${l.name}</b><br>${l.desc}`);
      });
      [...players, currentUser].forEach(p=>{
        const ll=xyToLatLng(p.x,p.y);
        const m=L.marker([ll.lat,ll.lng], {icon:L.divIcon({className:'', html:`<div style="width:48px;height:48px;border-radius:50%;border:3px solid white;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3)"><img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover"></div>`, iconSize:[48,48], iconAnchor:[24,24]})}).addTo(leafletMap);
        leafletMarkers[p.id]=m;
      });
      leafletMap.on('click', e=>{ const xy=latLngToXy(e.latlng.lat, e.latlng.lng); moveCurrentUserTo(xy.x,xy.y); });
    }
    setTimeout(()=>leafletMap.invalidateSize(),100);
  } else {
    leafContainer.classList.add('hidden'); mapLayer.style.backgroundImage="url('assets/map.jpg')"; $('#mapToggleBtn').textContent='🗺️';
  }
}

/* ---------- MODALS & REACTIONS ---------- */
function openPlayerModal(p){
  const modal=$('#playerModal'); const card=$('#modalCard'); const isMe=p.id===currentUser.id;
  const ll=xyToLatLng(p.x,p.y);
  card.innerHTML=`
    <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">
      <img src="${p.avatar}" style="width:64px;height:64px;border-radius:50%;border:3px solid ${p.color||'#fff'}">
      <div><b style="font-size:18px">${esc(p.name)}</b><br><small style="color:#6d818c">${ll.lat.toFixed(3)}, ${ll.lng.toFixed(3)} • Oslo</small><br><span style="background:#f2f6f7;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600">${esc(p.status||'chilling')}</span></div>
    </div>
    <div style="display:flex;gap:8px;margin:12px 0 4px">
      ${!isMe?`<button class="btn-demo" style="height:40px;flex:1" onclick="doWave('${p.id}')">👋 Wave</button><button class="btn-google" style="height:40px;flex:1" onclick="focusId('${p.id}')">📍 Visit</button><button class="btn-small" style="height:40px" onclick="addFriend('${p.id}')">💛</button>`:`<button class="btn-google" style="height:40px;flex:1" onclick="document.getElementById('playerModal').classList.add('hidden');document.getElementById('customizerModal').classList.remove('hidden');">✏️ Edit look</button>`}
    </div>
    <div style="margin-top:12px;font-size:12px;color:#7a8d98">Level ${Math.floor(4+Math.random()*20)} • ${Math.floor(Math.random()*800+200)} 🪙 • ${isMe?'You are here':'Active now'}</div>
  `;
  modal.classList.remove('hidden');
}
$('#playerModal').addEventListener('click', e=>{ if(e.target.id==='playerModal') e.currentTarget.classList.add('hidden'); });
window.focusId = id=>{ const p=[...players, currentUser].find(x=>x.id===id); if(p){ $('#playerModal').classList.add('hidden'); centerOnPlayer(p); showToast(`Heading to ${p.name.split(' ')[0]} 📍`);} };
window.doWave = id=>{
  const isIdString=typeof id==='string'; const p=isIdString? players.find(x=>x.id===id) : id;
  if(!p) return;
  showToast(`Waved at ${p.name.split(' ')[0]} 👋`); friends.add(p.id);
  const q=quests.find(q=>q.id==='q1'); if(q&&!q.done){ q.progress=Math.min(q.total,q.progress+1); if(q.progress>=q.total){ q.done=true; coinCount+=q.reward; spawnConfetti(); showToast(`Quest done! +${q.reward} 🪙`);} renderAllStatic(); updateHUD(); }
  pushChat({name:currentUser.name.split(' ')[0], text:`👋 ${p.name.split(' ')[0]}!`, me:true});
  const el=playersLayer.querySelector(`[data-id="${p.id}"] .avatar-wrap`); if(el) el.animate([{transform:'rotate(0)'},{transform:'rotate(-12deg)'},{transform:'rotate(12deg)'},{transform:'rotate(0)'}], {duration:500});
  saveProgress(); if(audioEnabled) playPop(); $('#playerModal').classList.add('hidden'); hideReactionBar();
};
window.addFriend = id=>{ friends.add(id); saveProgress(); renderAllStatic(); showToast('Added as friend 💛'); $('#playerModal').classList.add('hidden'); };

let reactionFor=null;
function showReactionBar(p){
  const bar=$('#reactionBar'); reactionFor=p; bar.classList.remove('hidden');
  bar.style.bottom='90px';
}
function hideReactionBar(){ $('#reactionBar').classList.add('hidden'); reactionFor=null; }
$('#reactionBar').addEventListener('click', e=>{
  if(e.target.dataset.emoji && reactionFor){
    const emoji=e.target.dataset.emoji;
    currentUser.status=emoji+' '+reactionFor.name.split(' ')[0]+'!';
    const bubble=playersLayer.querySelector(`[data-id="${currentUser.id}"] .speech-bubble`); if(bubble) bubble.textContent=currentUser.status;
    pushChat({name:currentUser.name.split(' ')[0], text:`${emoji} to ${reactionFor.name.split(' ')[0]}`, me:true});
    doWave(reactionFor.id);
  }
});

/* ---------- OTHER UI ---------- */
function renderLeaderboard(){
  const sorted=[...players].sort((a,b)=> (b.coins||0)-(a.coins||0) || a.name.localeCompare(b.name)).slice(0,6);
  const lb=$('#leaderboard'); lb.innerHTML='';
  sorted.forEach((p,i)=>{
    const row=document.createElement('div'); row.className='leader-row'+(p.id===currentUser.id?' me':'');
    row.innerHTML=`<span style="font-weight:800;font-size:11px;width:14px">${i+1}</span><img class="leader-ava" src="${safeAvatar(p.avatar)}"><div class="leader-name">${p.name.split(' ')[0]}</div><div class="leader-score">${Math.floor((p.coins||0))} 🪙</div>`;
    lb.appendChild(row);
  });
}
function renderChatInitial(){
  [{name:"Ingrid", text:"anyone near Mathallen hungry?"},{name:"Magnus", text:"live coding at Rebel, come! 💻"},{name:"Sofia", text:"Vigeland magical in snow ❄️"}].forEach(m=>pushChat(m));
  const feed=$('#chatFeed'); if(feed){ feed.scrollTop=feed.scrollHeight; }
}
function pushChat(msg){
  const feed=$('#chatFeed'); const div=document.createElement('div'); div.className='chat-msg'+(msg.me?' me':'');
  div.innerHTML=`<b>${esc(msg.name)}</b><br><span>${esc(msg.text)}</span>`;
  feed.appendChild(div); feed.scrollTop=feed.scrollHeight;
  $('#chatTyping').textContent=`${msg.name} is online`; setTimeout(()=>$('#chatTyping').textContent='', 2000);
}
function showToast(t){
  const el=document.createElement('div');
  el.textContent=t; el.style.cssText=`position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#264653;color:white;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;z-index:90;box-shadow:0 10px 30px rgba(0,0,0,0.2);animation:toastIn .4s cubic-bezier(.16,1,.3,1)`;
  document.body.appendChild(el);
  setTimeout(()=>{ el.animate([{opacity:1, transform:'translateX(-50%) translateY(0)'},{opacity:0, transform:'translateX(-50%) translateY(8px)'}],{duration:300}).onfinish=()=>el.remove(); }, 2400);
}
function spawnConfetti(){
  const root=$('#confettiRoot');
  for(let i=0;i<26;i++){
    const d=document.createElement('div'); d.textContent=['🎉','✨','🪙','💎','🌟'][Math.floor(Math.random()*5)];
    d.style.cssText=`position:absolute;left:${50+(Math.random()*40-20)}%;top:40%;font-size:${16+Math.random()*14}px;animation:conf ${1+Math.random()*1.2}s cubic-bezier(.16,1,.3,1) forwards`;
    root.appendChild(d); setTimeout(()=>d.remove(),2200);
  }
  if(!$('#confStyle')){ const s=document.createElement('style'); s.id='confStyle'; s.textContent=`@keyframes conf{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(${Math.random()*400-200}px, ${300+Math.random()*200}px) rotate(${Math.random()*720}deg) scale(0);opacity:0}} @keyframes toastIn{from{transform:translateX(-50%) translateY(12px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`; document.head.appendChild(s); }
}
function xyToLatLng(x,y){ return {lat:59.965 - (y/MAP_SIZE.h)*0.08, lng:10.68 + (x/MAP_SIZE.w)*0.12}; }
function latLngToXy(lat,lng){ return {x:((lng-10.68)/0.12)*MAP_SIZE.w, y:((59.965-lat)/0.08)*MAP_SIZE.h}; }
let audioCtx;
function ensureAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }
function playTone(f,d,t='sine',v=0.18){ if(!audioEnabled) return; try{ ensureAudio(); const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.frequency.value=f; o.type=t; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(v,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+d); o.start(); o.stop(audioCtx.currentTime+d);}catch{} }
function playPop(){ playTone(660,0.12,'sine',0.2); setTimeout(()=>playTone(880,0.12,'sine',0.15),80); }
function playCoin(){ playTone(1200,0.12,'sine',0.18); setTimeout(()=>playTone(1600,0.18,'sine',0.18),90); }
window.focusPlayer = p=>{ centerOnPlayer(p); openPlayerModal(p); };
$('#claimDaily').onclick=()=>{
  const streakKey='oslo_streak'; let streak=parseInt(localStorage.getItem(streakKey)||'4'); streak++; localStorage.setItem(streakKey, streak);
  coinCount+=200+streak*10; xp+=50; updateHUD(); saveProgress(); showToast(`Streak ${streak}! +${200+streak*10} 🪙`); spawnConfetti(); renderAllStatic();
};

// close modals on outside click already partial - add for new ones
$$('.modal').forEach(m=>{ m.addEventListener('click', e=>{ if(e.target===m) m.classList.add('hidden'); }); });
