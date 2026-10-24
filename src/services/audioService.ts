/**
 * Audio synthesis service for Nexora Coin briefings & mining voice broadcasts.
 * Integrates with server-side Gemini TTS (gemini-3.8-flash-tts / gemini-3.8-flash-lite-tts)
 * with robust client-side Web Speech API fallback.
 */

let currentAudio: HTMLAudioElement | null = null;

export const playAudioBriefing = playTtsBriefing;

export async function playTtsBriefing(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: string) => void
): Promise<void> {
  // Stop any currently playing audio
  stopAudio();

  try {
    onStart?.();

    // 1. Try server-side Gemini TTS endpoint
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: 'Kore',
        style: 'Luxury, authoritative fintech news anchor, clear and crisp',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        currentAudio = audio;
        audio.onended = () => {
          currentAudio = null;
          onEnd?.();
        };
        audio.onerror = () => {
          fallbackBrowserSpeech(text, onEnd, onError);
        };
        await audio.play();
        return;
      }
    }

    // 2. Fallback to Web Speech API if server-side TTS is unconfigured
    fallbackBrowserSpeech(text, onEnd, onError);
  } catch {
    fallbackBrowserSpeech(text, onEnd, onError);
  }
}

function fallbackBrowserSpeech(
  text: string,
  onEnd?: () => void,
  onError?: (err: string) => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Audio synthesis not supported in this environment.');
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.02;

  // Prefer natural English voices
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Google'))
  ) || voices.find(v => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (e) => {
    onError?.(`Speech error: ${e.error}`);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
