// Run Saved Places and Budget through their actual component trees and API boundaries.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), React = require('react'), babel = require('@babel/core');
const root = path.resolve(__dirname, '..'), cache = new Map(), instances = new Map();
let frame, effects = [], nodes = [], dark = true, platform = 'web', pickerCalls = 0, permissionCalls = 0, failSave = false, saved = [], deletedExpenses = [];
let photoSizes=[],photoResizes=[],photoCompressions=[],releasedContexts=0,releasedImages=0;
let catalogTrips = [{ id:'trip', title:'Dagupan adventure', status:'COMPLETED', plan:{ version:1 } }];
const budget = { entries:[{id:'expense',label:'Lunch',category:'Food',amount:100,color:'#123',date:'2026-10-07',tripId:'trip'}], settings:{monthlyBudget:1000,savingsTarget:20}, setEntries(value){this.entries = typeof value === 'function' ? value(this.entries) : value;}, setSettings(value){this.settings=value;} };
const api = { getTrips:async()=>catalogTrips,getSavedPlaces:async()=>[],getBudget:async()=>budget.entries,getBudgetSettings:async()=>budget.settings,
 createSavedPlace:async value=>{if(failSave)throw new Error('Offline. Try again.');saved.push(value);return {...value,id:'new'};}, updateSavedPlace:async(id,value)=>({...value,id}), deleteSavedPlace:async()=>{},deleteBudgetEntry:async id=>deletedExpenses.push(id) };
const flatten = value => Array.isArray(value) ? Object.assign({},...value.filter(Boolean).map(flatten)) : value || {};
const hooks = { useState(initial){const owner=frame,i=frame.index++;if(!(i in owner.slots))owner.slots[i]=typeof initial==='function'?initial():initial;return [owner.slots[i],value=>{owner.slots[i]=typeof value==='function'?value(owner.slots[i]):value;}];},
 useRef(value){const owner=frame,i=frame.index++;return owner.slots[i] ||= {current:value};},
 useEffect(fn,deps){const i=frame.index++,prev=frame.slots[i];if(!prev||!deps||deps.some((v,j)=>v!==prev[j]))effects.push(fn);frame.slots[i]=deps;},
 useCallback(fn){return fn;} };
const native={...Object.fromEntries(['View','Text','TextInput','Pressable','ScrollView','Modal','ActivityIndicator','Image'].map(n=>[n,n])),StyleSheet:{create:v=>v,flatten,absoluteFillObject:{position:'absolute',inset:0}},Platform:{get OS(){return platform;}},useWindowDimensions:()=>({width:390,height:844})};
function load(file){
 if(cache.has(file))return cache.get(file);
 const code=babel.transformSync(fs.readFileSync(file,'utf8'),{filename:file,babelrc:false,configFile:false,plugins:[['@babel/plugin-transform-react-jsx',{runtime:'automatic'}],'@babel/plugin-transform-modules-commonjs']}).code;
 const mod={exports:{}};
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
  if(name==='react')return {...React,...hooks};if(name==='react-native')return native;
  if(name==='@react-navigation/native')return {useFocusEffect:fn=>hooks.useEffect(fn,[])};
  if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:24,bottom:16,left:0,right:0})};
  if(name==='lucide-react-native')return new Proxy({},{get:(_,n)=>`Icon:${n}`});
  if(name==='expo-image-manipulator')return {SaveFormat:{JPEG:'jpeg'},ImageManipulator:{manipulate:()=>({resize:value=>photoResizes.push(value),renderAsync:async()=>({saveAsync:async options=>{photoCompressions.push(options.compress);return {base64:'A'.repeat(photoSizes.shift()??1000)};},release:()=>releasedImages++}),release:()=>releasedContexts++})}};
  if(name==='expo-image-picker')return {requestMediaLibraryPermissionsAsync:async()=>{permissionCalls++;return {granted:true};},launchImageLibraryAsync:async()=>{pickerCalls++;return {canceled:false,assets:[{uri:'file://photo',width:2000,height:1500}]};}};
  if(name.endsWith('/lib/placePhotos'))return {preparePlacePhoto:async()=> 'data:image/jpeg;base64,AAAA'};
  if(name.endsWith('/WorkspaceMotion'))return {FeedbackPressable:'Pressable'};
  if(name.endsWith('/lib/api'))return {api};
  if(name.endsWith('/store/budgetStore'))return {useBudgetStore:selector=>selector({...budget,setEntries:value=>budget.setEntries(value),setSettings:value=>budget.setSettings(value)})};
  if(name.endsWith('/store/preferencesStore'))return {usePreferencesStore:selector=>selector({currency:'PHP',rates:{PHP:1}})};
  if(name.endsWith('/theme/useAppTheme'))return {useAppTheme:()=>load(path.join(root,'src/theme/theme.js')).createTheme(dark)};
  if(name.endsWith('/hooks/useCurrency'))return {useCurrency:()=>({currency:'PHP',rates:{PHP:1},toPHP:v=>v,fromPHP:v=>v})};
  if(name.endsWith('/SavedItineraryDetails')||name.endsWith('/MoneyInput')||name.endsWith('/FormField'))return {__esModule:true,default:()=>null};
  if(name.startsWith('.')){const p=path.resolve(path.dirname(file),name);return load(fs.existsSync(p)?p:fs.existsSync(p+'.jsx')?p+'.jsx':p+'.js');}return require(name);
 },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const SavedPlaces=load(path.join(root,'src/pages/SavedPlaces.jsx')).default, Budget=load(path.join(root,'src/pages/Budget.jsx')).default;
