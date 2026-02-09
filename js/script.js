document.addEventListener('DOMContentLoaded', function() {
    console.log('Адвокатское бюро - главная страница');

    // ===== ЛОГОТИП =====
    const mainLogo = document.getElementById('main-logo');
    const logoImage = document.querySelector('.logo-image');
    
    if (mainLogo && logoImage) {
        function checkLogo() {
            if (mainLogo.complete && mainLogo.naturalWidth > 0) {
                logoImage.classList.add('has-logo');
            } else {
                logoImage.classList.remove('has-logo');
            }
        }
        checkLogo();
        mainLogo.onerror = () => logoImage.classList.remove('has-logo');
        mainLogo.onload = () => logoImage.classList.add('has-logo');
    }

    // ===== БОЛЬШОЙ ЛОГОТИП В ГЕРОЕ =====
    const heroLogo = document.getElementById('hero-logo');
    const heroLogoContainer = document.querySelector('.hero-logo');
    if (heroLogo && heroLogoContainer) {
        function checkHeroLogo() {
            if (heroLogo.complete && heroLogo.naturalWidth > 0) {
                heroLogoContainer.classList.add('has-logo');
            } else {
                heroLogoContainer.classList.remove('has-logo');
            }
        }
        checkHeroLogo();
        heroLogo.onerror = () => heroLogoContainer.classList.remove('has-logo');
        heroLogo.onload = () => heroLogoContainer.classList.add('has-logo');
    }

    // ===== МОБИЛЬНОЕ МЕНЮ =====
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
        });
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileNav.classList.remove('active'));
        });
    }

    // ===== АКТИВНАЯ СТРАНИЦА =====
    function setActivePage() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-button, .mobile-nav-button').forEach(button => {
            const buttonPage = button.getAttribute('href').split('/').pop();
            if (buttonPage === currentPage || (currentPage === '' && buttonPage === 'index.html')) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    setActivePage();

    // ===== ПЛАВНЫЕ ПЕРЕХОДЫ =====
    const pageTransition = document.getElementById('pageTransition');
    if (pageTransition) {
        setTimeout(() => {
            pageTransition.style.opacity = '0';
            pageTransition.style.visibility = 'hidden';
        }, 800);
    }

    document.querySelectorAll('a:not([href^="#"]):not([target="_blank"])').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.startsWith('#') && href !== window.location.pathname.split('/').pop()) {
                e.preventDefault();
                if (pageTransition) {
                    pageTransition.style.opacity = '1';
                    pageTransition.style.visibility = 'visible';
                }
                setTimeout(() => window.location.href = href, 500);
            }
        });
    });

    // ===== СКРОЛЛ ВНИЗ =====
    const scrollDown = document.querySelector('.scroll-down');
    if (scrollDown) {
        scrollDown.addEventListener('click', () => {
            document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // =============================================
    // ЗАГРУЗКА ОТЗЫВОВ С GOOGLE SHEETS
    // =============================================
    async function loadReviews() {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;

        // ←←← ЗАМЕНИ НА СВОЙ РЕАЛЬНЫЙ URL ОТ APPS SCRIPT
        const API_URL = 'https://script.google.com/macros/s/AKfycbwVHCR891FwQKuIWj0YEupr9qgr5hHCYsEMMfIaqHMZQw_FPqazZ9cWkamEgW1HlBsqpQ/exec';

        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Ошибка сети');

            const data = await response.json();
            const reviews = data.reviews || [];

            if (reviews.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#a0a8c0; grid-column: 1 / -1;">Пока нет отзывов</p>';
                return;
            }

            // Случайная сортировка + лимит 6–9
            reviews.sort(() => Math.random() - 0.5);
            const displayed = reviews.slice(0, 9);

            container.innerHTML = '';

            displayed.forEach(review => {
                const rating = Math.min(5, Math.max(0, Math.round(review.rating || 0)));
                const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

                const card = document.createElement('div');
                card.className = 'review-card';
                card.innerHTML = `
                    <div class="review-header">
                        <div class="review-avatar">${review.name?.charAt(0)?.toUpperCase() || '?'}</div>
                        <div class="review-name">${review.name || 'Аноним'}</div>
                        <div class="review-stars">${stars}</div>
                    </div>
                    <div class="review-text">${review.comment || review.text || '—'}</div>
                    ${review.date ? `<div class="review-date">${review.date}</div>` : ''}
                `;
                container.appendChild(card);
            });

        } catch (err) {
            console.error('Ошибка загрузки отзывов:', err);
            container.innerHTML = '<p style="text-align:center; color:#ff6b6b; grid-column: 1 / -1;">Не удалось загрузить отзывы</p>';
        }
    }

    // Запуск загрузки отзывов только на главной
    if (document.querySelector('#reviews')) {
        loadReviews();
    }
});




// =============================================
// МОДАЛЬНОЕ ОКНО ОТЗЫВА + ОТПРАВКА В GOOGLE SHEETS
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('reviewModal');
    const openBtn = document.getElementById('openReviewModal');
    const closeBtn = document.getElementById('closeReviewModal');
    const cancelBtn = document.getElementById('cancelReview');
    const form = document.getElementById('reviewForm');
    const message = document.getElementById('reviewMessage');

    if (!modal || !openBtn) return;

    // Открыть модалку
    openBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        message.innerHTML = '';
        form.reset();
    });

    // Закрыть модалку
    const closeModal = () => {
        modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Закрытие по клику вне окна
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Отправка формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('reviewName').value.trim();
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const text = document.getElementById('reviewText').value.trim();

        if (!name || !rating || !text) {
            message.innerHTML = '<span class="error">Заполните все обязательные поля</span>';
            return;
        }

        message.innerHTML = 'Отправка...';

        try {
            // ←←← ЗАМЕНИ НА СВОЙ РЕАЛЬНЫЙ URL (отдельный скрипт для записи!)
            const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyp7hLGLoG0RnNOKLSOTE5rFN3TDI4FvVt5kp1FyaDB9a_3IwheX2-y-WeVNU4QdkwdfA/exec';

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',           // важно для GAS без CORS-проблем
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    rating: Number(rating),
                    comment: text,
                    timestamp: new Date().toISOString()
                })
            });

            // При no-cors response.ok всегда false → проверяем по факту отправки
            message.innerHTML = '<span class="success">Спасибо! Ваш отзыв принят и скоро появится на сайте.</span>';
            form.reset();

            setTimeout(closeModal, 2200);

        } catch (err) {
            console.error(err);
            message.innerHTML = '<span class="error">Не удалось отправить. Попробуйте позже.</span>';
        }
    });
});