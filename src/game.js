(() => {
"use strict";

/* =========================================================
   RETRO TETRIS
   Self-contained, no external libraries, offline friendly.
   ========================================================= */

const W = 10, H = 20, HIDDEN = 2;
const TYPES = ["I","O","T","S","Z","J","L"];
const COLORS = {
  I:"#42d9d0", O:"#f1dc55", T:"#bd72df", S:"#6ed15b",
  Z:"#e45d5d", J:"#557fdb", L:"#e89545"
};
const SHAPES = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]]
  ],
  O: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]]
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]]
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]]
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]]
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]]
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]]
  ]
};

// SRS kick data. Coordinates are x,y where +y is downward.
const KICKS = {
  JLSTZ: {
    "0>1":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    "1>0":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    "1>2":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    "2>1":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    "2>3":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
    "3>2":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    "3>0":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    "0>3":[[0,0],[1,0],[1,-1],[0,2],[1,2]]
  },
  I: {
    "0>1":[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    "1>0":[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    "1>2":[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
    "2>1":[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    "2>3":[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    "3>2":[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    "3>0":[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    "0>3":[[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
  }
};

const SCORE = {
  single:100, double:300, triple:500, tetris:800,
  tspin0:400, tspin1:800, tspin2:1200, tspin3:1600,
  tspinMini0:100, tspinMini1:200, tspinMini2:400
};

const storeKey = "retro-tetris-v1";
const defaultSettings = {
  sound:true, music:true, vibration:true, ghost:true, nextCount:5,
  crt:false, reduced:false, handed:"right"
};

let settings = loadSettings();
let stats = loadStats();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const holdCanvas = document.getElementById("holdCanvas");
const hctx = holdCanvas.getContext("2d");
hctx.imageSmoothingEnabled = false;

let cell = 24, dpr = Math.min(devicePixelRatio || 1, 2);
let board = [];
let current = null;
let hold = null;
let canHold = true;
let queue = [];
let score = 0, lines = 0, level = 1, combo = -1;
let b2b = false, running = false, paused = false, gameOver = false;
let lastTime = 0, fallAcc = 0, lockTimer = 0, lockResets = 0;
let grounded = false, lastActionRotate = false;
let audioCtx = null, masterGain = null;
let gesture = null;
let repeatTimers = {left:null,right:null,down:null};

function loadSettings(){
  try { return {...defaultSettings, ...(JSON.parse(localStorage.getItem(storeKey))?.settings||{})}; }
  catch { return {...defaultSettings}; }
}
function loadStats(){
  try { return JSON.parse(localStorage.getItem(storeKey))?.stats || {
    bestScore:0,bestLines:0,bestLevel:0,bestCombo:0,tetrises:0,tspins:0,perfectClears:0,games:0,totalLines:0,totalPlayTime:0
  }; } catch { return {bestScore:0,bestLines:0,bestLevel:0,bestCombo:0,tetrises:0,tspins:0,perfectClears:0,games:0,totalLines:0,totalPlayTime:0}; }
}
function persist(){
  try { localStorage.setItem(storeKey, JSON.stringify({settings,stats})); } catch {}
}
function emptyBoard(){ return Array.from({length:H+HIDDEN},()=>Array(W).fill(null)); }
function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function refillQueue(){
  while(queue.length < 12) queue.push(...shuffle(TYPES.slice()));
}
function spawn(type=queue.shift()){
  refillQueue();
  const p = {type, rot:0, x:3, y:0, spawnY:0};
  if(type==="O") p.x=3;
  current=p;
  grounded=false; lockTimer=0; lockResets=0; lastActionRotate=false;
  if(collides(p,p.x,p.y,p.rot)) endGame();
}
function cells(p=p){
  return SHAPES[p.type][p.rot].map(([x,y])=>[p.x+x,p.y+y]);
}
function collides(p,x=p.x,y=p.y,r=p.rot){
  for(const [cx,cy] of SHAPES[p.type][r]){
    const bx=x+cx, by=y+cy;
    if(bx<0||bx>=W||by>=H+HIDDEN) return true;
    if(by>=0 && board[by][bx]) return true;
  }
  return false;
}
function move(dx){
  if(!running||paused||gameOver)return false;
  if(!collides(current,current.x+dx,current.y,current.rot)){
    current.x+=dx; grounded=collides(current,current.x,current.y+1,current.rot);
    lastActionRotate=false;
    if(grounded) resetLock();
    beep(160,0.018,"square",0.025);
    return true;
  }
  return false;
}
function rotate(dir=1){
  if(!running||paused||gameOver)return false;
  const from=current.rot, to=(from+dir+4)%4;
  const key=`${from}>${to}`;
  const table=current.type==="O"?[[0,0]]:(current.type==="I"?KICKS.I[key]:KICKS.JLSTZ[key]);
  for(const [kx,ky] of table){
    if(!collides(current,current.x+kx,current.y+ky,to)){
      current.rot=to; current.x+=kx; current.y+=ky;
      grounded=collides(current,current.x,current.y+1,current.rot);
      lastActionRotate=true;
      if(grounded) resetLock();
      beep(dir>0?500:430,0.025,"square",0.035);
      return true;
    }
  }
  return false;
}
function resetLock(){
  if(lockResets < 15){ lockTimer=0; lockResets++; }
}
function hardDrop(){
  if(!running||paused||gameOver)return;
  let d=0;
  while(!collides(current,current.x,current.y+1,current.rot)){current.y++;d++;}
  score += d*2;
  lockPiece();
  beep(90,0.055,"square",0.055);
  vibrate(10);
}
function softDrop(){
  if(!running||paused||gameOver)return;
  if(!collides(current,current.x,current.y+1,current.rot)){
    current.y++; score += 1; fallAcc=0; lastActionRotate=false;
  }
}
function holdPiece(){
  if(!running||paused||gameOver||!canHold)return;
  const t=current.type;
  if(hold===null){ hold=t; spawn(); }
  else { const swap=hold; hold=t; spawn(swap); }
  canHold=false; beep(280,0.04,"square",0.04); vibrate(8);
}
function ghostY(){
  let y=current.y;
  while(!collides(current,current.x,y+1,current.rot)) y++;
  return y;
}
function lockPiece(){
  if(!current)return;
  for(const [x,y] of cells(current)){
    if(y<0) continue;
    if(y<H+HIDDEN && x>=0 && x<W) board[y][x]=current.type;
  }
  const tspin = detectTSpin();
  const cleared = clearLines();
  award(cleared,tspin);
  if(cleared>0){
    lines += cleared; stats.totalLines += cleared;
    if(cleared===4) stats.tetrises++;
    if(tspin) stats.tspins++;
    combo++;
  } else combo=-1;
  if(board.every((row)=>row.every(v=>!v))) {
    stats.perfectClears++; score += 3500*level; showToast("PERFECT CLEAR!");
    beep(880,0.08,"square",0.08); vibrate([15,20,35]);
  }
  level = Math.floor(lines/10)+1;
  canHold=true;
  persist();
  spawn();
}
function clearLines(){
  let cleared=0;
  for(let y=H+HIDDEN-1;y>=0;y--){
    if(board[y].every(Boolean)){
      board.splice(y,1); board.unshift(Array(W).fill(null)); cleared++; y++;
    }
  }
  if(cleared) showToast(cleared===4?"TETRIS!":`${cleared} LINE${cleared>1?"S":""}`);
  return cleared;
}
function detectTSpin(){
  if(current.type!=="T" || !lastActionRotate) return null;
  const cx=current.x+1, cy=current.y+1;
  let blocked=0;
  for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const x=cx+dx,y=cy+dy;
    if(x<0||x>=W||y<0||y>=H+HIDDEN||board[y][x]) blocked++;
  }
  if(blocked<3)return null;
  // A small heuristic distinguishes Mini from full T-spin.
  const cornersTop = [[cx-1,cy-1],[cx+1,cy-1]].filter(([x,y])=>x<0||x>=W||y<0||board[y]?.[x]).length;
  return cornersTop===2 && (current.rot===1||current.rot===3) ? "mini" : "full";
}
function award(cleared,tspin){
  let base=0;
  if(tspin){
    const n=cleared;
    base=tspin==="mini" ? (n===2?SCORE.tspinMini2:n===1?SCORE.tspinMini1:SCORE.tspinMini0)
                         : (n===3?SCORE.tspin3:n===2?SCORE.tspin2:n===1?SCORE.tspin1:SCORE.tspin0);
    showToast(tspin==="mini"?"T-SPIN MINI":"T-SPIN!");
  } else if(cleared===1)base=SCORE.single;
  else if(cleared===2)base=SCORE.double;
  else if(cleared===3)base=SCORE.triple;
  else if(cleared===4)base=SCORE.tetris;
  if(base){
    if(b2b && (tspin || cleared===4)){base=Math.floor(base*1.5);showToast("BACK-TO-BACK");}
    else if(tspin||cleared===4)b2b=true; else b2b=false;
    if(combo>0) base += 50*combo*level;
    score += base*level;
    if(combo>0)showToast(`COMBO ×${combo+1}`);
  }
  if(!cleared && !tspin)b2b=false;
  stats.bestCombo=Math.max(stats.bestCombo,combo+1);
}
function gravityMs(){
  // Smooth, beginner-friendly curve that becomes very fast at high levels.
  const table=[800,700,600,500,400,330,270,220,180,150,125,105,90,75,60,50,42,36,30,25];
  return table[Math.min(level-1,table.length-1)];
}
function update(dt){
  if(!running||paused||gameOver)return;
  fallAcc += dt;
  const g=gravityMs();
  while(fallAcc>=g){
    fallAcc-=g;
    if(!collides(current,current.x,current.y+1,current.rot)){
      current.y++; grounded=false; lockTimer=0;
    } else {
      grounded=true; break;
    }
  }
  if(grounded){
    lockTimer += dt;
    if(lockTimer>=500) lockPiece();
  }
}
function render(){
  resize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBoard();
  drawGhost();
  drawCurrent();
  drawGrid();
  drawSide();
  document.getElementById("score").textContent=score.toLocaleString();
  document.getElementById("level").textContent=level;
}
function resize(){
  const game=document.getElementById("game");
  const rect=game.getBoundingClientRect();
  const hudH=document.querySelector(".hud").getBoundingClientRect().height;
  const controlsH=document.querySelector(".controls").getBoundingClientRect().height;
  const lowerH=document.querySelector(".lower").getBoundingClientRect().height;
  const arenaMaxH=Math.max(280,rect.height-hudH-controlsH-lowerH-24);
  const arenaMaxW=Math.min(window.innerWidth*0.64,520);
  const c=Math.floor(Math.min(arenaMaxW/10,arenaMaxH/20));
  cell=Math.max(12,Math.min(c,42));
  const cssW=cell*10, cssH=cell*20;
  if(canvas.width!==cssW*dpr||canvas.height!==cssH*dpr){
    canvas.width=cssW*dpr; canvas.height=cssH*dpr;
    canvas.style.width=cssW+"px"; canvas.style.height=cssH+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
}
function drawBoard(){
  ctx.fillStyle="#151812";ctx.fillRect(0,0,cell*W,cell*H);
  for(let y=HIDDEN;y<H+HIDDEN;y++)for(let x=0;x<W;x++){
    const t=board[y][x]; if(t) drawCell(ctx,x,y-HIDDEN,t,1);
  }
}
function drawGrid(){
  ctx.strokeStyle="#2b3226";ctx.lineWidth=1;
  for(let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*cell+.5,0);ctx.lineTo(x*cell+.5,H*cell);ctx.stroke()}
  for(let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*cell+.5);ctx.lineTo(W*cell,y*cell+.5);ctx.stroke()}
}
function drawGhost(){
  if(!settings.ghost||!current)return;
  const gy=ghostY();
  for(const [x,y] of SHAPES[current.type][current.rot]) drawCell(ctx,current.x+x,gy+y-HIDDEN,current.type,.22,true);
}
function drawCurrent(){
  if(!current)return;
  for(const [x,y] of cells(current)) if(y>=HIDDEN) drawCell(ctx,x,y-HIDDEN,current.type,1);
}
function drawCell(c,x,y,type,alpha=1,ghost=false){
  if(x<0||x>=W||y<0||y>=H)return;
  const px=x*cell,py=y*cell, s=Math.max(1,Math.floor(cell*.1));
  c.save();c.globalAlpha=alpha;
  if(ghost){
    c.strokeStyle=COLORS[type];c.lineWidth=Math.max(1,Math.floor(cell*.09));
    c.strokeRect(px+s,py+s,cell-2*s,cell-2*s);c.restore();return;
  }
  c.fillStyle=COLORS[type];c.fillRect(px+1,py+1,cell-2,cell-2);
  c.fillStyle="rgba(255,255,255,.28)";c.fillRect(px+2,py+2,cell-4,s);
  c.fillStyle="rgba(0,0,0,.26)";c.fillRect(px+2,py+cell-s-2,cell-4,s);
  c.fillRect(px+cell-s-2,py+2,s,cell-4);
  c.restore();
}
function drawSide(){
  hctx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
  if(hold) drawPreview(hctx,holdCanvas,hold);
  const host=document.getElementById("nextPreviews");
  host.innerHTML="";
  const count=Math.min(settings.nextCount,queue.length);
  for(let i=0;i<count;i++){
    const cv=document.createElement("canvas");cv.width=100;cv.height=100;cv.className="previewCanvas";
    cv.style.width="100%";cv.style.height="auto";cv.style.imageRendering="pixelated";
    host.appendChild(cv);drawPreview(cv.getContext("2d"),cv,queue[i]);
  }
}
function drawPreview(c,cv,type){
  c.clearRect(0,0,cv.width,cv.height);
  const pts=SHAPES[type][0];
  const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
  const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
  const size=Math.floor(Math.min(cv.width/(maxX-minX+1),cv.height/(maxY-minY+1))*.58);
  const ox=(cv.width-(maxX-minX+1)*size)/2-minX*size;
  const oy=(cv.height-(maxY-minY+1)*size)/2-minY*size;
  for(const [x,y] of pts) drawPreviewCell(c,ox+x*size,oy+y*size,size,COLORS[type]);
}
function drawPreviewCell(c,x,y,s,color){
  c.fillStyle=color;c.fillRect(x+1,y+1,s-2,s-2);
  c.fillStyle="rgba(255,255,255,.25)";c.fillRect(x+2,y+2,s-4,Math.max(1,s*.08));
  c.fillStyle="rgba(0,0,0,.25)";c.fillRect(x+2,y+s-3,s-4,Math.max(1,s*.08));
}

function showToast(text){
  const t=document.getElementById("toast");t.textContent=text;t.classList.remove("show");void t.offsetWidth;t.classList.add("show");
  if(text.includes("TETRIS")||text.includes("PERFECT")){beep(760,.08,"square",.07);vibrate(15)}
}
function vibrate(v){if(settings.vibration&&navigator.vibrate)try{navigator.vibrate(v)}catch{}}
function ensureAudio(){
  if(!settings.sound)return;
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=audioCtx.createGain();masterGain.gain.value=.18;masterGain.connect(audioCtx.destination);
  }
  if(audioCtx.state==="suspended")audioCtx.resume();
}
function beep(freq,duration,type="square",gain=.04){
  if(!settings.sound)return; ensureAudio(); if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
  o.connect(g);g.connect(masterGain);o.start();o.stop(audioCtx.currentTime+duration+.01);
}

function startGame(){
  ensureAudio();
  board=emptyBoard();queue=[];refillQueue();hold=null;canHold=true;
  score=0;lines=0;level=1;combo=-1;b2b=false;paused=false;gameOver=false;running=true;
  stats.games++;persist();
  spawn();showScreen("game");resize();lastTime=performance.now();fallAcc=0;lockTimer=0;
}
function endGame(){
  gameOver=true;running=false;
  stats.bestScore=Math.max(stats.bestScore,score);
  stats.bestLines=Math.max(stats.bestLines,lines);
  stats.bestLevel=Math.max(stats.bestLevel,level);
  persist();vibrate([30,20,50]);beep(100,.16,"sawtooth",.06);
  showDialog("GAME OVER",`
    <div class="stats">
      <div class="stat"><b>SCORE</b><span>${score.toLocaleString()}</span></div>
      <div class="stat"><b>LINES</b><span>${lines}</span></div>
      <div class="stat"><b>LEVEL</b><span>${level}</span></div>
      <div class="stat"><b>BEST</b><span>${stats.bestScore.toLocaleString()}</span></div>
    </div>
    <button class="retro-btn" id="again">▶ PLAY AGAIN</button>
    <br><br><button class="retro-btn" id="toMenu">HOME</button>
  `);
  document.getElementById("again").onclick=()=>{closeDialog();startGame()};
  document.getElementById("toMenu").onclick=()=>{closeDialog();showScreen("menu")};
}
function showScreen(id){
  for(const s of ["menu","game"])document.getElementById(s).classList.toggle("hidden",s!==id);
  if(id==="game"){resize();render()}
}
function showDialog(title,body){
  const ov=document.getElementById("overlay"),d=document.getElementById("dialog");
  d.innerHTML=`<h2>${title}</h2>${body}`;ov.classList.remove("hidden");
}
function closeDialog(){document.getElementById("overlay").classList.add("hidden")}
function pause(){
  if(!running||gameOver)return;
  paused=!paused;
  if(paused)showDialog("PAUSED",`<button class="retro-btn" id="resume">▶ RESUME</button><br><br><button class="retro-btn" id="restart">↻ RESTART</button><br><br><button class="retro-btn" id="home">HOME</button>`);
  else closeDialog();
  if(paused){
    document.getElementById("resume").onclick=pause;
    document.getElementById("restart").onclick=()=>{closeDialog();startGame()};
    document.getElementById("home").onclick=()=>{closeDialog();running=false;showScreen("menu")};
  }
}
function records(){
  showDialog("RECORDS",`
    <div class="stats">
      <div class="stat"><b>BEST SCORE</b><span>${stats.bestScore.toLocaleString()}</span></div>
      <div class="stat"><b>BEST LEVEL</b><span>${stats.bestLevel}</span></div>
      <div class="stat"><b>BEST LINES</b><span>${stats.bestLines}</span></div>
      <div class="stat"><b>BEST COMBO</b><span>${stats.bestCombo}</span></div>
      <div class="stat"><b>TETRISES</b><span>${stats.tetrises}</span></div>
      <div class="stat"><b>T-SPINS</b><span>${stats.tspins}</span></div>
      <div class="stat"><b>PERFECT CLEARS</b><span>${stats.perfectClears}</span></div>
      <div class="stat"><b>GAMES</b><span>${stats.games}</span></div>
    </div>
    <button class="retro-btn" id="closeRecords">BACK</button>
  `);
  document.getElementById("closeRecords").onclick=closeDialog;
}
function settingsDialog(){
  const on=x=>x?"ON":"OFF";
  showDialog("SETTINGS",`
    <div class="settings">
      <div class="setting">Sound <button id="sound">${on(settings.sound)}</button></div>
      <div class="setting">Music <button id="music">${on(settings.music)}</button></div>
      <div class="setting">Vibration <button id="vibe">${on(settings.vibration)}</button></div>
      <div class="setting">Ghost Piece <button id="ghost">${on(settings.ghost)}</button></div>
      <div class="setting">Next Preview <button id="next">${settings.nextCount}</button></div>
      <div class="setting">CRT Effect <button id="crt">${on(settings.crt)}</button></div>
      <div class="setting">Handedness <button id="hand">${settings.handed.toUpperCase()}</button></div>
    </div>
    <button class="retro-btn" id="closeSettings">BACK</button>
  `);
  const toggle=(id,key)=>document.getElementById(id).onclick=()=>{settings[key]=!settings[key];persist();settingsDialog()};
  toggle("sound","sound");toggle("music","music");toggle("vibe","vibration");toggle("ghost","ghost");toggle("crt","crt");
  document.getElementById("next").onclick=()=>{settings.nextCount=settings.nextCount===5?4:settings.nextCount===4?3:5;persist();settingsDialog()};
  document.getElementById("hand").onclick=()=>{settings.handed=settings.handed==="right"?"left":"right";persist();settingsDialog()};
  document.getElementById("closeSettings").onclick=closeDialog;
}

function action(name){
  ensureAudio();
  if(name==="left")move(-1);
  else if(name==="right")move(1);
  else if(name==="rotate")rotate(1);
  else if(name==="down")softDrop();
  else if(name==="drop")hardDrop();
  else if(name==="hold")holdPiece();
}
function bindControls(){
  document.querySelectorAll("[data-action]").forEach(btn=>{
    const a=btn.dataset.action;
    let timer=null;
    const down=e=>{
      e.preventDefault();btn.classList.add("active");ensureAudio();
      action(a);
      if(a==="left"||a==="right"||a==="down"){
        timer=setTimeout(()=>{timer=setInterval(()=>action(a),65)},180);
      }
    };
    const up=e=>{e.preventDefault();btn.classList.remove("active");if(timer){clearTimeout(timer);clearInterval(timer);timer=null}};
    btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointercancel",up);btn.addEventListener("pointerleave",up);
  });
}
function bindTouch(){
  canvas.addEventListener("pointerdown",e=>{
    if(!running||paused)return;
    gesture={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointerup",e=>{
    if(!gesture)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,dt=performance.now()-gesture.t;
    const adx=Math.abs(dx),ady=Math.abs(dy);
    gesture=null;
    if(adx<14&&ady<14&&dt<300){action("rotate");return}
    if(ady>adx){
      if(dy>0){ if(ady>75&&dt<420)action("drop"); else if(ady>15){ for(let i=0;i<Math.min(8,Math.floor(ady/12));i++)action("down"); } }
      else if(ady>45)action("hold");
    } else if(adx>18){
      const n=Math.min(7,Math.max(1,Math.floor(adx/22)));
      for(let i=0;i<n;i++)action(dx<0?"left":"right");
    }
  });
}
document.addEventListener("keydown",e=>{
  if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," ","z","Z","c","C","Escape"].includes(e.key))e.preventDefault();
  if(e.key==="ArrowLeft")action("left");
  else if(e.key==="ArrowRight")action("right");
  else if(e.key==="ArrowDown")action("down");
  else if(e.key==="ArrowUp"||e.key==="x"||e.key==="X")action("rotate");
  else if(e.key==="z"||e.key==="Z")rotate(-1);
  else if(e.key===" ")action("drop");
  else if(e.key==="c"||e.key==="C")action("hold");
  else if(e.key==="Escape")pause();
});
document.getElementById("playBtn").onclick=startGame;
document.getElementById("recordsBtn").onclick=records;
document.getElementById("settingsBtn").onclick=settingsDialog;
document.getElementById("pauseBtn").onclick=pause;
document.getElementById("restartBtn").onclick=startGame;
bindControls();bindTouch();

document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&running&&!paused)pause();
});
window.addEventListener("resize",()=>{if(!document.getElementById("game").classList.contains("hidden"))render()});

// Main loop
function loop(t){
  const dt=Math.min(50,t-(lastTime||t));lastTime=t;
  update(dt);if(running)render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Service worker
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}
})();
