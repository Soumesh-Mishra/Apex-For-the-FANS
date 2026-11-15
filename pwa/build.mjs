import {readFile} from 'node:fs/promises';
export async function installable(){
 const assets={};
 for(const [url,file,type] of [
  ['/manifest.webmanifest','manifest.webmanifest','application/manifest+json'],
  ['/sw.js','sw.js','text/javascript; charset=utf-8'],
  ['/install.js','install.js','text/javascript; charset=utf-8'],
  ['/install','install.html','text/html; charset=utf-8'],
  ['/offline','offline.html','text/html; charset=utf-8'],
  ...[180,192,512].map(size=>['/icons/apex-'+size+'.png','icons/apex-'+size+'.png','image/png'])
 ])assets[url]={body:(await readFile(new URL(file,import.meta.url))).toString('base64'),type};
 const tags='<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apex-180.png"><meta name="apple-mobile-web-app-title" content="APEX"><script src="/install.js" defer></script>';
 return {assets,enhance:html=>html.replace('</head>',tags+'</head>').replace('<div class="footer-links">','<div class="footer-links"><a href="/install">Install APEX ↗</a>')};
}