let Screen=SavedPlaces, screenProps={};
function expand(el,loc='root'){
 if(!el||typeof el!=='object')return el;if(Array.isArray(el))return el.map((c,i)=>expand(c,`${loc}/${c?.key??i}`));
 if(typeof el.type==='function'){const key=`${loc}/${el.type.name}`;if(!instances.has(key))instances.set(key,{index:0,slots:[]});const old=frame;frame=instances.get(key);frame.index=0;const child=el.type(el.props);frame=old;return expand(child,key);}
 if(el.type===React.Fragment)return expand(el.props.children,loc);if(el.type==='Modal'&&!el.props.visible)return null;
 const result={type:el.type,props:el.props};nodes.push(result);result.children=expand(el.props.children,`${loc}/${el.type}`);return result;
}
function render(){nodes=[];return expand(React.createElement(Screen,screenProps));}
const settle=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
async function flush(){for(const effect of effects.splice(0))effect();await settle();}
const text=node=>node==null||typeof node==='boolean'?'':typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):text(node.children);
const button=label=>nodes.findLast(n=>n.type==='Pressable'&&(n.props.accessibilityLabel===label||text(n)===label));
const tap=label=>{const b=button(label);assert(b,`Find ${label}`);assert(!b.props.disabled,`${label} enabled`);const result=b.props.onPress();render();return result;};
const hasText=value=>nodes.some(n=>n.type==='Text'&&text(n).includes(value));
const modals=()=>nodes.filter(n=>n.type==='Modal').length;
(async()=>{
 for(const theme of [false,true])for(const target of ['web','ios']){
  dark=theme;platform=target;instances.clear();effects=[];Screen=SavedPlaces;render();await flush();tap('Add Place');await flush();assert.equal(modals(),1);
  tap('Select a completed plan');tap('Dagupan adventure');tap('Private');assert.equal(modals(),1);assert(button('Private').props.accessibilityState.selected);assert(hasText('Private photos are visible only to you.'));
  if(dark){assert.equal(flatten(button('Private').props.style).backgroundColor,'#F5B8BC');tap('Public');assert.equal(flatten(button('Public').props.style).backgroundColor,'#A8E6CF');tap('Private');}
  const before=pickerCalls;await tap('Upload photos');await settle();assert.equal(pickerCalls,before+1);assert(hasText('Photos (1/3)'));assert.equal(modals(),1,'Photo selection stays in one native modal');
  tap('Remove photo 1');assert.equal(modals(),1);tap('Go back');assert(hasText('Photos (1/3)'));
  assert.equal(flatten(button('Cancel').props.style).flex,flatten(button('Add Place').props.style).flex);
  failSave=true;tap('Add Place');assert.equal(modals(),1);await tap('Save experience');await settle();assert(hasText('Offline. Try again.'));assert.equal(saved.length,theme===false&&target==='web'?0:theme===false?1:target==='web'?2:3);
  failSave=false;tap('Add Place');await tap('Save experience');await settle();assert.equal(modals(),0);assert.equal(saved.at(-1).isPublic,false);assert.equal(saved.at(-1).photos.length,1);assert(hasText('Experience saved successfully.'));
  tap('Add Place');await flush();tap('Cancel');assert.equal(modals(),1);tap('Go back');assert.equal(modals(),1);tap('Cancel');tap('Discard changes');assert.equal(modals(),0);
 }
 assert.equal(permissionCalls,2,'Only native uploads request library permissions');
 instances.clear();effects=[];catalogTrips=[];render();await flush();tap('Add Place');await flush();assert(hasText('-- Nothing here --'));tap('-- Nothing here --');assert(hasText('-- Nothing here --'));tap('Cancel');tap('Discard changes');
 Screen=Budget;instances.clear();effects=[];render();await flush();const trash=button('Delete expense Lunch');assert(trash);trash.props.onPress();render();assert(hasText('Delete this expense?'));assert.equal(deletedExpenses.length,0);tap('Go back');assert.equal(deletedExpenses.length,0);
 const again=button('Delete expense Lunch');again.props.onPress();render();await tap('Delete expense');await settle();assert.deepEqual(deletedExpenses,['expense']);assert(hasText('No expenses to show.'));assert(hasText('Expense deleted.'));
 Screen=load(path.join(root,'src/components/FullscreenMap.jsx')).default;instances.clear();effects=[];screenProps={height:420,children:React.createElement('View',{testID:'map-surface'})};render();assert.equal(modals(),0);tap('Open fullscreen map');assert.equal(modals(),1);assert.equal(nodes.filter(n=>n.props.testID==='map-surface').length,1);tap('Exit fullscreen map');assert.equal(modals(),0);assert.equal(nodes.filter(n=>n.props.testID==='map-surface').length,1);
 const prepare=load(path.join(root,'src/lib/placePhotos.js')).preparePlacePhoto;photoSizes=[300000,200000];const photo=await prepare({uri:'phone.jpg',width:3000,height:4000});assert(photo.length<=250000);assert.deepEqual(photoResizes,[{width:900,height:1200},{width:675,height:900}]);assert.deepEqual(photoCompressions,[0.75,0.6]);assert.equal(releasedImages,2);assert.equal(releasedContexts,2);photoSizes=[300000,300000,300000,300000];await assert.rejects(()=>prepare({uri:'huge.jpg',width:4000,height:3000}),/too large/);assert.equal(releasedImages,6);assert.equal(releasedContexts,6);await assert.rejects(()=>prepare({uri:'bad',width:0,height:0}),/could not be read/);
 console.log('PASS: Photo compression retries/API limit/resource cleanup; Fullscreen enter/exit and a single map surface; Saved Places direct upload on web/iOS, immediate visibility/colors/copy, persisted photos, save failure/retry, equal actions, single-modal discard and empty dropdown; Budget deletion requires confirmation and updates totals.');
})().catch(e=>{console.error(e);process.exitCode=1;});
