// Fullscreen toggle functionality
function toggleFullscreen() {
    const container = document.querySelector('.game-container');
    const iframe = document.getElementById('game-iframe');
    
    if (!document.fullscreenElement) {
        // Enter fullscreen
        container.classList.add('fullscreen');
        
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        container.classList.remove('fullscreen');
    }
}

// Handle fullscreen change events
document.addEventListener('fullscreenchange', function() {
    const container = document.querySelector('.game-container');
    if (!document.fullscreenElement) {
        container.classList.remove('fullscreen');
    }
});

document.addEventListener('webkitfullscreenchange', function() {
    const container = document.querySelector('.game-container');
    if (!document.webkitFullscreenElement) {
        container.classList.remove('fullscreen');
    }
});

document.addEventListener('msfullscreenchange', function() {
    const container = document.querySelector('.game-container');
    if (!document.msFullscreenElement) {
        container.classList.remove('fullscreen');
    }
});
