import { moonAt } from './moon';

// Scoring and astronomical cycles carried over from the original prototype.
const numStr = n => n.toFixed(1);

export const STAGES=[
 {n:"朝凪",d:"始まりの静けさ。休んで、備える"},{n:"さざ波",d:"小さく動き始める。試しに漕ぎ出す"},
 {n:"満ち潮",d:"潮が満ちて、物も人も集まり始める"},{n:"追い風",d:"風が背中を押す。素直に進む"},
 {n:"順風",d:"一番速く進む。帆を張り切る"},{n:"波立つ",d:"ざわつき始める。変化の兆しに気づく"},
 {n:"うねり",d:"遠くの嵐の気配が届く"},{n:"嵐",d:"一番荒れる。出航せず、守って耐える"},
 {n:"嵐の目",d:"中心だけ静か。ここで見極める"},{n:"雨上がり",d:"空が澄む。立て直して再出発"},
 {n:"引き潮",d:"潮が引く。手放す・整理する"},{n:"夕凪",d:"終わりの静けさ。次の周期に備える"}
];
var STAGE_PTS=[5,6,7,9,10,6,4,1,3,6,4,5];
export const OUTER=[
 {n:"イルカの海流",th:"出会い",t:"暖流",d:"人との縁の方へ運ぶ"},{n:"鯛の海流",th:"実り",t:"暖流",d:"成果・収穫の方へ運ぶ"},
 {n:"鰻の海流",th:"変化",t:"寒流",d:"環境が変わる方へ運ぶ"},{n:"亀の海流",th:"蓄え",t:"寒流",d:"静かに力を溜める方へ"},
 {n:"鮪の海流",th:"挑戦",t:"暖流",d:"未知へ運ぶ。強い"},{n:"海月の海流",th:"回復",t:"暖流",d:"休養と立て直しの方へ"},
 {n:"蛸の海流",th:"創作",t:"暖流",d:"ものづくり・表現の方へ運ぶ"},{n:"鯨の海流",th:"発信",t:"暖流",d:"声が遠くへ届く方へ運ぶ"},
 {n:"烏賊の海流",th:"探索",t:"寒流",d:"学び・探し物の方へ。深い"},{n:"鰯の海流",th:"結束",t:"暖流",d:"約束・チーム・家族の方へ"},
 {n:"飛魚の海流",th:"解放",t:"寒流",d:"手放しと自由の方へ運ぶ"},{n:"鮭の海流",th:"帰郷",t:"寒流",d:"原点・自分に戻る方へ運ぶ"}
];
/* index = (Y+M+D) mod 4 */
export const SEASON=[
 {n:"冬",ang:270,home:11,act:"蓄える",col:"#8ecbff",moon:"下弦の頃"},
 {n:"春",ang:0,home:1,act:"始める",col:"#7ee2a0",moon:"新月の頃"},
 {n:"夏",ang:90,home:4,act:"広げる",col:"#ffb26b",moon:"上弦の頃"},
 {n:"秋",ang:180,home:9,act:"実らせる",col:"#f2c979",moon:"満月の頃"}
];
export const NUMS=[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5];
var TIDE_AMP={"最接近":1,"近い":.78,"ふつう":.55,"遠い":.32,"最遠":.1};   /* strength of the tide-raising pull by Earth-Moon distance (independent of the moon's shape) */
var WD=["日","月","火","水","木","金","土"];

export function ctxFor(d){
  var Y=d.getUTCFullYear(), MO=d.getUTCMonth()+1, DA=d.getUTCDate(), K=Y+660;
  var mp=moonAt(d);   /* real moon: phase angle, age, shape and tide all from one value */
  return {Y:Y,MO:MO,DA:DA,K:K,wd:d.getUTCDay(),age:mp.age,ph:mp.e,tide:mp.distName,dist:mp.dist,phaseTide:mp.tide,moon:mp.moon,
    stage:(((K-1)%4)*3+Math.floor((MO-1)/4))%12, outer:(9+(K-1))%12,
    dayIndex:Math.floor(Date.UTC(Y,MO-1,DA)/86400000), seed:Y*10000+MO*100+DA};
}
/* ---- the 160 types ---- */
var TYPES=[];
(function(){
  for(var m=0;m<4;m++) for(var ni=0;ni<10;ni++) for(var mi=0;mi<2;mi++) for(var a=0;a<2;a++){
    TYPES.push({mod:m,ni:ni,num:NUMS[ni],minus:!!mi,A:!!a,key:m*40+ni*4+mi*2+a});
  }
})();
export function labelOf(t){ return SEASON[t.mod].n+(t.A?" A":"")+(t.minus?"-":"")+numStr(t.num); }

function ringOf(stage,mod){ var r=Math.abs(stage-SEASON[mod].home); return Math.min(r,12-r); }
function compOf(outer,t){
  var warmCur=(OUTER[outer].t==="暖流"), warmSeason=(t.mod===1||t.mod===2);
  var v=(warmCur===warmSeason)?2:-2; return t.minus? -v : v;
}
function partsFor(c,t){
  var dd=(t.num-3.25)/2.25;                                   /* depth -1..+1 */
  var phase=SEASON[t.mod].ang+dd*40;                          /* depth shifts the season's moon phase */
  var moonAng=c.ph;
  var moon=Math.cos((moonAng-phase)*Math.PI/180)*2;           /* season x moon  -2..+2 */
  var depth=dd*(TIDE_AMP[c.tide]-0.55)*2;                     /* depth x moon distance (tide strength) */
  var ring=ringOf(c.stage,t.mod);
  var aff=(1-ring/3)*1.5;                                     /* sea state x season's home sea -1.5..+1.5 */
  var comp=compOf(c.outer,t);                                 /* current x season, flipped by minus */
  /* 日の海: a fast 12-day wave. Each type starts at its own position (season/depth/minus/A), so the order reshuffles every day. */
  var off=(t.mod*3+t.ni+(t.minus?5:0)+(t.A?7:0))%12, dpos=(c.dayIndex+off)%12;
  var day=(STAGE_PTS[dpos]-5.5)/4.5*1.6;
  var vor=t.A? (TIDE_AMP[c.tide]-0.55)*1.6 : 0;                /* A (vortex) resonates with a near moon (big pull) */
  var hw=t.minus? -1.5 : 0;                                    /* 「−」: constant headwind, so minus types sink toward the bottom more often (design intent: 免罪符) */
  return {base:STAGE_PTS[c.stage],moon:moon,depth:depth,aff:aff,comp:comp,ring:ring,day:day,dpos:dpos,vor:vor,hw:hw};
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
  var pos=(((prof.Y+prof.M+prof.D+(prof.total||0)+c.dayIndex)%12)+12)%12;
  var wave=(STAGE_PTS[pos]-5.5)/4.5*1.6;
  var ret=(((c.K-(prof.Y+660))%12===0)&&c.Y>=prof.Y)? 1 : 0;
  return {pos:pos,wave:wave,ret:ret,delta:wave-row.p.day+ret};
}

export function blockScoreOf(y,b,t){
  var K=y+660, st=(((K-1)%4)*3+b)%12, outer=(9+(K-1))%12;
  return {st:st,outer:outer,score:STAGE_PTS[st]+(1-ringOf(st,t.mod)/3)*1.5+compOf(outer,t)+(t.minus?-1.5:0)};
}
export function yearScoreOf(y,t){
  var K=y+660, outer=(9+(K-1))%12, sum=0, b;
  for(b=0;b<3;b++) sum+=blockScoreOf(y,b,t).score;
  return {outer:outer,score:sum/3};
}
