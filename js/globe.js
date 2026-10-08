/* Atlas globe — CesiumJS, no Cesium Ion token needed for the default ellipsoid + imagery. */
(() => {
 'use strict';
 const COLORS={water:'#62baff',digital:'#43e5ba',company:'#ffc47c'};
 const geoOk = p => Number.isFinite(Number(p.lon)) && Number.isFinite(Number(p.lat)) && Math.abs(Number(p.lat))<=90 && Math.abs(Number(p.lon))<=180;
 const Ces=()=>window.Cesium;
 class AtlasGlobe {
  constructor(el, onSelect){this.el=el;this.onSelect=onSelect;this.viewer=null;this.dataSource=null;this.items=[];this.entities=new Map();this.language='es';this.labels=true;this.layer='satellite';this.tourTimer=null;this.onMove=null;this.focusTarget=null;this.anchorWheel=null;}
  init(){
   const C=Ces();if(!C)throw new Error('CesiumJS no está disponible: revisa el acceso a la CDN.');
   const token=String(window.ATLAS_CONFIG?.cesiumIonToken||'').trim();
   if(token)C.Ion.defaultAccessToken=token;
   const ground=token?{terrain:C.Terrain.fromWorldTerrain()}:{terrainProvider:new C.EllipsoidTerrainProvider()};
   const viewer = new C.Viewer(this.el, {
     sceneMode:C.SceneMode.SCENE3D, scene3DOnly:true, baseLayerPicker:false,
     baseLayer:false, ...ground,
     geocoder:false, homeButton:false, sceneModePicker:false,
     navigationHelpButton:false, timeline:false, animation:false, selectionIndicator:false,
     infoBox:false, fullscreenButton:false, shouldAnimate:true,
     // IMPORTANTE: nunca usar skyAtmosphere:true. Cesium espera un SkyAtmosphere
     // y el booleano provoca "setDynamicLighting is not a function" al renderizar.
     // La atmósfera se crea automáticamente al omitir esta opción.
     requestRenderMode:false,
   });
   this.viewer=viewer;
   if(token&&window.ATLAS_CONFIG?.osmBuildings){
     C.createOsmBuildingsAsync().then(tiles=>viewer.scene.primitives.add(tiles)).catch(err=>console.warn('3D buildings unavailable',err));
   }
   viewer.scene.globe.baseColor=C.Color.fromCssColorString('#0d2b39');
   viewer.scene.globe.showGroundAtmosphere=true;
   viewer.scene.globe.enableLighting=false;
   viewer.scene.fog.enabled=true;
   viewer.scene.globe.depthTestAgainstTerrain=false;
   viewer.scene.screenSpaceCameraController.minimumZoomDistance=170;
   viewer.scene.screenSpaceCameraController.maximumZoomDistance=45000000;
   viewer.scene.screenSpaceCameraController.inertiaSpin=0.85;
   viewer.scene.screenSpaceCameraController.inertiaZoom=0.7;
   viewer.scene.highDynamicRange=true;
   this.setLayer('satellite');
   this.dataSource=new C.CustomDataSource('Trayectoria Profesional');
   viewer.dataSources.add(this.dataSource);
   const cluster=this.dataSource.clustering;
   cluster.enabled=true;cluster.pixelRange=43;cluster.minimumClusterSize=3;
   cluster.clusterEvent.addEventListener((members,visual)=>{
     visual.billboard.show=false;
     visual.point.show=true;visual.point.pixelSize=27;
     visual.point.color=C.Color.fromCssColorString('#1f8f96').withAlpha(.98);
     visual.point.outlineColor=C.Color.fromCssColorString('#b7ffeb');visual.point.outlineWidth=2;
     visual.label.show=true;visual.label.text=String(members.length);
     visual.label.font='bold 13px Manrope, sans-serif';visual.label.fillColor=C.Color.WHITE;
     visual.label.showBackground=false;visual.label.pixelOffset=new C.Cartesian2(0,0);
     visual.label.horizontalOrigin=C.HorizontalOrigin.CENTER;visual.label.verticalOrigin=C.VerticalOrigin.CENTER;
     visual.label.disableDepthTestDistance=Number.POSITIVE_INFINITY;
   });
   const handler=new C.ScreenSpaceEventHandler(viewer.scene.canvas);
   handler.setInputAction(e=>{
     const picked=viewer.scene.pick(e.position);
     const candidate=picked && picked.id;
     if(candidate && candidate.atlasId){this.onSelect(candidate.atlasId);return;}
     if(Array.isArray(candidate)&&candidate.length){
       const points=candidate.filter(el=>el?.position).map(el=>el.position.getValue(C.JulianDate.now())).filter(Boolean);
       if(points.length){const sphere=C.BoundingSphere.fromPoints(points);sphere.radius=Math.max(sphere.radius*1.6,12000);viewer.camera.flyToBoundingSphere(sphere,{duration:1.6});return;}
     }
   },C.ScreenSpaceEventType.LEFT_CLICK);
   this.handler=handler;
   handler.setInputAction(()=>{this.focusTarget=null},C.ScreenSpaceEventType.LEFT_DOWN);
   this.anchorWheel=e=>{if(this.focusTarget){e.preventDefault();e.stopPropagation();this.zoom(e.deltaY<0?1:-1)}};
   this.el.addEventListener('wheel',this.anchorWheel,{capture:true,passive:false});
   this.moveListener=()=>{
     const position=viewer.camera.positionCartographic;
     if(!position)return;
     const lat=C.Math.toDegrees(position.latitude).toFixed(2);
     const lon=C.Math.toDegrees(position.longitude).toFixed(2);
     const alt=Math.round(position.height/1000).toLocaleString()+' km';
     if(this.onMove)this.onMove({lat,lon,alt});
   };
   viewer.camera.changed.addEventListener(this.moveListener);
   viewer.camera.percentageChanged=0.03;
   viewer.scene.renderError.addEventListener((scene,error)=>{ console.warn('Cesium render error',error); });
   viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-73,11,22000000),orientation:{heading:0,pitch:C.Math.toRadians(-90),roll:0}});
   const observer=new ResizeObserver(()=>this.resize());observer.observe(this.el);this.observer=observer;
   setTimeout(()=>{this.resize();this.flyToCostaRica(4);},550);
  }
  setLayer(which){
   if(!this.viewer)return;
   const C=Ces();const layers=this.viewer.imageryLayers;
   layers.removeAll(true);
   if(which==='streets'){
     layers.addImageryProvider(new C.OpenStreetMapImageryProvider({url:'https://tile.openstreetmap.org/',credit:'© OpenStreetMap contributors · openstreetmap.org/copyright'}));
   }else{
     // Public Esri raster imagery. Attribution must remain visible. Hosting/traffic subject to provider terms.
     const satelliteProvider=new C.UrlTemplateImageryProvider({
       url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
       tilingScheme:new C.WebMercatorTilingScheme(),
       maximumLevel:19,
       credit:'Tiles © Esri, Maxar, Earthstar Geographics and the GIS User Community'
     });
     let failures=0;
     satelliteProvider.errorEvent.addEventListener(err=>{
       if(this.layer==='satellite' && ++failures>=5){
         console.warn('Satellite unavailable; switching to streets.',err);
         this.setLayer('streets');
         document.querySelectorAll('[data-layer]').forEach(el=>el.classList.toggle('active',el.dataset.layer==='streets'));
       }
     });
     layers.addImageryProvider(satelliteProvider);
   }
   this.layer=which;
   this.viewer.scene.requestRender();
  }
  classification(p){
   if(String(p.tipo).toLowerCase().includes('empresa'))return 'company';
   const blob=(`${p.categoria||''} ${p.tecnologias||''} ${p.nombre?.es||''}`).toLowerCase();
   if(/digital|scada|python|streamlit|power bi|datos|software|visor|automatiz|gis|tecnolog|instrumentaci|telemetr/.test(blob))return 'digital';
   return 'water';
  }
  setItems(items, language='es',labels=true){
   if(!this.viewer || !this.dataSource)return;
   const C=Ces();this.language=language;this.labels=labels;
   this.items=items.filter(geoOk);this.entities.clear();this.dataSource.entities.removeAll();
   for(const p of this.items){
     const cls=this.classification(p), color=C.Color.fromCssColorString(COLORS[cls]);
     const title=(p.nombre?.[language] || p.nombre?.es || '').trim();
     const entity=this.dataSource.entities.add({
       id:'atlas-'+p.id, position:C.Cartesian3.fromDegrees(Number(p.lon),Number(p.lat),75),
       point:{pixelSize:cls==='company'?10:13,color,outlineColor:C.Color.fromCssColorString('#041726'),outlineWidth:2,
         heightReference:C.HeightReference.NONE,scaleByDistance:new C.NearFarScalar(150000,1.2,9500000,.85),
         disableDepthTestDistance:Number.POSITIVE_INFINITY},
       label:{text:title.length>31?title.slice(0,30)+'…':title,
         font:'700 12px DM Sans,sans-serif',fillColor:C.Color.WHITE,
         style:C.LabelStyle.FILL_AND_OUTLINE,outlineWidth:3,outlineColor:C.Color.fromCssColorString('#03111c'),
         pixelOffset:new C.Cartesian2(0,-22),verticalOrigin:C.VerticalOrigin.BOTTOM,
         distanceDisplayCondition:new C.DistanceDisplayCondition(0,1350000),
         show:labels,disableDepthTestDistance:Number.POSITIVE_INFINITY,
         scaleByDistance:new C.NearFarScalar(25000,1,1350000,.78)}
     });
     entity.atlasId=String(p.id);this.entities.set(String(p.id),entity);
   }
   this.viewer.scene.requestRender();
  }
  setLabels(v){this.labels=v;if(!this.viewer)return;for(const ent of this.entities.values())ent.label.show=v;this.viewer.scene.requestRender();}
  flyToProject(p,duration=1.8,heightOverride=null){
    if(!this.viewer||!geoOk(p))return;
    this.cancelTour();const C=Ces();
    const broad=/regional|multisitio|territorial|aproximad|municipio|localidad/i.test(p.precision||'');
    const height=heightOverride??(broad?70000:26000);
    this.focusTarget={lon:Number(p.lon),lat:Number(p.lat),broad};
    this.viewer.camera.flyToBoundingSphere(new C.BoundingSphere(C.Cartesian3.fromDegrees(Number(p.lon),Number(p.lat),0),120),{offset:new C.HeadingPitchRange(0,-C.Math.PI_OVER_TWO,height),duration});
  }
  flyToWorld(duration=2){if(!this.viewer)return;this.focusTarget=null;const C=Ces();this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-75,12,24000000),orientation:{heading:0,pitch:C.Math.toRadians(-90),roll:0},duration});}
  flyToCostaRica(duration=2){if(!this.viewer)return;this.focusTarget=null;const C=Ces();this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-84,9.8,1450000),orientation:{heading:0,pitch:C.Math.toRadians(-70),roll:0},duration});}
  zoom(factor){
    if(!this.viewer)return;const C=Ces();const camera=this.viewer.camera,current=camera.positionCartographic.height,next=Math.max(220,Math.min(45000000,current*(factor>0?.68:1.42)));
    if(this.focusTarget){this.viewer.camera.flyToBoundingSphere(new C.BoundingSphere(C.Cartesian3.fromDegrees(this.focusTarget.lon,this.focusTarget.lat,0),120),{offset:new C.HeadingPitchRange(0,-C.Math.PI_OVER_TWO,next),duration:.55});return;}
    const center=new C.Cartesian2(this.viewer.canvas.clientWidth/2,this.viewer.canvas.clientHeight/2),ray=camera.getPickRay(center),picked=ray&&this.viewer.scene.globe.pick(ray,this.viewer.scene);
    if(picked){const carto=C.Cartographic.fromCartesian(picked);this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(C.Math.toDegrees(carto.longitude),C.Math.toDegrees(carto.latitude),next),orientation:{heading:camera.heading,pitch:camera.pitch,roll:camera.roll},duration:.55});return;}
    if(factor>0)camera.zoomIn(Math.max(100,current*.37));else camera.zoomOut(Math.max(100,current*.42));
  }
  north(){if(!this.viewer)return;const C=Ces();this.viewer.camera.flyTo({destination:this.viewer.camera.position,orientation:{heading:0,pitch:C.Math.toRadians(-90),roll:0},duration:.8});}
  resize(){if(!this.viewer)return;try{this.viewer.resize();this.viewer.scene.requestRender();}catch(e){console.warn('Resize',e);}}
  tour(items,onStep,onFinish){
    this.cancelTour();const chosen=items.filter(geoOk).slice(0,7);
    if(!chosen.length)return;
    let index=0;
    const step=()=>{
      if(index>=chosen.length){this.cancelTour();onFinish?.();return;}
      const p=chosen[index++];onStep?.(p);
      const C=Ces();this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(Number(p.lon),Number(p.lat),110000),
       orientation:{heading:0,pitch:C.Math.toRadians(-67),roll:0},duration:2});
      this.tourTimer=setTimeout(step,4200);
    };
    step();
  }
  cancelTour(){if(this.tourTimer){clearTimeout(this.tourTimer);this.tourTimer=null;}}
  destroy(){this.cancelTour();if(this.anchorWheel)this.el.removeEventListener('wheel',this.anchorWheel,true);this.observer?.disconnect();this.handler?.destroy();if(this.viewer&&!this.viewer.isDestroyed())this.viewer.destroy();}
 }
 window.AtlasGlobe=AtlasGlobe;
})();
