#!/usr/bin/env python3
"""
speech-to-text.py
Convierte un archivo de audio WAV a texto usando Faster Whisper.
Uso: py speech-to-text.py <audio-file>
"""
import sys
from faster_whisper import WhisperModel

if len(sys.argv) < 2:
    print('{"error": "No audio file provided"}')
    sys.exit(1)

audio_file = sys.argv[1]
model_size = "base"  # tiny, base, small, medium, large

try:
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_file, language="es")
    text = " ".join([segment.text for segment in segments])
    print(text)
except Exception as e:
    print(f'{{"error": "{str(e)}"}}', file=sys.stderr)
    sys.exit(1)
