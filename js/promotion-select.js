// JavaScript для страницы выбора должности
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница выбора должности загружена');
    
    // ===== АНИМАЦИЯ КАРТОЧЕК ДОЛЖНОСТЕЙ =====
    const positionCards = document.querySelectorAll('.position-card');
    
    positionCards.forEach((card, index) => {
        // Начальное состояние для анимации
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9) translateY(20px)';
        
        // Запускаем анимацию с задержкой
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1) translateY(0)';
        }, 300 + (index * 150));
        
        // Эффект при наведении
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.position-icon');
            if (icon) {
                icon.style.transform = 'scale(1.1)';
                icon.style.transition = 'transform 0.3s ease';
            }
            
            // Показываем стоимость более заметно
            const price = this.querySelector('.price-value');
            if (price) {
                price.style.transform = 'scale(1.1)';
                price.style.transition = 'transform 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.position-icon');
            if (icon) {
                icon.style.transform = 'scale(1)';
            }
            
            const price = this.querySelector('.price-value');
            if (price) {
                price.style.transform = 'scale(1)';
            }
        });
    });
    
    // ===== ВЫБОР ДОЛЖНОСТИ =====
    const positionButtons = document.querySelectorAll('.position-button');
    
    positionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const card = this.closest('.position-card');
            const position = card.dataset.position;
            const positionTitle = card.querySelector('.position-title').textContent;
            
            // Сохраняем выбранную должность
            sessionStorage.setItem('selectedPosition', position);
            sessionStorage.setItem('selectedPositionTitle', positionTitle);
            
            console.log(`Выбрана должность: ${positionTitle} (${position})`);
            
            // Добавляем эффект нажатия
            this.style.transform = 'scale(0.98)';
            
            // Можно добавить подтверждение
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // ===== ПОДСВЕТКА РЕКОМЕНДУЕМОЙ ДОЛЖНОСТИ =====
    const featuredCard = document.querySelector('.position-card.featured');
    if (featuredCard) {
        // Пульсирующая анимация для рекомендованной карточки
        function pulseFeaturedCard() {
            featuredCard.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.3)';
            
            setTimeout(() => {
                featuredCard.style.boxShadow = 'var(--shadow)';
            }, 1000);
        }
        
        // Запускаем пульсацию каждые 3 секунды
        setInterval(pulseFeaturedCard, 3000);
        
        // Первая пульсация через 2 секунды
        setTimeout(pulseFeaturedCard, 2000);
    }
    
    // ===== ИНТЕРАКТИВНАЯ ТАБЛИЦА СРАВНЕНИЯ =====
    const tableRows = document.querySelectorAll('.comparison-table tbody tr');
    
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            const cells = this.querySelectorAll('td');
            const rowIndex = Array.from(tableRows).indexOf(this);
            
            // Подсвечиваем соответствующую строку во всех карточках
            positionCards.forEach(card => {
                const requirements = card.querySelectorAll('.requirements-list li, .benefits-list li');
                if (requirements[rowIndex]) {
                    requirements[rowIndex].style.color = 'var(--color-accent)';
                    requirements[rowIndex].style.fontWeight = '600';
                }
            });
        });
        
        row.addEventListener('mouseleave', function() {
            // Убираем подсветку
            positionCards.forEach(card => {
                const requirements = card.querySelectorAll('.requirements-list li, .benefits-list li');
                requirements.forEach(item => {
                    item.style.color = '';
                    item.style.fontWeight = '';
                });
            });
        });
    });
    
    // ===== ПРОВЕРКА СТАТУСА ПОЛЬЗОВАТЕЛЯ =====
    function checkUserStatus() {
        // Здесь можно добавить логику проверки текущей должности пользователя
        const userPosition = sessionStorage.getItem('userCurrentPosition') || 'none';
        console.log(`Текущая должность пользователя: ${userPosition}`);
        
        // Можно заблокировать карточки, на которые нельзя претендовать
        if (userPosition === 'junior') {
            // Например, заблокировать карточку младшего адвоката
            const juniorCard = document.querySelector('[data-position="junior"]');
            if (juniorCard) {
                const button = juniorCard.querySelector('.position-button');
                button.disabled = true;
                button.textContent = 'Ваша текущая должность';
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            }
        }
    }
    
    // Проверяем статус (заглушка, можно расширить)
    checkUserStatus();
    
    // ===== АНИМАЦИЯ ДЛЯ ЦЕН =====
    const priceValues = document.querySelectorAll('.price-value');
    
    priceValues.forEach(price => {
        // Анимация появления цены
        price.style.opacity = '0';
        price.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            price.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            price.style.opacity = '1';
            price.style.transform = 'translateY(0)';
        }, 1000);
        
        // Эффект при клике
        price.addEventListener('click', function() {
            const originalText = this.textContent;
            this.textContent = '💰 Оплата после одобрения';
            this.style.color = '#2ecc71';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.color = '';
            }, 1500);
        });
    });
});