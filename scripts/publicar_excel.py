"""Construye data/portafolio.json para GitHub Pages desde Excel con una fuente ES.
No exige paquetes externos con --provider cache. Para traducción nueva:
  python -m pip install deep-translator
  python scripts/publicar_excel.py --provider google
O LibreTranslate: --provider libre --endpoint https://SERVIDOR/
"""
import argparse, csv, json, os, pathlib, re, sys, time, urllib.parse, urllib.request, zipfile
import xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
DAT=ROOT/'data'
COLS=['id','tipo','nombre','organizacion','pais','region','ciudad','latitud','longitud','anio_inicio','anio_fin','categoria','estado','rol','descripcion','tecnologias','indicador','precision','visible','fuente','url_fuente','url_google_maps','imagen_url','ambito','evidencia','participacion_detalle','nota_geografica','fuentes_internas','validacion']
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def leer_excel(path):
 with zipfile.ZipFile(path) as z:
  strs=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   root=ET.fromstring(z.read('xl/sharedStrings.xml'))
   strs=[''.join(t.text or '' for t in si.findall('.//s:t',NS)) for si in root.findall('s:si',NS)]
  # Archivo generado para 'Proyectos' en la primera hoja.
  root=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
  table=[]
  for row in root.findall('.//s:sheetData/s:row',NS):
   vals={}
   for cell in row.findall('s:c',NS):
    address=cell.get('r',''); col=re.match(r'[A-Z]+',address).group()
    ix=0
    for l in col:ix=ix*26+ord(l)-64
    typ=cell.get('t',''); v=cell.find('s:v',NS)
    if typ=='inlineStr':value=''.join(t.text or '' for t in cell.findall('.//s:t',NS))
    elif v is None:value=''
    elif typ=='s':value=strs[int(v.text or '0')]
    else:value=v.text or ''
    vals[ix-1]=value
   if vals:
    table.append([vals.get(i,'') for i in range(max(vals)+1)])
  if not table:return []
  headers=[h.strip() for h in table[0]]
  if 'nombre' not in headers:raise ValueError('La primera hoja debe llamarse Proyectos y tener encabezados sin modificar.')
  return [dict(zip(headers,row+['']*max(0,len(headers)-len(row)))) for row in table[1:] if row and str(row[0]).strip()]
def leer_csv():
 with (DAT/'proyectos.csv').open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def translate_google(msg,lang):
 try:from deep_translator import GoogleTranslator
 except ImportError as e:raise RuntimeError('Instala dependencia: python -m pip install deep-translator') from e
 return GoogleTranslator(source='es',target=lang).translate(msg)
def translate_libre(msg,lang,endpoint):
 if not endpoint:raise RuntimeError('--endpoint requerido para LibreTranslate')
 payload=json.dumps({'q':msg,'source':'es','target':lang,'format':'text'}).encode()
 req=urllib.request.Request(endpoint.rstrip('/')+'/translate',data=payload,headers={'Content-Type':'application/json','Accept':'application/json'},method='POST')
 with urllib.request.urlopen(req,timeout=35) as resp:return json.load(resp)['translatedText']
def create(provider='cache',endpoint='',force=False):
 data=leer_excel(DAT/'proyectos.xlsx') if (DAT/'proyectos.xlsx').exists() else leer_csv()
 cache_file=DAT/'traducciones_cache.json'; cache=json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {}
 count=0; missing=[]; new={}
 def t(value,lang):
  nonlocal count
  value=str(value or '').strip()
  if not value:return ''
  key=lang+'|'+value
  if key in cache and not force:return cache[key]
  if provider=='cache':
   missing.append(value[:50]);return value
  for attempt in range(3):
   try:
    result=translate_google(value,lang) if provider=='google' else translate_libre(value,lang,endpoint)
    if result:
     cache[key]=result;count+=1;time.sleep(.15);return result
   except Exception as exc:
    if attempt==2:print('ADVERTENCIA de traducción:',repr(exc),file=sys.stderr)
    time.sleep(1.5*(attempt+1))
  missing.append(value[:50]);return value
 records=[]; seen=set()
 for row in data:
  if str(row.get('visible','yes')).strip().lower() in ('no','false','0','oculto'):continue
  rid=str(row.get('id','')).strip()
  if not rid or rid in seen:raise ValueError('ID duplicado o vacío: '+rid)
  seen.add(rid)
  try:
   lat=float(str(row['latitud']).replace(',','.')); lon=float(str(row['longitud']).replace(',','.'))
   if not (-90<=lat<=90 and -180<=lon<=180):raise ValueError()
  except (ValueError,KeyError):
   print('OMITIDO sin coordenadas válidas',rid,file=sys.stderr);continue
  r={k:str(row.get(k,'') or '').strip() for k in COLS}
  r['lat']=lat;r['lon']=lon
  for name in ('nombre','rol','descripcion'):
   value=r.pop(name)
   r[name]={'es':value,'en':t(value,'en'),'it':t(value,'it')}
  r.pop('latitud',None);r.pop('longitud',None)
  for field in ('anio_inicio','anio_fin'):
   try:r[field]=int(float(r[field])) if r[field] else None
   except ValueError:r[field]=None
  if not r['url_google_maps']:
   q=f"{r['nombre']['es']} {r['ciudad']} {r['pais']}"
   r['url_google_maps']='https://www.google.com/maps/search/?api=1&query='+urllib.parse.quote(q)
  records.append(r)
 result={'generated':time.strftime('%Y-%m-%d'),'language_source':'es','count':len(records),'items':records}
 (DAT/'portafolio.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 cache_file.write_text(json.dumps(cache,ensure_ascii=False,indent=2),encoding='utf-8')
 print('PUBLICADO:',len(records),'registros | traducciones nuevas:',count,'| textos pendientes:',len(set(missing)))
 if missing:print('Para traducir contenido nuevo ejecutar: python scripts/publicar_excel.py --provider google')
 return result
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--provider',choices=('cache','google','libre'),default='cache');ap.add_argument('--endpoint',default=os.getenv('LIBRETRANSLATE_URL',''));ap.add_argument('--force',action='store_true');opts=ap.parse_args();create(opts.provider,opts.endpoint,opts.force)
