import { moonAt } from './moon';
import { BRANCHES, BRANCH_ELEMENTS, FIVE_PHASES, SOLAR_MONTH_TERMS, solarCalendarFor, solarMonthStartDate, solarStageStartDate } from './solarCalendar';

// Scoring and astronomical cycles carried over from the original prototype.
const numStr = n => n.toFixed(1);

// 海況は24段階（約半月ごと）。並びと良し悪しは全員共通の表。いつ・どれだけ効くかは、人ごとの「海の時計」で変わる（下の personalStage / sensOf）。
export const STAGES=[{"n":"凪の入り","d":"静けさの中で、動く前に整える"},{"n":"そよ波","d":"最初の揺れ。固いものがほどける"},{"n":"舟出","d":"漕ぎ出す準備ができる"},{"n":"潮目","d":"流れの境目。方向を選ぶ"},{"n":"満ち潮","d":"人も物も集まり始める"},{"n":"帆あげ","d":"帆を揚げて進み出す"},{"n":"追い風","d":"風が背中を押す。素直に進む"},{"n":"走り波","d":"勢いが乗る。広げどき"},{"n":"帆満ち","d":"いちばん速く進む。帆を張り切る"},{"n":"大海原","d":"見渡す限り開ける。成果を確かめる"},{"n":"波頭","d":"波が立ち始める。変化の兆し"},{"n":"無風","d":"風が止まる。足止め"},{"n":"遠雷","d":"遠くの嵐の気配が届く"},{"n":"黒雲","d":"空が暗くなる。荷を固める"},{"n":"時化","d":"いちばん荒れる。出航せず、守って耐える"},{"n":"大嵐","d":"荒れが続く。無理をせず、凌ぐ"},{"n":"嵐の眼","d":"中心だけ静か。ここで見極める"},{"n":"余波","d":"荒れの名残。静かに整理する"},{"n":"雲間","d":"光が差す。立て直して再出発"},{"n":"澄み潮","d":"水が澄んで見通せる。次の針路を決める"},{"n":"引き潮","d":"潮が引く。手放して整理する"},{"n":"底潮","d":"底を打って、折り返す。小さな光を見つける"},{"n":"夕凪","d":"静かに終わる。次の周期に備える"},{"n":"静潮","d":"いちばん静か。休んで、力を溜める"}];
var STAGE_PTS=[4.5,5.5,5.5,6.5,6.5,7.5,8.5,9.5,10,10,7,5,4.5,3.5,1,1,2,4,5,7,5,3,4,6];
// 日の海（12日で一巡する日ごとの波）は、これまでどおり12段階。名前は24段階の前半の名前を使う。
var DAY_PTS=[5,6,7,9,10,6,4,1,3,6,4,5];
export const STAGE_POINTS=STAGE_PTS;
export const DAY_POINTS=DAY_PTS;
export const MONTH_STAGES=Array.from({length:12},function(_,k){ return {n:STAGES[2*k].n,d:STAGES[2*k].d,second:STAGES[2*k+1]}; });
export const DAY_STAGES=Array.from({length:12},function(_,k){ return {n:STAGES[2*k].n,d:STAGES[2*k].d}; });
export const OUTER=[{"n":"珊瑚の海流","th":"芽吹き","d":"新しい種を宿す方へ運ぶ"},{"n":"牡蠣の海流","th":"根づき","d":"根を張り、粘り強く結ぶ方へ"},{"n":"飛魚の海流","th":"旅立ち","d":"水面を飛び出し、外へ向かう方へ"},{"n":"イルカの海流","th":"出会い","d":"人との縁が広がる方へ運ぶ"},{"n":"鮪の海流","th":"挑戦","d":"勢いよく未知へ泳ぎ出す方へ"},{"n":"鯨の海流","th":"表現","d":"声や作品が遠くへ届く方へ運ぶ"},{"n":"鰻の海流","th":"転換","d":"流れが折り返し、姿を変える方へ"},{"n":"鯛の海流","th":"実り","d":"収穫を味わい、受け取る方へ"},{"n":"鰯の海流","th":"結束","d":"群れを束ね、整える方へ"},{"n":"蛸の海流","th":"成就","d":"形に仕上げ、やり遂げる方へ"},{"n":"海月の海流","th":"手放し","d":"力を抜き、ただよう方へ"},{"n":"鮭の海流","th":"源流","d":"原点に戻り、次へ託す方へ"}];
/* index = (Y+M+D) mod 4 */
export const SEASON=[
 {n:"冬",element:4,ang:270,home:11,act:"蓄える",col:"#8ecbff",moon:"下弦の頃"},
 {n:"春",element:0,ang:0,home:1,act:"始める",col:"#7ee2a0",moon:"新月の頃"},
 {n:"夏",element:1,ang:90,home:4,act:"広げる",col:"#ffb26b",moon:"上弦の頃"},
 {n:"秋",element:3,ang:180,home:9,act:"実らせる",col:"#f2c979",moon:"満月の頃"}
];
export { FIVE_PHASES, SOLAR_MONTH_TERMS, solarMonthStartDate, solarStageStartDate };
export const NUMS=[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5];
var TIDE_AMP={"最接近":1,"近い":.78,"ふつう":.55,"遠い":.32,"最遠":.1};   /* strength of the tide-raising pull by Earth-Moon distance (independent of the moon's shape) */
var WD=["日","月","火","水","木","金","土"];

