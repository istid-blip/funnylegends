'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d');
const W = 480, H = 270;
ctx.imageSmoothingEnabled = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SAVE_KEY = 'riften-chapter-one-v1';
let saved = null;
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
if (saved && saved.chapter === 1) $('continue').hidden = false;
let mode = 'title', paused = false, elapsed = 0, sceneTime = 0, sceneIndex = 0;
let last = 0, wake = 0, toastTimer = 0, letterTaken = false, activeTarget = null;
let player = {x:231,y:163,dir:1,step:0,moving:false}, walkTarget = null, autoInteract = false;
const keys = new Set(), held = new Set();
const scenes = [
  {duration:5.5,name:'ET STED I SKOGEN',title:'En stille kveld',text:'Det skulle bare være en rolig kveld ved bålet.'},
  {duration:6,name:'NOE ER GALT',title:'Riften',text:'Så revner himmelen. Og alt begynner å bevege seg oppover.'},
  {duration:6.5,name:'PÅ DEN ANDRE SIDEN',title:'En fremmed verden',text:'Gress. Blomster. Fjell du aldri har sett. Og du er ikke alene.'},
  {duration:3.5,name:'PÅ DEN ANDRE SIDEN',title:'Alt svartner',text:'Du prøver å forstå hvor du er. Så svikter beina.'}
];
let randSeed = 2891;
function rng(){randSeed=(randSeed*1664525+1013904223)>>>0;return randSeed/4294967296;}
const floorBits=Array.from({length:480},()=>({x:rng()*480,y:rng()*270,v:rng(),s:1+rng()*3}));
const stars=Array.from({length:65},()=>({x:rng()*480,y:rng()*140,v:rng()}));
const rocks=Array.from({length:130},()=>({x:rng()*480,y:rng()*270,r:7+rng()*15,v:rng()}));
const flowers=Array.from({length:100},()=>({x:rng()*480,y:104+rng()*165,v:rng()}));
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function glow(x,y,r,c){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function line(points,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function hash(n){return Math.abs(Math.sin(n*127.1)*43758.5453)%1;}
function pine(x,y,s=1,dark=false){
 const c=dark?'#132d31':'#25483e',l=dark?'#19383b':'#355544';
 rect(x-2*s,y-5*s,4*s,15*s,'#293d34');
 poly([[x,y-59*s],[x-19*s,y-23*s],[x+18*s,y-23*s]],c);
 poly([[x,y-46*s],[x-25*s,y-7*s],[x+24*s,y-7*s]],c);
 poly([[x,y-32*s],[x-29*s,y+6*s],[x+28*s,y+6*s]],c);
 line([[x-2*s,y-49*s],[x-16*s,y-23*s],[x-7*s,y-24*s],[x-22*s,y-8*s]],l,2*s);
}
function stone(x,y,r,v=0){
 poly([[x-r,y+2],[x-r*.65,y-r*.55],[x+r*.25,y-r*.8],[x+r*.9,y-r*.3],[x+r,y+r*.45],[x-r*.3,y+r*.65]],v>.5?'#283d3d':'#233536');
 poly([[x-r,y+2],[x-r*.65,y-r*.55],[x+r*.25,y-r*.8],[x+r*.9,y-r*.3],[x,y-r*.15]],v>.5?'#354b47':'#304442');
 line([[x-r*.65,y-r*.55],[x+r*.25,y-r*.8],[x+r*.7,y-r*.4]],'#40554a',1);
}
function mushroom(x,y,s=1){rect(x,y-2*s,2*s,6*s,'#698d7c');ellipse(x+1*s,y-3*s,6*s,3*s,'#3d998b');rect(x-3*s,y-5*s,5*s,1*s,'#83c2aa');rect(x+3*s,y-3*s,2*s,1*s,'#a6d6b1');glow(x,y,17*s,'#4fbfa019');}
function plant(x,y,c='#50765b',s=1){line([[x,y],[x-4*s,y-8*s],[x-2*s,y-1*s],[x+3*s,y-11*s],[x+1*s,y-1*s],[x+7*s,y-6*s]],c,1);}
function character(x,y,dir=1,step=0,moving=false,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;x=Math.round(x);y=Math.round(y);
 ellipse(x,y+8,7,3,'#00000045');
 const foot=moving?Math.sin(step)*2:0;
 rect(x-4,y+6+foot,3,5,'#253437');rect(x+1,y+6-foot,3,5,'#253437');
 rect(x-5,y-1,10,9,'#3d6970');rect(x-4,y,3,7,'#547b76');rect(x+3,y,3,6,'#2a505b');
 rect(x-7,y,2,6,'#bba885');rect(x+5,y,2,6,'#bba885');
 rect(x-4,y-10,8,9,'#c8b38d');rect(x-5,y-11,10,5,'#433e34');rect(x-5,y-8,3,3,'#514637');rect(x+3,y-9,2,5,'#514637');
 if(dir===-1){rect(x-3,y-6,1,1,'#2a3831');rect(x+1,y-6,1,1,'#2a3831');}
 if(dir===1){rect(x-4,y-8,8,3,'#514637');}
 rect(x-5,y-1,9,2,'#d1b779');rect(x-4,y+1,2,5,'#c4a567');ctx.restore();
}
function fire(x,y,t){
 ellipse(x,y+6,17,7,'#0e1719');
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9;stone(x+Math.cos(a)*15,y+Math.sin(a)*6,3,.2);}
 poly([[x-9,y+3],[x+8,y+6],[x+10,y+3],[x-8,y]],'#6d4f34');poly([[x-8,y+5],[x+8,y],[x+10,y+3],[x-7,y+8]],'#8a5d39');
 const f=reduced?1:Math.sin(t*12)*2;
 glow(x,y-4,65,'#f8b75629');glow(x,y-4,26,'#ffb65338');
 poly([[x-10,y+3],[x-8,y-9],[x-3,y-4],[x,y-21-f],[x+4,y-12],[x+8,y-16],[x+10,y+3]],'#db773e');
 poly([[x-6,y+3],[x-3,y-11],[x,y-5],[x+4,y-16+f],[x+6,y+3]],'#f1b65c');
 poly([[x-2,y+4],[x,y-9],[x+4,y+3]],'#ffdf98');
 for(let i=0;i<9;i++){const p=(t*(.28+i*.03)+i*.17)%1;rect(x+Math.sin(t+i*4)*8,y-12-p*45,1,2,`rgba(240,181,96,${(1-p)*.75})`);}
}
function drawCamp(t,portal=false,progress=0){
 rect(0,0,W,H,'#142a2c');
 for(const p of floorBits){if(p.y>91)rect(p.x,p.y,p.s,p.v>.6?2:1,p.v>.5?'#20372e':'#1b302d');}
 poly([[210,140],[240,121],[324,127],[379,164],[366,210],[283,224],[222,204]],'#354338');
 for(let i=0;i<18;i++){const x=i*31-16, y=56+hash(i)*40;pine(x,y,1+hash(i+3)*.7,true);}
 for(let i=0;i<13;i++){pine(i*41-5,120+hash(i+40)*31,.8+hash(i+12)*.7);}
 for(const p of stars)rect(p.x,p.y*.45,1,p.v>.8?2:1,p.v>.5?'#819c8a':'#405d58');
 glow(338,158,110,'#f4ab4830');fire(337,173,t);
 // Sleeping roll, cup and small camping pack.
 rect(270,189,26,11,'#243b3a');rect(269,185,26,9,'#6e7960');rect(269,185,7,9,'#8a8d6d');rect(270,185,24,1,'#9d9e78');
 rect(360,177,5,6,'#abb5a0');line([[365,178],[368,178],[368,181],[365,181]],'#a4b39a');
 rect(278,146,12,13,'#756347');rect(280,143,8,4,'#877859');rect(281,149,7,5,'#4e4c3a');
 const pull=portal?Math.max(0,(progress-.45)/.55):0;
 const px=310+(reduced?0:Math.sin(t*2)*pull*7),py=177-pull*95;
 ctx.save();if(pull>0){ctx.translate(px,py);ctx.rotate(pull*3);ctx.scale(1-pull*.6,1-pull*.6);character(0,0,-1,t*8,pull>0);ctx.restore();}else{ctx.restore();character(px,py,-1,0,false);}
 if(pull<.15){line([[315,174],[329,159]],'#b3996c',1);rect(327,157,5,4,'#efe5bf');rect(327,160,5,1,'#c29565');}
 if(portal){const intensity=Math.min(1,progress*4);glow(309,82,100*intensity,'#9687df50');
 const points=[[316,20],[300,40],[320,48],[300,67],[313,78],[299,101],[308,114]];
 ctx.save();ctx.globalAlpha=intensity;line(points,'#5b4c80',14);line(points,'#8870b5',7);line(points,'#e2d2f4',3);line(points,'#fff5dc',1);
 for(let i=0;i<24;i++){let a=i*2.399,dist=13+((1-(progress+i*.07)%1)*75);const x=309+Math.cos(a+t*.3)*dist,y=72+Math.sin(a)*dist*.65;rect(x,y,2,1,'#b7a4d9');}
 ctx.restore();if(pull>0)glow(308,72,120*pull,'#e0d0ff50');}
 for(let i=0;i<7;i++){pine(i*91-20,260+hash(i+77)*15,1.4,true);}
 // Small fireflies at the forest's edge.
 for(let i=0;i<14;i++){const x=60+hash(i+62)*380,y=110+hash(i+36)*123;glow(x,y,5,'#c5d88815');rect(x,y,1,1,`rgba(190,207,128,${.3+Math.sin(t+i)*.25})`);}
 vignette(.6);
}
function creature(x,y,color,t,i){
 const bob=reduced?0:Math.sin(t*2+i)*1.5;
 ellipse(x,y+5,9,3,'#142e272e');rect(x-5,y-4+bob,11,9,color);rect(x-3,y-9+bob,7,7,color);rect(x-7,y-10+bob,3,7,color);rect(x+4,y-11+bob,3,8,color);
 rect(x-3,y-5+bob,2,2,'#f1e9bb');rect(x+2,y-5+bob,2,2,'#f1e9bb');rect(x-2,y-5+bob,1,2,'#38493a');rect(x+3,y-5+bob,1,2,'#38493a');
 rect(x-4,y+4,3,3,'#48645a');rect(x+2,y+4,3,3,'#48645a');
}
function drawOtherworld(t,faint=false,p=0){
 rect(0,0,W,H,'#94b8aa');rect(0,45,W,100,'#b2c6ab');ellipse(361,44,15,15,'#e6ddbb');
 poly([[0,114],[40,57],[61,79],[107,18],[155,79],[193,40],[239,120]],'#697e83');
 poly([[48,108],[108,18],[132,51],[119,47],[110,62],[99,47]],'#b4c4bd');
 poly([[182,125],[263,39],[295,79],[336,11],[392,83],[422,48],[480,122]],'#6b8585');
 poly([[304,61],[336,11],[363,47],[349,41],[341,51],[335,38],[326,49]],'#c3d0bd');
 poly([[0,131],[80,95],[156,125],[237,87],[340,121],[412,91],[480,124],[480,270],[0,270]],'#5f806b');
 poly([[0,175],[65,134],[145,143],[222,122],[303,147],[398,127],[480,150],[480,270],[0,270]],'#789064');
 poly([[0,217],[138,180],[217,186],[312,161],[480,185],[480,270],[0,270]],'#879d6c');
 poly([[480,139],[416,151],[387,177],[401,209],[365,270],[402,270],[430,209],[412,179],[432,159],[480,154]],'#94b6a0');
 for(const f of flowers){if(f.x>380)continue;plant(f.x,f.y,'#5f8255',.4);rect(f.x,f.y-5,2,2,f.v>.65?'#d6b8a4':f.v>.3?'#e0daa1':'#b3bfce');if(f.v>.75)rect(f.x-2,f.y-4,5,1,'#cfb6a4');}
 for(let i=0;i<9;i++){const x=hash(i+200)*480,y=119+hash(i+270)*100;if(Math.abs(x-240)>30){rect(x,y-15,3,17,'#536e50');ellipse(x+2,y-15,13,9,'#65836a');ellipse(x-5,y-21,10,7,'#779976');rect(x-8,y-23,9,2,'#91ab80');}}
 const cx=230,cy=183;
 if(!faint || p<.45)character(cx,cy,-1,0,false);
 else {ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.min(1,(p-.45)*5)*Math.PI/2);character(0,0,-1,0,false);ctx.restore();}
 creature(281+Math.sin(t*.3)*4,179,'#98a98c',t,1);creature(155,212,'#a6a0b0',t,5);creature(333,225,'#bea58e',t,8);
 for(let i=0;i<12;i++){const x=(hash(i+350)*480+t*(i%2?1:-1)*2+480)%480,y=133+hash(i+378)*105+Math.sin(t+i)*4;rect(x,y,2,1,'#e1dfa2');}
 if(faint){const opacity=Math.max(0,(p-.2)/.8);vignette(.4+opacity);rect(0,0,W,H,`rgba(5,13,17,${Math.min(1,opacity)})`);}
 else vignette(.2);
}
function torch(x,y,t){
 rect(x-2,y+1,4,12,'#574a34');rect(x-4,y+2,8,3,'#7b7755');
 const f=reduced?0:Math.sin(t*13+x)*1.5;
 poly([[x-4,y+2],[x-5,y-5],[x-1,y-2],[x+1,y-12+f],[x+5,y-3],[x+3,y+2]],'#ce9751');
 poly([[x-2,y+2],[x,y-7],[x+3,y+1]],'#f5d88b');
 glow(x,y,48,'#c99e4a28');glow(x,y,15,'#e1b55930');
}
function drawCageBack(){
 ellipse(242,160,67,55,'#07171970');
 rect(183,104,115,103,'#142723');rect(188,109,106,92,'#555b3a');
 for(let y=112;y<200;y+=8){rect(190,y,102,6,y%3?'#4c5337':'#51573a');rect(191,y,100,1,'#64634550');}
 rect(183,103,116,5,'#1b2e29');rect(185,103,113,2,'#829077');rect(186,107,111,2,'#59684f');
 for(let x=187;x<301;x+=9){rect(x,98,3,15,'#35463b');rect(x,98,1,15,'#84917a');rect(x+1,98,1,2,'#b3b494');}
 // Left and right cage rails; the right side has a locked gate.
 rect(183,108,4,95,'#35473b');rect(183,109,1,93,'#92a088');rect(295,108,4,95,'#35473b');rect(298,108,1,93,'#a2a78c');
 for(let y=115;y<200;y+=11){rect(180,y,9,3,'#56634b');rect(180,y,9,1,'#91987a');rect(293,y,9,3,'#56634b');rect(294,y,8,1,'#9b9c7c');}
 rect(292,142,9,3,'#a3a284');rect(292,174,9,3,'#a3a284');rect(295,146,4,27,'#465448');rect(297,148,2,23,'#9b9b79');
 rect(298,157,5,7,'#a38c50');rect(299,154,3,4,'#b9ae78');rect(300,159,1,3,'#4a4836');
 // A modest straw bed and old empty bowl, no invented story props.
 for(let i=0;i<32;i++){const x=200+hash(i+510)*26,y=122+hash(i+540)*17;line([[x,y],[x+4,y+2]],i%2?'#8d8451':'#706e40');}
 ellipse(206,188,6,3,'#303d30');ellipse(206,187,5,2,'#798067');ellipse(206,186,4,2,'#475344');
}
function drawCageFront(){
 rect(183,202,117,5,'#283a30');rect(183,201,117,2,'#7a886a');
 for(let x=185;x<301;x+=9){rect(x,197,3,14,'#3c4c39');rect(x,197,1,14,'#9b9f7d');rect(x,198,2,1,'#bbc09b');}
 for(const [x,y] of [[181,99],[295,99],[181,199],[295,199]]){rect(x,y,7,12,'#3b4c3c');rect(x,y,7,3,'#a1a486');rect(x+1,y+3,1,8,'#7e8b69');}
}
function drawLetter(t){
 if(letterTaken)return;const x=311,y=166;
 glow(x,y,24,'#d6d6a819');ctx.save();ctx.translate(x,y);ctx.rotate(-.15);rect(-7,-4,14,9,'#1a2c2a');rect(-6,-5,12,8,'#e0d4a5');poly([[-6,-5],[0,0],[6,-5]],'#b8b88f');line([[-6,3],[0,-1],[6,3]],'#b7ab7e');rect(-1,-1,2,2,'#93824c');ctx.restore();
 // The chain and cross rest on the upper-right corner of the letter.
 ctx.save();ctx.strokeStyle='#9daaa0';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(x+4,y-4,2.4,1.6,-.4,0,Math.PI*2);ctx.stroke();
 line([[x+6,y-5],[x+8,y-2]],'#d2d6c4',1);line([[x+6,y-3],[x+8,y-4]],'#d2d6c4',1);ctx.restore();
 const a=reduced?.8:.45+Math.sin(t*2)*.3;ctx.save();ctx.globalAlpha=a;line([[311,146],[311,150]],'#d8cf99');line([[309,148],[313,148]],'#d8cf99');ctx.restore();
}
function drawCave(t){
 rect(0,0,W,H,'#0e2026');
 // Irregular cave floor and long shadows, viewed from above.
 poly([[49,76],[95,39],[171,46],[213,28],[294,40],[345,32],[406,69],[442,116],[434,203],[382,244],[284,251],[235,242],[160,254],[69,226],[37,168]],'#324339');
 poly([[81,93],[139,63],[222,66],[281,55],[380,81],[405,139],[393,219],[318,232],[222,227],[160,236],[86,211],[61,158]],'#394937');
 for(const p of floorBits){if(p.x>57&&p.x<421&&p.y>67&&p.y<237){const c=p.v>.8?'#63724a40':p.v>.45?'#243d3545':'#8c8b5d15';rect(p.x,p.y,p.s,p.v>.7?2:1,c);}}
 // Broken stone path approaching the cage.
 for(let i=0;i<7;i++){const x=301+i*13,y=180+i*5;poly([[x,y],[x+9,y-3],[x+13,y+3],[x+4,y+6]],'#66725b40');line([[x,y],[x+9,y-3]],'#7c856340');}
 // Dark pool with slow bioluminescent ripples.
 poly([[361,173],[389,165],[416,180],[414,208],[391,229],[364,220],[350,202]],'#193c3c');
 poly([[368,180],[389,174],[408,183],[401,207],[385,217],[366,213],[358,202]],'#25524a');
 for(let i=0;i<8;i++){const y=180+i*4,x=366+hash(i+570)*24,shift=reduced?0:Math.sin(t*.7+i)*3;rect(x+shift,y,8+hash(i)*13,1,i%2?'#5e9a7928':'#a2bc7c20');}
 glow(387,198,53,'#609e7820');
 // Boundary rocks form a continuous perimeter.
 for(const r of rocks){const inFloor = ((r.x-240)/198)**2+((r.y-148)/104)**2<.94;if(!inFloor||r.y<55)stone(r.x,r.y,r.r,r.v);}
 for(let i=0;i<8;i++){stone(54+i*48,67+Math.sin(i*2)*8,14+hash(i+711)*10,hash(i+712));}
 // Ceiling overhangs and hanging roots.
 poly([[0,0],[480,0],[480,33],[446,40],[417,31],[381,49],[351,42],[323,54],[286,39],[260,48],[218,35],[181,48],[141,36],[108,49],[64,34],[35,49],[0,38]],'#152a2d');
 for(let i=0;i<17;i++){const x=19+i*28,h=10+hash(i+741)*23;poly([[x-5,31],[x+5,31],[x+1,31+h]],i%2?'#263b37':'#213834');rect(x-2,32,1,h*.7,'#3f5142');}
 for(const [x,y] of [[82,95],[117,70],[391,91],[420,153],[87,218],[340,230]]){plant(x,y,'#698056',1.2);plant(x+8,y+5,'#506747',.7);}
 for(const [x,y,s] of [[89,159,1],[99,164,.65],[375,114,1],[386,117,.6],[346,221,.9],[333,220,.5],[137,230,.7],[410,185,.65]])mushroom(x,y,s);
 torch(143,101,t);torch(337,102,t+.8);
 // Abandoned crates, a folded blanket and mineral glints.
 rect(117,165,21,17,'#1e3029');rect(118,161,20,17,'#5a6040');rect(120,163,16,12,'#414b32');line([[120,164],[135,174],[135,164],[120,174]],'#74764d',2);rect(117,160,22,3,'#7f7f53');
 rect(104,183,11,8,'#4c5b3a');rect(105,181,9,4,'#737950');
 for(const [x,y] of [[401,66],[74,130],[309,66]]){poly([[x,y-7],[x+3,y-2],[x+1,y+4],[x-2,y]],'#65a79a');rect(x,y-5,1,6,'#a0c7ad');glow(x,y,12,'#4dc8ac20');}
 drawCageBack();drawLetter(t);character(player.x,player.y,player.dir,player.step,player.moving);drawCageFront();
 // A very gentle drift of dust and intermittent water drops.
 for(let i=0;i<28;i++){const x=(hash(i+830)*480+Math.sin(t*.15+i)*7),y=(hash(i+851)*270+t*(.5+hash(i+871)))%270;rect(x,y,1,1,`rgba(194,199,144,${.1+hash(i+892)*.18})`);}
 if(!reduced){const d=(t*.15)%1;rect(384,91+d*45,1,3,`rgba(146,184,161,${(1-d)*.4})`);}
 glow(player.x,player.y,28,'#d2d2a009');vignette(.62);
}
function vignette(strength){const g=ctx.createRadialGradient(245,145,65,240,135,285);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(4,15,20,${Math.min(.97,strength)})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
let audio = null, soundEnabled = false;
function initAudio(){if(audio)return;try{const ac=new (window.AudioContext||window.webkitAudioContext)(),gain=ac.createGain();gain.gain.value=0;gain.connect(ac.destination);for(const f of [110,164.81,220.35]){const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.025;o.connect(g).connect(gain);o.start();}audio={ac,gain};}catch{toast('Lyd er ikke tilgjengelig i denne nettleseren.');}}
function updateAudio(){if(audio){audio.gain.gain.setTargetAtTime(soundEnabled&&!paused&&!$('letterDialog').open&&!document.hidden&&mode!=='title'?.12:0,audio.ac.currentTime,.3);}}
function soundNote(f=420){if(!audio||!soundEnabled)return;const ac=audio.ac,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(f,ac.currentTime);g.gain.setValueAtTime(.018,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.3);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+.3);}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({chapter:1,letterTaken,x:player.x,y:player.y}));$('continue').hidden=false;}catch{document.querySelector('.save-note').textContent='Automatisk lagring er ikke tilgjengelig';}}
function setLocation(text){$('location').innerHTML='<span></span>'+text;}
function updateInventory(){
 $('inventory').disabled=!letterTaken;$('inventoryCount').textContent=letterTaken?'1':'0';$('inventoryLabel').textContent=letterTaken?'Brevet':'Tomme lommer';
 $('objective').textContent=letterTaken?'Brevet er funnet. Hva er dette stedet?':'Undersøk buret. Et brev ligger like utenfor.';
}
function startIntro(){
 if($('letterDialog').open)$('letterDialog').close();mode='prologue';paused=false;elapsed=0;sceneTime=0;sceneIndex=0;wake=0;keys.clear();held.clear();walkTarget=null;letterTaken=false;activeTarget=null;toastTimer=0;
 $('welcome').hidden=true;$('pauseScreen').hidden=true;$('wakeText').hidden=true;$('interactWrap').hidden=true;$('toast').hidden=true;$('cinematic').hidden=false;$('pause').disabled=false;$('pauseLabel').textContent='Pause';$('inventory').disabled=true;$('inventoryLabel').textContent='Tomme lommer';$('inventoryCount').textContent='0';$('objective').textContent='En rolig kveld ved bålet. Foreløpig.';
 $('chapterNumber').textContent='00';$('chapterLabel').textContent='NULL';updateScene();updateAudio();canvas.focus({preventScroll:true});
}
function updateScene(){const s=scenes[sceneIndex];setLocation(s.name);$('chapterTitle').textContent=s.title;$('subtitle').textContent=s.text;$('sceneCount').textContent=String(sceneIndex+1).padStart(2,'0')+' / 04';}
function enterCave(resume=false){
 mode='play';paused=false;wake=resume?4:0;sceneTime=0;elapsed=0;keys.clear();held.clear();walkTarget=null;autoInteract=false;activeTarget=null;
 player={x:231,y:163,dir:-1,step:0,moving:false};letterTaken=resume&&Boolean(saved?.letterTaken);
 if(resume&&saved){player.x=Math.max(197,Math.min(286,Number(saved.x)||231));player.y=Math.max(120,Math.min(192,Number(saved.y)||163));}
 $('welcome').hidden=true;$('cinematic').hidden=true;$('pauseScreen').hidden=true;$('pause').disabled=false;$('pauseLabel').textContent='Pause';$('chapterNumber').textContent='01';$('chapterLabel').textContent='ÉN';$('chapterTitle').textContent='Den ukjente grotten';setLocation('ET STED UNDER FJELLET');$('wakeText').hidden=resume;
 updateInventory();save();updateAudio();canvas.focus({preventScroll:true});
}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;toastTimer=4.5;}
function clearInputs(){keys.clear();held.clear();walkTarget=null;autoInteract=false;document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function togglePause(force){if(mode==='title'||$('letterDialog').open)return;paused=typeof force==='boolean'?force:!paused;$('pauseScreen').hidden=!paused;$('pauseLabel').textContent=paused?'Fortsett':'Pause';clearInputs();if(paused){if(mode==='play')save();$('resume').focus({preventScroll:true});}else canvas.focus({preventScroll:true});updateAudio();}
function targetForPlayer(){
 if(!letterTaken&&Math.hypot(player.x-309,player.y-166)<34)return {id:'letter',label:'Ta opp brevet'};
 if(Math.hypot(player.x-296,player.y-146)<28)return {id:'door',label:'Undersøk døren'};
 if(player.x<208)return {id:'bars',label:'Undersøk sprinklene'};
 if(player.y<133&&player.x<236)return {id:'bed',label:'Undersøk halmen'};
 return null;
}
let lastFocus=null;
function openLetter(){
 if(mode!=='play'||paused)return;lastFocus=document.activeElement;
 if(!letterTaken){letterTaken=true;updateInventory();save();soundNote(620);}
 $('letterDialog').showModal();clearInputs();updateAudio();
}
function closeLetter(){if($('letterDialog').open)$('letterDialog').close();}
function interact(){if(mode!=='play'||paused||$('letterDialog').open)return;const target=targetForPlayer();if(!target){toast('Gå nærmere noe du vil undersøke.');return;}
 if(target.id==='letter')openLetter();
 if(target.id==='door'){toast(letterTaken?'Døren er låst. Du blir stående og lytte til grotten.':'Døren er låst. Kanskje brevet kan fortelle deg noe.');soundNote(170);}
 if(target.id==='bars')toast('Sprinklene gir ikke etter. Du må finne en annen vei.');
 if(target.id==='bed')toast('Tørr halm. Det ser ut som du har ligget her en stund.');
}
function update(dt){
 if(paused||$('letterDialog').open)return;
 elapsed+=dt;
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').hidden=true;}
 if(mode==='prologue'){
  sceneTime+=dt;
  if(sceneTime>=scenes[sceneIndex].duration){sceneTime=0;sceneIndex++;if(sceneIndex>=scenes.length){enterCave();return;}updateScene();}
  $('sceneProgress').style.width=Math.min(100,sceneTime/scenes[sceneIndex].duration*100)+'%';
 }
 if(mode==='play'){
  wake+=dt;if(wake>3.5)$('wakeText').hidden=true;
  let dx=0,dy=0;
  if(keys.has('arrowleft')||keys.has('a')||held.has('left'))dx--;
  if(keys.has('arrowright')||keys.has('d')||held.has('right'))dx++;
  if(keys.has('arrowup')||keys.has('w')||held.has('up'))dy--;
  if(keys.has('arrowdown')||keys.has('s')||held.has('down'))dy++;
  if(dx||dy){walkTarget=null;autoInteract=false;}
  else if(walkTarget){dx=walkTarget.x-player.x;dy=walkTarget.y-player.y;const dist=Math.hypot(dx,dy);if(dist<2){walkTarget=null;dx=dy=0;if(autoInteract){autoInteract=false;interact();}}}
  const len=Math.hypot(dx,dy);player.moving=len>0&&wake>.7;
  if(player.moving){const speed=43;player.x=Math.max(197,Math.min(286,player.x+dx/len*speed*dt));player.y=Math.max(120,Math.min(192,player.y+dy/len*speed*dt));if(dy)player.dir=dy>0?-1:1;player.step+=dt*11;}
  const target=targetForPlayer();activeTarget=target;
  const show=Boolean(target)&&toastTimer<=0;
  $('interactWrap').hidden=!show;$('touchAction').disabled=!target;$('touchAction').firstChild.textContent=target?target.label+' ':'Undersøk ';
  if(target)$('interactText').textContent=target.label;
 }
}
function draw(){
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);
 let fade=0;
 if(mode==='title')drawCamp(elapsed,false);
 else if(mode==='prologue'){
  const s=scenes[sceneIndex],p=sceneTime/s.duration;
  ctx.save();if(sceneIndex===1&&!reduced){const shake=Math.max(0,p-.3)*1.2;ctx.translate(Math.sin(elapsed*40)*shake,Math.cos(elapsed*33)*shake);}
  if(sceneIndex===0)drawCamp(elapsed,false);
  if(sceneIndex===1)drawCamp(elapsed,true,p);
  if(sceneIndex>=2)drawOtherworld(elapsed,sceneIndex===3,p);
  ctx.restore();
  if(sceneIndex===1&&p>.91)fade=Math.min(1,(p-.91)/.09);
  if(sceneIndex===2&&p<.1)fade=1-p/.1;
 }else{
  drawCave(elapsed);if(wake<1.7)fade=Math.max(0,1-wake/1.7);
 }
 $('fade').style.opacity=String(fade);
}
function frame(now){const dt=last?Math.min((now-last)/1000,.25):0;last=now;update(dt);draw();requestAnimationFrame(frame);}
$('start').onclick=startIntro;
$('continue').onclick=()=>{try{saved=JSON.parse(localStorage.getItem(SAVE_KEY));}catch{}enterCave(true);};
$('skip').onclick=()=>enterCave();$('pause').onclick=()=>togglePause();$('resume').onclick=()=>togglePause(false);$('restart').onclick=startIntro;
$('interact').onclick=interact;$('touchAction').onclick=interact;$('inventory').onclick=openLetter;$('closeLetter').onclick=closeLetter;$('backToGame').onclick=closeLetter;
$('letterDialog').addEventListener('close',()=>{updateAudio();if(lastFocus&&lastFocus.isConnected&&!lastFocus.disabled)lastFocus.focus({preventScroll:true});else canvas.focus({preventScroll:true});});
$('letterDialog').addEventListener('click',e=>{if(e.target===$('letterDialog')){const r=$('letterDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeLetter();}});
$('sound').onclick=async()=>{initAudio();if(!audio)return;try{await audio.ac.resume();}catch{}soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('soundLabel').textContent=soundEnabled?'Lyd på':'Lyd av';$('sound').title=soundEnabled?'Slå av lyd':'Slå på lyd';updateAudio();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('game').requestFullscreen)await $('game').requestFullscreen();else toast('Fullskjerm er ikke tilgjengelig i denne nettleseren.');}catch{toast('Fullskjerm er ikke tilgjengelig her.');}};
function editableTarget(e){return ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable;}
window.addEventListener('keydown',e=>{
 if(editableTarget(e)||$('letterDialog').open)return;
 const k=e.key.toLowerCase();
 if((k==='p'||k==='escape')&&mode!=='title'){e.preventDefault();if(!e.repeat)togglePause();return;}
 if(mode==='title'||paused)return;
 if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k);}
 if(k==='e'){e.preventDefault();if(!e.repeat)interact();}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{clearInputs();if(mode!=='title'&&!paused&&!$('letterDialog').open)togglePause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(mode!=='title'&&!paused&&!$('letterDialog').open)togglePause(true);if(mode==='play')save();}updateAudio();});
window.addEventListener('pagehide',()=>{if(mode==='play')save();});
for(const button of document.querySelectorAll('[data-dir]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='play'||paused||$('letterDialog').open)return;button.setPointerCapture(e.pointerId);held.add(button.dataset.dir);button.classList.add('held');});
 const release=()=>{held.delete(button.dataset.dir);button.classList.remove('held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
canvas.addEventListener('pointerdown',e=>{
 if(mode!=='play'||paused||$('letterDialog').open)return;
 canvas.focus({preventScroll:true});const r=canvas.getBoundingClientRect();const fit=getComputedStyle(canvas).objectFit;const scale=(fit==='contain'?Math.min:Math.max)(r.width/960,r.height/540);const drawW=960*scale,drawH=540*scale;
 const x=(e.clientX-r.left-(r.width-drawW)/2)/(scale*2),y=(e.clientY-r.top-(r.height-drawH)/2)/(scale*2);
 if(!letterTaken&&Math.hypot(x-311,y-166)<16){walkTarget={x:284,y:166};autoInteract=true;}
 else{walkTarget={x:Math.max(197,Math.min(286,x)),y:Math.max(120,Math.min(192,y))};autoInteract=false;}
});
requestAnimationFrame(frame);
})();
