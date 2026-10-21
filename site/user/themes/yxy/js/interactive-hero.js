(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const disabled = () => reduced.matches || body.dataset.motion === 'off' || body.classList.contains('motion-paused') || document.hidden;
  const clearPointer = () => {
    hero.classList.remove('is-pointing');
    for (const property of ['--tilt-x','--tilt-y','--shift-x','--shift-y']) hero.style.removeProperty(property);
  };

  if (body.classList.contains('design-studio')) {
    hero.classList.add('interactive-ready');
    hero.addEventListener('pointermove', event => {
      if (disabled()) return;
      const bounds = hero.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      hero.classList.add('is-pointing');
      hero.style.setProperty('--tilt-x', `${(0.5-y)*3.5}deg`);
      hero.style.setProperty('--tilt-y', `${(x-0.5)*5}deg`);
      hero.style.setProperty('--shift-x', `${(x-0.5)*15}px`);
      hero.style.setProperty('--shift-y', `${(y-0.5)*10}px`);
      hero.style.setProperty('--light-x', `${x*100}%`);
      hero.style.setProperty('--light-y', `${y*100}%`);
    }, {passive:true});
    hero.addEventListener('pointerleave', clearPointer);
    document.addEventListener('yxy:motionchange', () => { if (disabled()) clearPointer(); });
    return;
  }

  const canvas = hero.querySelector('.hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const nexus = canvas.dataset.effect === 'nexus';
  const starLinks = [...hero.querySelectorAll('.star-link')];
  const featureLinks = [...hero.querySelectorAll('.star-link, .hero-capabilities a')];
  const featureGroup = hero.querySelector('.hero-capabilities');
  const pointer = {x:0,y:0,inside:false};
  const sparks = Array.from({length:nexus ? 42 : 24}, (_,i) => ({
    seed:i, x:((i*37+11)%97)/100, y:((i*53+19)%89)/100,
    phase:i*2.399963, speed:0.19+(i%5)*0.033
  }));
  const primary = [];
  const pulses = [];
  let width=0, height=0, mobile=false, inView=false, request=0, last=0, active=-1, motionTime=0, previousTime=0;
  let lastFrameMark=0, frameCount=0, orbitBoost=0, featured=-1;
  let featureElapsed=0, hovered=-1, focused=-1, groupHover=false;
  const held = () => hovered>=0 || focused>=0 || groupHover;
  const palette = nexus ? ['#60eaff','#607dff','#d099ff'] : ['#20a2e8','#4262e2','#9b50e6'];
  const glow = palette.map(color => {
    const sprite = document.createElement('canvas'); sprite.width=sprite.height=48;
    const sc = sprite.getContext('2d');
    const g = sc.createRadialGradient(24,24,0,24,24,24);
    g.addColorStop(0,'#ffffff');g.addColorStop(.12,color);g.addColorStop(.4,color+'88');g.addColorStop(1,color+'00');
    sc.fillStyle=g;sc.fillRect(0,0,48,48);return sprite;
  });
  function resize() {
    const rect=hero.getBoundingClientRect();width=rect.width;height=rect.height;mobile=width<=760;
    const ratio=Math.min(devicePixelRatio || 1, mobile?1.25:1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
    const points=mobile ? [[.23,.68],[.74,.74],[.42,.87]] : [[.81,.40],[.76,.68],[.38,.84]];
    primary.length=0;
    points.forEach(([x,y],i) => {
      primary.push({x:x*width,y:y*height});
      starLinks[i]?.style.setProperty('--star-x',`${x*width}px`);
      starLinks[i]?.style.setProperty('--star-y',`${y*height}px`);
    });
    draw(motionTime);
  }
  function dot(x,y,size,index,alpha=1) {
    ctx.globalAlpha=alpha;ctx.drawImage(glow[index%3],x-size,y-size,size*2,size*2);ctx.globalAlpha=1;
  }
  function deflect(x,y,strength=1) {
    if (!pointer.inside || disabled()) return {x,y};
    const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy),range=mobile?95:145;
    if (d<range && d>.1) {const push=(1-d/range)*23*strength;x+=dx/d*push;y+=dy/d*push;}
    return {x,y};
  }
  function drawStars(time) {
    const nodes=sparks.slice(0,mobile?16:24).map((p,i) => {
      let x,y;
      if(mobile){x=(.08+p.x*.85)*width;y=(.56+p.y*.32)*height;}
      else if(i%2){x=(.57+p.x*.38)*width;y=(.24+p.y*.58)*height;}
      else{x=(.08+p.x*.48)*width;y=(.60+p.y*.23)*height;}
      // Wider and quicker independent movement; primary link targets stay stable.
      const amplitude=mobile?18:32;
      return deflect(x+Math.sin(time*.95+p.phase)*amplitude,y+Math.cos(time*.78+p.phase)*amplitude*.78);
    });
    nodes.push(...primary);
    for(let i=0;i<nodes.length;i++) {
      let links=0;
      for(let j=i+1;j<nodes.length&&links<3;j++){
        const a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y),range=mobile?115:width*.23;
        if(d<range){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=.7;ctx.strokeStyle=`rgba(50,128,218,${.05+.19*(1-d/range)})`;ctx.stroke();links++;}
      }
      const main=i>=nodes.length-primary.length;
      dot(nodes[i].x,nodes[i].y,main?14:5,i,main?1:.65);
    }
    primary.forEach((p,i)=>{
      if(i===(active>=0?active:featured)){ctx.beginPath();ctx.arc(p.x,p.y,20+Math.sin(time*3)*3,0,Math.PI*2);ctx.strokeStyle='#435fe7';ctx.lineWidth=1;ctx.stroke();dot(p.x,p.y,22,i);}
    });
    if(pointer.inside&&!disabled()){
      dot(pointer.x,pointer.y,9,0,.65);
      nodes.filter(p=>Math.hypot(p.x-pointer.x,p.y-pointer.y)<(mobile?110:160)).slice(0,5).forEach(p=>{
        ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(p.x,p.y);ctx.strokeStyle='#408de16b';ctx.lineWidth=.9;ctx.stroke();
      });
    }
  }
  function orbitPosition(angle,band) {
    const cx=width*(mobile?.63:.74),cy=height*(mobile?.60:.44);
    const rx=Math.min(width*(mobile?.36:.24),310)*(1+band*.12),ry=rx*(.34+band*.10);
    const tilt=-.52+band*.35;
    const x=Math.cos(angle)*rx,y=Math.sin(angle)*ry;
    return deflect(cx+x*Math.cos(tilt)-y*Math.sin(tilt),cy+x*Math.sin(tilt)+y*Math.cos(tilt),.75);
  }
  function drawNexus(time) {
    ctx.globalCompositeOperation='lighter';
    sparks.slice(0,mobile?24:42).forEach((p,i)=>{
      const angle=p.phase+time*p.speed+orbitBoost,band=i%3;
      ctx.beginPath();
      for(let k=0;k<6;k++){const q=orbitPosition(angle-k*.025,band);if(k===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}
      ctx.lineWidth=i%7===0?1.5:.75;ctx.strokeStyle=palette[band]+'8c';ctx.stroke();
      const head=orbitPosition(angle,band);dot(head.x,head.y,i%7===0?9:5,band,.9);
    });
    if(pointer.inside&&!disabled()){
      dot(pointer.x,pointer.y,17,0,.85);
      ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(width*(mobile?.63:.74),height*(mobile?.60:.44));ctx.lineWidth=.6;ctx.strokeStyle='#4ed9ff3d';ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
  }
  function draw(time) {
    ctx.clearRect(0,0,width,height);
    if(nexus)drawNexus(time);else drawStars(time);
    for(let i=pulses.length-1;i>=0;i--){
      const pulse=pulses[i],age=time-pulse.start;
      if(age>1.15){pulses.splice(i,1);continue;}
      const progress=age/1.15;
      ctx.beginPath();ctx.arc(pulse.x,pulse.y,10+progress*(mobile?110:190),0,Math.PI*2);
      ctx.lineWidth=1.4*(1-progress)+.2;ctx.strokeStyle=nexus?`rgba(102,222,255,${(1-progress)*.7})`:`rgba(65,116,227,${(1-progress)*.55})`;ctx.stroke();
    }
    const count=String(pulses.length);
    if(canvas.dataset.pulses!==count)canvas.dataset.pulses=count;
  }
  function tick(now) {
    if(!inView||disabled()){request=0;previousTime=0;return;}
    request=requestAnimationFrame(tick);
    const interval=1000/(mobile?24:30);
    if(now-last<interval)return;
    if(previousTime){
      const step=Math.min((now-previousTime)/1000,.1);
      motionTime+=step;
      if(!held())featureElapsed+=step;
      if(pointer.inside)orbitBoost+=step*.12;
    }
    if(featureLinks.length && featured<0)setFeature(0,false);
    if(!held() && featureElapsed>=3.2){featureElapsed=0;setFeature((featured+1)%featureLinks.length,true);}
    previousTime=now;last=now;draw(motionTime);frameCount++;
    if(now-lastFrameMark>500){canvas.dataset.frames=String(frameCount);lastFrameMark=now;}
  }
  function sync() {
    const running=inView&&!disabled();canvas.dataset.state=running?'running':'paused';
    if(running&&!request){previousTime=0;if(held())holdFeature();request=requestAnimationFrame(tick);}
    else if(!running){cancelAnimationFrame(request);request=0;previousTime=0;pointer.inside=false;active=-1;canvas.dataset.hover='';featureLinks.forEach(link=>link.classList.remove('is-featured'));featured=-1;featureElapsed=0;}
  }
  function setFeature(index,automatic) {
    featured=index;
    featureLinks.forEach((link,i)=>link.classList.toggle('is-featured',i===index));
    canvas.dataset.feature=String(index);
    if(nexus&&automatic){const p=orbitPosition(motionTime*.25+index*Math.PI*2/3,index);pulse(p.x,p.y);}
  }
  function holdFeature() {
    const selected=hovered>=0?hovered:focused;
    active=selected;
    canvas.dataset.hover=selected>=0?featureLinks[selected].textContent.trim():'';
    canvas.dataset.rotation=held()?'held':'auto';
    hero.classList.toggle('feature-held',held());
    featureElapsed=0;
    if(selected>=0&&!disabled())setFeature(selected,false);
  }
  function pulse(x,y) {
    if(pulses.length===3)pulses.shift();
    pulses.push({x,y,start:motionTime});canvas.dataset.pulses=String(pulses.length);
  }
  hero.addEventListener('pointermove',event=>{
    if(disabled())return;
    const rect=hero.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.inside=true;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{pointer.inside=false;hovered=-1;groupHover=false;holdFeature();});
  hero.addEventListener('pointerdown',event=>{
    if(disabled()||event.target.closest('a,button,summary'))return;
    const rect=hero.getBoundingClientRect();
    pulse(event.clientX-rect.left,event.clientY-rect.top);
  },{passive:true});
  featureLinks.forEach((link,i)=>{
    link.addEventListener('pointerenter',()=>{hovered=i;holdFeature();});
    link.addEventListener('pointerleave',()=>{hovered=-1;holdFeature();});
    link.addEventListener('focus',()=>{focused=i;holdFeature();});
    link.addEventListener('blur',()=>{focused=-1;holdFeature();});
  });
  featureGroup?.addEventListener('pointerenter',()=>{groupHover=true;holdFeature();});
  featureGroup?.addEventListener('pointerleave',()=>{groupHover=false;holdFeature();});
  featureLinks.forEach((link,i)=>link.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    // Select the matching service before navigation; native details stay editable.
    if(i<2){document.querySelectorAll('.service').forEach((service,index)=>{service.open=index===i;});}
    if(disabled())return;
    const bounds=hero.getBoundingClientRect(),rect=link.getBoundingClientRect();
    pulse(rect.left+rect.width/2-bounds.left,rect.top+rect.height/2-bounds.top);
    link.classList.add('is-clicked');
    setTimeout(()=>link.classList.remove('is-clicked'),600);
    if(nexus){event.preventDefault();setTimeout(()=>{location.assign(link.href);},220);}
  }));
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(hero);else window.addEventListener('resize',resize,{passive:true});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.01}).observe(hero);else inView=true;
  document.addEventListener('yxy:motionchange',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{resize();sync();});
  hero.classList.add('interactive-ready');resize();sync();
})();
