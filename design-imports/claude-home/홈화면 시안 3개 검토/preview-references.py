"""Serve the imported design originals using existing app captures for shared images."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit
import argparse


REFERENCE_DIR = Path(__file__).resolve().parent
REPO_ROOT = REFERENCE_DIR.parents[2]
REFERENCE_PATH = "/" + REFERENCE_DIR.relative_to(REPO_ROOT).as_posix()
SHARED_UPLOADS = {"worries.png", "treasures.png", "rest-records.png"}


class ReferenceHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        request_path = unquote(urlsplit(path).path)
        upload_prefix = REFERENCE_PATH + "/uploads/"
        if request_path.startswith(upload_prefix):
            name = request_path[len(upload_prefix) :]
            if name in SHARED_UPLOADS:
                return str(REPO_ROOT / "expo-lab" / "assets" / "current-app" / name)
        return super().translate_path(path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    handler = partial(ReferenceHandler, directory=str(REPO_ROOT))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        for name in (
            "02-rest.dc.html",
            "03-archive.dc.html",
            "04-report.dc.html",
            "05-my.dc.html",
        ):
            path = quote(REFERENCE_PATH + "/" + name, safe="/")
            print(f"http://127.0.0.1:{args.port}{path}")
        server.serve_forever()