export function ctxFor(d){
  var Y=d.getUTCFullYear(), MO=d.getUTCMonth()+1, DA=d.getUTCDate(), cal=solarCalendarFor(d), K=cal.solarYear+660;
  var mp=moonAt(d);   /* real moon: phase angle, age, shape and tide all from one value */
  return {Y:Y,MO:MO,DA:DA,K:K,wd:d.getUTCDay(),age:mp.age,ph:mp.e,tide:mp.distName,dist:mp.dist,phaseTide:mp.tide,moon:mp.moon,
    solarYear:cal.solarYear,yearStemIndex:cal.yearStemIndex,yearBranchIndex:cal.yearBranchIndex,yearStem:cal.yearStem,yearBranch:cal.yearBranch,
    yearPillar:cal.yearPillar,yearElement:cal.yearElement,yearBranchElement:cal.yearBranchElement,yearPolarity:cal.yearPolarity,solarTermIndex:cal.solarTermIndex,solarTerm:cal.solarTerm,
    solarMonth:cal.solarMonth,solarMonthTerm:cal.solarMonthTerm,monthBranchIndex:cal.monthBranchIndex,monthBranch:cal.monthBranch,
    monthElement:cal.monthElement,monthPolarity:cal.monthPolarity,dayCycleIndex:cal.dayCycleIndex,dayStemIndex:cal.dayStemIndex,
    dayBranchIndex:cal.dayBranchIndex,dayStem:cal.dayStem,dayBranch:cal.dayBranch,dayPillar:cal.dayPillar,dayElement:cal.dayElement,
    dayPolarity:cal.dayPolarity,stage:cal.solarStage,outer:cal.yearBranchIndex,
    dayIndex:Math.floor(Date.UTC(Y,MO-1,DA)/86400000), seed:Y*10000+MO*100+DA};
}
/* ---- the 160 types ---- */
var TYPES=[];
(function(){
  for(var m=0;m<4;m++) for(var ni=0;ni<10;ni++) for(var mi=0;mi<2;mi++) for(var a=0;a<2;a++){
    TYPES.push({mod:m,ni:ni,num:NUMS[ni],minus:!!mi,A:!!a,key:m*40+ni*4+mi*2+a});
  }
})();
/* ---- 人ごとの海の時計 ----
   暦の24区間（c.stage）を、自分の時計の段階に読み替える。
   ・起点: 季節の拠点が「帆満ち」（頂点）に来る。深さで±2段階ずれる（季節4×深さ5=20通り＋年のずれ）。
   ・毎年のずれ: 時計が暦より少し速く進む。浅いほど速い（浅瀬6年・沿岸8年・沖合12年・深海24年で一巡）。
   ・感度: 同じ海況でも、効き方の強弱はタイプで違う（深さ・A・−）。 */
