import * as THREE from '/assets/three/three.module.js';

// Formula F226 by CarlosCG31, CC BY 4.0. Full provenance at /credits.
const RoomEnvironment=(()=>{__ROOM_ENVIRONMENT__})();
const host=document.querySelector('.drift-scene');
if(host)startScene(host).catch(()=>{host.dataset.renderMode='fallback';host.querySelector('.drift-webgl')?.remove();});
async function startScene(host){
 let renderer,needsRender=true,contextLost=false;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{host.dataset.renderMode='fallback';return;}
 const canvas=renderer.domElement;
 canvas.className='drift-webgl';canvas.setAttribute('aria-hidden','true');
 host.prepend(canvas);
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x090c13,.055);
 const camera=new THREE.PerspectiveCamera(36,1,.1,90);
 scene.add(new THREE.HemisphereLight(0xa9bfd7,0x08090c,.6));
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.65;
 const key=new THREE.DirectionalLight(0xffe5c9,3.4);key.position.set(3,7,4);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:8,top:7,bottom:-7,near:.1,far:25});key.shadow.bias=-.001;scene.add(key);
 const rim=new THREE.DirectionalLight(0xa5cbff,4.5);rim.position.set(-5,3,-5);scene.add(rim);
 const fill=new THREE.PointLight(0xff302e,8,16);fill.position.set(-2,2,3);scene.add(fill);
 const paint=new THREE.MeshPhysicalMaterial({color:0xff302e,metalness:.08,roughness:.38,clearcoat:1,clearcoatRoughness:.24,envMapIntensity:.35});
 const kerbPaint=new THREE.MeshStandardMaterial({color:0xff302e,roughness:.65});
 const trim=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.45,roughness:.28});
 const carbon=new THREE.MeshStandardMaterial({color:0x111317,metalness:.35,roughness:.38});
 const rubber=new THREE.MeshStandardMaterial({color:0x111113,roughness:.86});
 const metal=new THREE.MeshStandardMaterial({color:0x7a8290,metalness:.9,roughness:.25});
 const yellow=new THREE.MeshStandardMaterial({color:0xdcb64e,roughness:.65});
 const car=new THREE.Group();scene.add(car);
 const box=(parent,w,h,d,x,y,z,mat=paint)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};

 // Detailed Formula F226 by CarlosCG31 (CC BY 4.0), web derivative by BadCodesGG.
 const loaded={scene:new THREE.ObjectLoader().parse(__DETAILED_CAR__)};
 const model=loaded.scene;model.rotation.y=Math.PI;model.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(model);model.scale.setScalar(5.3/bounds.getSize(new THREE.Vector3()).x);model.updateMatrixWorld(true);
 bounds.setFromObject(model);const centre=bounds.getCenter(new THREE.Vector3());model.position.set(-centre.x,-bounds.min.y,-centre.z);car.add(model);car.updateMatrixWorld(true);
 const weave=document.createElement('canvas');weave.width=weave.height=64;const weaveCtx=weave.getContext('2d');weaveCtx.fillStyle='#777';weaveCtx.fillRect(0,0,64,64);for(let i=0;i<64;i+=8)for(let j=0;j<64;j+=8){weaveCtx.fillStyle=(i+j)%16?'#888':'#666';weaveCtx.fillRect(i,j,6,3);weaveCtx.fillRect(i+3,j+3,3,5);}const carbonMap=new THREE.CanvasTexture(weave);carbonMap.wrapS=carbonMap.wrapT=THREE.RepeatWrapping;carbonMap.repeat.set(12,12);carbon.bumpMap=carbonMap;carbon.bumpScale=.002;carbon.roughness=.43;
 paint.onBeforeCompile=shader=>{shader.uniforms.uPrimary={value:paint.color};shader.uniforms.uSecondary={value:trim.color};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 liveryMask; varying vec3 vLiveryMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLiveryMask=liveryMask;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uPrimary; uniform vec3 uSecondary; varying vec3 vLiveryMask;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=uPrimary*vLiveryMask.r+uSecondary*vLiveryMask.g+vec3(.009,.011,.014)*vLiveryMask.b;');};
 model.traverse(node=>{if(!node.isMesh)return;node.castShadow=true;node.receiveShadow=true;const original=node.material.name||'';if(/Livery/i.test(original)){
  node.material=paint;const positions=node.geometry.attributes.position,masks=new Float32Array(positions.count*3),v=new THREE.Vector3();
  for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld);const dark=v.y<.28||(Math.abs(v.z)>.28&&v.y<.4),stripe=v.y>.46&&v.y<.50&&Math.abs(v.x)<1.85;masks.set(dark?[0,0,1]:stripe?[0,1,0]:[1,0,0],i*3);}node.geometry.setAttribute('liveryMask',new THREE.BufferAttribute(masks,3));
 }else if(/Tyre/i.test(original))node.material=rubber;else if(/Carbon|Cover/i.test(original))node.material=carbon;else if(/Metal/i.test(original))node.material=metal;else if(/Redlight/i.test(original))node.material=new THREE.MeshStandardMaterial({color:0xaa0000,emissive:0xff1000,emissiveIntensity:3});else{node.material=node.material.clone();node.material.roughness=Math.max(node.material.roughness||.4,.32);} });
 const wheels=[];
 for(const name of ['front-left-wheel','front-right-wheel','rear-left-wheel','rear-right-wheel']){
  const node=model.getObjectByName(name);if(!node)continue;
  const centre=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());const steer=new THREE.Group();steer.position.copy(centre);car.add(steer);const spin=new THREE.Group();steer.add(spin);car.updateMatrixWorld(true);spin.attach(node);wheels.push({steer,spin,front:name.startsWith('front')});
 }
 // A seated driver and dark visor keep the cockpit from reading as an empty model.
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.125,24,16),trim);helmet.position.set(.49,.72,0);car.add(helmet);
 const visor=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),carbon);visor.scale.set(.07,.035,.115);visor.position.set(.59,.74,0);car.add(visor);
 // A soft contact patch anchors the tyres even under the low camera.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,32,4,64,32,63);sg.addColorStop(0,'rgba(0,0,0,.95)');sg.addColorStop(.55,'rgba(0,0,0,.7)');sg.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,64);
 const contactTexture=new THREE.CanvasTexture(shadowCanvas);const contact=new THREE.Mesh(new THREE.PlaneGeometry(5.7,2.45),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,opacity:.9}));contact.rotation.x=-Math.PI/2;contact.position.y=.008;car.add(contact);
 // Lit asphalt and alternating kerb blocks are geometry in the same scene.
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,40),new THREE.MeshStandardMaterial({color:0x10131a,roughness:.48,metalness:.28}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const asphalt=document.createElement('canvas');asphalt.width=asphalt.height=512;const ac=asphalt.getContext('2d');const pixels=ac.createImageData(512,512);for(let i=0;i<pixels.data.length;i+=4){const n=75+Math.random()*65;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}ac.putImageData(pixels,0,0);const grain=new THREE.CanvasTexture(asphalt);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(22,14);floor.material.bumpMap=grain;floor.material.bumpScale=.018;floor.material.roughnessMap=grain;
 const lampMaterial=new THREE.MeshStandardMaterial({color:0xe1edff,emissive:0xc9dcff,emissiveIntensity:6});
 const scenery=[];for(let i=-5;i<=5;i++){const lamps=new THREE.Group();box(lamps,1.2,.025,.025,0,2.7,-5,lampMaterial);box(lamps,.025,2.7,.025,0,1.35,-5,carbon);lamps.position.x=i*3.2;scene.add(lamps);scenery.push({object:lamps,base:i*3.2});}
 const wall=box(scene,70,.65,.18,0,.32,-4.5,carbon);wall.receiveShadow=true;
 
 const kerbs=[];for(let i=-20;i<21;i++){const k=box(scene,.65,.045,.4,i*.65,.02,-2.2,i%2?trim:kerbPaint);k.castShadow=false;kerbs.push(k);}
 const lane=new THREE.Mesh(new THREE.PlaneGeometry(60,.035),new THREE.MeshBasicMaterial({color:0x8e8e99}));lane.rotation.x=-Math.PI/2;lane.position.set(0,.006,2.4);scene.add(lane);
 // Soft smoke sprites live in 3D space, emitted at the rear tyre contact patches.
 const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=64;
 const ctx=smokeCanvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(220,225,235,.65)');gradient.addColorStop(.4,'rgba(180,185,200,.25)');gradient.addColorStop(1,'rgba(160,170,190,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(smokeCanvas),smoke=[];
 for(let i=0;i<96;i++){const material=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,color:0xd5d9df});const p=new THREE.Sprite(material);scene.add(p);smoke.push({sprite:p,life:0,age:10,velocity:new THREE.Vector3()});}
 const skidPositions=new Float32Array(240*6),skidGeometry=new THREE.BufferGeometry();skidGeometry.setAttribute('position',new THREE.BufferAttribute(skidPositions,3));
 const skidMaterial=new THREE.LineBasicMaterial({color:0x050506,transparent:true,opacity:.7});const skids=new THREE.LineSegments(skidGeometry,skidMaterial);skids.frustumCulled=false;scene.add(skids);let skidIndex=0,lastTyres=null,smokeIndex=0,lastEmit=0;
 const sparkPositions=new Float32Array(64*6),sparkGeometry=new THREE.BufferGeometry();sparkGeometry.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));const sparkLines=new THREE.LineSegments(sparkGeometry,new THREE.LineBasicMaterial({color:0xffc470,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));sparkLines.frustumCulled=false;scene.add(sparkLines);
 const sparks=Array.from({length:64},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),age:10,life:.4}));let sparkIndex=0,lastSpark=0;
 let aspect=1,visible=true,elapsed=2.5,last=performance.now(),lastPhase=0,frame=0,wasPaused=false;
 const rearPoint=new THREE.Vector3();
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;aspect=r.width/r.height;renderer.setSize(r.width,r.height,false);camera.aspect=aspect;camera.updateProjectionMatrix();needsRender=true;}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 const observer=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);observer.observe(host);
 function recolour(){const style=getComputedStyle(document.documentElement);paint.color.set(style.getPropertyValue('--accent').trim()||'#ff302e').multiplyScalar(.68);kerbPaint.color.copy(paint.color);trim.color.set(style.getPropertyValue('--accent-secondary').trim()||'#ffffff').multiplyScalar(.75);fill.color.copy(paint.color);needsRender=true;}
 recolour();new MutationObserver(recolour).observe(document.documentElement,{attributes:true,attributeFilter:['data-team','style']});
 const label=host.querySelector('.drift-caption>span');if(label){label.childNodes[0].textContent='CINEMATIC 3D · ';}
 host.dataset.renderMode='webgl';host.setAttribute('aria-label','3D open-wheel concept car drifting right, with rotating wheels, lighting, shadows and tyre smoke');
 document.querySelectorAll('[data-entry-car-credit]').forEach(a=>{a.href='/credits';a.removeAttribute('target');a.textContent='3D model & visual credits';});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;host.dataset.renderMode='fallback';});
 canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;host.dataset.renderMode='webgl';resize();});
 function tick(now){frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden||contextLost)return;
  const paused=document.body.dataset.motionPaused==='true';if(!paused)elapsed+=dt;
  if(paused&&wasPaused&&!needsRender)return;wasPaused=paused;
  const p=(elapsed%9)/9;
  if(p<lastPhase){skidPositions.fill(0);skidIndex=0;lastTyres=null;smoke.forEach(s=>s.age=10);}lastPhase=p;
  const slide=Math.sin(Math.max(0,Math.min(1,(p-.1)/.7))*Math.PI);
  car.position.set(paused?0:-4.7+10*(p<.7?p*.86:.602+(p-.7)*1.3267),0,paused?0:Math.sin(p*Math.PI)*.55);
  car.rotation.y=paused?-.32:-.08-slide*.7+Math.max(0,p-.65)*1.1;
  car.rotation.z=paused?0:Math.sin(p*18)*.009*slide;
  for(const w of wheels){w.spin.rotation.z=paused?0:-elapsed*(p>.7?39:24);w.steer.rotation.y=w.front?(paused?-.1:.25*slide):0;}
  car.updateMatrixWorld(true);
  if(!paused){
   const speed=8+Math.max(0,p-.65)*30;
   grain.offset.x+=dt*speed/3.2;
   const roadOffset=elapsed*8;
   kerbs.forEach((k,i)=>k.position.x=((i*.65-roadOffset+30)%26.65+26.65)%26.65-13.3);
   scenery.forEach(s=>s.object.position.x=((s.base-roadOffset+40)%35.2+35.2)%35.2-17.6);
   for(let i=0;i<skidPositions.length;i+=3)if(skidPositions[i]!==0)skidPositions[i]-=speed*dt;
   skidGeometry.attributes.position.needsUpdate=true;
   if(slide>.6&&elapsed-lastSpark>.045){lastSpark=elapsed;for(let i=0;i<3;i++){const s=sparks[sparkIndex++%sparks.length];s.position.set(-1.6,.07,(Math.random()-.5)*.7).applyMatrix4(car.matrixWorld);s.velocity.set(-7-Math.random()*5,.6+Math.random()*1.1,(Math.random()-.5)*1.2);s.age=0;s.life=.2+Math.random()*.3;}}
   sparks.forEach((s,i)=>{s.age+=dt;if(s.age>s.life){sparkPositions.fill(0,i*6,i*6+6);return;}s.velocity.y-=dt*4;s.position.addScaledVector(s.velocity,dt);s.position.y=Math.max(.012,s.position.y);sparkPositions.set(s.position.toArray(),i*6);sparkPositions.set(s.position.clone().addScaledVector(s.velocity,-.014).toArray(),i*6+3);});sparkGeometry.attributes.position.needsUpdate=true;
  }
  if(!paused&&slide>.35&&elapsed-lastEmit>.06){lastEmit=elapsed;const tyrePoints=[];for(const side of [-1,1]){
   rearPoint.set(-1.45,.07,side*.74).applyMatrix4(car.matrixWorld);tyrePoints.push(rearPoint.clone());const s=smoke[smokeIndex++%smoke.length];s.sprite.position.copy(rearPoint);s.age=0;s.life=2+Math.random()*.5;s.velocity.set(-3.5-Math.random(),.35+Math.random()*.25,side*.12);s.sprite.material.rotation=Math.random()*6;
  }if(lastTyres)for(let j=0;j<2;j++){const offset=(skidIndex++%240)*6;skidPositions.set([...lastTyres[j].toArray(),...tyrePoints[j].toArray()],offset);}lastTyres=tyrePoints;skidGeometry.attributes.position.needsUpdate=true;}
  if(!paused)for(const s of smoke){s.age+=dt;const life=s.age/s.life;if(life>=1){s.sprite.material.opacity=0;continue;}s.sprite.position.addScaledVector(s.velocity,dt);const size=.28+life*1.6;s.sprite.scale.set(size,size,size);s.sprite.material.opacity=(1-life)*.34*Math.min(s.age*10,1);}
  const distance=THREE.MathUtils.clamp(1.7/aspect,.86,1.7),push=1-slide*.15;
  const shake=paused?0:Math.sin(elapsed*39)*.012*slide;
  camera.position.set(2.3*distance*push+car.position.x*.16,1.15*distance*push+shake,6.5*distance*push);
  camera.lookAt(car.position.x*.25,.48,0);renderer.render(scene,camera);needsRender=false;
  host.dataset.phase=paused?'paused':p<.23?'approach':p<.68?'drift':'exit';
 }
 frame=requestAnimationFrame(tick);
 window.addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(frame);resizeObserver.disconnect();observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});texture.dispose();renderer.dispose();},{once:true});
}
