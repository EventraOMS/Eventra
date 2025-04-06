// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add fade-in animation to elements
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, {
    threshold: 0.1
});

document.querySelectorAll('.section, .card, .testimonial-card').forEach(el => {
    observer.observe(el);
});

// Image gallery lightbox
document.querySelectorAll('.image-gallery img').forEach(img => {
    img.addEventListener('click', function() {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img src="${this.src}" alt="${this.alt}">
                <button class="close-lightbox">&times;</button>
            </div>
        `;
        document.body.appendChild(lightbox);
        
        lightbox.querySelector('.close-lightbox').addEventListener('click', () => {
            lightbox.remove();
        });
    });
});

// Form validation
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        let isValid = true;
        
        form.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        });
        
        if (isValid) {
            // Here you would typically send the form data to a server
            console.log('Form submitted successfully');
            form.reset();
            alert('Thank you for your submission! We will contact you shortly.');
        }
    });
});

// Mobile menu toggle
const mobileMenuBtn = document.createElement('button');
mobileMenuBtn.className = 'mobile-menu-btn';
mobileMenuBtn.innerHTML = '☰';
document.querySelector('nav').prepend(mobileMenuBtn);

mobileMenuBtn.addEventListener('click', () => {
    document.querySelector('nav ul').classList.toggle('active');
});

// Add active class to current page in navigation
const currentPage = window.location.pathname.split('/').pop();
document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
    }
});

// Parallax effect for hero sections
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    document.querySelectorAll('.hero').forEach(hero => {
        hero.style.backgroundPositionY = -(scrolled * 0.5) + 'px';
    });
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
}); 
