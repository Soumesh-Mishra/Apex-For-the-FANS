// Dependency-free rasterization of APEX's original geometric A mark.
import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
const crc=buffer=>{let c=0xffffffff;for(const byte of buffer){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([length,name,data,checksum]);}
const polygon=[[.49,.24],[.77,.75],[.62,.75],[.48,.49],[.39,.66],[.53,.66],[.58,.75],[.23,.75]];
function inside(x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;}
await mkdir('pwa/icons',{recursive:true});
for(const size of [180,192,512]){const data=Buffer.alloc(size*(1+size*3));for(let y=0;y<size;y++){const row=y*(1+size*3);for(let x=0;x<size;x++){let coverage=0;for(let sy=0;sy<3;sy++)for(let sx=0;sx<3;sx++)if(inside((x+(sx+.5)/3)/size,(y+(sy+.5)/3)/size))coverage++;const t=coverage/9;for(let c=0;c<3;c++)data[row+1+x*3+c]=Math.round([16,16,18][c]*(1-t)+[255,48,46][c]*t);}}const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;await writeFile('pwa/icons/apex-'+size+'.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(data)),chunk('IEND',Buffer.alloc(0))]));}
console.log('Generated 180, 192 and 512 pixel app icons.');
