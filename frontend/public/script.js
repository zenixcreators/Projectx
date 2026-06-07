document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Scroll Reveal Animations (Framer Style) ---
    // Automatically add reveal classes to certain elements if they don't have them
    const elementsToReveal = document.querySelectorAll('.section-header, .feature-row, .process-card, .showcase-content, .benefit-card, .pricing-card, .testimonial-card, .faq-item, .logos-banner');
    
    elementsToReveal.forEach((el, index) => {
        if (!el.classList.contains('reveal')) {
            el.classList.add('reveal');
            // Add staggered delays for grid items
            if (el.classList.contains('process-card') || el.classList.contains('benefit-card') || el.classList.contains('pricing-card') || el.classList.contains('testimonial-card')) {
                const delayClass = 'delay-' + ((index % 3) + 1);
                el.classList.add(delayClass);
            }
        }
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    // Observe all elements with reveal classes
    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });

    // Manually trigger the hero section immediately
    setTimeout(() => {
        document.querySelectorAll('.hero .reveal').forEach(el => {
            el.classList.add('active');
        });
    }, 50);


    // --- Hero Cursor Glow & Parallax ---
    const heroSection = document.querySelector('.hero');
    const cursorGlow = document.querySelector('.cursor-glow');
    const heroContainer = document.querySelector('.hero-container');

    if (heroSection && cursorGlow && heroContainer) {
        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroSection.getBoundingClientRect();
            // Calculate mouse position relative to the hero section
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Move the glow
            cursorGlow.style.left = `${x}px`;
            cursorGlow.style.top = `${y}px`;

            // Update dot matrix mask
            const dotMatrix = document.querySelector('.dot-matrix');
            if (dotMatrix) {
                dotMatrix.style.webkitMaskImage = `radial-gradient(circle at ${x}px ${y}px, black 0%, transparent 400px)`;
                dotMatrix.style.maskImage = `radial-gradient(circle at ${x}px ${y}px, black 0%, transparent 400px)`;
            }

            // Calculate parallax/tilt values (-1 to 1)
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = (y - centerY) / centerY;
            const tiltY = (centerX - x) / centerX;

            // Apply subtle 3D tilt to the hero container
            heroContainer.style.transform = `perspective(1000px) rotateX(${tiltX * 2}deg) rotateY(${tiltY * 2}deg) translateY(${tiltX * -5}px)`;
            // Magnetic Button Logic
            const magneticBtn = document.querySelector('.magnetic-btn');
            if (magneticBtn) {
                const btnRect = magneticBtn.getBoundingClientRect();
                const btnCenterX = btnRect.left + btnRect.width / 2;
                const btnCenterY = btnRect.top + btnRect.height / 2;
                
                // Distance from mouse to button center
                const distX = e.clientX - btnCenterX;
                const distY = e.clientY - btnCenterY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                if (distance < 150) { // Magnet radius
                    const magnetX = distX * 0.3;
                    const magnetY = distY * 0.3;
                    magneticBtn.style.transform = `translate(${magnetX}px, ${magnetY}px)`;
                } else {
                    magneticBtn.style.transform = `translate(0px, 0px)`;
                }
            }
        });

        heroSection.addEventListener('mouseleave', () => {
            // Reset rotation when mouse leaves
            heroContainer.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
            const magneticBtn = document.querySelector('.magnetic-btn');
            if (magneticBtn) magneticBtn.style.transform = `translate(0px, 0px)`;
        });
        
        // Add a smooth transition for the container's transform
        heroContainer.style.transition = 'transform 0.1s ease-out';
        // But when mouse leaves, let it spring back slower
        heroSection.addEventListener('mouseenter', () => {
             heroContainer.style.transition = 'transform 0.1s ease-out';
        });
        heroSection.addEventListener('mouseleave', () => {
             heroContainer.style.transition = 'transform 0.5s var(--framer-spring)';
             heroContainer.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
        });

        // Particle Blasts on Click
        heroSection.addEventListener('click', (e) => {
            const emojis = ['🔥', '🚀', '✨', '🎬', '📈'];
            for(let i=0; i<5; i++) {
                const particle = document.createElement('div');
                particle.classList.add('blast-particle');
                particle.innerText = emojis[Math.floor(Math.random() * emojis.length)];
                
                // Set random blast trajectory variables
                const tx = (Math.random() - 0.5) * 200 + 'px';
                const ty = (Math.random() - 1) * 200 + 'px'; // mostly upwards
                const rot = (Math.random() - 0.5) * 360 + 'deg';
                
                particle.style.setProperty('--tx', tx);
                particle.style.setProperty('--ty', ty);
                particle.style.setProperty('--rot', rot);
                
                particle.style.left = e.clientX + 'px';
                particle.style.top = (e.clientY + window.scrollY) + 'px';
                
                document.body.appendChild(particle);
                
                setTimeout(() => particle.remove(), 1000);
            }
        });
    }

    // --- Dynamic Text Animation ---
    const dynamicText = document.getElementById('dynamic-text');
    const phrases = ["Going Viral.", "Hooking Viewers.", "Printing Views.", "Growing Faster."];
    let currentPhrase = 0;
    
    if (dynamicText) {
        setInterval(() => {
            dynamicText.style.opacity = '0';
            
            setTimeout(() => {
                currentPhrase = (currentPhrase + 1) % phrases.length;
                dynamicText.innerText = phrases[currentPhrase];
                dynamicText.style.opacity = '1';
            }, 300); // Wait for fade out
        }, 3000);
    }

    // --- LIVE DEMO MOCKUPS ---

    // 1. Live Chat Hooks Mockup
    const hookPrompts = [
        {
            prompt: "Generate hooks for weight loss",
            hooks: [
                { text: `"Stop doing endless cardio. Do this instead..."`, score: 99 },
                { text: `"The #1 reason you're not losing belly fat."`, score: 94 }
            ]
        },
        {
            prompt: "Hooks for a finance channel",
            hooks: [
                { text: `"Do not buy a house in 2024 until you watch this."`, score: 98 },
                { text: `"How to legally pay $0 in taxes this year."`, score: 96 }
            ]
        },
        {
            prompt: "Tech review hooks",
            hooks: [
                { text: `"I tested the new iPhone so you don't have to."`, score: 95 },
                { text: `"Apple just made a massive mistake."`, score: 99 }
            ]
        }
    ];

    let currentHookIndex = 0;
    const chatPrompt = document.getElementById('chat-prompt');
    const chatResp1 = document.getElementById('chat-resp-1');
    const chatResp2 = document.getElementById('chat-resp-2');
    const dynHook1 = document.getElementById('dyn-hook-1');
    const dynScore1 = document.getElementById('dyn-score-1');
    const dynHook2 = document.getElementById('dyn-hook-2');
    const dynScore2 = document.getElementById('dyn-score-2');

    if (chatPrompt && chatResp1 && chatResp2) {
        setInterval(() => {
            // Animate out
            chatResp1.style.animation = 'none';
            chatResp2.style.animation = 'none';
            chatPrompt.style.opacity = 0;
            chatResp1.style.opacity = 0;
            chatResp2.style.opacity = 0;

            setTimeout(() => {
                currentHookIndex = (currentHookIndex + 1) % hookPrompts.length;
                const data = hookPrompts[currentHookIndex];
                
                chatPrompt.innerText = data.prompt;
                dynHook1.innerText = data.hooks[0].text;
                dynScore1.innerText = data.hooks[0].score;
                dynHook2.innerText = data.hooks[1].text;
                dynScore2.innerText = data.hooks[1].score;

                // Animate in sequence
                chatPrompt.style.opacity = 1;
                chatResp1.style.animation = 'chatPop 0.5s var(--framer-spring) both';
                chatResp1.style.animationDelay = '0.5s';
                chatResp2.style.animation = 'chatPop 0.5s var(--framer-spring) both';
                chatResp2.style.animationDelay = '1s';
            }, 500);

        }, 5000);
    }

    // 2. Live Typewriter Script Generator
    const scriptsToType = [
        {
            header: "Prompt: 'Gym tips for beginners'",
            body: "[HOOK] Most people fail at the gym in month 1.\n\n[BODY] They overcomplicate their split. You only need 3 days a week. Day 1: Push...\n\n[CTA] Save this split for your next workout!"
        },
        {
            header: "Prompt: 'Productivity hacks'",
            body: "[HOOK] Stop using to-do lists. They are ruining your focus.\n\n[BODY] Use time-blocking instead. Dedicate 90-minute deep work blocks to single tasks...\n\n[CTA] Comment 'FOCUS' and I'll send you my template."
        }
    ];

    let currentScriptIdx = 0;
    const typeHeader = document.getElementById('dyn-type-header');
    const typeBody = document.getElementById('dyn-type-body');
    const processingBarUI = document.getElementById('processing-bar-ui');
    const successPopUI = document.getElementById('success-pop-ui');

    if (typeHeader && typeBody) {
        function runTypingLoop() {
            // Reset UI
            processingBarUI.style.animation = 'none';
            processingBarUI.style.opacity = '0';
            successPopUI.style.animation = 'none';
            successPopUI.style.opacity = '0';
            typeBody.innerHTML = '';
            
            const scriptData = scriptsToType[currentScriptIdx];
            typeHeader.innerText = scriptData.header;
            
            let charIndex = 0;
            const textToType = scriptData.body;
            
            function typeChar() {
                if (charIndex < textToType.length) {
                    let char = textToType.charAt(charIndex);
                    if (char === '\n') {
                        typeBody.innerHTML += '<br>';
                    } else {
                        typeBody.innerHTML += char;
                    }
                    charIndex++;
                    setTimeout(typeChar, 15 + Math.random() * 20); // Fast variable typing speed
                } else {
                    // Finished typing, trigger processing
                    processingBarUI.style.animation = 'fadeSequence 4s forwards';
                    const fill = processingBarUI.querySelector('.processing-fill');
                    fill.style.animation = 'none';
                    void fill.offsetWidth; // trigger reflow
                    fill.style.animation = 'loadBar 3s forwards';

                    setTimeout(() => {
                        successPopUI.style.animation = 'chatPop 0.5s var(--framer-spring) forwards';
                        
                        setTimeout(() => {
                            currentScriptIdx = (currentScriptIdx + 1) % scriptsToType.length;
                            runTypingLoop();
                        }, 3000);
                        
                    }, 3000);
                }
            }
            typeChar();
        }
        
        // Start typing loop
        setTimeout(runTypingLoop, 1000);
    }

    // 3. Live Caption Translations
    const captionData = [
        { w1: "The secret to", w2: "fast growth", w3: "is consistency.", langIdx: 0 },
        { w1: "El secreto para", w2: "un crecimiento", w3: "es la consistencia.", langIdx: 1 },
        { w1: "Le secret de", w2: "la croissance", w3: "est la régularité.", langIdx: 2 }
    ];
    let capIdx = 0;
    const capW1 = document.getElementById('cap-w1');
    const capW2 = document.getElementById('cap-w2');
    const capW3 = document.getElementById('cap-w3');
    const langTags = document.querySelectorAll('#dyn-lang-tags .lang-tag');

    if (capW1 && langTags.length > 0) {
        setInterval(() => {
            capIdx = (capIdx + 1) % captionData.length;
            const data = captionData[capIdx];
            
            // Fade text out
            capW1.style.opacity = 0; capW2.style.opacity = 0; capW3.style.opacity = 0;
            
            setTimeout(() => {
                capW1.innerText = data.w1;
                capW2.innerText = data.w2;
                capW3.innerText = data.w3;
                
                // Update language tags
                langTags.forEach((tag, i) => {
                    if (i === data.langIdx) tag.classList.add('active');
                    else tag.classList.remove('active');
                });
                
                // Fade text in
                capW1.style.opacity = 1; capW2.style.opacity = 1; capW3.style.opacity = 1;
            }, 300);
            
        }, 4000);
    }

    // --- Pricing Toggle Logic ---
    const pricingToggle = document.getElementById('pricing-toggle');
    const monthlyLabel = document.getElementById('monthly-label');
    const yearlyLabel = document.getElementById('yearly-label');
    const priceAmounts = document.querySelectorAll('.pricing-card .amount');

    if (pricingToggle) {
        pricingToggle.addEventListener('click', () => {
            pricingToggle.classList.toggle('toggled');
            
            const isYearly = pricingToggle.classList.contains('toggled');
            
            if (isYearly) {
                monthlyLabel.classList.remove('active');
                yearlyLabel.classList.add('active');
                
                priceAmounts.forEach(amount => {
                    // Slight animation for price change
                    amount.style.transform = 'translateY(-10px)';
                    amount.style.opacity = 0;
                    setTimeout(() => {
                        amount.textContent = amount.getAttribute('data-yearly');
                        amount.style.transform = 'translateY(0)';
                        amount.style.opacity = 1;
                    }, 200);
                });
            } else {
                yearlyLabel.classList.remove('active');
                monthlyLabel.classList.add('active');
                
                priceAmounts.forEach(amount => {
                    amount.style.transform = 'translateY(-10px)';
                    amount.style.opacity = 0;
                    setTimeout(() => {
                        amount.textContent = amount.getAttribute('data-monthly');
                        amount.style.transform = 'translateY(0)';
                        amount.style.opacity = 1;
                    }, 200);
                });
            }
        });
        
        // Add CSS transition to amounts programmatically to avoid CSS clutter
        priceAmounts.forEach(amount => {
            amount.style.transition = 'all 0.2s var(--framer-spring)';
        });
    }

    // --- FAQ Accordion Logic ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // If it wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // --- Mobile Menu Toggle ---
    const mobileMenuIcon = document.querySelector('.mobile-menu-icon');
    const navLinks = document.querySelector('.nav-links');
    let menuOpen = false;

    if (mobileMenuIcon && navLinks) {
        mobileMenuIcon.addEventListener('click', () => {
            menuOpen = !menuOpen;
            if (menuOpen) {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = 'rgba(252,252,253,0.98)';
                navLinks.style.padding = '2rem 0';
                navLinks.style.alignItems = 'center';
                navLinks.style.borderBottom = '1px solid var(--border-color)';
                navLinks.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
            } else {
                navLinks.style.display = 'none';
                navLinks.style.boxShadow = 'none';
            }
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navLinks) {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'row';
            navLinks.style.position = 'static';
            navLinks.style.background = 'transparent';
            navLinks.style.padding = '0';
            navLinks.style.borderBottom = 'none';
            navLinks.style.boxShadow = 'none';
            menuOpen = false;
        } else if (navLinks && !menuOpen) {
            navLinks.style.display = 'none';
        }
    });

    // --- Smooth Scrolling for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
                
                if (window.innerWidth <= 768 && navLinks) {
                    navLinks.style.display = 'none';
                    menuOpen = false;
                }
            }
        });
    });

});
