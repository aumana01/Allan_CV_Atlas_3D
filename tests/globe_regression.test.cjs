const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/globe.js'),'utf8');
const make=()=>{
 let count=0,clear=0;const records=[];
 const C={Color:{WHITE:{},fromCssColorString:()=>({})},Cartesian3:{fromDegrees:(lon,lat,height)=>({lon,lat,height})},Cartesian2:class{},DistanceDisplayCondition:class{},LabelStyle:{FILL_AND_OUTLINE:1},VerticalOrigin:{BOTTOM:1},HeightReference:{NONE:0}};
 const context={window:{Cesium:C},console};
 vm.runInNewContext(source,context);
 const a=new context.window.AtlasGlobe({},()=>{});
 a.viewer={scene:{requestRender(){}},camera:{positionCartographic:{height:5000},cancelFlight(){},flyTo(v){this.last=v;}}};
 a.dataSource={entities:{add(p){count++;const e={...p,show:true};records.push(e);return e;},removeAll(){clear++;}}};
 return {a,C,records,counts:()=>({count,clear})};
};
test('Viewer turns off perpetual drawing',()=>{
 const sentinel=new Error('capture');let config;
 const fake={SceneMode:{SCENE3D:3},EllipsoidTerrainProvider:class{},Viewer:class{constructor(el,options){config=options;throw sentinel;}}};
 const ctx={window:{Cesium:fake,ATLAS_CONFIG:{cesiumIonToken:''}},console};
 vm.runInNewContext(source,ctx);
 const g=new ctx.window.AtlasGlobe({},()=>{});
 assert.throws(()=>g.init(),e=>e===sentinel);
 assert.equal(config.requestRenderMode,true);
 assert.equal(config.shouldAnimate,false);
 assert.equal(config.msaaSamples,1);
});
test('Timeline does not recreate 58 markers on repeated filters',()=>{
 const {a,counts}=make();
 const data=Array.from({length:58},(_,i)=>({id:String(i),lon:-84,lat:9.9+i*.001,tipo:'Proyecto',nombre:{es:'Proyecto '+i}}));
 a.setItems(data);
 for(let i=0;i<100;i++)a.setItems(data.filter((_,j)=>j%(i%5+1)===0));
 a.setItems(data);
 assert.deepEqual(counts(),{count:58,clear:0});
});
test('Project zoom respects safe camera heights',()=>{
 const {a}=make();
 const p={id:'1',lon:-84,lat:9.9,tipo:'Proyecto'};
 a.flyToProject(p,0);
 for(let i=0;i<70;i++)a.zoom(1);
 assert.ok(a.viewer.camera.last.destination.height>=700);
});
test('Dataset remains complete and coordinates stay valid',()=>{
 const d=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/portafolio.json'),'utf8'));
 assert.equal(d.items.length,58);
 for(const p of d.items){assert.ok(Number.isFinite(Number(p.lat))&&Math.abs(Number(p.lat))<=90);assert.ok(Number.isFinite(Number(p.lon))&&Math.abs(Number(p.lon))<=180);}
});