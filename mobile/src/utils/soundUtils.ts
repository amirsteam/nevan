/**
 * Sound Utilities for Mobile
 * Provides audio feedback for chat events using expo-av
 */
import { Audio } from 'expo-av';

// Sound instances
let typingSound: Audio.Sound | null = null;
let messageSound: Audio.Sound | null = null;

// Debounce tracking
let lastTypingSoundTime = 0;
const TYPING_SOUND_DEBOUNCE_MS = 2000;

/**
 * Initialize audio mode for playback
 * Call this once on app startup
 */
export const initializeAudio = async (): Promise<void> => {
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: false, // Don't play in silent mode
            staysActiveInBackground: false,
            shouldDuckAndroid: true, // Lower volume of other audio
        });
    } catch (e) {
        console.warn("Failed to initialize audio mode:", e);
    }
};

/**
 * Create a programmatic beep sound using expo-av
 * Since we don't have bundled audio files, we'll use system sounds
 */
const createBeepSound = async (frequency: number = 800, duration: number = 100): Promise<void> => {
    try {
        // For React Native, we'll use a simple approach with Audio.Sound
        // Since we can't easily generate tones, we'll skip if no sound file is available
        // In production, you'd bundle an actual audio file
        
        // This is a placeholder - in a real app, you'd use:
        // const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/notification.mp3'));
        
        // For now, we'll use Haptics as a fallback
        const Haptics = await import('expo-haptics').catch(() => null);
        if (Haptics) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    } catch (e) {
        // Silently fail if haptics not available
    }
};

/**
 * Play typing notification sound/haptic
 */
export const playTypingSound = async (): Promise<void> => {
    try {
        const Haptics = await import('expo-haptics').catch(() => null);
        if (Haptics) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    } catch (e) {
        // Silently fail
    }
};

/**
 * Play message received notification sound/haptic
 */
export const playMessageSound = async (): Promise<void> => {
    try {
        const Haptics = await import('expo-haptics').catch(() => null);
        if (Haptics) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    } catch (e) {
        // Silently fail
    }
};

/**
 * Play typing sound with debounce
 * Prevents haptic spam when typing indicator updates frequently
 */
export const playTypingSoundDebounced = async (): Promise<void> => {
    const now = Date.now();
    if (now - lastTypingSoundTime > TYPING_SOUND_DEBOUNCE_MS) {
        lastTypingSoundTime = now;
        await playTypingSound();
    }
};

/**
 * Cleanup sounds when app unmounts
 */
export const cleanupSounds = async (): Promise<void> => {
    try {
        if (typingSound) {
            await typingSound.unloadAsync();
            typingSound = null;
        }
        if (messageSound) {
            await messageSound.unloadAsync();
            messageSound = null;
        }
    } catch (e) {
        // Silently fail
    }
};
