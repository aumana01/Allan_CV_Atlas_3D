"""Servidor local sin dependencias para lanzar el atlas en Windows/macOS/Linux."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

root = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

if __name__ == '__main__':
    server = None
    for port in (8878, 8879, 8880):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
            break
        except OSError:
            pass
    if server is None:
        raise SystemExit('Los puertos 8878, 8879 y 8880 están ocupados.')
    url = f'http://127.0.0.1:{port}/'
    print('ATLAS PROFESIONAL 3D - Allan Umaña')
    print('Abre tu navegador en:', url)
    print('Para detenerlo, presiona Ctrl+C.')
    threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
