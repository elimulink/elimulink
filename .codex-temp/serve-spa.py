from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import os

ROOT = os.path.join(os.getcwd(), '.codex-temp', 'site')

class SPAHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = urlparse(path).path
        if path == '/' or path.startswith('/login') or path.startswith('/institution'):
            return os.path.join(ROOT, 'index.html')
        if path.startswith('/assets/') or '.' in path.rsplit('/', 1)[-1]:
            return os.path.join(ROOT, path.lstrip('/'))
        return os.path.join(ROOT, 'index.html')

    def log_message(self, format, *args):
        pass

os.chdir(ROOT)
ThreadingHTTPServer(('127.0.0.1', 5175), SPAHandler).serve_forever()
