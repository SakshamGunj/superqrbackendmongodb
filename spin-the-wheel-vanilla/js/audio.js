// js/audio.js

const soundCache = {}; 
const soundFiles = {
    'spin-start': './assets/sounds/spin-start.mp3', // Adjust paths/extensions
    'spin-win': './assets/sounds/spin-win.mp3',
    'spin-try-again': './assets/sounds/spin-try-again.mp3',
    'click': './assets/sounds/click.mp3'
};
// Simple cache to avoid reloading

// Function to play a sound effect
export function playSound(soundName) {
    // Map sound names to file paths
    
    const soundUrl = soundFiles[soundName];
    if (!soundUrl) {
        console.warn(`Audio: Sound name "${soundName}" not found.`);
        return;
    }

    try {
        let audio = soundCache[soundUrl];
        if (!audio) {
            audio = new Audio(soundUrl);
            // Optional: Handle loading errors?
            // audio.onerror = () => console.error(`Audio: Error loading sound ${soundUrl}`);
            soundCache[soundUrl] = audio;
        }

        // Ensure previous playback is stopped/reset if needed
        // audio.pause();
        // audio.currentTime = 0;

        // Play the sound
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Automatic playback started!
                // console.log(`Audio: Playing ${soundName}`);
            }).catch(error => {
                // Auto-play was prevented
                // Show a "Play Sound" button or handle the error gracefully
                console.warn(`Audio: Playback prevented for ${soundName}. User interaction likely required first. Error: ${error}`);
            });
        }
    } catch (error) {
        console.error(`Audio: Error playing sound ${soundName}:`, error);
    }
}

// Optional: Preload sounds on app init (called from app.js)
export function preloadSounds() {
     console.log("Audio: Preloading sounds...");
     ['spin-start', 'spin-win', 'spin-try-again', 'click'].forEach(name => {
         const soundUrl = soundFiles[name];
         if (soundUrl && !soundCache[soundUrl]) {
              soundCache[soundUrl] = new Audio(soundUrl);
              // Attempting to load the sound data
              soundCache[soundUrl].load();
         }
     });
}