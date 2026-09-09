// Génère les icônes PNG de la PWA sans dépendance (encodeur PNG minimal).
const fs = require('fs'), zlib = require('zlib'), path = require('path');
function crcTable(){ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; } return t; }
const T = crcTable();
function crc32(buf){ let c=0xFFFFFFFF; for(const b of buf) c = T[(c^b)&0xFF] ^ (c>>>8); return (c^0xFFFFFFFF)>>>0; }
function chunk(type, data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type), data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w,h,rgba){ const raw=Buffer.alloc((w*4+1)*h); for(let y=0;y<h;y++){ raw[y*(w*4+1)]=0; rgba.copy(raw, y*(w*4+1)+1, y*w*4, (y+1)*w*4); }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',ihdr), chunk('IDAT', zlib.deflateSync(raw,{level:9})), chunk('IEND', Buffer.alloc(0))]); }

const lerp=(a,b,t)=>a+(b-a)*t;
function draw(size, {maskable=false, badge=false}={}){
  const buf=Buffer.alloc(size*size*4); const SS=3;
  const r = maskable ? 0 : size*0.22;
  const inRounded=(x,y,x0,y0,x1,y1,rad)=>{ if(x<x0||x>x1||y<y0||y>y1) return false; const cx=Math.min(Math.max(x,x0+rad),x1-rad), cy=Math.min(Math.max(y,y0+rad),y1-rad); return (x-cx)**2+(y-cy)**2 <= rad*rad; };
  // barres ascendantes (J+1, J+3, J+7, J+15)
  const pad = maskable ? size*0.24 : size*0.2; const n=4; const gap=size*0.045; const bw=(size-2*pad-gap*(n-1))/n; const base=size-pad; const heights=[0.28,0.42,0.58,0.78].map(h=>h*(size-2*pad));
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    let cov=0, wc=0;
    for(let sy=0;sy<SS;sy++) for(let sx=0;sx<SS;sx++){
      const px=x+(sx+0.5)/SS, py=y+(sy+0.5)/SS;
      if(badge){ if((px-size/2)**2+(py-size/2)**2<=(size/2)**2) cov++; }
      else if(inRounded(px,py,0,0,size,size,r)) cov++;
      for(let i=0;i<n;i++){ const x0=pad+i*(bw+gap), x1=x0+bw, y1=base, y0=base-heights[i]; if(inRounded(px,py,x0,y0,x1,y1,bw*0.32)) wc++; }
    }
    const a=cov/(SS*SS), wa=wc/(SS*SS);
    const t=(x+y)/(2*size);
    let R=lerp(0x5B,0x8B,t), G=lerp(0x5B,0x5C,t), B=lerp(0xD6,0xF6,t);
    if(badge){ R=G=B=255; }
    // fusion barres blanches
    const wr = badge ? 0 : 255;
    R=lerp(R, wr, wa*0.95); G=lerp(G, wr, wa*0.95); B=lerp(B, wr, wa*0.95);
    const A = badge ? Math.max(a*0, wa) : a; // badge: seulement les barres (monochrome)
    const o=(y*size+x)*4; buf[o]=Math.round(R); buf[o+1]=Math.round(G); buf[o+2]=Math.round(B); buf[o+3]=Math.round((badge?wa:A)*255);
  }
  return png(size,size,buf);
}
const out=path.join(__dirname,'icons');
fs.writeFileSync(path.join(out,'icon-192.png'), draw(192));
fs.writeFileSync(path.join(out,'icon-512.png'), draw(512));
fs.writeFileSync(path.join(out,'maskable-512.png'), draw(512,{maskable:true}));
fs.writeFileSync(path.join(out,'apple-touch-icon.png'), draw(180,{maskable:true}));
fs.writeFileSync(path.join(out,'badge.png'), draw(96,{badge:true}));
console.log('icons ok');
