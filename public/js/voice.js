/* voice.js — Web Speech API (STT continuo + TTS) para JARVIS.
   Funciona en Chrome/Edge/Safari. Sin dependencias Python. */
window.JarvisVoice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec        = null;
  let muted      = false;
  let listening  = false;
  let speaking   = false;
  let active     = false;   // true cuando el chat está abierto
  let onResult   = null;
  let onChange   = null;    // callback(isListening) para el indicador visual
  let restartTm  = null;

  function _notify() { if (onChange) onChange(listening && !muted && !speaking); }

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
    if (rec) { try { rec.abort(); } catch(e) {} }
    rec = new SR();
    rec.lang            = 'es-PR';
    rec.continuous      = true;
    rec.interimResults  = false;
    rec.maxAlternatives = 1;

    rec.onresult = (evt) => {
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
        restartTm = setTimeout(_safeStart, 500);
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
    if (!rec || listening || muted || !active) return;
    // Rebuild rec to avoid InvalidStateError on repeated start
    _buildRec();
    try { rec.start(); } catch(e) {}
  }

  function start() {
    clearTimeout(restartTm);
    _safeStart();
  }

  function stop() {
    clearTimeout(restartTm);
    if (rec && listening) { try { rec.stop(); } catch(e) {} }
    listening = false;
    _notify();
  }

  function speak(text, onDone) {
    if (!text) { onDone && onDone(); return; }

    // Pausa el STT mientras habla JARVIS
    stop();
    speaking = true;
    _notify();

    speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'es-PR';
    utt.rate   = 0.93;
    utt.pitch  = 0.82;   // más grave = más JARVIS
    utt.volume = 1.0;

    const _assignVoice = () => {
      if (muted) return;
      const vv = speechSynthesis.getVoices();
      const pick = vv.find(v => v.lang === 'es-PR')
        || vv.find(v => v.lang === 'es-US')
        || vv.find(v => v.lang.startsWith('es') && v.localService)
        || vv.find(v => v.lang.startsWith('es'));
      if (pick) utt.voice = pick;
    };

    if (speechSynthesis.getVoices().length) _assignVoice();
    else speechSynthesis.addEventListener('voiceschanged', _assignVoice, { once: true });

    const _done = () => {
      speaking = false;
      _notify();
      onDone && onDone();
      if (active && !muted) {
        clearTimeout(restartTm);
        restartTm = setTimeout(_safeStart, 600);
      }
    };

    if (muted) { speaking = false; onDone && onDone(); return; }

    utt.onend   = _done;
    utt.onerror = _done;
    speechSynthesis.speak(utt);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      speechSynthesis.cancel();
      stop();
    } else {
      if (active && !speaking) {
        clearTimeout(restartTm);
        restartTm = setTimeout(_safeStart, 300);
      }
    }
    _notify();
    return muted;
  }

  function destroy() {
    active = false;
    clearTimeout(restartTm);
    speechSynthesis.cancel();
    if (rec) { try { rec.abort(); } catch(e) {} rec = null; }
    listening = false; speaking = false;
    _notify();
  }

  function isSupported()  { return !!SR; }
  function isMuted()      { return muted; }
  function isListening()  { return listening && !speaking; }

  return { init, start, stop, speak, toggleMute, destroy, isSupported, isMuted, isListening };
})();
