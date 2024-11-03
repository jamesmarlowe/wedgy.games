
const canvas = document.getElementById("Canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");
const pillCount = 40;

function getRandomColor() {
    const colors = ["#4CAF50", "#2196F3", "#FF5722", "#9C27B0", "#FFC107", "#00BCD4", "#E91E63"];
    return colors[Math.floor(Math.random() * colors.length)];
}
const pills = [];

for (let i = 0; i < pillCount; i++) {
    // const width = Math.random() * 100 + 50;  // Random width between 50 and 150
    // const height = Math.random() * 8 + 3;  // Random height between 3 and 11
    const width = Math.random() * 70 + 35;  // Random width between 50 and 150
    const height = Math.random() * 6 + 3;  // Random height between 3 and 11
    const x = Math.random() * canvas.width;  // Random starting x-position within canvas width
    const y = Math.random() * (canvas.height - height); // Random y-position within canvas height
    const speed = Math.random() * 2 + 1; // Random speed between 1 and 3
    const color = getRandomColor();
    pills.push({ x, y, width, height, speed, color });
}

function drawPill(pill) {
    const { x, y, width, height, color } = pill;
    const radius = height / 2;
    
    // Draw the pill shape
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();

    // Set fill and stroke styles
    ctx.fillStyle = color;
    // ctx.strokeStyle = "#333";
    // ctx.lineWidth = 2;
    ctx.fill();
    // ctx.stroke();
}

function animate() {
    // ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.fillStyle = "#ffe79b"; // Replace with any color you want
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas

    // Update and draw each pill
    for (let pill of pills) {
        if (Math.random() < 0.01) {  // 1% chance to change speed each frame
            const speedChange = (Math.random() * 3 - 1.5); // Random change between -0.5 and +0.5
            pill.speed = Math.max(0.5, pill.speed + speedChange); // Ensure speed doesn't go below 0.5
            pill.speed = Math.min(4, pill.speed); // Ensure speed doesn't go above 4
        }
        drawPill(pill);  // Draw the pill at its current position

        // Update the position
        pill.x += pill.speed;

        // Reset position if it goes beyond the canvas width
        if (pill.x > canvas.width) {
            pill.x = -pill.width; // Reset to the left side, starting off-screen
        }
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // Light grey overlay, 50% opacity
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(animate); // Continue the animation
}

// Start the animation
animate();
