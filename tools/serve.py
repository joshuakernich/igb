"""
A local server for the platform that tells the browser never to cache, so an
edit shows on the next reload (python's plain http.server lets the browser
keep old copies of the menu and the games).

    python3 tools/serve.py [port] [folder]    (defaults: $PORT or 4300, the project)
"""
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


# (the port: $PORT if set, as the preview launcher gives one; else a number given first; else 4300)
args = sys.argv[1:]
port = int(args.pop(0)) if args and args[0].isdigit() else 4300
port = int(os.environ.get('PORT') or port)
root = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
handler = functools.partial(NoCache, directory=root)
print(f'Serving {os.path.abspath(root)} on http://localhost:{port}/ (no caching)')
http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
