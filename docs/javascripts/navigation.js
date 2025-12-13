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
        console.log('Current URL:', currentUrl);
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
        // Используем относительные ссылки, как генерирует MkDocs
        // Порядок должен соответствовать структуре nav в mkdocs.yml
        const pageOrder = [
            // Home
            { title: 'Home', url: '../', path: 'index' },
            // Core Concepts
            { title: 'Commands / Requests Handling', url: 'request_handler/', path: 'request_handler' },
            { title: 'Stream Handling', url: 'stream_handling/', path: 'stream_handling' },
            { title: 'Chain of Responsibility', url: 'chain_of_responsibility/', path: 'chain_of_responsibility' },
            { title: 'Events Handling', url: 'event_handler/', path: 'event_handler' },
            { title: 'Transaction Outbox', url: 'outbox/', path: 'outbox' },
            { title: 'Bootstrap', url: 'bootstrap/', path: 'bootstrap' },
            { title: 'Dependency Injection', url: 'di/', path: 'di' },
            // Integrations
            { title: 'FastAPI Integration', url: 'fastapi/', path: 'fastapi' },
            { title: 'FastStream Integration', url: 'faststream/', path: 'faststream' },
            { title: 'Kafka Integration', url: 'kafka/', path: 'kafka' },
            { title: 'Event Producing', url: 'event_producing/', path: 'event_producing' },
            { title: 'Event Consuming', url: 'event_consuming/', path: 'event_consuming' }
        ];
        
        // Нормализуем текущий URL для сравнения
        const normalizedUrl = currentUrl.replace(/\/index\.html$/, '').replace(/\/$/, '');
        
        const currentIndex = pageOrder.findIndex(page => {
            // Для главной страницы проверяем специальные случаи
            if (page.path === 'index') {
                return normalizedUrl === '' || 
                       normalizedUrl === '/' ||
                       normalizedUrl.endsWith('/python-cqrs-mkdocs') ||
                       normalizedUrl === '/python-cqrs-mkdocs' ||
                       normalizedUrl.endsWith('/index');
            }
            
            // Нормализуем путь страницы для сравнения
            const normalizedPath = page.path.replace(/\/$/, '');
            
            // Проверяем точное совпадение пути
            if (normalizedUrl.endsWith('/' + normalizedPath) || normalizedUrl.endsWith('/' + normalizedPath + '/')) {
                return true;
            }
            
            // Для страниц в подпапках
            // Проверяем, что URL содержит полный путь
            if (normalizedPath.includes('/')) {
                return normalizedUrl.includes('/' + normalizedPath + '/') || 
                       normalizedUrl.endsWith('/' + normalizedPath);
            }
            
            return false;
        });
        
        if (currentIndex !== -1) {
            console.log('Found page at index:', currentIndex, pageOrder[currentIndex]);
            return {
                current: pageOrder[currentIndex],
                prev: currentIndex > 0 ? pageOrder[currentIndex - 1] : null,
                next: currentIndex < pageOrder.length - 1 ? pageOrder[currentIndex + 1] : null
            };
        }
        
        // Специальная обработка для главной страницы (если не найдена в pageOrder)
        if (currentIndex === -1 && (currentUrl === '/' || currentUrl.endsWith('/python-cqrs-mkdocs/') || currentUrl.endsWith('/python-cqrs-mkdocs') || currentUrl.endsWith('/index.html') || currentUrl.endsWith('/python-cqrs-mkdocs/index.html'))) {
            console.log('Using special handling for home page');
            return {
                current: pageOrder[0], // Home
                prev: null,
                next: pageOrder[1] // Commands / Requests Handling
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
        
        // Функция для получения правильного относительного пути
        function getRelativeUrl(targetUrl, currentUrl) {
            // Нормализуем текущий URL
            const normalizedCurrent = currentUrl.replace(/\/index\.html$/, '').replace(/\/$/, '');
            
            // Если это главная страница
            if (targetUrl === '../' || targetUrl === 'index.html' || targetUrl === '') {
                // Определяем глубину текущей страницы
                const currentDepth = normalizedCurrent.split('/').filter(part => part && part !== 'python-cqrs-mkdocs' && part !== '').length;
                if (currentDepth === 0) {
                    return './';
                }
                return '../'.repeat(currentDepth) + 'index.html';
            }
            
            // Определяем глубину текущей страницы
            const currentDepth = normalizedCurrent.split('/').filter(part => part && part !== 'python-cqrs-mkdocs' && part !== '').length;
            
            // Определяем глубину целевой страницы
            const normalizedTarget = targetUrl.replace(/\/$/, '');
            const targetDepth = normalizedTarget.split('/').filter(part => part && part !== '').length;
            
            // Если мы на главной странице (depth = 0)
            if (currentDepth === 0) {
                return targetUrl;
            }
            
            // Вычисляем относительный путь
            // Если обе страницы на одном уровне (например, request_handler и stream_handling)
            // В MkDocs с use_directory_urls каждая страница находится в своей папке
            // Поэтому из /request_handler/ нужно подняться на уровень вверх и войти в stream_handling/
            if (targetDepth === 1 && currentDepth === 1) {
                // Поднимаемся на один уровень вверх и входим в целевую папку
                return '../' + normalizedTarget + '/';
            }
            
            // Если целевая страница на том же уровне или выше
            if (targetDepth <= 1 && currentDepth > 1) {
                // Поднимаемся на нужное количество уровней вверх
                const levelsUp = currentDepth - targetDepth;
                return '../'.repeat(levelsUp) + normalizedTarget + '/';
            }
            
            // Для страниц в подпапках
            // Находим общий префикс
            const currentParts = normalizedCurrent.split('/').filter(part => part && part !== 'python-cqrs-mkdocs' && part !== '');
            const targetParts = normalizedTarget.split('/').filter(part => part && part !== '');
            
            let commonDepth = 0;
            for (let i = 0; i < Math.min(currentParts.length, targetParts.length); i++) {
                if (currentParts[i] === targetParts[i]) {
                    commonDepth++;
                } else {
                    break;
                }
            }
            
            // Вычисляем сколько уровней нужно подняться
            const levelsUp = currentParts.length - commonDepth;
            // Вычисляем путь от общего предка до цели
            const targetPathFromCommon = targetParts.slice(commonDepth).join('/');
            
            if (levelsUp > 0) {
                return '../'.repeat(levelsUp) + targetPathFromCommon + '/';
            } else {
                return targetPathFromCommon + '/';
            }
        }
        
        // Кнопка "Предыдущая"
        if (prevPage) {
            const prevButton = document.createElement('a');
            const relativeUrl = getRelativeUrl(prevPage.url, window.location.pathname);
            prevButton.href = relativeUrl;
            console.log('Prev button URL:', prevPage.url, '->', relativeUrl);
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
                <span>Previous</span>
            `;
            container.appendChild(prevButton);
        }
        
        // Кнопка "Следующая"
        if (nextPage) {
            const nextButton = document.createElement('a');
            const relativeUrl = getRelativeUrl(nextPage.url, window.location.pathname);
            nextButton.href = relativeUrl;
            console.log('Next button URL:', nextPage.url, '->', relativeUrl);
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
