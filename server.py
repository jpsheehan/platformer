import http.server
import threading
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

ROOT = 'assets'

def runServer():
    HandlerClass = http.server.SimpleHTTPRequestHandler
    HandlerClass.extensions_map['.js'] = 'text/javascript'
    HandlerClass.extensions_map['.mjs'] = 'text/javascript'
    http.server.test(HandlerClass, port=8000)

class AssetEventHandler(FileSystemEventHandler):
    def writeAssetsFile(self):
        assets = { "images": [], "sounds": [] }
        for filename in os.listdir(ROOT):
            pathname = os.path.join(ROOT, filename)
            name, ext = os.path.splitext(pathname)
            name = os.path.basename(name)

            if ext in ('.png', '.jpg', '.jpeg', '.bmp'):
                type = 'images'
            elif ext in ('.wav', '.ogg', '.mp3'):
                type = 'sounds'
            else:
                print(f"WARNING: Could not determine the file type for {pathname}.")
                continue

            assets[type].append((pathname, name))
        
        with open('Assets.mjs', 'w') as f:
            f.write("export const images = {\n")
            for pathname, name in assets['images']:
                f.write(f'    "{name}": "{pathname}",\n')
            f.write("};\n\n")

            f.write("export const sounds = {\n")
            for pathname, name in assets["sounds"]:
                f.write(f'    "{name}": "{pathname},\n')
            f.write("};\n\n")

            f.write("export const assets = { images, sounds };\n\n")

    def on_any_event(self, event):
        self.writeAssetsFile()

observer = Observer()
handler = AssetEventHandler()
handler.writeAssetsFile()

observer.schedule(handler, ROOT, True)
observer.start()

server = threading.Thread(target=runServer)
server.start()

threads = [
    server,
    observer
]

for thread in threads:
    thread.join()
