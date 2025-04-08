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
            //send the form data to a server
            console.log('Form submitted successfully');
            form.reset();
            alert('Thank you for your submission! We will contact you shortly.');
        }
    });
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

// Update User link in navigation
function updateUserLink() {
    const userLinks = document.querySelectorAll('nav a[href="./index.html"]');
    userLinks.forEach(link => {
        link.href = './profile.html';
    });
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateUserLink();
    // ... existing code ...
}); 
