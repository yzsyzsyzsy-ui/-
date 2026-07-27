(function(){
"use strict";
var STORE_KEY="levelUpIntegratedV3",LEGACY_AWAKENING_KEY="levelUpAwakeningV2",LEGACY_COMPLETE_KEY="levelUpCompleteStateV1";
var state,gameData,contentData,workoutPlans,view="onboarding",questTab="daily",forestStage=1,classTab="love",battleBusy=false,activeRunProof=null,memoryStorage={};
var DEFAULT={
 profile:{name:"",rank:"B",gender:"male",createdAt:null},level:1,exp:0,coins:0,
 baseStats:{health:6,knowledge:6,mind:6,self:6,relation:6},
 permanent:{attack:0,magic:0,speed:0,defense:0},
 daily:{},goals:[],showcase:[],journals:{},shopping:{wishlist:[],purchases:[]},learnings:{love:[],life:[]},
 workouts:{
  back:{loops:0,level:1,history:[],awarded:[]},
  push:{loops:0,level:1,history:[],awarded:[]},
  legs:{loops:0,level:1,history:[],awarded:[]}
 },
 smoking:{nonSmoker:false,logs:{},awards:[]},lovePeople:[],mainRewards:{love:false},
 quests:{main:{dungeon1:false},special:[]},
 dungeons:{cleared:[],attempts:{}},inventory:{items:[],awakeningTickets:0,consumables:{}},
 equipped:{weapon:null,shield:null,top:null,bottom:null,shoes:null,bracelet:null},
 talent:{completed:{},boxingSkills:{step:0,oneTwo:0,weaving:0,ducking:0,hook:0,uppercut:0}},
 unlockedForestStages:[1],booksUnlocked:[],levelTrophies:[],settings:{}
};

function storageGet(key){try{return localStorage.getItem(key);}catch(e){return Object.prototype.hasOwnProperty.call(memoryStorage,key)?memoryStorage[key]:null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch(e){memoryStorage[key]=String(value);}}
function storageRemove(key){try{localStorage.removeItem(key);}catch(e){delete memoryStorage[key];}}

function clone(x){return JSON.parse(JSON.stringify(x));}
function uid(){return"id-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];});}
function merge(saved){
 var s=clone(DEFAULT);if(!saved)return s;Object.keys(saved).forEach(function(k){s[k]=saved[k];});
 s.profile=Object.assign({},DEFAULT.profile,saved.profile||{});
 s.baseStats=Object.assign({},DEFAULT.baseStats,saved.baseStats||{});
 s.permanent=Object.assign({},DEFAULT.permanent,saved.permanent||{});
 s.shopping=Object.assign({},DEFAULT.shopping,saved.shopping||{});
 s.learnings=Object.assign({},DEFAULT.learnings,saved.learnings||{});
 s.workouts=Object.assign({},DEFAULT.workouts,saved.workouts||{});
 ["back","push","legs"].forEach(function(k){s.workouts[k]=Object.assign({},DEFAULT.workouts[k],(saved.workouts||{})[k]||{});});
 s.smoking=Object.assign({},DEFAULT.smoking,saved.smoking||{});
 s.mainRewards=Object.assign({},DEFAULT.mainRewards,saved.mainRewards||{});
 s.quests=Object.assign({},DEFAULT.quests,saved.quests||{});s.quests.main=Object.assign({},DEFAULT.quests.main,(saved.quests||{}).main||{});
 s.dungeons=Object.assign({},DEFAULT.dungeons,saved.dungeons||{});
 s.inventory=Object.assign({},DEFAULT.inventory,saved.inventory||{});
 s.equipped=Object.assign({},DEFAULT.equipped,saved.equipped||{});
 s.talent=Object.assign({},DEFAULT.talent,saved.talent||{});s.talent.boxingSkills=Object.assign({},DEFAULT.talent.boxingSkills,(saved.talent||{}).boxingSkills||{});
 s.goals=(s.goals||[]).map(function(g){return Object.assign({},g,{name:g.name||g.title||"목표",progress:Number(g.progress||0)});});
 s.showcase=(s.showcase||[]).map(function(t){return Object.assign({},t,{title:t.title||t.name||"업적",earnedAt:t.earnedAt||new Date().toISOString()});});
 s.shopping.wishlist=(s.shopping.wishlist||[]).map(function(x){return Object.assign({},x,{why:x.why||x.reason||""});});
 s.learnings.love=(s.learnings.love||[]).map(function(x){return Object.assign({},x,{text:x.text||x.content||""});});
 s.learnings.life=(s.learnings.life||[]).map(function(x){return Object.assign({},x,{text:x.text||x.content||""});});
 if(saved.specialQuests&&(!saved.quests||!saved.quests.special)){s.quests.special=saved.specialQuests.map(function(x){return{id:x.id||uid(),name:x.title||"특별 퀘스트",desc:x.desc||"",coin:0,exp:Number(x.exp||0),done:!!x.done};});}
 return s;
}

function load(){
 try{
  var current=storageGet(STORE_KEY);
  if(current)return merge(JSON.parse(current));
  var awakening=storageGet(LEGACY_AWAKENING_KEY);
  if(awakening){var migratedA=merge(JSON.parse(awakening));storageSet(STORE_KEY,JSON.stringify(migratedA));return migratedA;}
  var complete=storageGet(LEGACY_COMPLETE_KEY);
  if(complete){var migratedC=merge(JSON.parse(complete));migratedC.profile.rank=migratedC.profile.rank||"B";storageSet(STORE_KEY,JSON.stringify(migratedC));return migratedC;}
  return clone(DEFAULT);
 }catch(e){console.warn("저장 데이터 복구 실패",e);return clone(DEFAULT);}
}

function save(){storageSet(STORE_KEY,JSON.stringify(state));}
function gameDate(){return new Date(Date.now()+7*60*60*1000).toISOString().slice(0,10);}
function kst(){var d=new Date(Date.now()+9*60*60*1000);return{date:d.toISOString().slice(0,10),hour:d.getUTCHours(),minute:d.getUTCMinutes(),iso:new Date().toISOString()};}
function today(){
 var k=gameDate();
 if(!state.daily[k])state.daily[k]={wake:null,sleep:null,runningKm:0,runProofs:[],workout:null,journal:false,rewarded:false};
 if(!Array.isArray(state.daily[k].runProofs))state.daily[k].runProofs=[];
 return state.daily[k];
}

function expNeed(l){if(l<=9)return 10;if(l===10)return 20;return 30;}
function addExp(n,why){
 state.exp+=Number(n)||0;var up=false;
 while(state.level<100&&state.exp>=expNeed(state.level)){state.exp-=expNeed(state.level);state.level++;awardLevelTrophy(state.level);up=true;}
 save();toast((why||"보상")+" · EXP +"+n);if(up)levelUp();
}
function awardShowcase(title,type,description){
 if(state.showcase.some(function(x){return x.title===title&&x.type===type;}))return;
 state.showcase.push({id:uid(),title:title,type:type,description:description||"",earnedAt:new Date().toISOString()});
}
function awardLevelTrophy(level){
 var map={5:"어른",10:"참된 사람",20:"알파메일",30:"탈인간",40:"신의 조각",50:"신의 형상",100:"세상에서 제일 잘 살고 있는 사람"};
 if(map[level]&&state.levelTrophies.indexOf(level)===-1){state.levelTrophies.push(level);awardShowcase(map[level],"레벨 트로피","Lv."+level+" 달성");}
}

function rankConfig(){return gameData.ranks.find(function(r){return r.rank===state.profile.rank;})||gameData.ranks[0];}
function playerAsset(){return rankConfig().asset;}
function playerImage(cls){return'<div class="character '+(cls||"")+'"><img src="'+playerAsset()+'" alt="플레이어 캐릭터"></div>';}
function statusCard(){
 var pct=state.level>=100?100:Math.min(100,state.exp/expNeed(state.level)*100);
 return'<button class="status-card" data-action="open-status"><div class="sys">PLAYER STATUS</div><div class="status-name">'+esc(state.profile.name)+' · Lv.'+state.level+' · <span class="rank">'+esc(state.profile.rank)+'급</span></div><div class="exp"><span style="width:'+pct+'%"></span></div><div style="display:flex;justify-content:space-between;margin-top:5px"><span class="small muted">'+state.exp+'/'+expNeed(state.level)+' EXP</span><span class="coin">◈ '+state.coins+'</span></div></button>';
}
function modal(title,body,label){closeModal();var w=document.createElement("div");w.id="modal";w.className="modal-backdrop";w.innerHTML='<section class="modal"><button class="secondary close" data-action="close-modal">닫기</button><div class="modal-label">'+esc(label||"SYSTEM")+'</div><h2>'+esc(title)+'</h2>'+body+'</section>';document.body.appendChild(w);}
function closeModal(){var m=document.getElementById("modal");if(m)m.remove();}
function toast(msg){var t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(function(){t.classList.remove("show");},2200);}
function levelUp(){modal("LEVEL UP",'<div class="rank-reveal">Lv.'+state.level+'</div><p style="text-align:center">'+esc(state.profile.name)+'님의 성장 단계가 상승했습니다.</p><button class="primary" style="width:100%" data-action="close-modal">확인</button>',"SYSTEM MESSAGE");}
function itemById(id){for(var s of gameData.talentStages){for(var i of s.items){if(i.id===id)return i;}}return null;}
function equippedItems(){return Object.keys(state.equipped).map(function(k){return itemById(state.equipped[k]);}).filter(Boolean);}
function equipmentBonus(){var b={attack:state.permanent.attack,magic:state.permanent.magic,speed:state.permanent.speed,defense:state.permanent.defense};equippedItems().forEach(function(i){Object.keys(b).forEach(function(k){b[k]+=Number(i.stats[k]||0);});});return b;}
function computedStats(){var b=equipmentBonus();return{health:state.baseStats.health+b.attack,knowledge:state.baseStats.knowledge+b.magic*.5,mind:state.baseStats.mind+b.magic*.5,relation:state.baseStats.relation+b.speed,self:state.baseStats.self+b.defense,attack:b.attack,magic:b.magic,speed:b.speed,defense:b.defense};}
function combatPower(){var s=computedStats();return Math.round(s.health*1.25+s.knowledge*.55+s.mind*.55+s.relation*.7+s.self*.9+s.attack*.65+s.speed*.45+s.defense*.55);}
function dailyStatus(){var d=today();return[{name:"오전 6시 30분까지 기상",done:!!(d.wake&&d.wake.success)},{name:"밤 12시 전 취침",done:!!(d.sleep&&d.sleep.success)},{name:"러닝 10km",done:d.runningKm>=10},{name:"수련장 운동 1회",done:!!d.workout},{name:"뇌내혁명 일기",done:!!d.journal}];}
function checkDaily(){var d=today();if(dailyStatus().every(function(q){return q.done;})&&!d.rewarded){d.rewarded=true;state.coins+=10;save();addExp(10,"일일 퀘스트 전체 완료");toast("일일 퀘스트 보상 · 10 coin");}else save();}
function render(){
 var app=document.getElementById("app");if(!state.profile.name)view="onboarding";
 if(view==="onboarding")renderOnboarding(app);else if(view==="home")renderHome(app);else if(view==="quests")renderQuests(app);
 else if(view==="dungeons")renderDungeons(app);else if(view==="forest")renderForest(app);else if(view==="bag")renderBag(app);
 else if(view==="training")renderTraining(app);else if(view==="showcase")renderShowcase(app);
 else if(view==="classroom")renderClassroom(app);else if(view==="memories")renderMemories(app);else if(view==="goals")renderGoals(app);
 else if(view==="shopping")renderShopping(app);else renderHome(app);
}

function header(title){return'<div class="topbar">'+statusCard()+'<button class="icon-btn" data-nav="home">🏠 홈</button></div><h1 class="section-title">'+esc(title)+'</h1>';}
function renderOnboarding(app){app.innerHTML='<main class="screen"><section class="hero"><h1>LEVEL UP!</h1><p>현실 행동 기반 각성 RPG</p></section><section class="card">'+playerImage("large")+'<div class="rank-reveal">당신은 B급 각성자입니다.</div><label class="label">각성자 이름</label><input id="playerName" class="input" maxlength="20" placeholder="예: 준성"><button class="primary" style="width:100%;margin-top:10px" data-action="start">각성 시작</button></section></main>';}
function renderHome(app){
 var first=state.goals.filter(function(g){return!g.done;}).sort(function(a,b){return a.priority-b.priority;})[0],d=today();
 app.innerHTML='<main class="screen"><div class="topbar">'+statusCard()+'<button class="icon-btn" data-action="settings">⚙️</button></div>'+
 '<div class="action-bar"><button class="secondary" data-action="wake">'+(d.wake?"기상 "+esc(d.wake.time):"기상 인증")+'</button><button class="secondary" data-action="sleep">'+(d.sleep?"취침 "+esc(d.sleep.time):"지금 취침하기")+'</button><button class="secondary" data-action="love-person">사랑 기록</button></div>'+
 '<section class="hub"><div class="hub-top"><div class="hub-side"><button class="hub-btn" data-nav="dungeons">⚔️ 던전<small>보스 전투</small></button><button class="hub-btn" data-nav="forest">🌲 재능의 숲<small>아이템 파밍</small></button><button class="hub-btn" data-nav="training">🏋️ 수련장<small>러닝·헬스</small></button></div>'+playerImage("")+'<div class="hub-side"><button class="hub-btn" data-nav="bag">🎒 가방<small>장착·각성·상점</small></button><button class="hub-btn" data-nav="classroom">📚 강의실<small>마도서·나의 배움</small></button><button class="hub-btn" data-nav="showcase">🏆 진열장<small>목표·훈장·트로피</small></button></div></div>'+
 '<div class="hub-grid"><button class="hub-btn" data-nav="goals">🎯 과녁<small>'+(first?esc(first.name):"목표 설정")+'</small></button><button class="hub-btn" data-nav="memories">🌀 기억들<small>뇌내혁명</small></button><button class="hub-btn" data-nav="shopping">🛍️ 현실 쇼핑<small>지출 관리</small></button><button class="hub-btn" data-nav="quests">📜 퀘스트<small>일일·메인·서브</small></button></div></section>'+
 '<button class="quest-fab" data-nav="quests">⚔️ 퀘스트</button></main>';
}

function renderQuests(app){app.innerHTML='<main class="screen">'+header("QUEST")+'<div class="tabs"><button class="tab '+(questTab==="daily"?"active":"")+'" data-qtab="daily">일일</button><button class="tab '+(questTab==="main"?"active":"")+'" data-qtab="main">메인</button><button class="tab '+(questTab==="sub"?"active":"")+'" data-qtab="sub">서브</button><button class="tab '+(questTab==="special"?"active":"")+'" data-qtab="special">특별</button></div>'+questBody()+'</main>';}
function questBody(){
 if(questTab==="daily"){
  var q=dailyStatus(),done=q.filter(function(x){return x.done;}).length;
  return'<section class="card"><h2>오늘을 지배하는 자</h2><div class="progress"><span style="width:'+(done/5*100)+'%"></span></div><p class="muted">'+done+'/5 완료 · 보상 EXP 10 + 10 coin</p><div class="quest-list">'+q.map(function(x){return'<div class="list-item quest-row"><div class="checkmark '+(x.done?"done":"")+'">'+(x.done?"✓":"")+'</div><strong>'+esc(x.name)+'</strong><span class="badge '+(x.done?"ok":"warn")+'">'+(x.done?"완료":"진행 중")+'</span></div>';}).join("")+'</div></section>';
 }
 if(questTab==="main"){
  var dungeonDone=state.dungeons.cleared.indexOf(1)!==-1,loveDone=state.lovePeople.length>0;
  return'<div class="list-item"><div class="modal-label">MAIN QUEST</div><h2>1단계 던전 클리어하기</h2><p>과거의 회랑에서 과거 지배자를 쓰러뜨리세요.</p><span class="badge '+(dungeonDone?"ok":"warn")+'">'+(dungeonDone?"완료":"미완료")+'</span> <button class="primary" data-nav="dungeons">던전으로 이동</button></div>'+
  '<div class="list-item"><div class="modal-label">MAIN QUEST</div><h2>사랑 찾아 인생을 찾아</h2><p>사랑하는 사람의 이름 또는 별명과 기억하고 싶은 내용을 기록하세요.</p><span class="badge '+(loveDone?"ok":"warn")+'">'+(loveDone?"완료 · EXP 100":"미완료")+'</span> <button class="primary" data-action="love-person">기록하기</button></div>';
 }
 if(questTab==="sub"){
  var days=state.smoking.nonSmoker?365:Object.keys(state.smoking.logs).filter(function(k){return state.smoking.logs[k];}).length;
  return'<div class="list-item"><div class="modal-label">SUB QUEST</div><h2>금연 기록</h2><p>현재 성공 기록 '+days+'일</p><p class="muted">14일 EXP 50 · 30일 EXP 60 · 90일 EXP 100 · 365일 EXP 200</p><button class="primary" data-action="smoking">오늘 기록</button></div>';
 }
 return'<section class="card"><h2>특별 퀘스트</h2><input id="specialName" class="input" placeholder="퀘스트 이름"><textarea id="specialDesc" class="textarea" placeholder="완료 조건"></textarea><div class="row"><input id="specialCoin" class="input" type="number" min="0" value="5"><input id="specialExp" class="input" type="number" min="0" value="0"></div><button class="primary" data-action="add-special">추가</button></section>'+
 state.quests.special.map(function(x){return'<div class="list-item"><strong>'+esc(x.name)+'</strong><p class="muted">'+esc(x.desc||"")+' · '+Number(x.coin||0)+' coin · '+Number(x.exp||0)+' EXP</p>'+(x.done?'<span class="badge ok">완료</span>':'<button class="primary" data-action="complete-special" data-id="'+x.id+'">완료</button>')+' <button class="danger" data-action="delete-special" data-id="'+x.id+'">삭제</button></div>';}).join("");
}

function renderDungeons(app){app.innerHTML='<main class="screen">'+header("DUNGEON")+'<div class="grid2">'+gameData.dungeons.map(function(d){var clear=state.dungeons.cleared.indexOf(d.stage)!==-1;return'<article class="card dungeon-card" style="background-image:url('+d.background+')"><div class="modal-label">STAGE '+d.stage+'</div><h2>'+esc(d.name)+'</h2><p>'+esc(d.minion)+' → '+esc(d.boss)+'</p><p class="small">권장 전투력 '+d.power+' · 현재 '+combatPower()+'</p><span class="badge '+(clear?"ok":"warn")+'">'+(clear?"클리어":"도전 가능")+'</span><button class="primary" data-action="open-dungeon" data-stage="'+d.stage+'">입장</button></article>';}).join("")+'</div></main>';}
function dungeonModal(stage){var d=gameData.dungeons.find(function(x){return x.stage===stage;});modal(d.name,'<div class="enemy-row"><div><div class="enemy-portrait"><img src="'+d.minionAsset+'"></div><p>'+esc(d.minion)+'</p></div><div><div class="enemy-portrait"><img src="'+d.bossAsset+'"></div><p>'+esc(d.boss)+'</p></div></div><p>권장 전투력 '+d.power+' · 현재 전투력 '+combatPower()+'</p><button class="primary" style="width:100%" data-action="start-battle" data-stage="'+stage+'">도전하기</button>',"DUNGEON GATE");}
function renderForest(app){
 var stage=gameData.talentStages.find(function(x){return x.stage===forestStage;});
 app.innerHTML='<main class="screen">'+header("TALENT FOREST")+'<div class="tabs">'+gameData.talentStages.map(function(s){var unlocked=state.unlockedForestStages.indexOf(s.stage)!==-1;return'<button class="tab '+(forestStage===s.stage?"active":"")+'" data-forest-stage="'+s.stage+'" '+(unlocked?"":"disabled")+'> '+s.stage+'단계</button>';}).join("")+'</div><section class="forest" style="background-image:url('+stage.background+')"><div class="forest-title">재능의 숲 '+stage.stage+'단계</div><div class="item-grid">'+stage.items.map(function(i){var owned=state.inventory.items.indexOf(i.id)!==-1;return'<button class="loot-card '+(owned?"owned":"")+'" data-action="inspect-item" data-id="'+i.id+'"><img src="'+i.asset+'"><strong>'+esc(i.name)+'</strong><p class="small muted">'+(owned?"파밍 완료":"클릭하여 조건 확인")+'</p></button>';}).join("")+'</div></section></main>';
}
function inspectItem(id){var item=itemById(id),ch=gameData.challenges[item.condition],done=!!state.talent.completed[item.condition];modal(item.name,'<img src="'+item.asset+'" style="width:100%;height:240px;object-fit:contain"><div class="warning">경고: 이 아이템을 파밍하려면 파밍 조건을 만족하세요.</div><p><strong>'+esc(ch.category)+' '+ch.level+'단계</strong> · '+esc(ch.description)+'</p><p>공격 '+item.stats.attack+' · 마력 '+item.stats.magic+' · 스피드 '+item.stats.speed+' · 방어 '+item.stats.defense+'</p>'+(done?'<button class="primary" data-action="claim-item" data-id="'+item.id+'">아이템 파밍</button>':'<button class="primary" data-action="open-challenge" data-id="'+item.condition+'">파밍 조건으로 이동</button>'),"FARMING WARNING");}
function challengeModal(id){
 var ch=gameData.challenges[id],body='<p>'+esc(ch.description)+'</p>';
 if(ch.type==="boxingSkills"){var names={step:"스텝",oneTwo:"원투",weaving:"위빙",ducking:"더킹",hook:"훅",uppercut:"어퍼컷"};body+='<div class="grid2">'+Object.keys(names).map(function(k){return'<label class="card">'+names[k]+'<input class="input boxing-skill" data-skill="'+k+'" type="number" min="0" max="10" value="'+state.talent.boxingSkills[k]+'"></label>';}).join("")+'</div><button class="primary" data-action="save-boxing1">단계 저장</button>';}
 else if(ch.type==="doubleCheck"){body+='<label class="list-item"><input id="double1" type="checkbox"> 9600 이상 1회</label><label class="list-item"><input id="double2" type="checkbox"> 9600 이상 2회 연속</label><button class="primary" data-action="complete-challenge" data-id="'+id+'">완료 확인</button>';}
 else{body+='<label class="list-item"><input id="challengeCheck" type="checkbox"> 조건을 안전하게 완료했습니다.</label><button class="primary" data-action="complete-challenge" data-id="'+id+'">완료 확인</button>';}
 modal(ch.title,body,"TALENT CHALLENGE");
}
function renderBag(app){
 var items=state.inventory.items.map(itemById).filter(Boolean),bonus=equipmentBonus();
 app.innerHTML='<main class="screen">'+header("BAG")+'<section class="card"><div class="item-head"><div><h2>각성</h2><p class="muted">각성도전권 '+state.inventory.awakeningTickets+'개 · 현재 '+state.profile.rank+'급</p></div><button class="primary" data-action="awaken">각성 도전</button></div></section><h2>장착 슬롯</h2><div class="slot-grid">'+gameData.slots.map(function(s){var id=state.equipped[s.id],i=id?itemById(id):null;return'<div class="slot"><strong>'+s.name+'</strong><p>'+(i?esc(i.name):"비어 있음")+'</p>'+(i?'<button class="danger" data-action="unequip" data-slot="'+s.id+'">해제</button>':'')+'</div>';}).join("")+'</div><h2>가방 아이템</h2><div class="inventory-grid">'+(items.length?items.map(function(i){return'<div class="inventory-item"><img src="'+i.asset+'"><strong>'+esc(i.name)+'</strong><p class="small">공격 '+i.stats.attack+' · 마력 '+i.stats.magic+' · 스피드 '+i.stats.speed+' · 방어 '+i.stats.defense+'</p><button class="primary" data-action="equip" data-id="'+i.id+'">장착</button></div>';}).join(""):'<div class="card muted">아직 파밍한 아이템이 없습니다.</div>')+'</div><h2>시스템 상점</h2><div class="shop-grid">'+gameData.systemShop.map(function(x){return'<div class="list-item"><strong>'+esc(x.name)+'</strong><p class="muted">'+esc(x.description)+'</p><button class="primary" data-action="buy-system" data-id="'+x.id+'">'+x.price+' coin</button></div>';}).join("")+'</div><section class="card"><h2>장착 보너스</h2><p>공격 '+bonus.attack+' · 마력 '+bonus.magic+' · 스피드 '+bonus.speed+' · 방어 '+bonus.defense+'</p></section></main>';
}
function renderClassroom(app){
 var mine=state.learnings[classTab]||[],books=contentData[classTab]||[];
 app.innerHTML='<main class="screen">'+header("ARCANE CLASSROOM")+
 '<div class="tabs"><button class="tab '+(classTab==="love"?"active":"")+'" data-class="love">사랑</button><button class="tab '+(classTab==="life"?"active":"")+'" data-class="life">인생</button></div>'+
 '<section class="card"><h2>나의 배움 추가</h2><input id="learnTitle" class="input" placeholder="제목"><textarea id="learnText" class="textarea" placeholder="내가 배운 내용"></textarea><button class="primary" data-action="add-learning">책으로 저장</button></section>'+
 '<h2>나의 배움</h2><div class="grimoire-grid">'+(mine.length?mine.map(function(b){return'<button class="personal-book" data-action="open-learning" data-id="'+b.id+'"><strong>'+esc(b.title)+'</strong><p class="muted small">'+esc((b.text||"").slice(0,90))+'</p></button>';}).join(""):'<div class="card muted">아직 저장한 배움이 없습니다.</div>')+'</div>'+
 '<h2>시스템 마도서</h2><div class="grimoire-grid">'+books.map(function(b){var unlocked=state.booksUnlocked.indexOf(b.id)!==-1;return'<button class="grimoire '+(unlocked?"":"locked")+'" data-action="open-book" data-id="'+b.id+'"><strong>'+esc(b.title)+'</strong><p>'+esc(b.section)+' · '+(unlocked?"열람 가능":"봉인됨")+'</p>'+(unlocked?"":'<span class="lock-price">해제 1 coin</span>')+'</button>';}).join("")+'</div></main>';
}

function findBook(id){return(contentData.love||[]).concat(contentData.life||[]).find(function(x){return x.id===id;});}
function renderMemories(app){
 var k=gameDate(),t=state.journals[k]?state.journals[k].text:"",entries=Object.keys(state.journals).sort().reverse();
 app.innerHTML='<main class="screen">'+header("MEMORIES")+
 '<section class="card"><h2>'+k+' · 뇌내혁명</h2><textarea id="journal" class="textarea" placeholder="오늘 있었던 일, 감정, 배운 것, 내일의 한마디를 기록하세요.">'+esc(t)+'</textarea><p class="muted small">20자 이상 저장하면 일일 퀘스트가 완료됩니다.</p><button class="primary" data-action="save-journal">저장</button></section>'+
 '<div class="history-grid">'+entries.map(function(date){return'<button class="list-item" data-action="open-journal" data-id="'+date+'"><strong>'+date+'</strong><p class="muted">'+esc((state.journals[date].text||"").slice(0,120))+'</p></button>';}).join("")+'</div></main>';
}

function renderGoals(app){
 var goals=state.goals.slice().sort(function(a,b){return a.priority-b.priority;});
 app.innerHTML='<main class="screen">'+header("TARGET")+
 '<section class="card"><input id="goalName" class="input" placeholder="목표 이름"><div class="goal-controls"><input id="goalPriority" class="input" type="number" min="1" value="'+(goals.length+1)+'"><input id="goalProgress" class="input" type="number" min="0" max="100" value="0"></div><button class="primary" data-action="add-goal">목표 추가</button></section>'+
 goals.map(function(g){return'<div class="list-item"><div class="item-head"><div><strong>'+g.priority+'순위 · '+esc(g.name)+'</strong><p class="muted">진행률 '+Number(g.progress||0)+'%</p></div><span class="badge '+(g.done?"ok":"warn")+'">'+(g.done?"달성":"진행 중")+'</span></div><div class="progress"><span style="width:'+Number(g.progress||0)+'%"></span></div><div class="row">'+(!g.done?'<button class="secondary" data-action="edit-goal" data-id="'+g.id+'">수정</button><button class="primary" data-action="goal-done" data-id="'+g.id+'">달성 체크</button>':'')+'<button class="danger" data-action="delete-goal" data-id="'+g.id+'">삭제</button></div></div>';}).join("")+'</main>';
}

function renderShopping(app){
 var total=state.shopping.purchases.reduce(function(s,x){return s+Number(x.price||0);},0);
 app.innerHTML='<main class="screen">'+header("REAL SHOPPING")+
 '<section class="card"><input id="shopName" class="input" placeholder="이름"><input id="shopPrice" class="input" type="number" min="0" placeholder="가격"><textarea id="shopWhy" class="textarea" placeholder="살 이유"></textarea><button class="primary" data-action="add-shopping">추가</button></section>'+
 '<h2>구매 예정</h2>'+(state.shopping.wishlist.length?state.shopping.wishlist.map(function(x){return'<div class="list-item"><strong>'+esc(x.name)+'</strong><p>'+Number(x.price).toLocaleString("ko-KR")+'원 · '+esc(x.why||"")+'</p><button class="primary" data-action="buy-real" data-id="'+x.id+'">구매 완료</button> <button class="secondary" data-action="edit-shopping" data-id="'+x.id+'">수정</button> <button class="danger" data-action="delete-shopping" data-id="'+x.id+'">삭제</button></div>';}).join(""):'<div class="card muted">구매 예정 항목이 없습니다.</div>')+
 '<h2>쇼핑 지출</h2><div class="card"><div class="total">'+total.toLocaleString("ko-KR")+'원</div></div>'+
 state.shopping.purchases.map(function(x){return'<div class="list-item"><strong>'+esc(x.name)+'</strong><p>'+Number(x.price).toLocaleString("ko-KR")+'원</p><button class="secondary" data-action="restore-shopping" data-id="'+x.id+'">되돌리기</button> <button class="danger" data-action="delete-purchase" data-id="'+x.id+'">삭제</button></div>';}).join("")+'</main>';
}

function openStatus(){
 var s=computedStats(),workoutCount=["back","push","legs"].reduce(function(n,k){return n+state.workouts[k].history.length;},0);
 modal("플레이어 상태",playerImage("")+
 '<div class="summary-strip"><div><span class="muted small">전투력</span><strong>'+combatPower()+'</strong></div><div><span class="muted small">운동 완료</span><strong>'+workoutCount+'</strong></div><div><span class="muted small">각성권</span><strong>'+state.inventory.awakeningTickets+'</strong></div></div>'+
 '<div class="stat-grid"><div class="stat">체력<strong>'+s.health.toFixed(1)+'</strong></div><div class="stat">지식<strong>'+s.knowledge.toFixed(1)+'</strong></div><div class="stat">정신력<strong>'+s.mind.toFixed(1)+'</strong></div><div class="stat">인간관계<strong>'+s.relation.toFixed(1)+'</strong></div><div class="stat">자기관리<strong>'+s.self.toFixed(1)+'</strong></div><div class="stat">coin<strong>'+state.coins+'</strong></div></div>',"PLAYER STATUS");
}


function renderTraining(app){
 var d=today();
 app.innerHTML='<main class="screen">'+header("TRAINING")+
 '<section class="card"><div class="modal-label">RUNNING QUEST</div><h2>오늘 누적 '+Number(d.runningKm||0).toFixed(2)+'km</h2><input id="runPhoto" class="input" type="file" accept="image/*"><img id="runPreview" class="preview" alt="러닝 기록 미리보기" hidden><div class="row"><input id="runDate" class="input" type="date" value="'+kst().date+'"><input id="runTime" class="input" type="time"></div><input id="runKm" class="input" type="number" min="0" step="0.01" placeholder="거리(km)"><div id="ocrStatus" class="muted small">사진 선택 후 자동 분석을 누르거나 직접 입력하세요.</div><div class="row"><button class="secondary" data-action="ocr-run">사진 자동 분석</button><button class="primary" data-action="save-run">오늘 기록에 추가</button></div><p class="muted small">이미지 날짜가 오늘과 다르면 누적하지 않으며 같은 이미지는 중복 등록되지 않습니다.</p></section>'+
 '<section class="card"><div class="modal-label">WORKOUT QUEST</div><h2>운동 루틴</h2><div class="grid3">'+["back","push","legs"].map(function(k){var p=state.workouts[k],plan=workoutPlans[k];return'<button class="hub-btn" data-routine="'+k+'"><strong>'+esc(plan.name)+'</strong><small>'+p.level+'단계 · '+p.loops+'바퀴</small></button>';}).join("")+'</div><p class="muted small">4회 완료할 때마다 다음 단계로 올라갑니다. 무게는 강제값이 아니라 개인 상태에 맞춘 참고값입니다.</p></section>'+
 '<h2>최근 운동 기록</h2><div class="history-grid">'+[].concat.apply([],["back","push","legs"].map(function(k){return state.workouts[k].history.map(function(h){return Object.assign({routine:k},h);});})).sort(function(a,b){return new Date(b.completedAt)-new Date(a.completedAt);}).slice(0,12).map(function(h){return'<div class="list-item"><strong>'+esc(workoutPlans[h.routine].name)+'</strong><p class="muted">'+esc(h.date||"")+" · "+new Date(h.completedAt).toLocaleString("ko-KR")+'</p></div>';}).join("")+'</div></main>';
}
function renderShowcase(app){
 var items=state.showcase.slice().sort(function(a,b){return new Date(b.earnedAt)-new Date(a.earnedAt);});
 app.innerHTML='<main class="screen">'+header("SHOWCASE")+'<div class="showcase-grid">'+(items.length?items.map(function(t){return'<article class="trophy"><div class="trophy-icon">🏆</div><strong>'+esc(t.title)+'</strong><p class="muted small">'+esc(t.type||"업적")+'</p><p class="small">'+esc(t.description||"")+'</p><span class="badge">'+new Date(t.earnedAt).toLocaleDateString("ko-KR")+'</span></article>';}).join(""):'<div class="card muted">아직 전시된 목표·훈장·트로피가 없습니다.</div>')+'</div></main>';
}
function previewRun(file){var img=document.getElementById("runPreview");if(!file||!img)return;img.src=URL.createObjectURL(file);img.hidden=false;activeRunProof=null;}
async function hashFile(file){
 if(window.crypto&&crypto.subtle){var buf=await file.arrayBuffer(),digest=await crypto.subtle.digest("SHA-256",buf);return Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");}
 return file.name+"-"+file.size+"-"+file.lastModified;
}
function parseOcr(text){
 var normalized=text.replace(/,/g,"."),kms=Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:km|KM|㎞)/g)).map(function(m){return Number(m[1]);}).filter(function(n){return n>0&&n<200;}),date=null,time=null,m;
 m=normalized.match(/(20\d{2})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/);if(m)date=m[1]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[3]).padStart(2,"0");
 if(!date){m=normalized.match(/(\d{1,2})[.\-\/월]\s*(\d{1,2})/);if(m)date=kst().date.slice(0,4)+"-"+String(m[1]).padStart(2,"0")+"-"+String(m[2]).padStart(2,"0");}
 m=normalized.match(/([01]?\d|2[0-3])[:시]\s*([0-5]\d)/);if(m)time=String(m[1]).padStart(2,"0")+":"+m[2];
 return{km:kms.length?Math.max.apply(null,kms):null,date:date,time:time,text:text};
}
async function loadTesseract(){
 if(window.Tesseract)return true;
 return new Promise(function(resolve){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";s.onload=function(){resolve(true);};s.onerror=function(){resolve(false);};document.head.appendChild(s);});
}
async function ocrRun(){
 var file=document.getElementById("runPhoto").files[0];if(!file){toast("먼저 러닝 사진을 선택해주세요.");return;}
 var status=document.getElementById("ocrStatus");status.textContent="OCR 엔진을 불러오는 중...";
 if(!await loadTesseract()){status.textContent="자동 분석을 불러오지 못했습니다. 직접 입력해주세요.";return;}
 try{
  var result=await Tesseract.recognize(file,"eng+kor",{logger:function(m){if(m.progress)status.textContent="사진 분석 "+Math.round(m.progress*100)+"%";}}),parsed=parseOcr(result.data.text||"");
  if(parsed.date)document.getElementById("runDate").value=parsed.date;if(parsed.time)document.getElementById("runTime").value=parsed.time;if(parsed.km)document.getElementById("runKm").value=parsed.km;
  activeRunProof={hash:await hashFile(file),ocr:parsed};status.textContent="인식 완료 · 날짜 "+(parsed.date||"미확인")+" · 거리 "+(parsed.km||"미확인")+"km";
 }catch(e){console.error(e);status.textContent="자동 분석 실패. 날짜와 거리를 직접 입력해주세요.";}
}
async function saveRun(){
 var file=document.getElementById("runPhoto").files[0],date=document.getElementById("runDate").value,time=document.getElementById("runTime").value,km=Number(document.getElementById("runKm").value);
 if(!date||!(km>0)){toast("날짜와 거리를 확인해주세요.");return;}if(date!==kst().date){toast("오늘의 러닝을 인증해주세요!");return;}
 var hash=activeRunProof&&activeRunProof.hash;if(!hash&&file)hash=await hashFile(file);var d=today();
 if(hash&&d.runProofs.some(function(p){return p.hash===hash;})){toast("이미 등록한 이미지입니다.");return;}
 d.runningKm+=km;d.runProofs.push({hash:hash||uid(),date:date,time:time,km:km,addedAt:new Date().toISOString()});save();checkDaily();render();toast(km+"km가 누적되었습니다.");
}
function routineModal(key){
 var plan=workoutPlans[key],p=state.workouts[key],stage=workoutPlans.stages[p.level-1],remaining=4-(p.loops%4);
 modal(plan.name+" · "+p.level+"단계",'<p class="muted">'+esc(stage.note)+'</p><p>완료 '+p.loops+'바퀴 · 다음 단계까지 '+remaining+'회</p><div class="quest-list">'+plan.exercises.map(function(ex){return'<label class="list-item workout-row"><input class="routineCheck" type="checkbox"><div><strong>'+esc(ex.name)+'</strong><p class="muted">'+esc(ex.weight)+' · '+esc(ex.reps)+' · '+ex.sets+'세트</p></div></label>';}).join("")+'</div><label class="list-item"><input id="safeConfirm" type="checkbox"> 자세가 안정적이었고 통증이 없었습니다.</label><button class="primary" data-action="complete-routine" data-routine-key="'+key+'">루틴 완료</button>',"TRAINING SYSTEM");
}
function completeRoutine(key){
 var checks=Array.from(document.querySelectorAll(".routineCheck"));if(!checks.length||!checks.every(function(x){return x.checked;})){toast("모든 운동을 체크해주세요.");return;}if(!document.getElementById("safeConfirm").checked){toast("안전 확인 항목을 체크해주세요.");return;}
 var d=today();if(d.workout){toast("오늘 헬스 퀘스트는 이미 완료되었습니다.");return;}var p=state.workouts[key],old=p.level;p.loops++;p.level=Math.min(10,Math.floor(p.loops/4)+1);p.history.push({date:gameDate(),completedAt:new Date().toISOString(),level:p.level});d.workout={routine:key,completedAt:new Date().toISOString()};state.baseStats.health+=.5;
 if(p.level!==old&&p.level%2===0&&p.awarded.indexOf(p.level)===-1){p.awarded.push(p.level);var medal=workoutPlans[key].medals[String(p.level)];if(medal)awardShowcase(medal,workoutPlans[key].name+" 훈장",p.level+"단계 달성");}
 save();checkDaily();closeModal();render();toast(workoutPlans[key].name+" 완료");
}
function evaluateSmoking(){
 var days=state.smoking.nonSmoker?365:Object.keys(state.smoking.logs).filter(function(k){return state.smoking.logs[k];}).length;
 [{d:14,xp:50},{d:30,xp:60},{d:90,xp:100},{d:365,xp:200}].forEach(function(m){if(days>=m.d&&state.smoking.awards.indexOf(m.d)===-1){state.smoking.awards.push(m.d);awardShowcase("금연 "+m.d+"일","서브퀘스트","금연 기록 달성");addExp(m.xp,"금연 "+m.d+"일");}});save();
}
function loveModal(){
 modal("사랑 찾아 인생을 찾아",'<input id="loveName" class="input" placeholder="이름 또는 별명"><textarea id="loveInfo" class="textarea" placeholder="그 사람에 대해 기억하고 싶은 내용"></textarea><p class="muted small">주소, 연락처, 비밀번호 등 민감한 개인정보는 적지 마세요.</p><button class="primary" data-action="save-love-person">저장</button>',"MAIN QUEST");
}
function editGoal(id){
 var g=state.goals.find(function(x){return x.id===id;});if(!g)return;
 modal("목표 수정",'<input id="editGoalName" class="input" value="'+esc(g.name)+'"><div class="row"><input id="editGoalPriority" class="input" type="number" min="1" value="'+g.priority+'"><input id="editGoalProgress" class="input" type="number" min="0" max="100" value="'+Number(g.progress||0)+'"></div><button class="primary" data-action="save-goal-edit" data-id="'+id+'">저장</button>',"TARGET EDIT");
}
function editShopping(id){
 var x=state.shopping.wishlist.find(function(v){return v.id===id;});if(!x)return;
 modal("쇼핑 항목 수정",'<input id="editShopName" class="input" value="'+esc(x.name)+'"><input id="editShopPrice" class="input" type="number" min="0" value="'+Number(x.price||0)+'"><textarea id="editShopWhy" class="textarea">'+esc(x.why||"")+'</textarea><button class="primary" data-action="save-shopping-edit" data-id="'+id+'">저장</button>',"SHOP EDIT");
}

function settings(){
 modal("설정 및 백업",'<div class="stack"><button class="secondary" data-action="export">통합 데이터 내보내기</button><label class="secondary" style="text-align:center">데이터 불러오기<input id="importFile" type="file" accept="application/json" hidden></label><button class="danger" data-action="reset">전체 초기화</button></div><p class="muted small">이전 COMPLETE V1 또는 Awakening V2 저장 데이터가 있으면 첫 실행 때 자동으로 이전합니다.</p>',"SYSTEM SETTINGS");
}

function startBattle(stage){
 if(battleBusy)return;battleBusy=true;closeModal();
 var d=gameData.dungeons.find(function(x){return x.stage===stage;}),potion=Number(state.inventory.consumables["heal-potion"]||0)>0,boost=potion?12:0;
 modal(d.name,'<div class="arena" style="background-image:url('+d.background+')"><div id="battleLog" class="battle-log">'+esc(d.minion)+'들이 접근합니다...</div><div id="playerF" class="fighter player"><img src="'+playerAsset()+'"></div><div id="enemyF" class="fighter enemy"><img src="'+d.bossAsset+'"></div></div><p class="small muted">전투력 '+combatPower()+(boost?" + 포션 12":"")+' / 권장 '+d.power+'</p>',"BATTLE");
 var player=document.getElementById("playerF"),enemy=document.getElementById("enemyF"),log=document.getElementById("battleLog");
 setTimeout(function(){player.classList.add("attack-left");log.textContent="플레이어가 전진 공격합니다!";},450);
 setTimeout(function(){enemy.classList.add("hit");player.classList.remove("attack-left");log.textContent=d.minion+" 격파. "+d.boss+"가 등장합니다.";},1100);
 setTimeout(function(){enemy.classList.remove("hit");enemy.classList.add("attack-right");log.textContent=d.boss+"의 반격!";},1750);
 setTimeout(function(){
  enemy.classList.remove("attack-right");player.classList.add("hit");
  var chance=Math.min(.96,Math.max(.08,(combatPower()+boost)/d.power*.72)),win=Math.random()<chance;
  if(potion){state.inventory.consumables["heal-potion"]--;save();}
  if(win){
   enemy.classList.add("lose");log.textContent="던전 클리어! 각성도전권 1개를 획득했습니다.";
   if(state.dungeons.cleared.indexOf(stage)===-1){state.dungeons.cleared.push(stage);state.inventory.awakeningTickets++;if(stage===1)state.quests.main.dungeon1=true;save();}
  }else{player.classList.add("lose");log.textContent="패배했습니다. 아이템을 장착하거나 능력치를 높인 뒤 다시 도전하세요.";}
  battleBusy=false;setTimeout(function(){var m=document.querySelector(".modal");if(m)m.insertAdjacentHTML("beforeend",'<button class="primary" style="width:100%" data-action="close-modal">전투 종료</button>');},650);
 },2500);
}
function claimItem(id){
 if(state.inventory.items.indexOf(id)===-1)state.inventory.items.push(id);
 var st=gameData.talentStages.find(function(s){return s.items.some(function(i){return i.id===id;});}).stage;
 if(st<4&&state.unlockedForestStages.indexOf(st+1)===-1)state.unlockedForestStages.push(st+1);
 save();closeModal();render();toast("아이템이 가방에 추가되었습니다.");
}
function awaken(){
 if(state.inventory.awakeningTickets<1){toast("각성도전권이 없습니다.");return;}
 var cfg=rankConfig();if(!cfg.next){toast("최고 각성 등급입니다.");return;}
 state.inventory.awakeningTickets--;var win=Math.random()<cfg.chance;if(win)state.profile.rank=cfg.next;save();
 modal(win?"각성 성공":"각성 실패",'<div class="rank-reveal">'+(win?esc(cfg.next)+"급 각성자":esc(cfg.rank)+"급 유지")+'</div><p style="text-align:center">성공 확률 '+Math.round(cfg.chance*100)+'% · 도전권은 소모되었습니다.</p><button class="primary" style="width:100%" data-action="close-modal">확인</button>',"AWAKENING");
}
function openBook(id){
 var b=findBook(id),unlocked=state.booksUnlocked.indexOf(id)!==-1;
 if(!unlocked){
  if(state.coins<1){toast("coin이 부족합니다.");return;}
  state.coins--;state.booksUnlocked.push(id);state.baseStats.knowledge+=.5;state.baseStats.mind+=.5;save();toast("마도서 해제 · 지식 +0.5 · 정신력 +0.5");
 }
 modal(b.title,'<span class="badge">'+esc(b.section)+'</span><p>'+esc(b.text)+'</p>',"ARCANE BOOK");
}
function bind(){
 document.addEventListener("click",function(e){
  var nav=e.target.closest("[data-nav]");if(nav){view=nav.dataset.nav;render();return;}
  var qt=e.target.closest("[data-qtab]");if(qt){questTab=qt.dataset.qtab;render();return;}
  var fs=e.target.closest("[data-forest-stage]");if(fs&&!fs.disabled){forestStage=Number(fs.dataset.forestStage);render();return;}
  var cl=e.target.closest("[data-class]");if(cl){classTab=cl.dataset.class;render();return;}
  var routine=e.target.closest("[data-routine]");if(routine){routineModal(routine.dataset.routine);return;}
  var a=e.target.closest("[data-action]");if(!a)return;var act=a.dataset.action,id=a.dataset.id;
  if(act==="close-modal")closeModal();
  else if(act==="start"){
   var n=document.getElementById("playerName").value.trim();if(!n){toast("이름을 입력해주세요.");return;}
   state.profile.name=n;state.profile.rank="B";state.profile.createdAt=new Date().toISOString();save();view="home";render();
   modal("각성자 등록 완료",'<div class="rank-reveal">당신은 B급 각성자입니다.</div><p style="text-align:center">'+esc(n)+'님, 통합 시스템 접속을 시작합니다.</p><button class="primary" style="width:100%" data-action="close-modal">입장</button>',"AWAKENING");
  }
  else if(act==="open-status")openStatus();
  else if(act==="settings")settings();
  else if(act==="wake"){
   var d=today(),now=kst();if(d.wake){toast("오늘 기상 인증이 이미 있습니다.");return;}
   d.wake={time:String(now.hour).padStart(2,"0")+":"+String(now.minute).padStart(2,"0"),success:now.hour<6||(now.hour===6&&now.minute<=30),iso:now.iso};save();checkDaily();render();toast(d.wake.success?"기상 퀘스트 성공":"기상 시간이 기록되었습니다.");
  }
  else if(act==="sleep"){
   var d2=today(),n2=kst();if(!d2.wake){toast("먼저 기상 인증을 해주세요.");return;}if(d2.sleep){toast("오늘 취침 기록이 이미 있습니다.");return;}
   d2.sleep={time:String(n2.hour).padStart(2,"0")+":"+String(n2.minute).padStart(2,"0"),success:n2.hour>=2,iso:n2.iso};save();checkDaily();render();toast(d2.sleep.success?"취침 퀘스트 성공":"취침 시간이 기록되었습니다.");
  }
  else if(act==="smoking"){
   modal("금연 서브퀘스트",'<label class="list-item"><input id="nonSmoker" type="checkbox" '+(state.smoking.nonSmoker?"checked":"")+'> 나는 비흡연자입니다.</label><p class="muted">비흡연자는 금연 조건을 달성한 것으로 간주합니다.</p><div class="stack"><button class="primary" data-action="smoke-ok">오늘 금연 성공</button><button class="secondary" data-action="smoke-skip">오늘 기록하지 않음</button></div>',"SUB QUEST");
  }
  else if(act==="smoke-ok"){
   state.smoking.nonSmoker=document.getElementById("nonSmoker").checked;state.smoking.logs[gameDate()]=true;save();evaluateSmoking();closeModal();render();toast("금연 기록 완료");
  }
  else if(act==="smoke-skip"){state.smoking.nonSmoker=document.getElementById("nonSmoker").checked;delete state.smoking.logs[gameDate()];save();closeModal();render();}
  else if(act==="love-person")loveModal();
  else if(act==="save-love-person"){
   var ln=document.getElementById("loveName").value.trim();if(!ln){toast("이름 또는 별명을 입력해주세요.");return;}
   state.lovePeople.push({id:uid(),name:ln,info:document.getElementById("loveInfo").value.trim(),createdAt:new Date().toISOString()});
   if(!state.mainRewards.love){state.mainRewards.love=true;awardShowcase("사랑 찾아 인생을 찾아","메인 퀘스트","소중한 사람 기록");save();addExp(100,"메인 퀘스트 완료");}else save();
   closeModal();render();
  }
  else if(act==="add-special"){
   var name=document.getElementById("specialName").value.trim();if(!name){toast("퀘스트 이름을 입력해주세요.");return;}
   state.quests.special.push({id:uid(),name:name,desc:document.getElementById("specialDesc").value.trim(),coin:Number(document.getElementById("specialCoin").value)||0,exp:Number(document.getElementById("specialExp").value)||0,done:false});save();render();
  }
  else if(act==="complete-special"){
   var sp=state.quests.special.find(function(x){return x.id===id;});if(sp&&!sp.done){sp.done=true;state.coins+=Number(sp.coin||0);save();if(Number(sp.exp||0)>0)addExp(Number(sp.exp),"특별 퀘스트 완료");else{render();toast("특별 퀘스트 완료");}}
  }
  else if(act==="delete-special"){state.quests.special=state.quests.special.filter(function(x){return x.id!==id;});save();render();}
  else if(act==="open-dungeon")dungeonModal(Number(a.dataset.stage));
  else if(act==="start-battle")startBattle(Number(a.dataset.stage));
  else if(act==="inspect-item")inspectItem(id);
  else if(act==="open-challenge")challengeModal(id);
  else if(act==="save-boxing1"){
   var count=0;document.querySelectorAll(".boxing-skill").forEach(function(inp){var k=inp.dataset.skill,v=Math.max(0,Math.min(10,Number(inp.value)||0));state.talent.boxingSkills[k]=v;if(v>=5)count++;});
   if(count>=5){state.talent.completed.boxing1=true;toast("복싱 1단계 완료");}else toast("5개 이상 기술을 5단계 이상으로 올려주세요.");save();closeModal();render();
  }
  else if(act==="complete-challenge"){
   var ch=gameData.challenges[id],ok=ch.type==="doubleCheck"?(document.getElementById("double1").checked&&document.getElementById("double2").checked):document.getElementById("challengeCheck").checked;
   if(!ok){toast("완료 조건을 확인해주세요.");return;}state.talent.completed[id]=true;save();closeModal();toast("파밍 조건 완료");
  }
  else if(act==="claim-item")claimItem(id);
  else if(act==="equip"){var it=itemById(id);state.equipped[it.slot]=id;save();render();toast("아이템 장착 완료");}
  else if(act==="unequip"){state.equipped[a.dataset.slot]=null;save();render();}
  else if(act==="awaken")awaken();
  else if(act==="buy-system"){
   var p=gameData.systemShop.find(function(x){return x.id===id;});if(state.coins<p.price){toast("coin이 부족합니다.");return;}
   state.coins-=p.price;if(p.type==="consumable"){state.inventory.consumables[p.id]=(state.inventory.consumables[p.id]||0)+1;}else{Object.keys(p.effect).forEach(function(k){state.permanent[k]=(state.permanent[k]||0)+p.effect[k];});}save();render();toast("구매 완료");
  }
  else if(act==="ocr-run")ocrRun();
  else if(act==="save-run")saveRun();
  else if(act==="complete-routine")completeRoutine(a.dataset.routineKey);
  else if(act==="open-book")openBook(id);
  else if(act==="add-learning"){
   var lt=document.getElementById("learnTitle").value.trim(),lx=document.getElementById("learnText").value.trim();if(!lt||!lx){toast("제목과 내용을 모두 입력해주세요.");return;}
   state.learnings[classTab].push({id:uid(),title:lt,text:lx,createdAt:new Date().toISOString()});state.baseStats.knowledge+=.25;save();render();
  }
  else if(act==="open-learning"){
   var l=state.learnings[classTab].find(function(x){return x.id===id;});if(l)modal(l.title,'<p>'+esc(l.text).replace(/\n/g,"<br>")+'</p><button class="danger" data-action="delete-learning" data-id="'+l.id+'">삭제</button>',"MY BOOK");
  }
  else if(act==="delete-learning"){state.learnings[classTab]=state.learnings[classTab].filter(function(x){return x.id!==id;});save();closeModal();render();}
  else if(act==="save-journal"){
   var tx=document.getElementById("journal").value.trim(),old=state.journals[gameDate()]&&state.journals[gameDate()].text;
   state.journals[gameDate()]={text:tx,updatedAt:new Date().toISOString()};today().journal=tx.length>=20;if(tx.length>=20&&!old)state.baseStats.mind+=.5;save();checkDaily();render();toast("기억을 저장했습니다.");
  }
  else if(act==="open-journal"){var j=state.journals[id];if(j)modal(id,'<p>'+esc(j.text||"").replace(/\n/g,"<br>")+'</p>',"MEMORY LOG");}
  else if(act==="add-goal"){
   var gn=document.getElementById("goalName").value.trim();if(!gn){toast("목표 이름을 입력해주세요.");return;}
   state.goals.push({id:uid(),name:gn,priority:Number(document.getElementById("goalPriority").value)||1,progress:Math.max(0,Math.min(100,Number(document.getElementById("goalProgress").value)||0)),done:false,createdAt:new Date().toISOString()});save();render();
  }
  else if(act==="edit-goal")editGoal(id);
  else if(act==="save-goal-edit"){
   var eg=state.goals.find(function(x){return x.id===id;});if(eg){eg.name=document.getElementById("editGoalName").value.trim()||eg.name;eg.priority=Number(document.getElementById("editGoalPriority").value)||eg.priority;eg.progress=Math.max(0,Math.min(100,Number(document.getElementById("editGoalProgress").value)||0));save();closeModal();render();}
  }
  else if(act==="goal-done"){
   var g=state.goals.find(function(x){return x.id===id;});if(g){g.done=true;g.progress=100;g.completedAt=new Date().toISOString();awardShowcase(g.name,"달성 목표","목표 달성");save();render();toast("목표가 진열장에 전시되었습니다.");}
  }
  else if(act==="delete-goal"){state.goals=state.goals.filter(function(x){return x.id!==id;});save();render();}
  else if(act==="add-shopping"){
   var sn=document.getElementById("shopName").value.trim();if(!sn){toast("항목 이름을 입력해주세요.");return;}
   state.shopping.wishlist.push({id:uid(),name:sn,price:Number(document.getElementById("shopPrice").value)||0,why:document.getElementById("shopWhy").value.trim()});save();render();
  }
  else if(act==="buy-real"){var x=state.shopping.wishlist.find(function(v){return v.id===id;});if(x){state.shopping.wishlist=state.shopping.wishlist.filter(function(v){return v.id!==id;});x.boughtAt=new Date().toISOString();state.shopping.purchases.push(x);save();render();}}
  else if(act==="edit-shopping")editShopping(id);
  else if(act==="save-shopping-edit"){
   var es=state.shopping.wishlist.find(function(x){return x.id===id;});if(es){es.name=document.getElementById("editShopName").value.trim()||es.name;es.price=Number(document.getElementById("editShopPrice").value)||0;es.why=document.getElementById("editShopWhy").value.trim();save();closeModal();render();}
  }
  else if(act==="delete-shopping"){state.shopping.wishlist=state.shopping.wishlist.filter(function(x){return x.id!==id;});save();render();}
  else if(act==="restore-shopping"){var rp=state.shopping.purchases.find(function(x){return x.id===id;});if(rp){state.shopping.purchases=state.shopping.purchases.filter(function(x){return x.id!==id;});state.shopping.wishlist.push(rp);save();render();}}
  else if(act==="delete-purchase"){state.shopping.purchases=state.shopping.purchases.filter(function(x){return x.id!==id;});save();render();}
  else if(act==="export"){var b=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),l=document.createElement("a");l.href=URL.createObjectURL(b);l.download="level-up-integrated-backup.json";l.click();setTimeout(function(){URL.revokeObjectURL(l.href);},1000);}
  else if(act==="reset"){if(confirm("모든 기록을 삭제할까요?")){storageRemove(STORE_KEY);location.reload();}}
 });
 document.addEventListener("change",function(e){
  if(e.target.id==="runPhoto")previewRun(e.target.files[0]);
  if(e.target.id==="importFile"){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{state=merge(JSON.parse(r.result));save();closeModal();view="home";render();toast("백업을 불러왔습니다.");}catch(err){toast("백업 파일 오류");}};r.readAsText(f);}
 });
}

async function init(){
 state=load();
 var data=await Promise.all([
  fetch("./game-data.json?v=3").then(function(r){if(!r.ok)throw new Error("game-data.json");return r.json();}),
  fetch("./content.json?v=3").then(function(r){if(!r.ok)throw new Error("content.json");return r.json();}),
  fetch("./workout-plans.json?v=3").then(function(r){if(!r.ok)throw new Error("workout-plans.json");return r.json();})
 ]);
 gameData=data[0];contentData=data[1];workoutPlans=data[2];[5,10,20,30,40,50,100].forEach(function(l){if(state.level>=l)awardLevelTrophy(l);});save();view=state.profile.name?"home":"onboarding";bind();render();
 if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("./sw.js?v=3").catch(console.warn);});
}

window.addEventListener("error",function(e){var f=document.getElementById("fatal");f.hidden=false;f.textContent="앱 오류\n\n"+e.message+"\n\napp.js와 game-data.json 업로드 여부를 확인하세요.";});
document.addEventListener("DOMContentLoaded",function(){init().catch(function(e){console.error(e);var f=document.getElementById("fatal");f.hidden=false;f.textContent="초기화 오류\n\n"+e.message;});});
})();
