// JavaScript для страницы "О нас"
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница "О нас" загружена');
    
    // ===== ОБРАБОТКА АВАТАРОК =====
    const profileAvatars = document.querySelectorAll('.profile-avatar');
    
    profileAvatars.forEach(avatar => {
        const img = avatar.querySelector('.avatar-image');
        
        if (img) {
            // Проверяем, загружено ли изображение
            function checkAvatar() {
                if (img.complete && img.naturalWidth > 0) {
                    // Аватар загружен
                    avatar.classList.add('has-avatar');
                } else {
                    // Аватар не загружен
                    avatar.classList.remove('has-avatar');
                }
            }
            
            // Проверяем сразу
            checkAvatar();
            
            // Обработчики для динамической загрузки
            img.onload = function() {
                avatar.classList.add('has-avatar');
            };
            
            img.onerror = function() {
                avatar.classList.remove('has-avatar');
            };
        }
    });
    
    // ===== ЭФФЕКТЫ ПРИ НАВЕДЕНИИ НА КАРТОЧКИ =====
    const profileCards = document.querySelectorAll('.profile-card');
    
    profileCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const avatar = this.querySelector('.profile-avatar');
            if (avatar) {
                avatar.style.transform = 'scale(1.05)';
                avatar.style.transition = 'transform 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const avatar = this.querySelector('.profile-avatar');
            if (avatar) {
                avatar.style.transform = 'scale(1)';
            }
        });
    });
    
    // ===== АНИМАЦИЯ ПОЯВЛЕНИЯ КАРТОЧЕК ПРИ ПРОКРУТКЕ =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Анимация для карточек команды
    document.querySelectorAll('.profile-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
    
    // Анимация для статистики
    document.querySelectorAll('.stat-item').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.8)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(item);
    });
});