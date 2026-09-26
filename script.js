const svgNS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('mapSvg');
function lonToX(lon){ return (lon+180)/360*720; }
function latToY(lat){ return (90-lat)/180*360; }
function xToLon(x){ return x/720*360-180; }
function yToLat(y){ return 90 - y/360*180; }

const bg = document.createElementNS(svgNS,'rect');
bg.setAttribute('x',0); bg.setAttribute('y',0); bg.setAttribute('width',720); bg.setAttribute('height',360);
bg.setAttribute('fill','#0d0c0a');
svg.appendChild(bg);
for(let lon=-180; lon<=180; lon+=30){
  const l = document.createElementNS(svgNS,'line');
  l.setAttribute('x1',lonToX(lon)); l.setAttribute('x2',lonToX(lon));
  l.setAttribute('y1',0); l.setAttribute('y2',360);
  l.setAttribute('stroke', lon===0 ? '#4a4235' : '#25211a'); l.setAttribute('stroke-width', lon===0?1:0.6);
  svg.appendChild(l);
}
for(let lat=-90; lat<=90; lat+=30){
  const l = document.createElementNS(svgNS,'line');
  l.setAttribute('y1',latToY(lat)); l.setAttribute('y2',latToY(lat));
  l.setAttribute('x1',0); l.setAttribute('x2',720);
  l.setAttribute('stroke', lat===0 ? '#4a4235' : '#25211a'); l.setAttribute('stroke-width', lat===0?1:0.6);
  svg.appendChild(l);
}

['90°N','60°N','30°N','0°','30°S','60°S','90°S'].forEach((t,i)=>{
  const lat = 90-i*30;
  const txt = document.createElementNS(svgNS,'text');
  txt.setAttribute('x',4); txt.setAttribute('y', latToY(lat)+10);
  txt.setAttribute('fill','#6e6558'); txt.setAttribute('font-size','9');
  txt.textContent=t; svg.appendChild(txt);
});

const selRect = document.createElementNS(svgNS,'rect');
selRect.setAttribute('fill','#9b5cf6'); selRect.setAttribute('fill-opacity','0.14');
selRect.setAttribute('stroke','#c084fc'); selRect.setAttribute('stroke-width','1.5');
svg.appendChild(selRect);

let bbox = {n:5, s:-5, e:15, w:-5};
function drawSelection(){
  const x1=lonToX(bbox.w), x2=lonToX(bbox.e), y1=latToY(bbox.n), y2=latToY(bbox.s);
  selRect.setAttribute('x', Math.min(x1,x2)); selRect.setAttribute('y', Math.min(y1,y2));
  selRect.setAttribute('width', Math.abs(x2-x1)); selRect.setAttribute('height', Math.abs(y2-y1));
}
drawSelection(); updateBboxInfo();

function svgPoint(ev){
  const rect = svg.getBoundingClientRect();
  const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
  const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
  const x = cx/rect.width*720, y = cy/rect.height*360;
  return {x,y};
}

let dragging=false, startPt=null;
function onDown(ev){ dragging=true; startPt = svgPoint(ev); ev.preventDefault(); }
function onMove(ev){
  if(!dragging) return;
  const p = svgPoint(ev);
  const lonA = xToLon(startPt.x), lonB = xToLon(p.x);
  const latA = yToLat(startPt.y), latB = yToLat(p.y);
  bbox = {n:Math.max(latA,latB), s:Math.min(latA,latB), e:Math.max(lonA,lonB), w:Math.min(lonA,lonB)};
  drawSelection(); updateBboxInfo(false);
}
function onUp(){ dragging=false; }
svg.addEventListener('mousedown', onDown);
svg.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
svg.addEventListener('touchstart', onDown, {passive:false});
svg.addEventListener('touchmove', onMove, {passive:false});
window.addEventListener('touchend', onUp);

