/* voice.js — Web Speech API (STT continuo + TTS).
   Funciona en Chrome/Edge/Safari/iOS. Sin Python. */
window.JarvisVoice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec        = null;
  let muted      = false;
  let listening  = false;
  let speaking   = false;
  let active     = false;
  let onResult   = null;
  let onChange   = null;
  let restartTm  = null;
  let speakGuard = false;   // bloqueo extra anti-self-listening

  function _notify() { if (onChange) onChange(listening && !muted && !speaking); }

  // Desbloquea el sintetizador en iOS (debe llamarse dentro de un gesto del usuario).
  function unlock() {
    const utt = new SpeechSynthesisUtterance('');
    utt.volume = 0;
    speechSynthesis.speak(utt);
  }

  function init({ onTranscript, onListenChange } = {}) {
    onResult = onTranscript;
    onChange = onListenChange;
    active   = true;
    muted    = false;
    if (!SR) return false;
    _buildRec();
    return true;
  }

  function _buildRec() {
    if (rec) { try { rec.abort(); } catch(e) {} rec = null; }
    rec = new SR();
    rec.lang            = 'es-PR';
    rec.continuous      = true;
    rec.interimResults  = false;
    rec.maxAlternatives = 1;

    rec.onresult = (evt) => {
      // Ignora completamente si JARVIS está hablando o hay guarda activa
      if (speaking || speakGuard) return;
      const last = evt.results[evt.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text && onResult) onResult(text);
      }
    };

    rec.onstart = () => { listening = true; _notify(); };

    rec.onend = () => {
      listening = false;
      _notify();
      if (active && !muted && !speaking) {
        clearTimeout(restartTm);
        restartTm = setTimeout(_safeStart, 600);
      }
    };

    rec.onerror = (evt) => {
      listening = false;
      _notify();
      if (evt.error === 'not-allowed') { muted = true; return; }
      if (active && !muted && !speaking && evt.error !== 'aborted') {
        clearTimeout(restartTm);
        restartTm = setTimeout(_safeStart, 1200);
      }
    };
  }

  function _safeStart() {
    if (!rec || listening || muted || !active || speaking) return;
    _buildRec();
    try { rec.start(); } catch(e) {}
  }

  function start() {
    clearTimeout(restartTm);
    if (!speaking) _safeStart();
  }

  function stop() {
    clearTimeout(restartTm);
    if (rec && listening) {
      try { rec.abort(); } catch(e) {}  // abort = parada inmediata
    }
    listening = false;
    _notify();
  }

  // Elige la mejor voz española disponible: prefiere masculina y grave.
  function _pickVoice(utt) {
    const vv = speechSynthesis.getVoices();
    if (!vv.length) return;
    // Orden de preferencia: male español, español con nombre conocido, cualquier español
    const male = vv.find(v => v.lang.startsWith('es') && /jorge|pablo|carlos|diego|miguel|male|hombre|alvaro|enrique|juan/i.test(v.name));
    const esUS = vv.find(v => v.lang === 'es-US');
    const esPR = vv.find(v => v.lang === 'es-PR');
    const esAny = vv.find(v => v.lang.startsWith('es') && v.localService);
    const fallback = vv.find(v => v.lang.startsWith('es'));
    const chosen = male || esPR || esUS || esAny || fallback;
    if (chosen) utt.voice = chosen;
  }

  function speak(text, onDone) {
    if (!text) { onDone && onDone(); return; }

    // Para el reconocimiento ANTES de hablar
    stop();
    speaking   = true;
    speakGuard = true;   // bloqueo doble
    _notify();

    speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'es-PR';
    utt.rate   = 0.88;   // más pausado = más mayordomo elegante
    utt.pitch  = 0.78;   // más grave
    utt.volume = 1.0;

    if (speechSynthesis.getVoices().length) {
      _pickVoice(utt);
    } else {
      speechSynthesis.addEventListener('voiceschanged', () => _pickVoice(utt), { once: true });
    }

    if (muted) {
      speaking = false; speakGuard = false;
      onDone && onDone();
      return;
    }

    const _done = () => {
      speaking = false;
      // Mantiene el guard activo 800ms extra para no capturar el eco final
      setTimeout(() => { speakGuard = false; }, 800);
      _notify();
      onDone && onDone();
      if (active && !muted) {
        clearTimeout(restartTm);
        restartTm = setTimeout(_safeStart, 1000);
      }
    };

    utt.onend   = _done;
    utt.onerror = _done;
    speechSynthesis.speak(utt);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      speechSynthesis.cancel();
      stop();
    } else if (active && !speaking) {
      clearTimeout(restartTm);
      restartTm = setTimeout(_safeStart, 300);
    }
    _notify();
    return muted;
  }

  function destroy() {
    active = false;
    clearTimeout(restartTm);
    speechSynthesis.cancel();
    if (rec) { try { rec.abort(); } catch(e) {} rec = null; }
    listening = false; speaking = false; speakGuard = false;
    _notify();
  }

  function isSupported()  { return !!SR; }
  function isMuted()      { return muted; }
  function isListening()  { return listening && !speaking; }

  return { init, start, stop, speak, unlock, toggleMute, destroy, isSupported, isMuted, isListening };
})();
