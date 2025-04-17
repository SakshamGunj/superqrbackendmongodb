// js/spinWheel.js
import { getState, canSpin } from './state.js'; // Import canSpin and getState
import { playSound } from './audio.js'; // Import playSound

// --- Module Scope Variables ---
let sectors = []; // Holds the current wheel sectors (offers)
let ctx = null; // Canvas rendering context
// spinEl removed - button is external now
let canvasEl = null; // The canvas element itself
let dia = 0; // Internal canvas diameter/resolution
let rad = 0; // Internal canvas radius
const PI = Math.PI;
const TAU = 2 * PI; // Full circle
let arc = 0; // Angle per sector
const friction = 0.991; // Controls how quickly the wheel slows down (0.99 = normal, 0.995 = slower stop)
let angVel = 0; // Current angular velocity
let ang = 0; // Current angle of rotation in radians
let isSpinning = false; // Flag if animation is running
let spinEndCallback = null; // Function to call when spin finishes
let animationFrameId = null; // ID for canceling animation frame

// Helper for random numbers
const rand = (m, M) => Math.random() * (M - m) + m;

// --- Core Wheel Logic ---

// Calculate the index of the sector currently pointed to by the top pointer
const getIndex = () => {
    if (sectors.length === 0) return 0;
    // Adjust angle for the pointer being at the top (negative PI/2 or 1.5 * PI radians)
    // Normalize angle to be 0 at the top, increasing clockwise
    const correctedAngle = (ang + PI / 2 + TAU) % TAU; // Ensure positive 0 to TAU range
    // Calculate index based on the corrected angle
    let index = Math.floor((TAU - correctedAngle) / arc) % sectors.length;
    // Ensure index is always positive
    if (index < 0) {
        index += sectors.length;
    }
    return index;
};

// Draw a single sector on the canvas
function drawSector(sector, i) {
    if (!ctx || !sector) return; // Added null check for sector object

    const sectorAngle = arc * i;
    const sectorLabel = sector.label || ''; // Default to empty string if no label
    const sectorColor = sector.color || '#CCCCCC'; // Default color
    const sectorTextColor = sector.textColor || '#000000'; // Default text color

    ctx.save(); // Save current drawing state

    // --- Segment Background Color ---
    ctx.beginPath();
    ctx.fillStyle = sectorColor;
    ctx.moveTo(rad, rad);
    ctx.arc(rad, rad, rad, sectorAngle, sectorAngle + arc);
    ctx.lineTo(rad, rad);
    ctx.fill();

    // --- Segment Text ---
    if (sectorLabel.trim() !== '') {
        ctx.translate(rad, rad);
        ctx.rotate(sectorAngle + arc / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = sectorTextColor;
        const fontSize = Math.max(11, Math.min(16, rad / 12));
        ctx.font = `700 ${fontSize}px 'Poppins', sans-serif`;
        ctx.textBaseline = 'middle';

        const maxTextWidth = rad * 0.70;
        const words = sectorLabel.split(' ');
        let line = '';
        let y = 0;
        const lineHeight = fontSize * 1.25;
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line.trim());

        y -= ((lines.length - 1) * lineHeight) / 2;

        const textRadius = rad * 0.65;
        lines.forEach(lineText => {
            ctx.fillText(lineText, textRadius, y);
            y += lineHeight;
        });
    }

    ctx.restore(); // Restore canvas state
}

// Update wheel rotation via CSS transform
function rotateWheel() {
    if (!canvasEl) return;
    // Apply CSS rotation to the canvas element itself for smooth animation
    canvasEl.style.transform = `rotate(${ang}rad)`;
    // No longer need to update center button text/style here
}

// Animation frame logic: Handles spinning and stopping
function frame() {
    if (!isSpinning) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
    }
    angVel *= friction;
    if (angVel < 0.002) {
        angVel = 0;
        isSpinning = false;
        document.getElementById('spin-action-button')?.removeAttribute('disabled');
        renderSpinPageUI(); // Update UI after spin stops

        const finalIndex = getIndex();
        const finalSector = sectors[finalIndex];
        console.log("Spin ended. Final Angle:", ang.toFixed(4), "Final Index:", finalIndex, "Sector:", finalSector);
        if (finalSector && spinEndCallback) spinEndCallback(finalSector);
        else if (!finalSector && spinEndCallback) {
            console.error("SpinWheel: Could not determine final sector!");
            spinEndCallback({ label: 'Error', value: 'ERROR' });
        }
        return;
    }
    ang = (ang + angVel + TAU) % TAU;
    rotateWheel();
    animationFrameId = requestAnimationFrame(frame);
}

