var R=Math.PI/180;
function norm(a){ a%=360; return a<0?a+360:a; }
function elong(ms){
  var jd=ms/86400000+2440587.5, T=(jd-2451545.0)/36525;
  var Lp=218.3164477+481267.88123421*T, Dm=297.8501921+445267.1114034*T, M=357.5291092+35999.0502909*T, Mp=134.9633964+477198.8675055*T, F=93.2720950+483202.0175233*T;
  function s(x){ return Math.sin(x*R); }
  var lon=Lp+6.288774*s(Mp)+1.274027*s(2*Dm-Mp)+0.658314*s(2*Dm)+0.213618*s(2*Mp)-0.185116*s(M)-0.114332*s(2*F)+0.058793*s(2*Dm-2*Mp)+0.057066*s(2*Dm-M-Mp)+0.053322*s(2*Dm+Mp)+0.045758*s(2*Dm-M)-0.040923*s(M-Mp)-0.034720*s(Dm)-0.030383*s(M+Mp);
  var L0=280.46646+36000.76983*T, C=1.914602*s(M)+0.019993*s(2*M)+0.000289*s(3*M);
  return norm(lon-(L0+C));
}
function distKm(ms){   /* Earth-Moon distance in km (Meeus ch. 47 main terms). Cycle = 27.55 days (perigee to perigee), NOT the 29.53-day phase cycle, so it drifts against the moon's shape */
  var jd=ms/86400000+2440587.5, T=(jd-2451545.0)/36525;
  var Dm=297.8501921+445267.1114034*T, M=357.5291092+35999.0502909*T, Mp=134.9633964+477198.8675055*T, F=93.2720950+483202.0175233*T;
  function c(x){ return Math.cos(x*R); }
  return 385000.56-20905.355*c(Mp)-3699.111*c(2*Dm-Mp)-2955.968*c(2*Dm)-569.925*c(2*Mp)+48.888*c(M)-3.149*c(2*F)+246.158*c(2*Dm-2*Mp)-152.138*c(2*Dm-M-Mp)-170.733*c(2*Dm+Mp)-204.586*c(2*Dm-M)-129.620*c(M-Mp)+108.743*c(Dm)+104.755*c(M+Mp)+10.321*c(2*Dm-2*F);
}
function distName(km){ return km<366000?"最接近":(km<378000?"近い":(km<393000?"ふつう":(km<401000?"遠い":"最遠"))); }
function ageDays(ms){   /* days since the last true new moon */
  var g=ms-(elong(ms)/12.19)*86400000, i, err;
  for(i=0;i<8;i++){ err=elong(g); if(err>180) err-=360; g-=err/12.19*86400000; }
  return (ms-g)/86400000;
}
function moonName(e){
  if(e>=345||e<15) return "新月"; if(e<80) return "三日月"; if(e<100) return "上弦の半月"; if(e<165) return "満ちていく月";
  if(e<195) return "満月"; if(e<260) return "欠けていく月"; if(e<280) return "下弦の半月"; return "有明月";
}
function tideName(e){   /* by the phase angle folded to 0..180 (0 = new or full moon) */
  var p=e%180;
  if(p>=165||p<33) return "大潮"; if(p<80) return "中潮"; if(p<116) return "小潮"; if(p<128) return "長潮"; if(p<140) return "若潮"; return "中潮";
}
export function moonAt(d){
  var ms=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),3,0,0), e=elong(ms);
  var km=distKm(ms);
  return {e:e,age:ageDays(ms),moon:moonName(e),tide:tideName(e),dist:km,distName:distName(km)};
}