var BASE_SCALE=0.6;
var DRIFT=[4,3,2,1];
var SENS=[1.4,1.15,0.9,0.65];
function depthGroup(t){ return t.ni<3?0:t.ni<5?1:t.ni<7?2:3; }
export function personalStage(solarYear,stage,t){
  var S=(solarYear-2000)*24+stage, d=DRIFT[depthGroup(t)];
  var home=SEASON[t.mod].home*2, shift=Math.floor(t.ni/2)-2;
  return (((S+Math.floor(S*d/24)-home+8+shift)%24)+24)%24;
}
function sensOf(t,dev){ var k=SENS[depthGroup(t)]*(t.A?1.25:1); if(dev<0&&t.minus) k*=1.3; return k; }
function baseAt(solarYear,stage,t){ var dev=(STAGE_PTS[personalStage(solarYear,stage,t)]-5.5)*BASE_SCALE; return 5.5+dev*sensOf(t,dev); }
/* 画面に出す海況の番号。タイプがあれば自分の時計、なければ暦のまま。 */
export function stageFor(c,t){ return t?personalStage(c.solarYear,c.stage,t):c.stage; }
export function monthStagesFor(solarYear,month,t){
  var a=t?personalStage(solarYear,2*month,t):2*month, b=t?personalStage(solarYear,2*month+1,t):2*month+1;
  return {n:STAGES[a].n,d:STAGES[a].d,second:STAGES[b]};
}
export function labelOf(t){ return SEASON[t.mod].n+(t.A?" A":"")+(t.minus?"-":"")+numStr(t.num); }

/* stage は24段階。季節の拠点（home は12段階の番号）との近さを、これまでと同じ 0〜6 の目盛りで返す。 */
function ringOf(stage,mod){ var r=Math.abs(stage-SEASON[mod].home*2); return Math.min(r,24-r)/2; }
const GENERATES=[1,2,3,4,0];
const CONTROLS=[2,3,4,0,1];
function relationOf(person,environment){
  if(person===environment) return {kind:"同気",score:1.2,description:"同じ働きが重なります"};
  if(GENERATES[environment]===person) return {kind:"相生",score:1.8,description:"時の流れが基調を育てます"};
  if(GENERATES[person]===environment) return {kind:"流出",score:-0.6,description:"力を外へ渡す流れです"};
  if(CONTROLS[person]===environment) return {kind:"調整",score:0.8,description:"流れに働きかけやすい関係です"};
  return {kind:"相剋",score:-1.3,description:"周囲の圧を受け、調整が要る関係です"};
}
function compOf(yearElement,yearBranchElement,t){
  var stemRelation=fivePhaseRelation(t,yearElement).score;
  var branchRelation=fivePhaseRelation(t,yearBranchElement).score;
  return (stemRelation+branchRelation)/2;
}
export function fivePhaseRelation(type,element){
  return type.minus ? relationOf(element,SEASON[type.mod].element) : relationOf(SEASON[type.mod].element,element);
}
function partsFor(c,t){
  var dd=(t.num-3.25)/2.25;                                   /* depth -1..+1 */
  var phase=SEASON[t.mod].ang+dd*40;                          /* depth shifts the season's moon phase */
  var moonAng=c.ph;
  var moon=Math.cos((moonAng-phase)*Math.PI/180)*2;           /* season x moon  -2..+2 */
  var depth=dd*(TIDE_AMP[c.tide]-0.55)*2;                     /* depth x moon distance (tide strength) */
  var ring=ringOf(c.stage,t.mod);
  var monthRelation=fivePhaseRelation(t,c.monthElement);
  var aff=monthRelation.score*.45;                              /* month's five-phase correspondence (the season's home is now the peak of the personal sea clock) */
  var comp=compOf(c.yearElement,c.yearBranchElement,t);        /* stem and branch elements x season profile */
  /* 日の海: a fast 12-day wave. Each type starts at its own position (season/depth/minus/A), so the order reshuffles every day. */
  var off=(t.mod*3+t.ni+(t.minus?5:0)+(t.A?7:0))%12, dpos=(c.dayBranchIndex+off)%12;
  var dayRelation=fivePhaseRelation(t,c.dayElement);
  var wave=(DAY_PTS[dpos]-5.5)/4.5*1.6;
  var day=wave*sensOf(t,wave)+dayRelation.score*.35;
  var vor=t.A? (TIDE_AMP[c.tide]-0.55)*1.6 : 0;                /* A (vortex) resonates with a near moon (big pull) */
  var hw=t.minus? -1.5 : 0;                                    /* 「−」: constant headwind, so minus types sink toward the bottom more often (design intent: 免罪符) */
  return {base:baseAt(c.solarYear,c.stage,t),moon:moon,depth:depth,aff:aff,comp:comp,ring:ring,day:day,dpos:dpos,vor:vor,hw:hw};
}
const tableCache = new Map();
export function dayTable(c){
  if (tableCache.has(c.seed)) return tableCache.get(c.seed);
  var rows=TYPES.map(function(t){
    var p=partsFor(c,t); return {t:t,p:p,raw:p.base+p.moon+p.depth+p.aff+p.comp+p.day+p.vor+p.hw,score:0,rank:0};
  });
  var sum=0,i; for(i=0;i<rows.length;i++) sum+=rows[i].raw;
  var mean=sum/rows.length;
  /* A (vortex) amplification is NOT applied to the shared ranking (it would park every A type at both
     ends of the SNS top/bottom 5); it widens the personal "effective rank" instead (see renderToday). */
  rows.forEach(function(r){ r.score=r.raw; });
  var sorted=rows.slice().sort(function(a,b){ return (b.score-a.score)||(a.t.key-b.t.key); });
  var byKey={}; sorted.forEach(function(r,k){ r.rank=k+1; byKey[r.t.key]=r; });
  var min=sorted[sorted.length-1].score, max=sorted[0].score;
  const table = {rows:sorted,byKey:byKey,mean:mean,min:min,max:max};
  if (tableCache.size >= 32) tableCache.delete(tableCache.keys().next().value);
  tableCache.set(c.seed, table);
  return table;
}

