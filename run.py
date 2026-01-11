#!/usr/bin/env python3
"""
Run in commandline
"""

import http.server
import socketserver
import socket
import sys

START_PORT = 8000
MAX_TRIES = 20


def find_free_port(start):
    for port in range(start, start + MAX_TRIES):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    raise RuntimeError("No free port found.")


def main():
    try:
        port = find_free_port(START_PORT)
    except RuntimeError as e:
        print("Error:", e)
        sys.exit(1)

    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler) as httpd:
        url = f"http://localhost:{port}"
        print("=" * 50)
        print(" Dog Breeding Calculator Server Started ")
        print("=" * 50)
        print(f"Open this in your browser:\n  {url}")
        print("\nPress CTRL+C to stop the server.")
        print("=" * 50)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
