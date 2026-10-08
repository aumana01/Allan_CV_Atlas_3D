"""Normaliza los 19 registros heredados, dejando UNA fuente en español."""
import csv, pathlib, urllib.parse, json
ROOT=pathlib.Path(__file__).resolve().parents[1]
with (ROOT/'data/datos_legado.csv').open(encoding='utf-8-sig', newline='') as f: rows=list(csv.DictReader(f))
cols=['id','tipo','nombre','organizacion','pais','region','ciudad','latitud','longitud','anio_inicio','anio_fin','categoria','estado','rol','descripcion','tecnologias','indicador','precision','visible','fuente','url_fuente','url_google_maps','imagen_url']
source_url={
'7':'https://www.santaanahoy.com/m%C3%A1s-agua-para-m%C3%A1s-personas-de-la-gam',
'15':'https://infofirma.sea.gob.cl/DocumentosSEA/MostrarDocumento?docId=f9%2F1e%2Ffce7ed7b924b34bc71ad37f6fd352bac898d',
'16':'https://www.wikidata.org/wiki/Q18477912',
'17':'https://www.celec.gob.ec/electroguayas/proyectos/',
}
out=[]
for r in rows:
 id=str(r['id']); area=f"{r['title_es']}, {r['city']}, {r['country']}"
 o={'id':id,'tipo':r['type'],'nombre':r['title_es'],'organizacion':r['organization'], 'pais':r['country'], 'region':r['region'],'ciudad':r['city'], 'latitud':r['latitude'], 'longitud':r['longitude'], 'anio_inicio':r['year_start'], 'anio_fin':r['year_end'], 'categoria':r['category'], 'estado':r['status'],'rol':r['role_es'],'descripcion':r['description_es'],'tecnologias':r['technologies'],'indicador':r['metric'],'precision':'Referencia territorial aproximada','visible':r['visible'],'fuente':r['source'],'url_fuente':source_url.get(id,''),'url_google_maps':'https://www.google.com/maps/search/?api=1&query='+urllib.parse.quote(area),'imagen_url':''}
 if id=='7':
  o.update({'region':'Heredia','ciudad':'Belén / Puente Mulas','latitud':'9.979','longitud':'-84.177','precision':'Municipio aproximado'})
  o['url_google_maps']='https://www.google.com/maps/search/?api=1&query='+urllib.parse.quote('Fuente Zamora Grupo Pedregal Puente Mulas Belén Costa Rica')
 if id=='15':o.update({'latitud':'-33.7055','longitud':'-70.93637','ciudad':'Talagante (CMPC Tissue)','precision':'Referencia de instalación pública'})
 if id=='16':o.update({'latitud':'-3.58535','longitud':'-38.85508','ciudad':'Pecém, São Gonçalo do Amarante','precision':'Referencia de instalación pública'})
 if id=='17':o.update({'ciudad':'Machala / Bajo Alto (por verificar)','precision':'Ciudad aproximada'})
 out.append(o)
with (ROOT/'data/proyectos.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(out)
with (ROOT/'data/traducciones_cache.json').open('w',encoding='utf-8') as f:
 cache={}
 for r,legacy in zip(out,rows):
  for field,old in [('nombre','title'),('rol','role'),('descripcion','description')]:
   value=r[field].strip()
   for lang in ['en','it']:
    t=legacy.get(f'{old}_{lang}','').strip()
    if value and t:cache[f'{lang}|{value}']=t.replace('Ttrattamento','Trattamento')
 json.dump(cache,f,ensure_ascii=False,indent=2)
print('Registros ES:',len(out),'Traducciones precargadas:',len(cache))
