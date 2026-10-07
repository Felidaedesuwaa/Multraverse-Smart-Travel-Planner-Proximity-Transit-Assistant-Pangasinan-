// Exercise the real map and gesture hook without a device or map API key.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), babel = require('@babel/core');
const map = require('../src/data/pangasinanMap.json');
let slots = [], cursor = 0, picks = [];
const hook = value => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => slots[i] = typeof value === 'function' ? value(slots[i]) : value]; };
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
const mocks = {
 react: { useState: hook, useRef: value => hook({ current: value })[0], useMemo: fn => fn(), useCallback: fn => fn, useEffect() {} },
 'react-native': { Platform: { OS: 'web' }, View: 'View', Text: 'Text', Pressable: 'Pressable', PanResponder: { create: config => ({ panHandlers: config }) } },
 'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', G: 'G', Line: 'Line', Path: 'Path', Text: 'SvgText' },
};
function load(file) {
 const code = babel.transformSync(fs.readFileSync(file,'utf8'), { babelrc:false, configFile:false, plugins:[['@babel/plugin-transform-react-jsx',{pragma:'h',pragmaFrag:'Fragment'}],'@babel/plugin-transform-modules-commonjs'] }).code;
 const mod = { exports:{} };
 vm.runInNewContext(`(function(require,module,exports){${code}})`,{h, Fragment:'Fragment', Math, setTimeout: fn => fn(), window:{scrollX:0,scrollY:0}})(name => {
  if(mocks[name]) return mocks[name];
  if(name.endsWith('/FullscreenMap')) return {__esModule:true,default:'FullscreenMap'};
  if(name.endsWith('/theme/useAppTheme')) return {useAppTheme:()=>({palette:{ink:'#123',muted:'#456'},mapColors:{regions:['#fff'],border:'#333',label:'#111',water:'#eee'}})};
  const target = path.resolve(path.dirname(file),name);
  if(target.endsWith('.json')) return require(target);
  return load(fs.existsSync(target) ? target : fs.existsSync(target+'.jsx') ? target+'.jsx' : target+'.js');
 },mod,mod.exports);
 return mod.exports;
}
const Component=load('src/components/TransitJourneyMap.jsx').default;
const origin = {lat:16.0424,lng:120.3375};
const render = () => { cursor=0; return Component({origin,destination:null,pinMode:'destination',onPick:p=>picks.push(p)}); };
const find = (n,predicate) => { if(!n || typeof n!=='object')return null; if(predicate(n))return n; for(const child of n.children){const result=find(child,predicate);if(result)return result;}return null; };
const scale=Math.min(800/map.width,420/map.height);
const x=(origin.lng*0.9612616959383189-115.11081980143565)*817.448349655742+40;
const y=(16.443622150000063-origin.lat)*817.448349655742+40;
const event=(x,y,second)=>({nativeEvent:{locationX:x,locationY:y,pageX:x,pageY:y,touches:[{pageX:x,pageY:y},...(second?[{pageX:second[0],pageY:second[1]}]:[])]}});
let tree=render(), surface=find(tree,n=>n.props.onPanResponderGrant);
const tap=event(400+(x-map.width/2)*scale,210+(y-map.height/2)*scale);
surface.props.onPanResponderGrant(tap,{dx:0,dy:0});surface.props.onPanResponderRelease(tap,{dx:0,dy:0});
assert(Math.abs(picks[0].lat-origin.lat)<1e-8);assert(Math.abs(picks[0].lng-origin.lng)<1e-8);
const marker=find(tree,n=>n.type==='Circle'); assert(Math.abs(marker.props.cx-x)<1e-8);
const view=()=>find(render(),n=>n.type==='Svg').props.viewBox.split(' ').map(Number);
const initial=view();
surface.props.onPanResponderGrant(event(350,210,[450,210]),{dx:0,dy:0});
surface.props.onPanResponderMove(event(300,210,[500,210]),{dx:-50,dy:0});
surface.props.onPanResponderRelease(event(300,210),{dx:-50,dy:0});
assert.equal(picks.length,1,'Pinching must not place a pin');
const zoomed=view(); assert(Math.abs(zoomed[2]-initial[2]/2)<1e-8,'Pinch out doubles map scale');
surface=find(render(),n=>n.props.onPanResponderGrant);
surface.props.onPanResponderGrant(event(400,210),{dx:0,dy:0});
surface.props.onPanResponderMove(event(500,240),{dx:100,dy:30});
surface.props.onPanResponderRelease(event(500,240),{dx:100,dy:30});
assert.equal(picks.length,1,'Panning must not place a pin'); assert.notEqual(view()[0],zoomed[0],'Drag pans a zoomed map');
surface=find(render(),n=>n.props.onPanResponderGrant);
surface.props.onPanResponderGrant(event(300,210,[500,210]),{dx:0,dy:0});
surface.props.onPanResponderMove(event(350,210,[450,210]),{dx:50,dy:0});
// Finish with one finger; this is still a gesture, never a pin-placement tap.
surface.props.onPanResponderMove(event(350,210),{dx:50,dy:0});
surface.props.onPanResponderRelease(event(350,210),{dx:50,dy:0});
assert.equal(picks.length,1); assert(Math.abs(view()[2]-initial[2])<1e-8,'Pinch in restores scale');
const listeners=new Map();
surface=find(render(),n=>n.props.onPanResponderGrant);
surface.props.ref({getBoundingClientRect:()=>({left:0,top:0}),addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)});
let prevented=false;
listeners.get('wheel')({clientX:400,clientY:210,deltaY:-350,preventDefault:()=>{prevented=true;}});
assert(prevented);assert(view()[2]<initial[2],'Mouse wheel zooms');
listeners.get('keydown')({key:'0',preventDefault(){}});assert.equal(view()[2],initial[2]);
surface.props.ref(null);assert.equal(listeners.size,0,'DOM listeners are removed when fullscreen reparents the map');
assert(find(render(),n=>n.type==='FullscreenMap'),'Shared fullscreen wrapper is present');
assert(!find(render(),n=>n.props.accessibilityLabel==='Zoom in'),'Visible zoom buttons are removed');
console.log('Transit map checks passed: coordinate round-trip, marker projection, pinch in/out, drag, no accidental pins, wheel/keyboard zoom, fullscreen wrapper and listener cleanup.');
