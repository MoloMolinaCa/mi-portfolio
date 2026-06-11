/* eslint-disable */
import React, { useState } from "react";

export default function Chart100({series}){
  const [hoverDate,setHoverDate]=useState(null);
  if(!series?.length)return null;
  const W=560,H=280,PL=40,PT=10,PR=52,PB=22;

  const allDates=[...new Set(series.flatMap(s=>s.data.map(d=>d.date)))].sort();
  const dateToX=date=>{
    const n=allDates.length;
    if(n<2)return PL;
    const i=allDates.indexOf(date);
    if(i<0){
      const t=new Date(date).getTime();
      const t0=new Date(allDates[0]).getTime(),t1=new Date(allDates[n-1]).getTime();
      return PL+((t-t0)/(t1-t0))*(W-PL-PR);
    }
    return PL+(i/(n-1))*(W-PL-PR);
  };

  const seriesMaps=series.map(s=>Object.fromEntries(s.data.map(d=>[d.date,d.val])));

  const allV=series.flatMap(s=>s.data.map(d=>d.val)).filter(v=>v!=null&&isFinite(v));
  if(!allV.length)return null;
  const minV=Math.min(...allV)*0.997,maxV=Math.max(...allV)*1.003;
  const yS=v=>PT+(1-(v-minV)/(maxV-minV))*(H-PT-PB);
  const makePath=data=>{
    let path="";
    for(const d of data){
      if(d.val==null||!isFinite(d.val))continue;
      const x=dateToX(d.date).toFixed(1),y=yS(d.val).toFixed(1);
      path+=path===''?`M${x},${y}`:`L${x},${y}`;
    }
    return path;
  };

  const yTicks=Array.from({length:6},(_,i)=>minV+(maxV-minV)*i/5);
  const n=allDates.length;
  const xLabelIdxs=[0,Math.floor(n/4),Math.floor(n/2),Math.floor(3*n/4),n-1].filter((v,i,a)=>a.indexOf(v)===i&&v<n);
  const fmtD=s=>s?s.slice(8)+'/'+s.slice(5,7):'';
  const LABELS={port:"Portfolio",spy:"S&P 500",ccl:"CCL",mep:"MEP",t10y:"T10Y",uva:"UVA",cer:"CER"};

  const onMove=(e)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const svgX=(e.clientX-rect.left)*(W/rect.width);
    const frac=Math.max(0,Math.min(1,(svgX-PL)/(W-PL-PR)));
    const idx=Math.round(frac*(n-1));
    setHoverDate(allDates[idx]||null);
  };

  const lastDate=allDates[n-1];
  const xEnd=dateToX(lastDate);
  const ttRight=hoverDate!=null&&dateToX(hoverDate)>W*0.65;

  const sortedByLastVal=[...series].map(s=>{
    const last=s.data[s.data.length-1];
    return{...s,lastVal:last?.val,lastDate:last?.date};
  }).filter(s=>s.lastVal!=null).sort((a,b)=>b.lastVal-a.lastVal);
  const labelY=[];

  return(
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block",cursor:"crosshair"}}
        onMouseMove={onMove} onMouseLeave={()=>setHoverDate(null)}>
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={PL} x2={W-PR} y1={yS(v)} y2={yS(v)} stroke="var(--border)" strokeWidth="0.6" opacity="0.8"/>
            <text x={PL-6} y={yS(v)+4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{v.toFixed(1)}</text>
          </g>
        ))}
        <line x1={PL} x2={W-PR} y1={yS(100)} y2={yS(100)} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4"/>
        {series.map(s=>(
          <path key={s.key} d={makePath(s.data)} fill="none" stroke={s.color} strokeWidth={s.bold?2.5:1.5} strokeLinejoin="round" opacity={s.bold?1:0.75}/>
        ))}
        {sortedByLastVal.map((s)=>{
          const v=s.lastVal;
          const rawY=yS(v),minGap=13;
          let cy=rawY;for(const py of labelY){if(Math.abs(cy-py)<minGap)cy=py+minGap;}
          labelY.push(cy);
          const pct=(v-100).toFixed(2);
          const lx=dateToX(s.lastDate);
          return(
            <g key={`lbl-${s.key}`}>
              {Math.abs(cy-rawY)>2&&<line x1={lx} y1={rawY} x2={lx+6} y2={cy} stroke={s.color} strokeWidth="0.8" opacity="0.4"/>}
              <circle cx={lx} cy={rawY} r={s.bold?4:3} fill={s.color}/>
              <text x={lx+8} y={cy+5} fontSize="14" fill={s.color} fontWeight="700">{pct>=0?"+":""}{pct}%</text>
            </g>
          );
        })}
        {xLabelIdxs.map(i=>(
          <text key={i} x={dateToX(allDates[i])} y={H-6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{fmtD(allDates[i])}</text>
        ))}
        {hoverDate!=null&&(
          <>
            <line x1={dateToX(hoverDate)} x2={dateToX(hoverDate)} y1={PT} y2={H-PB} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
            {series.map((s,si)=>{const v=seriesMaps[si][hoverDate];if(v==null)return null;return <circle key={s.key} cx={dateToX(hoverDate)} cy={yS(v)} r={s.bold?4.5:3} fill={s.color} stroke="var(--bg-card)" strokeWidth="1.5"/>;  })}
          </>
        )}
      </svg>
      {hoverDate!=null&&(
        <div style={{
          position:"absolute",top:10,
          left:ttRight?undefined:(dateToX(hoverDate)/W*100)+"%",
          right:ttRight?((1-dateToX(hoverDate)/W)*100)+"%":undefined,
          transform:ttRight?"translateX(10px)":"translateX(-50%)",
          background:"var(--bg-card)",border:"1px solid var(--border)",
          borderRadius:9,padding:"9px 13px",pointerEvents:"none",
          fontSize:12,minWidth:152,boxShadow:"0 6px 20px rgba(0,0,0,0.45)",zIndex:10,
        }}>
          <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:7,fontWeight:700,letterSpacing:1}}>
            {hoverDate?hoverDate.slice(8)+'/'+hoverDate.slice(5,7)+'/'+hoverDate.slice(0,4):''}
          </div>
          {series.map((s,si)=>{
            const v=seriesMaps[si][hoverDate];if(v==null)return null;
            const pct=(v-100).toFixed(2);
            return(
              <div key={s.key} style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:4,alignItems:"center"}}>
                <span style={{color:s.color,fontSize:11,fontWeight:s.bold?700:400}}>{LABELS[s.key]||s.key}</span>
                <span style={{fontWeight:700,fontFamily:"monospace",fontSize:12,color:v>=100?"var(--green)":"var(--red)"}}>
                  {v>=100?"+":""}{pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
