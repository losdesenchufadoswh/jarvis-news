#!/usr/bin/env python3
"""
text-to-speech.py
Convierte texto a audio WAV usando Piper TTS (voz en español).
Uso: py -3 text-to-speech.py "tu texto aqui" output.wav
El modelo es_ES-davefx-medium debe estar en la carpeta del proyecto (--data-dir .).
"""
import sys
import os
import warnings

warnings.filterwarnings("ignore")

if len(sys.argv) < 3:
    print("ERROR: Usage: text-to-speech.py <text> <output-file>", file=sys.stderr)
    sys.exit(1)

text = sys.argv[1]
output_file = sys.argv[2]
script_dir = os.path.dirname(os.path.abspath(__file__))
voice = "es_ES-davefx-medium"

try:
    from piper import PiperVoice
    import wave

    onnx_path = os.path.join(script_dir, f"{voice}.onnx")
    if not os.path.exists(onnx_path):
        print(f"ERROR: Voice model not found: {onnx_path}", file=sys.stderr)
        sys.exit(1)

    piper_voice = PiperVoice.load(onnx_path)
    with wave.open(output_file, "wb") as wav_file:
        piper_voice.synthesize_wav(text, wav_file)

    sys.stdout.write("OK")
    sys.stdout.flush()
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
