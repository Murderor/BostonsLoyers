// JavaScript для страницы законов
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница законодательной базы загружена');
    
    // ===== КОНФИГУРАЦИЯ ССЫЛОК =====
    // Здесь можно настроить реальные ссылки на законы
    const lawLinks = {
        'Уголовный кодекс': 'https://example.com/criminal-code',
        'Конституция': 'https://example.com/constitution',
        'Процессуальный кодекс': 'https://example.com/procedural-code',
        'Гражданский кодекс': 'https://example.com/civil-code',
        'Административный кодекс': 'https://example.com/administrative-code',
        'Трудовой кодекс': 'https://example.com/labor-code',
        'Налоговый кодекс': 'https://example.com/tax-code',
        'Земельный кодекс': 'https://example.com/land-code'
    };
    
    // ===== ОБРАБОТКА КЛИКОВ ПО КНОПКАМ =====
    document.querySelectorAll('.law-button').forEach(button => {
        button.addEventListener('click', function(e) {
            const lawName = this.closest('.law-card').querySelector('.law-name').textContent;
            console.log(`Выбран закон: ${lawName}`);
            
            // Можно добавить отслеживание кликов
            trackLawClick(lawName);
            
            // Добавляем анимацию нажатия
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // ===== ОТСЛЕЖИВАНИЕ КЛИКОВ =====
    function trackLawClick(lawName) {
        // Сохраняем историю просмотров
        const viewHistory = JSON.parse(localStorage.getItem('lawViewHistory') || '[]');
        
        const viewRecord = {
            law: lawName,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString()
        };
        
        viewHistory.unshift(viewRecord);
        
        // Ограничиваем историю 20 последними записями
        if (viewHistory.length > 20) {
            viewHistory.length = 20;
        }
        
        localStorage.setItem('lawViewHistory', JSON.stringify(viewHistory));
        console.log(`Закон ${lawName} добавлен в историю просмотров`);
    }
    
    // ===== ПОИСК ПО ЗАКОНАМ =====
    // Можно добавить поиск, если понадобится
    function setupSearch() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Поиск по законам...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 12px 20px;
            background-color: var(--color-gray);
            border: 1px solid var(--color-gray-light);
            border-radius: var(--border-radius);
            color: var(--color-light);
            font-size: 1rem;
            margin-bottom: 30px;
            transition: var(--transition);
        `;
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const lawCards = document.querySelectorAll('.law-card');
            
            lawCards.forEach(card => {
                const lawName = card.querySelector('.law-name').textContent.toLowerCase();
                const lawDescription = card.querySelector('.law-description').textContent.toLowerCase();
                
                if (lawName.includes(searchTerm) || lawDescription.includes(searchTerm)) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeInUp 0.3s ease';
                } else {
                    card.style.display = 'none';
                }
            });
        });
        
        // Вставляем поиск после заголовка
        const header = document.querySelector('.laws-header');
        if (header) {
            header.insertAdjacentElement('afterend', searchInput);
        }
    }
    
    // Раскомментируйте, если нужен поиск
    // setupSearch();
    
    // ===== СОРТИРОВКА ЗАКОНОВ =====
    // Можно добавить сортировку по алфавиту или частоте использования
    function sortLawsByFrequency() {
        const viewHistory = JSON.parse(localStorage.getItem('lawViewHistory') || '[]');
        const frequency = {};
        
        // Считаем частоту просмотров
        viewHistory.forEach(view => {
            frequency[view.law] = (frequency[view.law] || 0) + 1;
        });
        
        // Сортируем карточки по частоте
        const lawCards = Array.from(document.querySelectorAll('.law-card'));
        
        lawCards.sort((a, b) => {
            const lawA = a.querySelector('.law-name').textContent;
            const lawB = b.querySelector('.law-name').textContent;
            
            const freqA = frequency[lawA] || 0;
            const freqB = frequency[lawB] || 0;
            
            return freqB - freqA; // По убыванию частоты
        });
        
        // Переставляем карточки
        const grid = document.querySelector('.laws-grid');
        if (grid) {
            lawCards.forEach(card => {
                grid.appendChild(card);
            });
        }
    }
    
    // Раскомментируйте для сортировки по частоте использования
    // sortLawsByFrequency();
    
    // ===== АНИМАЦИЯ ПОЯВЛЕНИЯ =====
    // Уже добавлена через CSS, но можно добавить дополнительные эффекты
    document.querySelectorAll('.law-card').forEach((card, index) => {
        // Добавляем эффект при наведении
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.law-icon');
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
                icon.style.transition = 'transform 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.law-icon');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
    
    // ===== КНОПКА "ПОСЛЕДНИЕ ПРОСМОТРЫ" =====
    function addRecentViewsButton() {
        const viewHistory = JSON.parse(localStorage.getItem('lawViewHistory') || '[]');
        if (viewHistory.length === 0) return;
        
        const button = document.createElement('button');
        button.className = 'button';
        button.style.cssText = `
            margin: 20px auto;
            display: block;
            background-color: var(--color-primary);
        `;
        button.innerHTML = '📚 Последние просмотры';
        
        button.addEventListener('click', function() {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            let historyHtml = '<h3 style="color: var(--color-light); margin-bottom: 20px;">История просмотров</h3>';
            historyHtml += '<div style="max-height: 300px; overflow-y: auto;">';
            
            viewHistory.forEach(view => {
                historyHtml += `
                    <div style="padding: 10px; border-bottom: 1px solid var(--color-gray-light);">
                        <div style="color: var(--color-light); font-weight: 600;">${view.law}</div>
                        <div style="color: #a0a8c0; font-size: 0.9rem;">${view.date}</div>
                    </div>
                `;
            });
            
            historyHtml += '</div>';
            
            modal.innerHTML = `
                <div style="background-color: var(--color-gray); padding: 30px; border-radius: var(--border-radius); max-width: 500px; width: 90%;">
                    ${historyHtml}
                    <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                            class="button" 
                            style="margin-top: 20px; width: 100%;">
                        Закрыть
                    </button>
                </div>
            `;
            
            document.body.appendChild(modal);
        });
        
        const container = document.querySelector('.laws-container');
        if (container) {
            const infoBlock = container.querySelector('.laws-info');
            infoBlock.insertAdjacentElement('beforebegin', button);
        }
    }
    
    // Раскомментируйте для добавления кнопки истории просмотров
    // addRecentViewsButton();
    
    // ===== ПРОВЕРКА ДОСТУПНОСТИ ССЫЛОК =====
    async function checkLinksAvailability() {
        console.log('Проверка доступности ссылок на законы...');
        // Можно добавить проверку доступности внешних ресурсов
    }
    
    // Запускаем проверку при загрузке
    checkLinksAvailability();
    
    console.log('Страница законов инициализирована');
});

// Добавляем глобальные функции для модальных окон
window.closeModal = function(button) {
    button.closest('div[style*="position: fixed"]').remove();
};