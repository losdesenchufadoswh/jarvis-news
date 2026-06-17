#!/usr/bin/env python3
"""
speech-to-text.py
Convierte un archivo de audio (WAV/WebM/Opus) a texto usando Faster Whisper.
El navegador manda WebM aunque lo etiquetemos .wav; PyAV lo decodifica igual.
Uso: py -3 speech-to-text.py <audio-file>
Imprime SOLO el texto transcrito en stdout. Errores van a stderr.
"""
import sys
import os
import warnings

# Silencia warnings de HuggingFace/symlinks para no ensuciar stdout.
warnings.filterwarnings("ignore")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

if len(sys.argv) < 2:
    print("ERROR: No audio file provided", file=sys.stderr)
    sys.exit(1)

audio_file = sys.argv[1]

if not os.path.exists(audio_file):
    print(f"ERROR: File not found: {audio_file}", file=sys.stderr)
    sys.exit(1)

try:
    from faster_whisper import WhisperModel

    model_size = "base"  # tiny, base, small, medium, large
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_file, language="es", beam_size=1)
    text = " ".join(segment.text for segment in segments).strip()
    # Imprime solo el texto en stdout (sin nada más).
    sys.stdout.write(text)
    sys.stdout.flush()
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