export function axes(c, row) {
  const { p, t } = row;
  const go = ((p.base - 1) / 9) * .5 + ((p.moon + 2) / 4) * .25 + ((p.aff + 1.5) / 3) * .25;
  const change = TIDE_AMP[c.tide] * .35 + ((p.comp + 2) / 4) * .4 + (t.A ? .25 : 0);
  return { go: Math.max(0, Math.min(1, go)), change: Math.max(0, Math.min(1, change)) };
}

export function personalFor(c,prof,row){
  var offset=((prof.Y+prof.M+prof.D+(prof.total||0))%12+12)%12;
  var pos=(c.dayBranchIndex+offset)%12;
  var wave=(DAY_PTS[pos]-5.5)/4.5*1.6; wave=wave*sensOf(row.t,wave);
  var ret=(c.solarYear>prof.birthSolarYear&&c.yearBranchIndex===prof.birthYearBranchIndex)?1:0;
  return {pos:pos,wave:wave,ret:ret,delta:wave-row.p.day+ret};
}

export function blockScoreOf(y,b,t){
  var st=((b%12)+12)%12, outer=((y-4)%12+12)%12, yearStem=((y-4)%10+10)%10;
  var yearElement=Math.floor(yearStem/2), yearBranchElement=BRANCH_ELEMENTS[outer], monthBranch=BRANCHES[(st+2)%12], monthElement=BRANCH_ELEMENTS[(st+2)%12];
  var monthRelation=fivePhaseRelation(t,monthElement);
  return {st:st,outer:outer,yearElement:yearElement,yearBranchElement:yearBranchElement,monthElement:monthElement,
    score:(baseAt(y,2*st,t)+baseAt(y,2*st+1,t))/2+monthRelation.score*.45+compOf(yearElement,yearBranchElement,t)+(t.minus?-1.5:0)};
}
export function yearScoreOf(y,t){
  var outer=((y-4)%12+12)%12, sum=0, b;
  for(b=0;b<12;b++) sum+=blockScoreOf(y,b,t).score;
  return {outer:outer,score:sum/12};
}
