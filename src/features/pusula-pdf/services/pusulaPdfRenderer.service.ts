import { jsPDF } from 'jspdf';
import type { PusulaPdfSatellitePoint, PusulaPdfSnapshot } from '../types';
import { buildPusulaPdfGuidance } from './pusulaPdfInsights.service';

const W = 1240;
const H = 1754;
const M = 28;
const INK = '#12252b';
const MUTED = '#65747a';
const LINE = '#d9e1e4';
const WHITE = '#ffffff';
const GREEN = '#0a9a56';
const GREEN_DARK = '#063d36';
const GREEN_SOFT = '#e8f7ed';
const BLUE = '#168ee3';
const BLUE_SOFT = '#e9f4ff';
const ORANGE = '#f28a19';
const ORANGE_SOFT = '#fff3df';
const RED = '#ef4c42';
const GRAY_SOFT = '#f4f7f8';

const fmt = (value?: string | null, year = true) => {
  if (!value) return '—';
  const d = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('tr-TR', year
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'short' });
};
const num = (v: unknown, digits = 2) => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—';
const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('PDF çizim alanı oluşturulamadı.');
  ctx.fillStyle = '#f7f9f8'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  return { c, ctx };
}
function font(ctx: CanvasRenderingContext2D, size: number, weight = 500) {
  ctx.font = `${weight} ${size}px Inter, "Noto Sans", Arial, sans-serif`;
}
function rr(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r=18,fill=WHITE,stroke=LINE,lw=1.5) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill();
  if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=lw; ctx.stroke(); }
}
function lines(ctx:CanvasRenderingContext2D, s:string, x:number,y:number,size=18,weight=500,color=INK,max=9999,lineHeight=1.28,maxLines=99) {
  font(ctx,size,weight); ctx.fillStyle=color;
  const words=String(s ?? '').split(/\s+/).filter(Boolean); let line=''; let yy=y; let count=0;
  for(const word of words){
    const test=line?`${line} ${word}`:word;
    if(ctx.measureText(test).width>max && line){ ctx.fillText(line,x,yy); count++; if(count>=maxLines)return yy; line=word; yy+=size*lineHeight; }
    else line=test;
  }
  if(line && count<maxLines)ctx.fillText(line,x,yy);
  return yy;
}
function t(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=18,weight=500,color=INK){font(ctx,size,weight);ctx.fillStyle=color;ctx.fillText(s,x,y)}
function compass(ctx:CanvasRenderingContext2D,x:number,y:number,r=24,color=WHITE){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-r+4);ctx.lineTo(7,5);ctx.lineTo(0,1);ctx.lineTo(-7,5);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(0,r-4);ctx.lineTo(-6,-4);ctx.lineTo(0,0);ctx.lineTo(6,-4);ctx.closePath();ctx.fill();ctx.restore();
}
function topBar(ctx:CanvasRenderingContext2D){
  const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#052d2c');g.addColorStop(1,'#061f28');ctx.fillStyle=g;ctx.fillRect(0,0,W,104);
  compass(ctx,54,51,27);t(ctx,'TarlaPusula',91,51,27,850,WHITE);t(ctx,'Tarlan için doğru yön.',91,78,13,600,'#dce9e5');
  ctx.textAlign='right';t(ctx,'TARLA ANALİZ RAPORU',W-35,45,17,850,WHITE);t(ctx,'Veriyle, daha güçlü yarınlara.',W-35,70,13,550,'#dce9e5');ctx.textAlign='left';
}
function footer(ctx:CanvasRenderingContext2D,page:number,snapshot:PusulaPdfSnapshot){
  const y=1693;ctx.strokeStyle=LINE;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(W-28,y);ctx.stroke();
  compass(ctx,48,y+30,18,GREEN_DARK);t(ctx,'TarlaPusula',77,y+28,18,850,GREEN_DARK);t(ctx,'Tarlan için doğru yön.',77,y+48,10,600,MUTED);
  ctx.textAlign='right';t(ctx,`Rapor Tarihi: ${fmt(snapshot.period.end)}   |   Sayfa ${page}/2`,W-35,y+35,12,600,MUTED);ctx.textAlign='left';
}
function imageBitmapFrom(src:string|null|undefined){
  if(!src)return Promise.resolve<ImageBitmap|null>(null);
  return fetch(src).then(r=>r.ok?r.blob():Promise.reject()).then(b=>createImageBitmap(b)).catch(()=>null);
}
async function drawImage(ctx:CanvasRenderingContext2D,src:string|null|undefined,x:number,y:number,w:number,h:number,cover=true,r=12){
  rr(ctx,x,y,w,h,r,'#e9efec',LINE);const img=await imageBitmapFrom(src);if(!img){t(ctx,'Görüntü yok',x+20,y+h/2,15,650,MUTED);return false;}
  const scale=cover?Math.max(w/img.width,h/img.height):Math.min((w-8)/img.width,(h-8)/img.height);const dw=img.width*scale,dh=img.height*scale;
  ctx.save();ctx.beginPath();ctx.roundRect(x+1,y+1,w-2,h-2,r);ctx.clip();ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();img.close();return true;
}
function irrigationLabel(v?:string|null){
  const k=String(v??'').toLocaleLowerCase('tr-TR');
  if(['irrigated','sulu'].includes(k))return 'Sulu'; if(['rainfed','susuz'].includes(k))return 'Susuz'; if(['partial','kısmi','kismi'].includes(k))return 'Kısmi'; return v||'Kayıt yok';
}
function weatherRows(snapshot:PusulaPdfSnapshot){
  const w:any=snapshot.weather;
  const candidates=[w?.history,w?.daily,w?.forecast];
  for(const c of candidates)if(Array.isArray(c)&&c.length)return c;
  if(Array.isArray(w?.providers))return w.providers.flatMap((p:any)=>p?.history??p?.daily??p?.forecast??[]);
  return [];
}
function wv(row:any,...keys:string[]){for(const k of keys){const v=row?.[k];if(valid(v))return v}return null}
function wd(row:any){return String(row?.date??row?.time??row?.datetime??'').slice(0,10)}
function activityDate(a:any){return String(a?.activity_date??a?.date??a?.created_at??'').slice(0,10)}
function activityName(a:any){return String(a?.activity_type??a?.type??a?.name??a?.title??'İşlem')}
function activityIcon(name:string){const u=name.toLocaleUpperCase('tr-TR');if(u.includes('SULA'))return '●';if(u.includes('GÜBRE'))return '◆';if(u.includes('İLAÇ'))return '✦';return '■'}
function pickSatellite(points:PusulaPdfSatellitePoint[],count=5){if(points.length<=count)return points;return Array.from({length:count},(_,i)=>points[Math.round(i*(points.length-1)/(count-1))]);}
function avg(values:(number|null|undefined)[]){const a=values.filter(valid);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null}
function periodCompare(sat:PusulaPdfSatellitePoint[],key:'ndvi'|'ndmi'){
  const vals=sat.filter(p=>valid(p[key])); if(vals.length<2)return {current:null,previous:null,pct:null};
  const split=Math.max(1,Math.floor(vals.length/2));const previous=avg(vals.slice(0,split).map(p=>p[key]));const current=avg(vals.slice(split).map(p=>p[key]));
  const pct=valid(previous)&&previous!==0&&valid(current)?((current-previous)/Math.abs(previous))*100:null;return {current,previous,pct};
}
function sectionTitle(ctx:CanvasRenderingContext2D,title:string,x:number,y:number){t(ctx,title,x,y,20,900,INK)}
function legendDot(ctx:CanvasRenderingContext2D,x:number,y:number,color:string,label:string){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();t(ctx,label,x+13,y+5,12,650,MUTED)}
function seriesChart(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,sat:PusulaPdfSatellitePoint[],weather:any[],activities:any[],compact=false){
  rr(ctx,x,y,w,h,16,WHITE,LINE);sectionTitle(ctx,'BİTKİ GELİŞİMİ VE SU DURUMU',x+18,y+31);
  const ly=y+63;legendDot(ctx,x+205,ly,GREEN,'NDVI');legendDot(ctx,x+285,ly,BLUE,'NDMI');legendDot(ctx,x+365,ly,'#69b6ff','Yağış (mm)');legendDot(ctx,x+470,ly,ORANGE,'Sıcaklık (°C)');
  const gx=x+58,gy=y+95,gw=w-92,gh=h-(compact?150:175);
  ctx.strokeStyle='#e4e9eb';ctx.lineWidth=1;for(let i=0;i<5;i++){const yy=gy+i*gh/4;ctx.beginPath();ctx.moveTo(gx,yy);ctx.lineTo(gx+gw,yy);ctx.stroke();}
  const dates=Array.from(new Set([...sat.map(p=>p.date),...weather.map(wd).filter(Boolean)])).sort();
  if(dates.length<2){lines(ctx,'Karşılaştırmalı grafik için yeterli tarihli veri yok.',gx,gy+55,16,650,MUTED,gw);return;}
  const xAt=(d:string)=>gx+(Math.max(0,dates.indexOf(d))/(dates.length-1))*gw;
  const maxRain=Math.max(1,...weather.map(r=>wv(r,'rain','precipitation','precipitationMm')??0));
  weather.forEach(r=>{const d=wd(r),rain=wv(r,'rain','precipitation','precipitationMm');if(!d||!valid(rain))return;const bh=(rain/maxRain)*gh*.55;ctx.fillStyle='#69b6ff';ctx.fillRect(xAt(d)-4,gy+gh-bh,8,bh)});
  const draw=(key:'ndvi'|'ndmi',color:string)=>{const pts=sat.filter(p=>valid(p[key]));if(pts.length<2)return;ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();pts.forEach((p,i)=>{const px=xAt(p.date),py=gy+gh-(clamp(p[key] as number,0,1)*gh);i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();ctx.fillStyle=color;pts.forEach(p=>{ctx.beginPath();ctx.arc(xAt(p.date),gy+gh-clamp(p[key] as number,0,1)*gh,5,0,Math.PI*2);ctx.fill()})};
  draw('ndvi',GREEN);draw('ndmi',BLUE);
  const temps=weather.map(r=>({d:wd(r),v:wv(r,'temperature','temp','tempAvg','avgTemp','tempMax','maxTemp')})).filter((r):r is {d:string;v:number}=>!!r.d&&valid(r.v));
  if(temps.length>=2){const mn=Math.min(...temps.map(v=>v.v)),mx=Math.max(...temps.map(v=>v.v)),range=Math.max(1,mx-mn);ctx.strokeStyle=ORANGE;ctx.lineWidth=3;ctx.beginPath();temps.forEach((p,i)=>{const px=xAt(p.d),py=gy+gh*.78-((p.v-mn)/range)*gh*.32;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();}
  const labels=[dates[0],dates[Math.floor((dates.length-1)/2)],dates.at(-1)!];labels.forEach((d,i)=>{const px=xAt(d);ctx.textAlign=i===0?'left':i===2?'right':'center';t(ctx,fmt(d,false),px,y+h-20,11,600,MUTED)});ctx.textAlign='left';
  if(!compact&&activities.length){const ay=y+h-47;pickSatellite(activities.map((a:any)=>({date:activityDate(a)} as any)),Math.min(4,activities.length)).forEach((a:any)=>{const original=activities.find((z:any)=>activityDate(z)===a.date);if(!original||!dates.includes(a.date))return;const px=xAt(a.date);t(ctx,activityIcon(activityName(original)),px-5,ay,15,850,GREEN);});}
}
function comparisonCard(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,title:string,value:string,sub:string,accent:string,soft:string){rr(ctx,x,y,w,108,14,soft,soft);t(ctx,title,x+15,y+27,12,850,accent);t(ctx,value,x+15,y+66,27,900,INK);t(ctx,sub,x+15,y+91,11,600,MUTED)}
function deltaText(pct:number|null){if(!valid(pct))return '—';return `${pct>=0?'↑':'↓'} %${Math.abs(pct).toFixed(0)}`}
function insightText(guidance:ReturnType<typeof buildPusulaPdfGuidance>,index:number,fallback:string){return guidance.insights[index]?.meaning??guidance.insights[index]?.action??fallback}
function recommendationColumns(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,guidance:ReturnType<typeof buildPusulaPdfGuidance>){
  const gap=12,cw=(w-gap*2)/3;const defs=[
    {title:'İYİ GİDENLER',accent:GREEN,soft:GREEN_SOFT,items:[guidance.weeklyHeadline, insightText(guidance,0,'Mevcut veriler düzenli takip ediliyor.')]},
    {title:'DİKKAT EDİLMESİ GEREKENLER',accent:ORANGE,soft:ORANGE_SOFT,items:[insightText(guidance,1,guidance.dataQualityNote)]},
    {title:'ÖNERİLEN AKSİYONLAR',accent:BLUE,soft:BLUE_SOFT,items:guidance.next7Days.slice(0,3)},
  ];
  defs.forEach((d,i)=>{const xx=x+i*(cw+gap);rr(ctx,xx,y,cw,195,14,d.soft,d.soft);t(ctx,d.title,xx+16,y+30,13,900,d.accent);let yy=y+62;d.items.filter(Boolean).slice(0,3).forEach(item=>{ctx.fillStyle=d.accent;ctx.beginPath();ctx.arc(xx+18,yy-4,6,0,Math.PI*2);ctx.fill();yy=lines(ctx,String(item),xx+32,yy,12,650,INK,cw-48,1.22,2)+35;});});
}

export async function generatePusulaPdf(snapshot:PusulaPdfSnapshot){
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
  const sat=[...snapshot.satellite.points].sort((a,b)=>a.date.localeCompare(b.date));
  const weather=weatherRows(snapshot).sort((a,b)=>wd(a).localeCompare(wd(b)));
  const activities=[...(snapshot.activities??[])].sort((a:any,b:any)=>activityDate(a).localeCompare(activityDate(b)));
  const guidance=buildPusulaPdfGuidance(snapshot);
  const latest=sat.at(-1),first=sat[0];const ndviCmp=periodCompare(sat,'ndvi');const ndmiCmp=periodCompare(sat,'ndmi');
  const rainTotal=weather.map(r=>wv(r,'rain','precipitation','precipitationMm')).filter(valid).reduce((a,b)=>a+b,0);
  const temps=weather.map(r=>wv(r,'temperature','temp','tempAvg','avgTemp','tempMax','maxTemp')).filter(valid);
  const selected=pickSatellite(sat,5);const pages:HTMLCanvasElement[]=[];

  // SAYFA 1 — referans mockup: 30 günlük tarla hikâyesi
  {
    const {c,ctx}=makeCanvas();pages.push(c);topBar(ctx);
    const heroY=104,heroH=210;
    await drawImage(ctx,latest?.trueColorImage??latest?.ndviImage,0,heroY,W,heroH,true,0);
    const shade=ctx.createLinearGradient(0,heroY,W*.72,heroY);shade.addColorStop(0,'rgba(247,249,248,.98)');shade.addColorStop(.58,'rgba(247,249,248,.86)');shade.addColorStop(1,'rgba(247,249,248,.08)');ctx.fillStyle=shade;ctx.fillRect(0,heroY,W,heroH);
    t(ctx,`${snapshot.field.name.toLocaleUpperCase('tr-TR')} TARLASI`,36,174,39,900,INK);t(ctx,'30 GÜNLÜK TARLA HİKÂYESİ',36,218,28,900,INK);
    const metaY=252;const meta=[['Ürün',snapshot.field.crop??'Kayıt yok',GREEN],['Alan',snapshot.field.areaDecare!=null?`${snapshot.field.areaDecare} da`:'—',GREEN],['Sulama',irrigationLabel(snapshot.field.irrigationStatus),BLUE],['Rapor Dönemi',`${fmt(snapshot.period.start,false)} – ${fmt(snapshot.period.end)}`,GREEN_DARK]] as const;
    meta.forEach((m,i)=>{const xx=36+i*150;ctx.fillStyle=m[2];ctx.beginPath();ctx.arc(xx+8,metaY-7,7,0,Math.PI*2);ctx.fill();t(ctx,m[0],xx+22,metaY-11,10,650,MUTED);t(ctx,m[1],xx+22,metaY+11,12,850,INK)});

    seriesChart(ctx,20,330,1200,470,sat,weather,activities);

    rr(ctx,20,816,1200,150,16,WHITE,LINE);sectionTitle(ctx,'KARŞILAŞTIRMA',36,847);
    const cw=(1168-30)/4;
    comparisonCard(ctx,36,866,cw,'BU HAFTA',valid(ndviCmp.current)?`NDVI ${num(ndviCmp.current)}`:'NDVI —',deltaText(ndviCmp.pct),GREEN,GREEN_SOFT);
    comparisonCard(ctx,36+(cw+10),866,cw,'ÖNCEKİ DÖNEM',valid(ndviCmp.previous)?`NDVI ${num(ndviCmp.previous)}`:'NDVI —','Karşılaştırma tabanı',INK,GRAY_SOFT);
    comparisonCard(ctx,36+(cw+10)*2,866,cw,'SU DURUMU',valid(ndmiCmp.current)?`NDMI ${num(ndmiCmp.current)}`:'NDMI —',deltaText(ndmiCmp.pct),BLUE,BLUE_SOFT);
    comparisonCard(ctx,36+(cw+10)*3,866,cw,'30 GÜNLÜK YÖN',valid(first?.ndvi)&&valid(latest?.ndvi)?`${num(first.ndvi)} → ${num(latest.ndvi)}`:'Ölçüm bekleniyor','Gerçek Sentinel ölçümü',GREEN_DARK,GRAY_SOFT);

    rr(ctx,20,982,1200,360,16,WHITE,LINE);sectionTitle(ctx,'UYDU GÖRÜNTÜLERİNDE ZAMANA GÖRE DEĞİŞİM (NDVI)',36,1014);t(ctx,'Renkler tarihler arası görsel karşılaştırma içindir.',W-355,1014,11,600,MUTED);
    const iw=(1168-32)/5;for(let i=0;i<5;i++){const p=selected[i],xx=36+i*(iw+8);await drawImage(ctx,p?.ndviImage,xx,1035,iw,225,true,9);t(ctx,p?fmt(p.date):'Veri yok',xx,1283,12,850,INK);t(ctx,p?`NDVI ${num(p.ndvi)} · NDMI ${num(p.ndmi)}`:'—',xx,1303,11,650,MUTED)}

    rr(ctx,20,1358,1200,235,16,ORANGE_SOFT,'#f4dfba');compass(ctx,58,1403,20,GREEN_DARK);t(ctx,"Pusula'nın Kısa Değerlendirmesi",92,1401,16,900,INK);
    lines(ctx,`${guidance.weeklySummary} ${guidance.insights[0]?.meaning??''}`.trim(),92,1433,14,600,INK,1090,1.34,5);
    t(ctx,'Dayanak',92,1544,11,850,ORANGE);lines(ctx,`Sentinel-2 · ${sat.length} tarih${weather.length?` · Hava ${weather.length} gün`:''}${activities.length?` · ${activities.length} tarla işlemi`:''}`,155,1544,11,650,MUTED,920,1.2,2);
    footer(ctx,1,snapshot);
  }

  // SAYFA 2 — hava ilişkisi, değişim ve Pusula önerileri
  {
    const {c,ctx}=makeCanvas();pages.push(c);topBar(ctx);
    const left=20,top=124,chartW=735,sideX=770,sideW=450;
    seriesChart(ctx,left,top,chartW,460,sat,weather,[],true);
    rr(ctx,sideX,top,sideW,460,16,GREEN_SOFT,'#d3ead9');compass(ctx,sideX+36,top+38,19,GREEN_DARK);t(ctx,'Pusula Bu Verileri',sideX+70,top+35,18,900,INK);t(ctx,'Nasıl Okuyor?',sideX+70,top+60,18,900,INK);
    const readings=[
      rainTotal>0?`Dönemde ${rainTotal.toFixed(1)} mm yağış kaydı var.`:'Yağış verisi yoksa Pusula miktar üretmez.',
      valid(ndviCmp.pct)?`NDVI önceki döneme göre ${deltaText(ndviCmp.pct)} yönünde değişti.`:'NDVI dönem karşılaştırması için yeterli sayısal ölçüm bekleniyor.',
      valid(ndmiCmp.pct)?`NDMI önceki döneme göre ${deltaText(ndmiCmp.pct)} yönünde değişti.`:'NDMI su durumu karşılaştırması için yeterli ölçüm bekleniyor.',
      guidance.insights[0]?.meaning??guidance.dataQualityNote,
    ];let ry=top+105;readings.forEach(r=>{ctx.fillStyle=GREEN;ctx.beginPath();ctx.arc(sideX+28,ry-5,8,0,Math.PI*2);ctx.fill();t(ctx,'✓',sideX+23,ry,10,900,WHITE);ry=lines(ctx,r,sideX+48,ry,13,650,INK,sideW-68,1.3,3)+48;});

    rr(ctx,20,602,1200,445,16,WHITE,LINE);sectionTitle(ctx,'TARLADA NE DEĞİŞTİ?',36,634);
    const bx=36,bw=350,bgap=18;const p0=selected[0]??first,p1=selected.at(-1)??latest;
    t(ctx,'ÖNCEKİ DÖNEM',bx,666,12,850,MUTED);t(ctx,p0?fmt(p0.date):'—',bx,686,11,650,INK);await drawImage(ctx,p0?.ndviImage,bx,700,bw,245,true,10);t(ctx,p0?`NDVI ${num(p0.ndvi)} · NDMI ${num(p0.ndmi)}`:'—',bx,968,12,800,INK);
    const x2=bx+bw+bgap;t(ctx,'SON DÖNEM',x2,666,12,850,MUTED);t(ctx,p1?fmt(p1.date):'—',x2,686,11,650,INK);await drawImage(ctx,p1?.ndviImage,x2,700,bw,245,true,10);t(ctx,p1?`NDVI ${num(p1.ndvi)} · NDMI ${num(p1.ndmi)}`:'—',x2,968,12,800,INK);
    const x3=x2+bw+bgap;rr(ctx,x3,700,430,245,10,GRAY_SOFT,LINE);t(ctx,'DEĞİŞİM ÖZETİ',x3+18,731,13,900,INK);
    const d1=valid(first?.ndvi)&&valid(latest?.ndvi)?(latest.ndvi-first.ndvi):null;const d2=valid(first?.ndmi)&&valid(latest?.ndmi)?(latest.ndmi-first.ndmi):null;
    t(ctx,'NDVI',x3+18,775,12,800,MUTED);t(ctx,valid(d1)?`${d1>=0?'+':''}${d1.toFixed(3)}`:'—',x3+115,775,22,900,valid(d1)&&d1<0?RED:GREEN);
    t(ctx,'NDMI',x3+18,820,12,800,MUTED);t(ctx,valid(d2)?`${d2>=0?'+':''}${d2.toFixed(3)}`:'—',x3+115,820,22,900,valid(d2)&&d2<0?ORANGE:BLUE);
    lines(ctx,guidance.weeklyHeadline,x3+18,866,14,750,INK,390,1.3,4);
    rr(ctx,36,992,1168,40,12,GRAY_SOFT,GRAY_SOFT);t(ctx,'BÖLGESEL DEĞERLENDİRME',52,1018,12,900,INK);t(ctx,'Sayısal bölgesel zon verisi bağlıysa değişim haritası burada kullanılabilir; bağlı değilse uydurma zon üretilmez.',245,1018,11,600,MUTED);

    rr(ctx,20,1065,1200,430,16,WHITE,LINE);compass(ctx,55,1102,18,GREEN);t(ctx,"PUSULA'NIN ÖNERİLERİ",87,1102,20,900,INK);t(ctx,'Önümüzdeki 7 gün için',87,1126,12,600,MUTED);
    recommendationColumns(ctx,36,1150,1168,guidance);
    rr(ctx,36,1362,1168,105,14,'#063a32','#063a32');t(ctx,'“',126,1418,38,900,WHITE);t(ctx,'Veri, toprağı daha iyi anlamanın anahtarıdır.',185,1406,18,750,WHITE);t(ctx,'TarlaPusula her zaman yanında.',185,1434,15,600,'#dcebe6');
    const dataLine=[`Sentinel-2 ${sat.length} tarih`,weather.length?`hava ${weather.length} gün`:null,activities.length?`${activities.length} işlem`:null,temps.length?`${Math.min(...temps).toFixed(0)}–${Math.max(...temps).toFixed(0)} °C`:null].filter(Boolean).join(' · ');
    t(ctx,`Kullanılan gerçek veri: ${dataLine||'bağlı veri bekleniyor'}`,36,1528,11,650,MUTED);
    lines(ctx,guidance.dataQualityNote,36,1553,11,600,MUTED,1160,1.25,3);
    footer(ctx,2,snapshot);
  }

  pages.forEach((c,i)=>{if(i)doc.addPage();doc.addImage(c.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST')});
  doc.setProperties({title:`PUSULAPDF - ${snapshot.field.name}`,author:'TarlaPusula',creator:'TarlaPusula PUSULAPDF'});return doc;
}

export async function downloadPusulaPdf(snapshot:PusulaPdfSnapshot){
  const doc=await generatePusulaPdf(snapshot);
  const name=(snapshot.field.name||'tarla').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi,'-').replace(/^-+|-+$/g,'');
  doc.save(`PUSULAPDF-${name}-${snapshot.period.end}.pdf`);
}