function updateBboxInfo(rebuildInputs=true){
  const info = document.getElementById('bboxInfo');
  if(rebuildInputs){
    info.innerHTML = `
      <label>С <input type="number" id="inN" step="0.5" value="${bbox.n.toFixed(1)}"></label>
      <label>Ю <input type="number" id="inS" step="0.5" value="${bbox.s.toFixed(1)}"></label>
      <label>В <input type="number" id="inE" step="0.5" value="${bbox.e.toFixed(1)}"></label>
      <label>З <input type="number" id="inW" step="0.5" value="${bbox.w.toFixed(1)}"></label>
      <button id="applyBbox">Применить</button>
    `;
    document.getElementById('applyBbox').addEventListener('click', ()=>{
      bbox = {
        n: parseFloat(document.getElementById('inN').value),
        s: parseFloat(document.getElementById('inS').value),
        e: parseFloat(document.getElementById('inE').value),
        w: parseFloat(document.getElementById('inW').value)
      };
      drawSelection();
    });
  } else {
    const inN=document.getElementById('inN'), inS=document.getElementById('inS'),
          inE=document.getElementById('inE'), inW=document.getElementById('inW');
    if(inN){ inN.value=bbox.n.toFixed(1); inS.value=bbox.s.toFixed(1); inE.value=bbox.e.toFixed(1); inW.value=bbox.w.toFixed(1); }
  }
}

function seedFromBbox(){
  const s = `${bbox.n.toFixed(1)}_${bbox.s.toFixed(1)}_${bbox.e.toFixed(1)}_${bbox.w.toFixed(1)}`;
  let h=0; for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0; }
  return h || 1;
}
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const YEAR_START = 2001, YEAR_END = 2026;

function generateData(){
  const rand = mulberry32(seedFromBbox());
  const midLat = (bbox.n + bbox.s)/2;
  const dryMonth = midLat >= 0 ? 7 : 1;
  const baseIntensity = 2 + rand()*6;
  const days = [];
  for(let y=YEAR_START; y<=YEAR_END; y++){
    const start = new Date(Date.UTC(y,0,1));
    const isLeap = (new Date(y,1,29)).getMonth()===1;
    const numDays = isLeap?366:365;
    for(let d=0; d<numDays; d++){
      const date = new Date(start); date.setUTCDate(date.getUTCDate()+d);
      const month = date.getUTCMonth();
      const seasonal = Math.max(0, Math.cos((month-dryMonth)/12*2*Math.PI)) ** 2;
      let count = Math.round(baseIntensity * seasonal * 3 * rand() * rand() * 4);
      if(rand() < 0.012) count += Math.round(10 + rand()*40);
      days.push({date: date.toISOString().slice(0,10), year:y, month, count});
    }
  }
  return days;
}

let dataset = [];

function computeStats(days){
  const total = days.reduce((a,d)=>a+d.count,0);
  const byYear = {};
  days.forEach(d=>{ byYear[d.year] = (byYear[d.year]||0) + d.count; });
  const years = Object.keys(byYear).map(Number);
  const peakYear = years.reduce((best,y)=> byYear[y]>byYear[best]?y:best, years[0]);
  const activeDays = days.filter(d=>d.count>0).length;
  const anomalies = days.filter(d=>d._anom).length;
  return {total, peakYear, peakYearCount:byYear[peakYear], activeDays, anomalies};
}

function markAnomalies(days){
  const byMonth = {};
  days.forEach(d=>{ (byMonth[d.month] = byMonth[d.month]||[]).push(d.count); });
  const avgByMonth = {};
  Object.keys(byMonth).forEach(m=>{
    const arr = byMonth[m];
    avgByMonth[m] = arr.reduce((a,b)=>a+b,0)/arr.length;
  });
  days.forEach(d=>{
    d._anom = d.count > avgByMonth[d.month]*3 + 5;
  });
}

function renderStats(days){
  const s = computeStats(days);
  document.getElementById('statsRow').innerHTML = `
    <div class="stat"><b>${s.total.toLocaleString('ru-RU')}</b><span>очагов всего · ${YEAR_START}–${YEAR_END}</span></div>
    <div class="stat"><b>${s.peakYear}</b><span>пиковый год (${s.peakYearCount.toLocaleString('ru-RU')} очагов)</span></div>
    <div class="stat"><b>${s.activeDays.toLocaleString('ru-RU')}</b><span>дней с зафиксированной активностью</span></div>
    <div class="stat"><b>${s.anomalies}</b><span>аномальных дней (резкий всплеск)</span></div>
  `;
}

