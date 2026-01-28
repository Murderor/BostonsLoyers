// JavaScript для страницы обращений
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница обращений загружена');
    
    // ===== АНИМАЦИЯ КАРТОЧЕК =====
    const typeCards = document.querySelectorAll('.type-card');
    
    typeCards.forEach((card, index) => {
        // Начальное состояние для анимации
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.95)';
        
        // Запускаем анимацию с задержкой
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, 300 + (index * 100));
        
        // Эффект при наведении на карточку с формой
        if (!card.classList.contains('coming-soon')) {
            card.addEventListener('mouseenter', function() {
                const icon = this.querySelector('.type-icon');
                if (icon) {
                    icon.style.transform = 'scale(1.1) rotate(5deg)';
                    icon.style.transition = 'transform 0.3s ease';
                }
            });
            
            card.addEventListener('mouseleave', function() {
                const icon = this.querySelector('.type-icon');
                if (icon) {
                    icon.style.transform = 'scale(1) rotate(0deg)';
                }
            });
        }
    });
    
    // ===== АНИМАЦИЯ ИНСТРУКЦИЙ =====
    const instructionCards = document.querySelectorAll('.instruction-card');
    
    instructionCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 800 + (index * 100));
    });
    
    // ===== ЭФФЕКТ ДЛЯ КНОПОК ВЫБОРА =====
    const typeButtons = document.querySelectorAll('.type-button:not(:disabled)');
    
    typeButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
            this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.3)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
        
        // Эффект при клике
        button.addEventListener('click', function(e) {
            if (!this.hasAttribute('disabled')) {
                // Добавляем эффект нажатия
                this.style.transform = 'scale(0.98)';
                
                // Показываем сообщение о переходе
                const card = this.closest('.type-card');
                const typeName = card.querySelector('h4').textContent;
                
                console.log(`Выбран тип обращения: ${typeName}`);
                
                // Можно добавить отслеживание выбора
                localStorage.setItem('lastSelectedAppealType', typeName);
            }
        });
    });
    
    // ===== ПРОВЕРКА СОХРАНЁННОГО ВЫБОРА =====
    const lastSelectedType = localStorage.getItem('lastSelectedAppealType');
    if (lastSelectedType) {
        console.log(`Ранее выбранный тип: ${lastSelectedType}`);
        
        // Можно добавить подсветку последнего выбранного типа
        typeCards.forEach(card => {
            const typeName = card.querySelector('h4').textContent;
            if (typeName === lastSelectedType) {
                card.style.borderColor = 'var(--color-accent)';
                card.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.2)';
            }
        });
    }
    
    // ===== ТАЙМЕР ДЛЯ ЭКСТРЕННОЙ КАРТОЧКИ =====
    function updateEmergencyTimer() {
        const emergencyCard = document.querySelector('.emergency-card');
        if (emergencyCard) {
            const now = new Date();
            const minutes = now.getMinutes();
            
            // Каждую минуту обновляем анимацию
            if (minutes % 1 === 0) {
                emergencyCard.style.animation = 'none';
                setTimeout(() => {
                    emergencyCard.style.animation = 'emergencyPulse 2s infinite';
                }, 10);
            }
        }
    }
    
    setInterval(updateEmergencyTimer, 60000); // Проверка каждую минуту
    updateEmergencyTimer(); // Запуск сразу
    
    // ===== КОПИРОВАНИЕ КОНТАКТОВ =====
    const contactMethods = document.querySelectorAll('.contact-method');
    
    contactMethods.forEach(method => {
        method.addEventListener('click', function() {
            const text = this.querySelector('.method-text').textContent;
            
            // Копирование в буфер обмена
            navigator.clipboard.writeText(text.replace('Экстренный вызов: ', '').replace('Чат поддержки: ', ''))
                .then(() => {
                    // Визуальная обратная связь
                    const originalColor = this.style.color;
                    this.style.color = 'var(--color-accent)';
                    
                    setTimeout(() => {
                        this.style.color = originalColor;
                    }, 1000);
                    
                    console.log('Контакт скопирован в буфер обмена');
                })
                .catch(err => {
                    console.log('Ошибка копирования: ', err);
                });
        });
    });
});