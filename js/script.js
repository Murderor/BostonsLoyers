// Минимальный необходимый JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Адвокатское бюро - главная страница');

    // ===== ЛОГОТИП =====
    const mainLogo = document.getElementById('main-logo');
    const logoImage = document.querySelector('.logo-image');
    
    if (mainLogo && logoImage) {
        // Проверяем, загружен ли логотип
        function checkLogo() {
            if (mainLogo.complete && mainLogo.naturalWidth > 0) {
                // Логотип загружен успешно
                logoImage.classList.add('has-logo');
                console.log('Логотип загружен');
            } else {
                // Логотип не загружен
                logoImage.classList.remove('has-logo');
                console.log('Логотип не загружен, показываем заглушку');
            }
        }
        
        // Проверяем сразу
        checkLogo();
        
        // Проверяем при ошибке загрузки
        mainLogo.onerror = function() {
            console.log('Ошибка загрузки логотипа');
            logoImage.classList.remove('has-logo');
        };
        
        // Проверяем при успешной загрузке
        mainLogo.onload = function() {
            console.log('Логотип загрузился');
            logoImage.classList.add('has-logo');
        };
    }

    // ===== МОБИЛЬНОЕ МЕНЮ =====
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
        });
        
        // Закрытие меню при клике на ссылку
        const mobileLinks = mobileNav.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('active');
            });
        });
    }

    // ===== ПОДСВЕТКА АКТИВНОЙ СТРАНИЦЫ =====
    function setActivePage() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        const navButtons = document.querySelectorAll('.nav-button, .mobile-nav-button');
        
        navButtons.forEach(button => {
            const buttonHref = button.getAttribute('href');
            const buttonPage = buttonHref.split('/').pop();
            
            if (buttonPage === currentPage || 
                (currentPage === '' && buttonPage === 'index.html')) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    setActivePage();

    // ===== ПЛАВНАЯ ПРОКРУТКА ДЛЯ ВНУТРЕННИХ ССЫЛОК =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// ===== ПЛАВНЫЕ ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ =====
function initPageTransitions() {
    const pageTransition = document.getElementById('pageTransition');
    
    if (pageTransition) {
        // Прячем прелоадер после загрузки страницы
        setTimeout(() => {
            pageTransition.style.opacity = '0';
            pageTransition.style.visibility = 'hidden';
            
            // Запускаем анимации появления
            animatePageContent();
        }, 800);
    }
    
    // Обработка кликов по ссылкам
    document.querySelectorAll('a:not([href^="#"]):not([target="_blank"])').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Проверяем, ведёт ли ссылка на другую страницу
            if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
                // Проверяем, не ведёт ли ссылка на текущую страницу
                if (href !== window.location.pathname.split('/').pop()) {
                    e.preventDefault();
                    
                    // Показываем прелоадер
                    if (pageTransition) {
                        pageTransition.style.opacity = '1';
                        pageTransition.style.visibility = 'visible';
                        
                        // Меняем текст прелоадера в зависимости от страницы
                        const loaderText = pageTransition.querySelector('.loader-text');
                        if (loaderText) {
                            const pageName = this.textContent.trim() || 'страницу';
                            loaderText.textContent = `Переход на ${pageName}...`;
                        }
                    }
                    
                    // Переходим на новую страницу с задержкой
                    setTimeout(() => {
                        window.location.href = href;
                    }, 500);
                }
            }
        });
    });
}

// Анимация появления контента
function animatePageContent() {
    // Анимация для элементов с задержкой
    const elementsToAnimate = [
        '.logo',
        '.nav-list li',
        '.hero',
        '.info-item',
        '.profile-card',
        '.section-title',
        '.footer'
    ];
    
    elementsToAnimate.forEach((selector, index) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, elementIndex) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, (index * 100) + (elementIndex * 50));
        });
    });
}

// Добавляем эффект параллакса для фона
function initParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero, .page-header');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
}

// Инициализируем всё при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // ... существующий код ...
    
    // Добавляем плавные переходы
    initPageTransitions();
    initParallax();
    
    // Добавляем анимацию для текущей страницы
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Проверка и анимация большого логотипа на главной
function initHeroLogo() {
    const heroLogo = document.getElementById('hero-logo');
    const heroLogoContainer = document.querySelector('.hero-logo');
    
    if (heroLogo && heroLogoContainer) {
        function checkHeroLogo() {
            if (heroLogo.complete && heroLogo.naturalWidth > 0) {
                heroLogoContainer.classList.add('has-logo');
                console.log('Большой логотип загружен');
            } else {
                heroLogoContainer.classList.remove('has-logo');
                console.log('Большой логотип не загружен, показываем заглушку');
            }
        }
        
        // Проверяем сразу
        checkHeroLogo();
        
        // Обработчики событий
        heroLogo.onerror = function() {
            console.log('Ошибка загрузки большого логотипа');
            heroLogoContainer.classList.remove('has-logo');
        };
        
        heroLogo.onload = function() {
            console.log('Большой логотип успешно загрузился');
            heroLogoContainer.classList.add('has-logo');
        };
    }
    
    // Анимация при скролле к преимуществам
    const scrollDown = document.querySelector('.scroll-down');
    if (scrollDown) {
        scrollDown.addEventListener('click', function() {
            const servicesSection = document.getElementById('services');
            if (servicesSection) {
                servicesSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
    
    // Добавляем класс для отладочной информации
    document.body.classList.add('home-page-loaded');
}

// Обновите функцию initPageContent для анимации новых элементов
function animateHomePageContent() {
    const elements = [
        '.hero-logo',
        '.hero-content',
        '.hero-actions',
        '.scroll-down',
        '.section-title',
        '.info-item'
    ];
    
    elements.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                element.style.opacity = '1';
            }, 200 + (index * 100));
        }
    });
}

// Обновите DOMContentLoaded обработчик
document.addEventListener('DOMContentLoaded', function() {
    // ... существующий код ...
    
    // Инициализация главной страницы с большим логотипом
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/')) {
        
        initHeroLogo();
        animateHomePageContent();
        
        // Показываем анимацию логотипа через секунду
        setTimeout(() => {
            const heroLogo = document.querySelector('.hero-logo');
            if (heroLogo) {
                heroLogo.style.animationPlayState = 'running';
            }
        }, 1000);
    }
    
    // ... остальной код ...
});