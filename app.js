'use strict';
window.CaseViewer=(()=>{
 let data,filtered=[],page=0,active=null,current=null,map,pointLayer,traceLayer,roadLayer,targetLayer;
 const cache=new Map(),roads=new Map(),pending=new Set(),perPage=10;
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const motion=s=>({static:'静止',moving:'运动',unknown:'标签不足'}[s]||'标签不足');
 const fmt=(v,n=2)=>Number.isFinite(Number(v))&&v!==null?Number(v).toFixed(n):'—';
 const source=s=>s==='legacy'?'历史来源':'聚合来源';
 function load(src){const s=document.createElement('script');s.src=src;s.onerror=()=>{$('mapNote').textContent='案例载入失败，请刷新页面后重试。'};s.onload=()=>s.remove();document.body.appendChild(s);}
 function initMap(){map=L.map('map',{preferCanvas:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([22.88,113.87],16);map.attributionControl.addAttribution('路网底图 © OpenStreetMap contributors · ODbL 1.0');L.control.scale({imperial:false}).addTo(map);map.createPane('roads').style.zIndex=250;roadLayer=L.layerGroup().addTo(map);traceLayer=L.layerGroup().addTo(map);pointLayer=L.layerGroup().addTo(map);targetLayer=L.layerGroup().addTo(map);}
 function receiveIndex(d){data=d;initMap();['search','truthFilter','sourceFilter','helperFilter','sort'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;filter()}));
 $('reset').onclick=()=>{['search','truthFilter','sourceFilter','helperFilter'].forEach(id=>$(id).value='');$('sort').value='id';page=0;filter()};
 $('prev').onclick=()=>{page--;list()};$('next').onclick=()=>{page++;list()};
 $('showRoads').onchange=drawRoads;$('showPoints').onchange=()=>toggle(pointLayer,$('showPoints').checked);$('showTraces').onchange=()=>toggle(traceLayer,$('showTraces').checked);
 $('fitAll').onclick=fitAll;$('fitTarget').onclick=fitTarget;filter();const hash=decodeURIComponent(location.hash.slice(1));select(data.cases.some(c=>c.testcase_id===hash)?hash:data.cases[0].testcase_id);
 }
 function toggle(layer,on){on?layer.addTo(map):map.removeLayer(layer)}
 function filter(){const q=$('search').value.trim().toLowerCase(),t=$('truthFilter').value,s=$('sourceFilter').value,h=$('helperFilter').value;
 filtered=data.cases.filter(c=>(!q||(c.testcase_id+' '+c.case_key).toLowerCase().includes(q))&&(!t||c.motion_truth===t)&&(!s||(s==='legacy'?c.source==='legacy':c.source!=='legacy'))&&(!h||(h==='ge10'?c.known_helpers>=10:c.unknown_helpers)));
 const sort=$('sort').value;if(sort==='errorDesc')filtered.sort((a,b)=>b.error_m-a.error_m);if(sort==='errorAsc')filtered.sort((a,b)=>a.error_m-b.error_m);list();}
 function list(){$('listCount').textContent=`共 ${filtered.length.toLocaleString()} 例`;$('pageInfo').textContent=filtered.length?`${page+1} / ${Math.ceil(filtered.length/perPage)}`:'0 / 0';$('prev').disabled=page===0;$('next').disabled=(page+1)*perPage>=filtered.length;
 const el=$('caseList');el.innerHTML='';for(const c of filtered.slice(page*perPage,(page+1)*perPage)){const b=document.createElement('button');b.className='case-button'+(c.testcase_id===active?' active':'');b.innerHTML=`<div class="row"><b>${esc(c.testcase_id.replace('InfoCollect_',''))}</b><strong>${fmt(c.error_m)} m</strong></div><div class="row"><span>${source(c.source)} · ${motion(c.motion_truth)}</span><span>${c.unknown_helpers?'人数未知':c.legacy_fallback?'兼容输入':c.known_helpers+' 个标识'}</span></div>`;b.onclick=()=>select(c.testcase_id);el.appendChild(b)}if(!filtered.length)el.innerHTML='<div class="empty">没有匹配案例</div>';}
 function select(id){active=id;location.hash=id;list();$('caseTitle').textContent=id.replace('InfoCollect_','');$('mapNote').textContent='正在载入案例';if(cache.has(id))show(cache.get(id));else load('data/cases/'+id+'.js');}
 function receiveCase(c){cache.set(c.meta.testcase_id,c);if(c.meta.testcase_id===active)show(c)}
 function show(c){current=c;const m=c.meta;$('caseSource').textContent=`${source(m.source)} · 材料编号 ${m.no} / 1651`;$('caseKey').textContent=m.case_key;
 $('rawLink').href='raw/input/'+m.testcase_id+'.json';const stem=m.testcase_id.replace('InfoCollect_','realPosition_');$('gtLink').href='raw/ground_truth/'+stem+'.in';$('outLink').href='raw/output/'+stem+'.out';
 $('caseMetrics').innerHTML=[['实际定位误差',fmt(m.error_m)+' m'],['原始观测',m.raw_records+' 条'],['可确认好心人数',m.unknown_helpers?'未知':m.legacy_fallback?'兼容输入不计数':m.known_helpers],['真值代理标签',motion(m.motion_truth)],['算法状态输出',motion(m.motion_state)]].map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('');
 $('motionNote').textContent=`标签来源：${m.motion_label_source}。${m.motion_truth==='unknown'?'该例缺少足够的时序真值，不据算法输出反推实际动静状态。':'动静标签基于既有末端 5 秒真值轨迹代理，与算法输出分别保留。'} 本例最新有效观测基线误差 ${fmt(m.baseline_error_m)} 米；程序估计精度半径 ${fmt(m.est_accuracy_m)} 米。`;
 pointLayer.clearLayers();traceLayer.clearLayers();targetLayer.clearLayers();const pp=c.points.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180);const times=pp.map(p=>p.time_ms).filter(Number.isFinite),lo=Math.min(...times),hi=Math.max(...times),groups=new Map();
 for(const p of pp){const age=Number.isFinite(p.time_ms)&&hi>lo?(p.time_ms-lo)/(hi-lo):.5;const hue=210-35*age;L.circleMarker([p.latitude,p.longitude],{radius:3.5,weight:.5,color:'#fff',fillColor:`hsl(${hue},65%,45%)`,fillOpacity:.72}).bindPopup(`原始行 ${esc(Number(p.raw_index)+1)}<br>时间戳 ${esc(p.time_ms)}<br>RSSI ${esc(p.rssi)}<br>好心人标识 ${esc(p.kindTransID??'未知')}`).addTo(pointLayer);if(p.kindTransID!==null&&p.kindTransID!==undefined&&p.kindTransID!==''){const k=String(p.kindTransID);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}}
 for(const [k,v]of groups){const ps=v.filter(p=>Number.isFinite(p.time_ms)).sort((a,b)=>a.time_ms-b.time_ms);if(ps.length>1)L.polyline(ps.map(p=>[p.latitude,p.longitude]),{color:'#5d88aa',weight:1.4,opacity:.6}).bindTooltip('好心人 '+esc(k)).addTo(traceLayer)}
 L.polyline([[m.truth_lat,m.truth_lon],[m.est_lat,m.est_lon]],{color:'#cc5555',weight:2,dashArray:'5,5'}).addTo(targetLayer);
 L.circleMarker([m.truth_lat,m.truth_lon],{radius:8,color:'#fff',weight:2,fillColor:'#16856b',fillOpacity:1}).bindTooltip('评分真实位置',{permanent:true,direction:'left',className:'targetlabel'}).addTo(targetLayer);
 L.circleMarker([m.est_lat,m.est_lon],{radius:7,color:'#fff',weight:2,fillColor:'#d8484d',fillOpacity:1}).bindTooltip('预测位置',{permanent:true,direction:'right',className:'targetlabel'}).addTo(targetLayer);
 L.circle([m.truth_lat,m.truth_lon],{radius:30,color:'#16856b',weight:1,dashArray:'4,4',fill:false}).addTo(targetLayer);
 toggle(pointLayer,$('showPoints').checked);toggle(traceLayer,$('showTraces').checked);fitTarget();
 $('pointsSummary').textContent=`原始观测明细 · ${m.raw_records.toLocaleString()} 条记录`;$('pointTable').innerHTML=pp.slice(0,200).map(p=>'<tr>'+[p.raw_index+1,fmt(p.latitude,7),fmt(p.longitude,7),p.time_ms??'—',p.rssi??'—',fmt(p.accuracy),p.kindTransID??'未知'].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
 for(const t of c.road_tiles){if(!roads.has(t)&&!pending.has(t)){pending.add(t);load('data/roads/'+t+'.js')}}drawRoads();}
 function fitTarget(){if(!current)return;const m=current.meta;map.fitBounds([[m.truth_lat,m.truth_lon],[m.est_lat,m.est_lon]],{padding:[90,90],maxZoom:18,animate:false});}
 function fitAll(){if(!current)return;const ps=current.points.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180).map(p=>[p.latitude,p.longitude]);ps.push([current.meta.truth_lat,current.meta.truth_lon],[current.meta.est_lat,current.meta.est_lon]);map.fitBounds(ps,{padding:[25,25],maxZoom:18,animate:false})}
 function receiveRoad(r){roads.set(r.key,r.data);pending.delete(r.key);if(current&&current.road_tiles.includes(r.key))drawRoads()}
 function drawRoads(){if(!current)return;roadLayer.clearLayers();let n=0;if($('showRoads').checked){for(const k of current.road_tiles){const r=roads.get(k);if(!r)continue;n++;for(const [kind,segs]of Object.entries(r.layers||{})){const lines=segs.map(s=>[[s[0],s[1]],[s[2],s[3]]]);const major=/motorway|trunk|primary|secondary/.test(kind);L.polyline(lines,{pane:'roads',interactive:false,color:major?'#c8bf9d':'#c5cfcb',weight:major?3:1.5,opacity:.82}).addTo(roadLayer)}}}targetLayer.eachLayer(l=>l.bringToFront?.());const omitted=current.meta.raw_records-current.points.length;$('mapNote').textContent=`显示 ${current.points.length.toLocaleString()} 条坐标观测${omitted?'；'+omitted+' 条无效坐标记录保留在原文件、不绘制':''}；绿圈半径 30 米。路网底图 ${n}/${current.road_tiles.length} 块已载入，路网仅供展示，不参与定位。${current.road_tiles.length?'':'当前区域没有路网底图，坐标与比例尺仍可查看。'}`;}
 return {receiveIndex,receiveCase,receiveRoad};
})();
