const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),babel=require('@babel/core');
let slots=[],cursor=0,effects=[],instances=[],markers=[],fitCalls=0,removedListeners=0;
const useState=initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];};
const hooks={useState,useRef:v=>useState({current:v})[0],useEffect(fn,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((v,j)=>v!==previous.deps[j]))effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)});
const maps={Map:class{constructor(node,options){this.options=options;this.center=options.center;this.zoom=options.zoom;instances.push(this);}addListener(){return {remove(){removedListeners++;}};}getCenter(){return {toJSON:()=>this.center};}getZoom(){return this.zoom;}fitBounds(){fitCalls++;}panTo(p){this.center=p;}},
 Marker:class{constructor(options){this.options=options;markers.push(this);}addListener(){return {remove(){}};}setMap(value){this.detached=value===null;}setPosition(){}},LatLngBounds:class{extend(){}}};
const code=babel.transformSync(fs.readFileSync('src/components/TransitPinMap.web.jsx','utf8'),{babelrc:false,configFile:false,plugins:[['@babel/plugin-transform-react-jsx',{pragma:'h'}],'@babel/plugin-transform-modules-commonjs']}).code;
const mod={exports:{}};
vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{h,google:{maps},process:{env:{EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:'test-key'}},setTimeout,clearTimeout})(name=>name==='react'?{...hooks,createElement:h}:{__esModule:true,default:name},mod,mod.exports);
const props={origin:{lat:16,lng:120.2},destination:{lat:16.1,lng:120.3},pinMode:'origin',onPick(){},onMovePin(){}};
const render=()=>{cursor=0;return mod.exports.default(props);};
async function flush(){for(const effect of effects.splice(0))effect();await new Promise(resolve=>setImmediate(resolve));render();}
(async()=>{
 render();await flush();await flush();assert.equal(instances.length,1);assert.equal(markers.length,2);assert.equal(fitCalls,1);
 assert.equal(instances[0].options.zoomControl,false);assert.equal(instances[0].options.fullscreenControl,false);assert.equal(instances[0].options.gestureHandling,'greedy');
 instances[0].center={lat:16.05,lng:120.25};instances[0].zoom=13;
 render().props.onFullscreenChange(true);render();await flush();await flush();assert.equal(instances.length,2);assert.equal(instances[1].zoom,13);assert.equal(instances[1].center.lat,16.05);assert.equal(fitCalls,1,'Fullscreen preserves the camera');assert(markers.slice(0,2).every(m=>m.detached));assert.equal(markers.filter(m=>!m.detached).length,2,'Pins remain on the fullscreen map');
 render().props.onFullscreenChange(false);render();await flush();await flush();assert.equal(instances.length,3);assert.equal(instances[2].zoom,13);assert.equal(markers.filter(m=>!m.detached).length,2);assert.equal(removedListeners,2);
 console.log('PASS: Google map gestures, hidden zoom buttons, fullscreen enter/exit, camera and pin preservation, old map cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
