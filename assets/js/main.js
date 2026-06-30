// Small script to ensure glitch animations are triggered correctly or for future interactive elements
document.addEventListener('DOMContentLoaded', () => {
    console.log('Zentra Core Website Loaded.');
});

// Hecos Interactive Slideshow Core
let currentSlideIndex = 1;
showSlides(currentSlideIndex);

// Cambia slide (avanti/indietro)
function changeSlide(n) {
    showSlides(currentSlideIndex += n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("hecos-slide");
    
    if (slides.length === 0) return; // Evita errori se la funzione viene chiamata in pagine senza slideshow
    
    if (n > slides.length) { currentSlideIndex = 1 }    
    if (n < 1) { currentSlideIndex = slides.length }
    
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
    }
    
    slides[currentSlideIndex-1].style.display = "block";  
}
