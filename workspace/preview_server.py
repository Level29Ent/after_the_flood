import functools
import http.server
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

root = Path(__file__).resolve().parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv)>1 else 0), handler)
port = server.server_address[1]
record = {'url': f'http://127.0.0.1:{port}/dist/', 'boundAddress':'127.0.0.1','port':port,'projectRoot':str(root),'buildRoot':str(root/'dist'),'serverPid':os.getpid(),'serverStartTime':datetime.now(timezone.utc).isoformat(),'browserSession':'after_flood_expansion_02'}
(root/'preview-runtime.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
print(f'After the Flood preview ready at {record["url"]}', flush=True)
server.serve_forever()
