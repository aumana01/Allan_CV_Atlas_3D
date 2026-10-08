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
     infoBox:false, fullscreenButton:false, shouldAnimate:false,
     // IMPORTANTE: nunca usar skyAtmosphere:true. Cesium espera un SkyAtmosphere
     // y el booleano provoca "setDynamicLighting is not a function" al renderizar.
     // La atmósfera se crea automáticamente al omitir esta opción.
     requestRenderMode:true, maximumRenderTimeChange:Number.POSITIVE_INFINITY, msaaSamples:1, showRenderLoopErrors:false,
   });
   this.viewer=viewer;
   viewer.resolutionScale=(window.devicePixelRatio||1)>1.5?0.75:0.9;
   viewer.scene.requestRenderMode=true;
   viewer.scene.maximumRenderTimeChange=Number.POSITIVE_INFINITY;
   if(token&&window.ATLAS_CONFIG?.osmBuildings){
     C.createOsmBuildingsAsync().then(tiles=>viewer.scene.primitives.add(tiles)).catch(err=>console.warn('3D buildings unavailable',err));
   }
   viewer.scene.globe.baseColor=C.Color.fromCssColorString('#0d2b39');
   viewer.scene.globe.showGroundAtmosphere=false;
   viewer.scene.globe.maximumScreenSpaceError=4;
   viewer.scene.globe.tileCacheSize=100;
   viewer.scene.globe.enableLighting=false;
   viewer.scene.fog.enabled=false;
   viewer.scene.globe.depthTestAgainstTerrain=false;
   viewer.scene.screenSpaceCameraController.minimumZoomDistance=700;
   viewer.scene.screenSpaceCameraController.maximumZoomDistance=45000000;
   viewer.scene.screenSpaceCameraController.inertiaSpin=0.55;
   viewer.scene.screenSpaceCameraController.inertiaZoom=0.4;
   viewer.scene.highDynamicRange=false;
   if(viewer.scene.postProcessStages?.fxaa)viewer.scene.postProcessStages.fxaa.enabled=false;
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
   this._lastReadout=0;
   this.moveListener=()=>{
     if(!this.onMove)return;
     const now=performance.now();if(now-this._lastReadout<220)return;this._lastReadout=now;
     const position=viewer.camera.positionCartographic;
     if(!position || !Number.isFinite(position.height) || !Number.isFinite(position.latitude) || !Number.isFinite(position.longitude))return;
     const lat=C.Math.toDegrees(position.latitude).toFixed(2);
     const lon=C.Math.toDegrees(position.longitude).toFixed(2);
     const alt=Math.round(position.height/1000).toLocaleString()+' km';
     if(this.onMove)this.onMove({lat,lon,alt});
   };
   viewer.camera.changed.addEventListener(this.moveListener);
   viewer.camera.percentageChanged=0.05;
   viewer.scene.renderError.addEventListener((scene,error)=>{
     console.error('Cesium render error',error);
     document.getElementById('globeError')?.removeAttribute('hidden');
     const status=document.getElementById('mapStatus');if(status)status.textContent='● VISOR TEMPORALMENTE NO DISPONIBLE';
   });
   viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-73,11,22000000),orientation:{heading:0,pitch:C.Math.toRadians(-90),roll:0}});
   let resizeTimer;const observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>this.resize(),120);});observer.observe(this.el);this.observer=observer;
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
  setItems(items,language='es',labels=true){
    if(!this.viewer||!this.dataSource)return;
    const C=Ces();
    const languageChanged=this.language!==language;
    this.language=language;this.labels=labels;
    this.items=items.filter(geoOk);
    const ids=new Set(this.items.map(p=>String(p.id)));
    // Stable entities: filtering never clears/recreates the GPU label collection.
    for(const p of this.items){
      const id=String(p.id);
      let entity=this.entities.get(id);
      if(!entity){
        const cls=this.classification(p),color=C.Color.fromCssColorString(COLORS[cls]);
        const title=(p.nombre?.[language]||p.nombre?.es||'').trim();
        entity=this.dataSource.entities.add({
          id:'atlas-'+p.id,
          position:C.Cartesian3.fromDegrees(Number(p.lon),Number(p.lat),75),
          point:{pixelSize:cls==='company'?10:13,color,outlineColor:C.Color.fromCssColorString('#041726'),outlineWidth:2,
            heightReference:C.HeightReference.NONE,disableDepthTestDistance:Number.POSITIVE_INFINITY},
          label:{text:title.length>31?title.slice(0,30)+'…':title,font:'700 12px sans-serif',fillColor:C.Color.WHITE,
            style:C.LabelStyle.FILL_AND_OUTLINE,outlineWidth:3,outlineColor:C.Color.fromCssColorString('#03111c'),
            pixelOffset:new C.Cartesian2(0,-22),verticalOrigin:C.VerticalOrigin.BOTTOM,
            distanceDisplayCondition:new C.DistanceDisplayCondition(0,1350000),show:labels,
            disableDepthTestDistance:Number.POSITIVE_INFINITY}
        });
        entity.atlasId=id;
        this.entities.set(id,entity);
      }
      if(!entity.show)entity.show=true;
      if(languageChanged){
        const text=(p.nombre?.[language]||p.nombre?.es||'').trim();
        entity.label.text=text.length>31?text.slice(0,30)+'…':text;
      }
      if(entity.label.show!==labels)entity.label.show=labels;
    }
    for(const [id,entity] of this.entities)if(!ids.has(id)&&entity.show)entity.show=false;
    this.viewer.scene.requestRender();
  }
  setLabels(v){this.labels=v;if(!this.viewer)return;for(const ent of this.entities.values())ent.label.show=v;this.viewer.scene.requestRender();}
  flyToProject(p,duration=1.5,heightOverride=null){
    if(!this.viewer||!geoOk(p))return;
    this.cancelTour();
    const C=Ces(),broad=/regional|multisitio|territorial|aproximad|municipio|localidad/i.test(p.precision||'');
    const height=Math.min(45000000,Math.max(700,Number(heightOverride)||(broad?70000:26000)));
    this.focusTarget={lat:Number(p.lat),lon:Number(p.lon),broad,height};
    this.viewer.camera.cancelFlight();
    this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(Number(p.lon),Number(p.lat),height),
      orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration});
    this.viewer.scene.requestRender();
  }
  flyToWorld(duration=1.8){
    if(!this.viewer)return;this.focusTarget=null;
    const C=Ces();this.viewer.camera.cancelFlight();
    this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-75,12,24000000),
      orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration});
  }
  flyToCostaRica(duration=1.8){
    if(!this.viewer)return;this.focusTarget=null;
    const C=Ces();this.viewer.camera.cancelFlight();
    this.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-84,9.8,1450000),
      orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration});
  }
  zoom(factor){
    if(!this.viewer)return;
    const C=Ces(),camera=this.viewer.camera,current=camera.positionCartographic?.height;
    if(!Number.isFinite(current)){this.flyToCostaRica(.2);return;}
    const next=Math.min(45000000,Math.max(700,current*(factor>0?.72:1.4)));
    if(this.focusTarget){
      const {lon,lat}=this.focusTarget;this.focusTarget.height=next;
      camera.cancelFlight();
      camera.flyTo({destination:C.Cartesian3.fromDegrees(lon,lat,next),
        orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration:.35});
      return;
    }
    const canvas=this.viewer.canvas;
    const center=new C.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2);
    const ray=camera.getPickRay(center),pick=ray&&this.viewer.scene.globe.pick(ray,this.viewer.scene);
    if(pick){
      const pos=C.Cartographic.fromCartesian(pick);
      if(Number.isFinite(pos?.latitude)&&Number.isFinite(pos?.longitude)){
        camera.cancelFlight();
        camera.flyTo({destination:C.Cartesian3.fromDegrees(C.Math.toDegrees(pos.longitude),C.Math.toDegrees(pos.latitude),next),
          orientation:{heading:camera.heading,pitch:-Math.PI/2,roll:0},duration:.35});
        return;
      }
    }
    if(factor>0)camera.zoomIn(Math.max(50,current*.28));else camera.zoomOut(Math.max(50,current*.4));
    this.viewer.scene.requestRender();
  }
  north(){if(!this.viewer)return;const C=Ces();this.viewer.camera.flyTo({destination:this.viewer.camera.position,orientation:{heading:0,pitch:C.Math.toRadians(-90),roll:0},duration:.8});}
  resize(){if(!this.viewer||this.el.clientWidth<100||this.el.clientHeight<100)return;try{this.viewer.resize();this.viewer.scene.requestRender();}catch(e){console.warn('Resize',e);}}
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
