import assert from 'node:assert/strict';
// Aggregate allocation-socket count only. Do not retain peer/network records.
export function boundRelaySockets(tables,min,max){
 assert(Number.isInteger(min)&&Number.isInteger(max)&&min>0&&max<=65535&&min<=max);
 let count=0;
 for(const text of tables){
  const lines=text.trim().split('\n');assert(lines[0].includes('local_address'));
  for(const line of lines.slice(1)){
   const f=line.trim().split(/\s+/);assert(f.length>=10&&/^[0-9A-F]+:[0-9A-F]{4}$/i.test(f[1]));
   const port=parseInt(f[1].split(':')[1],16);if(port>=min&&port<=max)count++;
  }
 }
 return count;
}
