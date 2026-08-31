#!/usr/bin/env python3
"""
Lightweight Static & Configuration Server for Plant Stake Labeler.
Serves the Angular web application and provides synchronized /api/config
and /api/history endpoints so all greenhouse devices share the same
configuration and print history log.
"""

import os
import sys
import json
import shutil
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()
# Use DATA_DIR environment variable if provided, otherwise default to BASE_DIR / "data" if present, else BASE_DIR
DATA_DIR = Path(os.environ.get("DATA_DIR", BASE_DIR / "data" if (BASE_DIR / "data").exists() else BASE_DIR))
DIST_DIR = BASE_DIR / "dist" / "label-live-app" / "browser"
CONFIG_FILE = DATA_DIR / "config.json"
EXAMPLE_CONFIG = BASE_DIR / "config.example.json"
HISTORY_FILE = DATA_DIR / "print_history.json"
MAX_HISTORY_ITEMS = 50

def get_or_create_config():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        # Check if legacy config exists in BASE_DIR
        legacy_config = BASE_DIR / "config.json"
        if legacy_config.exists() and legacy_config != CONFIG_FILE:
            try:
                shutil.copyfile(legacy_config, CONFIG_FILE)
            except Exception as e:
                print(f"Warning: Could not copy legacy config: {e}", file=sys.stderr)
        elif EXAMPLE_CONFIG.exists():
            try:
                shutil.copyfile(EXAMPLE_CONFIG, CONFIG_FILE)
            except Exception as e:
                print(f"Warning: Could not copy example config: {e}", file=sys.stderr)
        else:
            return {}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading config.json: {e}", file=sys.stderr)
        return {}

def save_config(config_data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error writing config.json: {e}", file=sys.stderr)
        return False

def get_history():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not HISTORY_FILE.exists():
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading print_history.json: {e}", file=sys.stderr)
        return []

def add_history_entry(entry):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    history = get_history()
    # Filter out duplicate ID if exists, prepend new entry
    history = [h for h in history if h.get("id") != entry.get("id")]
    history.insert(0, entry)
    history = history[:MAX_HISTORY_ITEMS]
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
        return True
    except Exception as e:
        print(f"Error writing print_history.json: {e}", file=sys.stderr)
        return False

def clear_history():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        return True
    except Exception as e:
        print(f"Error clearing print_history.json: {e}", file=sys.stderr)
        return False

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        serve_dir = str(DIST_DIR) if DIST_DIR.exists() else str(BASE_DIR)
        super().__init__(*args, directory=serve_dir, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/config":
            config = get_or_create_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            self.wfile.write(json.dumps(config).encode("utf-8"))
            return

        if self.path == "/api/history":
            history = get_history()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            self.wfile.write(json.dumps(history).encode("utf-8"))
            return

        # SPA fallback for frontend pushState routes
        path_without_query = self.path.split("?")[0]
        full_path = DIST_DIR / path_without_query.lstrip("/")
        if not full_path.exists() and not full_path.is_file() and not self.path.startswith("/api/"):
            index_path = DIST_DIR / "index.html"
            if index_path.exists():
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                with open(index_path, "rb") as f:
                    self.wfile.write(f.read())
                return

        super().do_GET()

    def do_POST(self):
        if self.path == "/api/config":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                if save_config(data):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                else:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Write failed"}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        if self.path == "/api/history":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                entry = json.loads(body.decode("utf-8"))
                if add_history_entry(entry):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                else:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Write failed"}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        if self.path == "/api/history":
            if clear_history():
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            else:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Clear failed"}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

def run_server(port=4200):
    httpd = HTTPServer(("", port), AppHandler)
    print(f"🌿 Server running at http://localhost:{port} (Data directory: {DATA_DIR})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        httpd.server_close()

if __name__ == "__main__":
    port = 4200
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
