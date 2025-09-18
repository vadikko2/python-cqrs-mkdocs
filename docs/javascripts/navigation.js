// Скрипт для добавления кнопок навигации на все страницы документации
(function() {
    'use strict';

    // Функция для получения структуры навигации из MkDocs
    function getNavigationStructure() {
        // Получаем данные навигации из глобальной переменной MkDocs
        if (typeof window.nav !== 'undefined') {
            return window.nav;
        }
        
        // Альтернативный способ - парсим из DOM
        const navItems = document.querySelectorAll('.md-nav__item');
        const structure = [];
        
        navItems.forEach(item => {
            const link = item.querySelector('.md-nav__link');
            if (link && link.href) {
                structure.push({
                    title: link.textContent.trim(),
                    url: link.href,
                    children: []
                });
            }
        });
        
        return structure;
    }

    // Функция для получения текущей страницы и соседних страниц
    function getCurrentPageInfo() {
        const currentUrl = window.location.pathname;
        const nav = getNavigationStructure();
        
        // Если у нас есть доступ к MkDocs навигации
        if (typeof window.nav !== 'undefined' && window.nav) {
            const flatNav = flattenNavigation(window.nav);
            const currentIndex = flatNav.findIndex(item => 
                item.url && currentUrl.includes(item.url.split('/').pop())
            );
            
            if (currentIndex !== -1) {
                return {
                    current: flatNav[currentIndex],
                    prev: currentIndex > 0 ? flatNav[currentIndex - 1] : null,
                    next: currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null
                };
            }
        }
        
        // Fallback - используем реальный порядок страниц из MkDocs навигации
        const pageOrder = [
            { title: 'Home', url: '/', path: 'index' },
            { title: 'Commands / Requests Handling', url: '/request_handler/', path: 'request_handler' },
            { title: 'Bootstrap', url: '/bootstrap/', path: 'bootstrap' },
            { title: 'Dependency Injection', url: '/di/', path: 'di' },
            { title: 'Transactional Outbox', url: '/outbox/', path: 'outbox' },
            { title: 'FastAPI integration', url: '/fastapi/', path: 'fastapi' },
            { title: 'Faststream integration', url: '/faststream/', path: 'faststream' },
            { title: 'Kafka integration', url: '/kafka/', path: 'kafka' },
            { title: 'Event Consuming', url: '/event_consuming/', path: 'event_consuming' },
            { title: 'Event Producing', url: '/event_producing/', path: 'event_producing' }
        ];
        
        const currentIndex = pageOrder.findIndex(page => 
            currentUrl.includes(page.path) || currentUrl === page.url
        );
        
        if (currentIndex !== -1) {
            return {
                current: pageOrder[currentIndex],
                prev: currentIndex > 0 ? pageOrder[currentIndex - 1] : null,
                next: currentIndex < pageOrder.length - 1 ? pageOrder[currentIndex + 1] : null
            };
        }
        
        return { current: null, prev: null, next: null };
    }

    // Функция для "сплющивания" иерархической навигации
    function flattenNavigation(nav, result = []) {
        if (Array.isArray(nav)) {
            nav.forEach(item => {
                if (item.url) {
                    result.push({
                        title: item.title,
                        url: item.url
                    });
                }
                if (item.children) {
                    flattenNavigation(item.children, result);
                }
            });
        }
        return result;
    }

    // Функция для создания HTML кнопок навигации
    function createNavigationButtons(prevPage, nextPage) {
        const container = document.createElement('div');
        container.className = 'navigation-buttons';
        
        // Кнопка "Предыдущая"
        if (prevPage) {
            const prevButton = document.createElement('a');
            prevButton.href = prevPage.url;
            prevButton.className = 'nav-button prev';
            prevButton.innerHTML = `
                <span class="icon">←</span>
                <span>${prevPage.title}</span>
            `;
            container.appendChild(prevButton);
        } else {
            const prevButton = document.createElement('span');
            prevButton.className = 'nav-button prev disabled';
            prevButton.innerHTML = `
                <span class="icon">←</span>
                <span>Introducing</span>
            `;
            container.appendChild(prevButton);
        }
        
        // Кнопка "Следующая"
        if (nextPage) {
            const nextButton = document.createElement('a');
            nextButton.href = nextPage.url;
            nextButton.className = 'nav-button next';
            nextButton.innerHTML = `
                <span>${nextPage.title}</span>
                <span class="icon">→</span>
            `;
            container.appendChild(nextButton);
        } else {
            const nextButton = document.createElement('span');
            nextButton.className = 'nav-button next disabled';
            nextButton.innerHTML = `
                <span>Next</span>
                <span class="icon">→</span>
            `;
            container.appendChild(nextButton);
        }
        
        return container;
    }

    // Функция для добавления кнопок навигации на страницу
    function addNavigationButtons() {
        // Добавляем кнопки на все страницы, включая главную
        
        const pageInfo = getCurrentPageInfo();
        
        if (pageInfo.current) {
            const buttons = createNavigationButtons(pageInfo.prev, pageInfo.next);
            
            // Ищем место для вставки кнопок (перед footer или в конце контента)
            const content = document.querySelector('.md-content__inner');
            if (content) {
                content.appendChild(buttons);
            } else {
                // Fallback - добавляем в конец body
                document.body.appendChild(buttons);
            }
        }
    }

    // Инициализация при загрузке страницы
    function init() {
        // Ждем полной загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addNavigationButtons);
        } else {
            addNavigationButtons();
        }
    }

    // Запускаем инициализацию
    init();

})();
