"""API Python OPCIONAL en localhost:8765 para traducción y recompilación de datos.
El sitio de GitHub Pages NO usa esta API; consume el JSON que el script genera.
"""
from http.server import BaseHTTPRequestHandler,HTTPServer
import json, sys
from publicar_excel import create,translate_google,translate_libre
class Handler(BaseHTTPRequestHandler):
 def do_POST(self):
  try:
   length=int(self.headers.get('Content-Length',0)); body=json.loads(self.rfile.read(min(length,50000)))
   if self.path=='/traducir':
    txt=body.get('texto','');target=body.get('idioma','en'); provider=body.get('proveedor','google')
    if target not in ['en','it'] or not isinstance(txt,str) or len(txt)>5000:raise ValueError('Idioma o texto inválido')
    output=translate_google(txt,target) if provider=='google' else translate_libre(txt,target,body.get('endpoint',''))
    result={'traduccion':output}
   elif self.path=='/actualizar':
    result={'registros':create(body.get('proveedor','cache'),body.get('endpoint',''))['count']}
   else:raise ValueError('Ruta desconocida')
   self.send_response(200)
  except Exception as e:
   self.send_response(400);result={'error':str(e)}
  self.send_header('Content-Type','application/json; charset=utf-8');self.end_headers();self.wfile.write(json.dumps(result,ensure_ascii=False).encode())
if __name__=='__main__':
 print('Servicio de traducción local: http://127.0.0.1:8765')
 HTTPServer(('127.0.0.1',8765),Handler).serve_forever()
