#!/usr/bin/env python3
"""
text-to-speech.py
Convierte texto a audio usando Piper TTS.
Uso: py text-to-speech.py "tu texto aquí" output.wav
"""
import sys
import subprocess

if len(sys.argv) < 3:
    print('{"error": "Usage: text-to-speech.py <text> <output-file>"}', file=sys.stderr)
    sys.exit(1)

text = sys.argv[1]
output_file = sys.argv[2]

try:
    # Usar piper CLI para generar audio
    # es_ES-olea-medium es una voz en español
    process = subprocess.Popen(
        ['piper', '--model', 'es_ES-olea-medium', '--output_file', output_file],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate(input=text.encode('utf-8'))

    if process.returncode != 0:
        print(f'{{"error": "{stderr.decode()}"}}', file=sys.stderr)
        sys.exit(1)

    print(f'{{"success": true, "file": "{output_file}"}}')
except Exception as e:
    print(f'{{"error": "{str(e)}"}}', file=sys.stderr)
    sys.exit(1)
