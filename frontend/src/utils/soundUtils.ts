/**
 * Sound Utilities
 * Provides audio feedback for chat events
 */

// Audio context singleton
let audioContext: AudioContext | null = null;

/**
 * Get or create AudioContext
 * AudioContext must be created after user interaction
 */
const getAudioContext = (): AudioContext | null => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API not supported");
            return null;
        }
    }
    return audioContext;
};

/**
 * Play a subtle typing notification sound
 * Uses Web Audio API to generate a soft "pop" sound
 */
export const playTypingSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume audio context if suspended (required after user interaction)
    if (ctx.state === "suspended") {
        ctx.resume();
    }

    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Create a soft, subtle sound
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

        // Quick fade in and out for a subtle "pop"
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.warn("Error playing typing sound:", e);
    }
};

/**
 * Play a message received notification sound
 * Uses Web Audio API to generate a pleasant notification tone
 */
export const playMessageSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
        ctx.resume();
    }

    try {
        // Create two oscillators for a pleasant two-tone sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // First tone
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5

        // Second tone (harmony)
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

        // Volume envelope
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.warn("Error playing message sound:", e);
    }
};

// Debounce for typing sound to avoid spam
let lastTypingSoundTime = 0;
const TYPING_SOUND_DEBOUNCE_MS = 2000; // Only play every 2 seconds

/**
 * Play typing sound with debounce
 * Prevents sound spam when typing indicator updates frequently
 */
export const playTypingSoundDebounced = (): void => {
    const now = Date.now();
    if (now - lastTypingSoundTime > TYPING_SOUND_DEBOUNCE_MS) {
        lastTypingSoundTime = now;
        playTypingSound();
    }
};
