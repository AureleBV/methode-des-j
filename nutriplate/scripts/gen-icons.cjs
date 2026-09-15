// Génère les icônes PNG de la PWA sans dépendance (encodeur PNG minimal).
// Motif : assiette (cercle clair) + centre doré sur fond vert, coins arrondis.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
function crcTable(){ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; } return t; }
const T = crcTable();
function crc32(buf){ let c=0xFFFFFFFF; for(const b of buf) c = T[(c^b)&0xFF] ^ (c>>>8); return (c^0xFFFFFFFF)>>>0; }
function chunk(type, data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type), data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w,h,rgba){ const raw=Buffer.alloc((w*4+1)*h); for(let y=0;y<h;y++){ raw[y*(w*4+1)]=0; rgba.copy(raw, y*(w*4+1)+1, y*w*4, (y+1)*w*4); }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',ihdr), chunk('IDAT', zlib.deflateSync(raw,{level:9})), chunk('IEND', Buffer.alloc(0))]); }
const lerp=(a,b,t)=>a+(b-a)*t;
function draw(size){
  const buf=Buffer.alloc(size*size*4); const SS=3; const r=size*0.22; const c=size/2;
  const inRounded=(x,y)=>{ const cx=Math.min(Math.max(x,r),size-r), cy=Math.min(Math.max(y,r),size-r); return (x-cx)**2+(y-cy)**2 <= r*r; };
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    let bg=0, plate=0, core=0;
    for(let sy=0;sy<SS;sy++) for(let sx=0;sx<SS;sx++){
      const px=x+(sx+0.5)/SS, py=y+(sy+0.5)/SS; const d=(px-c)**2+(py-c)**2;
      if(inRounded(px,py)) bg++;
      if(d<=(size*0.27)**2) plate++;
      if(d<=(size*0.17)**2) core++;
    }
    const a=bg/(SS*SS), pa=plate/(SS*SS), ca=core/(SS*SS);
    let R=0x1f,G=0x7a,B=0x5c;
    R=lerp(R,0xfa,pa); G=lerp(G,0xfa,pa); B=lerp(B,0xf7,pa);
    R=lerp(R,0xf2,ca); G=lerp(G,0xb8,ca); B=lerp(B,0x4b,ca);
    const o=(y*size+x)*4; buf[o]=Math.round(R); buf[o+1]=Math.round(G); buf[o+2]=Math.round(B); buf[o+3]=Math.round(a*255);
  }
  return png(size,size,buf);
}
const out=path.join(__dirname,'..','public');
fs.writeFileSync(path.join(out,'icon-192.png'), draw(192));
fs.writeFileSync(path.join(out,'icon-512.png'), draw(512));
console.log('icons ok');
