/* Shared cinematic layer. All race data and navigation remain in the app. */
(()=>{
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
 const host=document.querySelector('.hero')||document.querySelector('.entry-editorial')||document.querySelector('.splash-stage');
 if(!host)return;
 const entry=!host.matches('.hero');
 host.classList.add(entry?'apex-entry-cinema':'apex-cinema');
 host.dataset.render='loading';
 const stage=document.createElement('div');stage.className='apex-stage';stage.setAttribute('aria-label','Interactive Formula-style concept car in your team colours');
 const ghost=document.createElement('span');ghost.className='cinema-word';ghost.textContent='APEX';ghost.setAttribute('aria-hidden','true');
 const topline=document.createElement('div');topline.className='cinema-topline';topline.innerHTML='<i></i><span data-cinema-status>PREPARING THE MACHINE</span>';
 const bottom=document.createElement('div');bottom.className='cinema-bottom';bottom.innerHTML='<a class="cinema-caption" href="/credits"><b data-cinema-team>APEX ORIGINAL</b><span>TEAM-INSPIRED 3D CONCEPT ↗</span></a><div class="cinema-controls"><button type="button" data-cinema-angle aria-label="Change 3D camera angle">↻ Camera</button><button type="button" data-cinema-motion aria-pressed="false">Ⅱ Pause motion</button></div>';
 const rails=document.createElement('div');rails.className='cinema-rails';rails.setAttribute('aria-hidden','true');for(let i=0;i<18;i++){const rail=document.createElement('i');rail.style.setProperty('--rail',i);rails.append(rail);}
 host.append(ghost,stage,topline,bottom,rails);
 const status=topline.querySelector('[data-cinema-status]'),motion=bottom.querySelector('[data-cinema-motion]'),angle=bottom.querySelector('[data-cinema-angle]');
 let paused=reduced.matches,visible=true,inFrame=true,raf=0,renderOnce=()=>{},repaint=()=>{},disposed=false,activeTime=0,angleIndex=0,manualOrbit=null,renderer,scene,camera;
 const pointer={x:0,y:0},target={x:0,y:0},angles=[-.72,.06,-2.35];
 function motionLabel(){document.documentElement.dataset.motionState=paused?'paused':'playing';motion.textContent=reduced.matches?'Reduced motion':paused?'▷ Play motion':'Ⅱ Pause motion';motion.setAttribute('aria-pressed',String(paused));motion.disabled=reduced.matches;}
 motionLabel();
 const canAnimate=()=>!disposed&&host.dataset.render==='ready'&&!paused&&!document.hidden&&visible&&inFrame;
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
 let previous=0;
 function frame(now){raf=0;if(!canAnimate())return;const delta=previous?Math.min((now-previous)/1000,.06):0;previous=now;activeTime+=delta;repaint(activeTime,delta);raf=requestAnimationFrame(frame);}
 function sync(){stop();previous=0;if(canAnimate())raf=requestAnimationFrame(frame);else renderOnce();}
 motion.addEventListener('click',()=>{paused=!paused;motionLabel();sync();});
 angle.addEventListener('click',()=>{manualOrbit=null;angleIndex=(angleIndex+1)%angles.length;angle.textContent=['↻ Camera','↻ Side view','↻ Rear view'][angleIndex];renderOnce();});
 reduced.addEventListener('change',()=>{paused=reduced.matches;motionLabel();sync();});
 document.addEventListener('visibilitychange',sync);
 const intersection=new IntersectionObserver(entries=>{inFrame=entries[0].isIntersecting;sync();},{threshold:.03});intersection.observe(host);
 const view=host.closest('[id$="-view"]');
 const viewObserver=view?new MutationObserver(()=>{visible=!view.classList.contains('hidden');sync();}):null;
 viewObserver?.observe(view,{attributes:true,attributeFilter:['class']});
 let team=TeamThemes.resolve(document.documentElement.dataset.team||'apex'),onTeam=()=>{};
 function palette(){team=TeamThemes.resolve(document.documentElement.dataset.team||'apex');bottom.querySelector('[data-cinema-team]').textContent=team.id==='apex'?'APEX ORIGINAL':team.name.toUpperCase();onTeam(team);renderOnce();}
 const themeObserver=new MutationObserver(palette);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-team']});palette();
 if(fine.matches){host.addEventListener('pointermove',event=>{const r=host.getBoundingClientRect();target.x=((event.clientX-r.left)/r.width-.5)*2;target.y=((event.clientY-r.top)/r.height-.5)*2;});host.addEventListener('pointerleave',()=>{target.x=0;target.y=0;});}
 const revealNodes=[...document.querySelectorAll('.web-tool,.section-head,.workspace,.news-card,.view-header,.login-card,.splash-panel')];
 if(!reduced.matches){const reveals=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-visible');reveals.unobserve(e.target);}},{threshold:.06});revealNodes.forEach((node,i)=>{node.classList.add('cinema-reveal');node.style.setProperty('--reveal-delay',(i%4)*65+'ms');reveals.observe(node);});}
 if(fine.matches&&!reduced.matches)document.querySelectorAll('.web-tool').forEach(card=>{card.addEventListener('pointermove',event=>{if(reduced.matches||paused)return;const r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;card.style.transform='perspective(800px) rotateX('+((.5-y)*5)+'deg) rotateY('+((x-.5)*6)+'deg) translateY(-4px)';card.style.setProperty('--shine-x',x*100+'%');card.style.setProperty('--shine-y',y*100+'%');});card.addEventListener('pointerleave',()=>{card.style.transform='';});});
 window.addEventListener('hashchange',()=>{const node=document.getElementById((location.hash.slice(1)||'overview')+'-view');if(!node||reduced.matches)return;node.classList.remove('cinema-view-enter');requestAnimationFrame(()=>node.classList.add('cinema-view-enter'));});
 function fallback(){stop();host.dataset.render='fallback';status.textContent='YOUR TEAM. YOUR MACHINE.';stage.hidden=true;angle.disabled=true;angle.textContent='Studio view';motion.disabled=true;motion.textContent='Static view';}
 async function boot(){
  try{
   if(navigator.connection?.saveData){fallback();return;}
   const T=await import('/assets/three/three.module.js');
   renderer=new T.WebGLRenderer({antialias:devicePixelRatio<2,alpha:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:1.8));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
   renderer.shadowMap.enabled=innerWidth>700;renderer.shadowMap.type=T.PCFSoftShadowMap;
   renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','3D Formula-style concept car. Use left and right arrow keys to change the camera.');
   stage.append(renderer.domElement);
   renderer.domElement.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();manualOrbit=null;angleIndex=(angleIndex+(event.key==='ArrowRight'?1:2))%angles.length;renderOnce();});
   let drag=null;renderer.domElement.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={id:event.pointerId,x:event.clientX,angle:manualOrbit??angles[angleIndex]};renderer.domElement.setPointerCapture(event.pointerId);});renderer.domElement.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;manualOrbit=drag.angle+(event.clientX-drag.x)*.008;renderOnce();});for(const name of ['pointerup','pointercancel'])renderer.domElement.addEventListener(name,()=>{drag=null;});
   renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
   scene=new T.Scene();scene.fog=new T.FogExp2('#08090d',.035);camera=new T.PerspectiveCamera(34,1,.1,70);
   const [{GLTFLoader},{MeshoptDecoder},{RoomEnvironment}]=await Promise.all([import('/assets/three/GLTFLoader.js'),import('/assets/three/meshopt_decoder.module.js'),import('/assets/three/RoomEnvironment.js')]);
   const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environmentTarget=pmrem.fromScene(environment,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.7;environment.dispose();pmrem.dispose();
   scene.add(new T.HemisphereLight('#c7d9ff','#08090d',1.25));
   const key=new T.DirectionalLight('#ffffff',3);key.position.set(-4,7,5);key.castShadow=innerWidth>700;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;scene.add(key);
   const rim=new T.PointLight(team.primary,15,18,2);rim.position.set(2,2,-3);scene.add(rim);
   const cool=new T.PointLight('#c4d7ff',12,16,2);cool.position.set(-3,4,2);scene.add(cool);
   const rig=new T.Group();scene.add(rig);
   const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/assets/models/formula-f226.glb');
   const car=gltf.scene,box=new T.Box3().setFromObject(car),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   car.position.sub(center);const scale=6.1/Math.max(size.x,size.z);car.scale.setScalar(scale);car.position.multiplyScalar(scale);car.position.y-=box.min.y*scale-center.y*scale;rig.add(car);
   const paint=[],trim=[];
   car.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;mesh.receiveShadow=true;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];const replacements=mats.map(original=>{const material=original.clone();material.emissive?.set('#000000');material.emissiveIntensity=0;if(/livery/i.test(material.name)&&!/^(FrontWing|RearWing)/.test(material.name)){material.map=null;material.color.set(team.primary);material.metalness=.5;material.roughness=.25;paint.push(material);}else if(/carbon|WingLivery|material_0/i.test(material.name)){material.map=null;material.color.set('#11141b');material.metalness=.65;material.roughness=.34;}else if(/tyre/i.test(material.name)){material.map=null;material.color.set('#111114');material.roughness=.95;material.metalness=.02;}else if(/metal|cover/i.test(material.name)){material.map=null;material.color.set('#373b44');material.metalness=.8;material.roughness=.27;}return material;});mesh.material=Array.isArray(mesh.material)?replacements:replacements[0];});
   const floor=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({color:'#03040a',metalness:.48,roughness:.42,transparent:true,opacity:.72}));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;scene.add(floor);
   const shadowImage=document.createElement('canvas');shadowImage.width=256;shadowImage.height=128;const shadowContext=shadowImage.getContext('2d');if(shadowContext){const gradient=shadowContext.createRadialGradient(128,64,12,128,64,120);gradient.addColorStop(0,'rgba(0,0,0,.8)');gradient.addColorStop(1,'rgba(0,0,0,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,256,128);const contact=new T.Mesh(new T.PlaneGeometry(7.6,3.6),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowImage),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.025;scene.add(contact);}
   // A separate mirrored mesh gives a soft studio reflection without an extra
   // render target or expensive post-processing on phones.
   const reflection=car.clone(true);reflection.scale.y*=-1;reflection.position.y=-car.position.y-.075;reflection.traverse(mesh=>{if(!mesh.isMesh)return;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];const copies=materials.map(material=>{const copy=material.clone();copy.transparent=true;copy.opacity=.12;copy.depthWrite=false;return copy;});mesh.material=Array.isArray(mesh.material)?copies:copies[0];mesh.castShadow=false;});rig.add(reflection);reflection.visible=innerWidth>650;
   const arcMaterial=new T.MeshBasicMaterial({color:team.primary,transparent:true,opacity:.65,side:T.DoubleSide});
   const ring=new T.Mesh(new T.TorusGeometry(4.15,.012,6,160,Math.PI*1.4),arcMaterial);ring.rotation.x=Math.PI/2;ring.position.y=.012;scene.add(ring);
   const bars=new T.Group();for(let i=0;i<9;i++){const bar=new T.Mesh(new T.BoxGeometry(.022,.014,2.8),new T.MeshBasicMaterial({color:i%3===0?team.primary:'#c6d0e5',transparent:true,opacity:i%3===0?.5:.12}));bar.position.set(-5+i*1.25,.01,-2.2);bars.add(bar);}scene.add(bars);
   let cameraAngle=angles[0];const focus=new T.Vector3(0,.4,0);
   function draw(time,delta){pointer.x+=(target.x-pointer.x)*.045;pointer.y+=(target.y-pointer.y)*.045;const goal=manualOrbit??(angles[angleIndex]+(paused?0:Math.sin(time*.28)*.18));cameraAngle=paused||drag?goal:cameraAngle+((goal-cameraAngle+Math.PI*3)%(Math.PI*2)-Math.PI)*.055;const arrival=paused?0:Math.exp(-time*1.2)*3.2,radius=(entry?10:10.1)+arrival;camera.position.set(Math.sin(cameraAngle)*radius,3.25+pointer.y*.2+arrival*.25,Math.cos(cameraAngle)*radius);camera.position.x+=pointer.x*.35;camera.lookAt(focus);rig.rotation.y=paused?0:Math.sin(time*.22)*.025;ring.rotation.z=time*.035;rim.intensity=15+Math.sin(time*.7)*3;key.position.x=-4+Math.sin(time*.25)*1.5;bars.position.x=paused?0:(time*.24)%1.25;renderer.render(scene,camera);}
   repaint=draw;renderOnce=()=>{if(!renderer||disposed)return;draw(activeTime,0);};
   onTeam=next=>{paint.forEach(material=>material.color.set(next.primary));trim.forEach(material=>material.color.set(next.secondary||'#ffffff'));rim.color.set(next.primary);arcMaterial.color.set(next.primary);bars.children.forEach((bar,i)=>{if(i%3===0)bar.material.color.set(next.primary);});const reflected=[];reflection.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(/livery/i.test(material.name)&&!/^(FrontWing|RearWing)/.test(material.name))reflected.push(material);});reflected.forEach(material=>material.color.set(next.primary));};
   const resize=()=>{const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;reflection.visible=innerWidth>650;renderer.shadowMap.enabled=innerWidth>700;key.castShadow=innerWidth>700;renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:1.8));renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderOnce();};
   const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();palette();
   host.dataset.render='ready';status.textContent='REAL-TIME 3D / '+(entry?'PADDOCK EDITION':'STUDIO EDITION');sync();
   window.addEventListener('pageshow',event=>{if(event.persisted)sync();});
   window.addEventListener('pagehide',event=>{stop();if(event.persisted)return;disposed=true;resizeObserver.disconnect();intersection.disconnect();viewObserver?.disconnect();themeObserver.disconnect();scene.traverse(object=>{object.geometry?.dispose();const materials=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];materials.forEach(material=>material.dispose());});environmentTarget.dispose();renderer.dispose();});
  }catch{fallback();}
 }
 boot();
})();