// --- Interaction ---

// Called when the external spin button (#spin-action-button) is clicked (listener in app.js)
export function startSpin() {
    // 1. Check if allowed to spin based on state
    const { currentRestaurant } = getState();
    if (!currentRestaurant || !canSpin(currentRestaurant.id)) {
        console.warn("SpinWheel: Spin blocked - canSpin() returned false or no restaurant context.");
        // Trigger shake animation on the external button
        const spinButton = document.getElementById('spin-action-button');
        if (spinButton && !spinButton.classList.contains('shake')) {
            spinButton.classList.add('shake');
            setTimeout(() => spinButton.classList.remove('shake'), 300); // Remove after animation
        }
        return; // Do not start spin
    }

    // 2. Check if already spinning or no sectors defined
    if (isSpinning || sectors.length === 0) return;

    // 3. Trigger sound and update state/UI
    playSound('spin-start');
    isSpinning = true;
    // Disable the external button and update its text (optional)
    const spinButton = document.getElementById('spin-action-button');
    if (spinButton) {
        spinButton.setAttribute('disabled', 'true');
        const textSpan = spinButton.querySelector('span');
        if (textSpan) textSpan.textContent = 'Spinning...';
        // Consider adding a loading class for CSS styling
        spinButton.classList.add('spinning');
    }

    // 4. Set initial velocity and start animation loop
    // Give a good random initial spin speed
    angVel = rand(0.30, 0.55); // Increased velocity range slightly
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Clear previous loop if any
    animationFrameId = requestAnimationFrame(frame); // Start the animation

    // 5. Optional: Notify app that animation started
    document.dispatchEvent(new CustomEvent('spinanimationstart'));
}

// --- Exported Functions ---

/**
 * Initializes the spin wheel canvas. Button listener is handled externally.
 * @param {string} canvasId - The ID of the HTML canvas element.
 * @param {Array<object>} initialSectors - Array of sector objects { label, value, color, textColor }.
 * @param {function} onSpinEnd - Callback function executed when spinning stops, receives winning sector.
 */
export function initSpinWheel(canvasId, initialSectors, onSpinEnd) {
    canvasEl = document.getElementById(canvasId);
    // Removed buttonId parameter and spinEl variable reference

    if (!canvasEl) { console.error("SpinWheel Error: Canvas element not found:", canvasId); return; }
    ctx = canvasEl.getContext("2d");
    if (!ctx) { console.error("SpinWheel Error: Cannot get 2D context for canvas."); return; }

    // Use the canvas's intrinsic width/height for drawing resolution
    dia = canvasEl.width;
    rad = dia / 2;
    spinEndCallback = onSpinEnd; // Store the callback function

    console.log(`SpinWheel: Initializing canvas ${dia}x${dia}`);

    // Draw the initial state of the wheel
    updateSectors(initialSectors);

    // Reset animation/state variables
    ang = 0;
    angVel = 0;
    isSpinning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    // Ensure external button is enabled initially (renderSpinPageUI handles this based on canSpin)

    rotateWheel(); // Set initial canvas rotation (should be 0)
}

/**
 * Updates the sectors displayed on the wheel and redraws it.
 * @param {Array<object>} newSectors - The new array of sector objects.
 */
export function updateSectors(newSectors) {
    if (!ctx || !canvasEl) {
        console.error("SpinWheel: Cannot update sectors - context or canvas not ready.");
        return;
    }
    sectors = Array.isArray(newSectors) ? newSectors : [];
    console.log(`SpinWheel: Updating sectors. Received ${newSectors?.length} items, using ${sectors.length} valid sectors.`);

    arc = sectors.length > 0 ? TAU / sectors.length : 0;

    ctx.clearRect(0, 0, dia, dia);

    if (sectors.length > 0) {
        sectors.forEach(drawSector);
    } else {
        ctx.save();
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "bold 20px 'Poppins', sans-serif";
        ctx.fillText("No Prizes Available", rad, rad);
        ctx.restore();
    }
    ang = 0;
    rotateWheel();
}

// --- CSS for Shake Animation (if not already in style.css) ---
// It's generally better to keep this in style.css, but including here
// for completeness if needed as a standalone module requirement.
/*
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes briefShake {
  0%, 100% { transform: translateX(0); }
  25%, 75% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
}
#spin-action-button.shake {
  animation: briefShake 0.3s ease-in-out;
}`;
document.head.appendChild(styleSheet);
*/