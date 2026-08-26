"""Local development server.

Identical to `python -m http.server` except that it tells the browser not to
cache anything. Without that, an edited .js file keeps being served from the
browser cache and you end up debugging code that is no longer on disk.

This is a development convenience only. The site itself is plain static files
with no build step and no dependencies - any static host will serve it as is.

    python serve.py [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler) as httpd:
        print(f"serving on http://localhost:{port} (no-cache)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