function renderSeason(days){
  const names = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  const sums = new Array(12).fill(0), counts = new Array(12).fill(0);
  days.forEach(d=>{ sums[d.month]+=d.count; counts[d.month]++; });
  const avgs = sums.map((s,i)=> s/(counts[i]||1));
  const max = Math.max(...avgs, 0.001);
  const el = document.getElementById('season');
  el.innerHTML = avgs.map((v,i)=>{
    const h = Math.max(3, (v/max)*100);
    return `<div class="bar" style="height:${h}%"><b>${v.toFixed(1)}</b><span class="mlabel">${names[i]}</span></div>`;
  }).join('');
  el.style.marginBottom = '18px';
}

function colorFor(count, max){
  if(count<=0) return '#1e1630';
  const steps = ['#3a2360','#5b3399','#7c3aed','#c084fc'];
  const idx = Math.min(steps.length-1, Math.floor((count/max)*steps.length));
  return steps[idx];
}

function renderCalendar(days){
  const byYear = {};
  days.forEach(d=>{ (byYear[d.year]=byYear[d.year]||[]).push(d); });
  const max = Math.max(...days.map(d=>d.count), 1);
  const wrap = document.getElementById('calWrap');
  wrap.innerHTML='';
  Object.keys(byYear).sort((a,b)=>b-a).forEach(y=>{
    const yearDays = byYear[y];
    const row = document.createElement('div'); row.className='cal-year';
    const label = document.createElement('div'); label.className='ylabel'; label.textContent=y;
    const grid = document.createElement('div'); grid.className='cal-row';
    const cells = new Array(53*7).fill(null);
    yearDays.forEach(d=>{
      const doy = Math.floor((new Date(d.date) - new Date(Date.UTC(d.year,0,1)))/86400000);
      if(doy < cells.length) cells[doy] = d;
    });
    grid.style.gridTemplateRows='repeat(7,8px)';
    grid.style.gridAutoFlow='column';
    cells.forEach(d=>{
      const c = document.createElement('div'); c.className='cell in';
      if(d){
        c.style.background = colorFor(d.count, max);
        if(d._anom) c.classList.add('anom');
        c.addEventListener('mouseenter', ev=>showTip(ev, d));
        c.addEventListener('mousemove', ev=>showTip(ev, d));
        c.addEventListener('mouseleave', hideTip);
        c.addEventListener('click', ()=>showDetail(d));
      } else {
        c.style.background='transparent';
      }
      grid.appendChild(c);
    });
    row.appendChild(label); row.appendChild(grid);
    wrap.appendChild(row);
  });
}

function showTip(ev, d){
  const tip = document.getElementById('tip');
  tip.style.display='block';
  tip.style.left = (ev.clientX+12)+'px';
  tip.style.top = (ev.clientY+12)+'px';
  tip.innerHTML = `<b>${d.date}</b><br>${d.count} очаг(ов)${d._anom?' · аномалия':''}`;
}
function hideTip(){ document.getElementById('tip').style.display='none'; }

function showDetail(d){
  document.getElementById('detail').innerHTML =
    `<b>${d.date}</b> — зафиксировано <b>${d.count}</b> активных очагов в выбранной области.` +
    (d._anom ? ' Это значительно выше нормы для данного месяца — возможный критический период.' : ' В пределах обычной сезонной нормы.');
}

function loadAll(){
  dataset = generateData();
  markAnomalies(dataset);
  renderStats(dataset);
  renderSeason(dataset);
  renderCalendar(dataset);
  document.getElementById('detail').textContent = 'Наведите или нажмите на ячейку календаря, чтобы увидеть детали дня.';
}

document.getElementById('loadBtn').addEventListener('click', loadAll);
loadAll();

const sensorWrap = document.getElementById('sensorWrap');
const sensorBtn = document.getElementById('sensorBtn');
const sensorMenu = document.getElementById('sensorMenu');
sensorBtn.addEventListener('click', (e)=>{ e.stopPropagation(); sensorWrap.classList.toggle('open'); });
sensorMenu.querySelectorAll('.select-opt').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    sensorMenu.querySelectorAll('.select-opt').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    sensorBtn.textContent = opt.textContent;
    sensorWrap.classList.remove('open');
  });
});
document.addEventListener('click', ()=> sensorWrap.classList.remove('open'));
