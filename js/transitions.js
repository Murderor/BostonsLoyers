// Управление плавными переходами между страницами
class PageTransition {
    constructor() {
        this.transitionElement = document.getElementById('pageTransition');
        this.links = document.querySelectorAll('a[href]:not([href^="#"]):not([href^="javascript"]):not([target="_blank"])');
        this.isTransitioning = false;
        this.init();
    }
    
    init() {
        // Показываем страницу после загрузки
        window.addEventListener('load', () => {
            this.hideTransition();
        });
        
        // Обработка кликов по ссылкам
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                // Исключаем ссылки на текущую страницу и якорные ссылки
                if (link.href === window.location.href || 
                    link.getAttribute('href').startsWith('#') ||
                    this.isTransitioning) {
                    return;
                }
                
                e.preventDefault();
                this.navigateTo(link.href);
            });
        });
        
        // Обработка кнопок браузера (вперёд/назад)
        window.addEventListener('popstate', () => {
            this.showTransition();
        });
    }
    
    navigateTo(url) {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.showTransition();
        
        // Имитация загрузки страницы
        setTimeout(() => {
            window.location.href = url;
        }, 600);
    }
    
    showTransition() {
        if (this.transitionElement) {
            this.transitionElement.classList.add('active');
            
            // Добавляем случайные сообщения для прелоадера
            const messages = [
                'Загрузка данных...',
                'Подготовка документов...',
                'Консультация с юристами...',
                'Проверка законодательства...',
                'Соединение с сервером...'
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const loaderText = this.transitionElement.querySelector('.loader-text');
            if (loaderText) {
                loaderText.textContent = randomMessage;
            }
        }
    }
    
    hideTransition() {
        if (this.transitionElement) {
            // Прячем прелоадер с задержкой для плавности
            setTimeout(() => {
                this.transitionElement.classList.remove('active');
                this.isTransitioning = false;
                
                // Запускаем анимации появления элементов
                this.animatePageElements();
            }, 300);
        }
    }
    
    animatePageElements() {
        // Анимация для элементов с задержкой
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        animatedElements.forEach((element, index) => {
            const delay = element.dataset.delay || index * 0.1;
            const animation = element.dataset.animate || 'fadeIn';
            
            element.style.animationDelay = `${delay}s`;
            element.classList.add(`animate-${animation}`);
        });
        
        // Параллакс эффект для фона
        this.initParallax();
    }
    
    initParallax() {
        // Простой параллакс эффект для фона
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const background = document.querySelector('body');
            
            if (background) {
                background.style.backgroundPosition = `center ${scrolled * 0.5}px`;
            }
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new PageTransition();
    
    // Добавляем класс для анимации появления
    document.body.classList.add('page-loaded');
    
    // Плавное появление контента
    const mainContent = document.querySelector('.main');
    if (mainContent) {
        mainContent.classList.add('main-content');
    }
});