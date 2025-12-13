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
            // Bootstrap
            { title: 'Bootstrap', url: 'bootstrap/', path: 'bootstrap/index' },
            { title: 'Request Mediator', url: 'bootstrap/request_mediator/', path: 'bootstrap/request_mediator' },
            { title: 'Streaming Mediator', url: 'bootstrap/streaming_mediator/', path: 'bootstrap/streaming_mediator' },
            { title: 'Event Mediator', url: 'bootstrap/event_mediator/', path: 'bootstrap/event_mediator' },
            { title: 'Message Brokers', url: 'bootstrap/message_brokers/', path: 'bootstrap/message_brokers' },
            { title: 'Middlewares', url: 'bootstrap/middlewares/', path: 'bootstrap/middlewares' },
            { title: 'DI Containers', url: 'bootstrap/di_containers/', path: 'bootstrap/di_containers' },
            { title: 'Advanced', url: 'bootstrap/advanced/', path: 'bootstrap/advanced' },
            // Dependency Injection
            { title: 'Dependency Injection', url: 'di/', path: 'di' },
            // Request Handler
            { title: 'Commands / Requests Handling', url: 'request_handler/', path: 'request_handler' },
            // Stream Handling
            { title: 'Stream Handling', url: 'stream_handling/', path: 'stream_handling/index' },
            { title: 'Stream Configuration', url: 'stream_handling/configuration/', path: 'stream_handling/configuration' },
            { title: 'Stream FastAPI Integration', url: 'stream_handling/fastapi_integration/', path: 'stream_handling/fastapi_integration' },
            { title: 'Stream Reference', url: 'stream_handling/reference/', path: 'stream_handling/reference' },
            // Chain of Responsibility
            { title: 'Chain of Responsibility', url: 'chain_of_responsibility/', path: 'chain_of_responsibility/index' },
            { title: 'CoR Examples', url: 'chain_of_responsibility/examples/', path: 'chain_of_responsibility/examples' },
            { title: 'CoR Advanced', url: 'chain_of_responsibility/advanced/', path: 'chain_of_responsibility/advanced' },
            // Event Handler
            { title: 'Events Handling', url: 'event_handler/', path: 'event_handler/index' },
            { title: 'Event Flow', url: 'event_handler/event_flow/', path: 'event_handler/event_flow' },
            { title: 'Runtime Processing', url: 'event_handler/runtime_processing/', path: 'event_handler/runtime_processing' },
            { title: 'Parallel Processing', url: 'event_handler/parallel_processing/', path: 'event_handler/parallel_processing' },
            { title: 'Event Types', url: 'event_handler/event_types/', path: 'event_handler/event_types' },
            { title: 'Event Examples', url: 'event_handler/examples/', path: 'event_handler/examples' },
            { title: 'Event Best Practices', url: 'event_handler/best_practices/', path: 'event_handler/best_practices' },
            // Outbox
            { title: 'Transaction Outbox', url: 'outbox/', path: 'outbox/index' },
            { title: 'Outbox Implementation', url: 'outbox/implementation/', path: 'outbox/implementation' },
            { title: 'Outbox Usage', url: 'outbox/usage/', path: 'outbox/usage' },
            { title: 'Outbox Examples', url: 'outbox/examples/', path: 'outbox/examples' },
            { title: 'Outbox Best Practices', url: 'outbox/best_practices/', path: 'outbox/best_practices' },
            // Integrations
            { title: 'FastAPI Integration', url: 'fastapi/', path: 'fastapi' },
            { title: 'FastStream Integration', url: 'faststream/', path: 'faststream' },
            { title: 'Event Producing', url: 'event_producing/', path: 'event_producing' },
            { title: 'Protobuf Integration', url: 'protobuf/', path: 'protobuf' }
        ];
        
        // Нормализуем текущий URL для сравнения
        const normalizedUrl = currentUrl.replace(/\/index\.html$/, '').replace(/\/$/, '');
        
        // Убираем префикс python-cqrs-mkdocs если есть
        let urlToCheck = normalizedUrl;
        if (urlToCheck.includes('/python-cqrs-mkdocs/')) {
            urlToCheck = urlToCheck.split('/python-cqrs-mkdocs/')[1] || '';
        } else if (urlToCheck.startsWith('/python-cqrs-mkdocs')) {
            urlToCheck = urlToCheck.replace('/python-cqrs-mkdocs', '');
        }
        // Нормализуем: убираем завершающие слеши и index
        urlToCheck = urlToCheck.replace(/\/+$/, '').replace(/\/index\.html$/, '').replace(/\/index$/, '').replace(/^\/+/, '');
        
        const currentIndex = pageOrder.findIndex(page => {
            // Для главной страницы проверяем специальные случаи
            if (page.path === 'index') {
                return urlToCheck === '' || urlToCheck === '/';
            }
            
            // Нормализуем путь страницы для сравнения
            const normalizedPath = page.path.replace(/\/$/, '');
            
            // Если путь заканчивается на /index, проверяем также вариант без /index
            const pathWithoutIndex = normalizedPath.replace(/\/index$/, '');
            
            // Проверяем точное совпадение пути
            if (urlToCheck === normalizedPath || urlToCheck === pathWithoutIndex) {
                return true;
            }
            
            // Для страниц в подпапках - проверяем совпадение последней части пути
            const pathParts = normalizedPath.split('/');
            const urlParts = urlToCheck.split('/').filter(p => p);
            
            // Если URL заканчивается на имя папки, а путь страницы заканчивается на имя_папки/index
            // Например: urlToCheck = "bootstrap", path = "bootstrap/index"
            if (pathParts.length === urlParts.length + 1 && pathParts[pathParts.length - 1] === 'index') {
                let matches = true;
                for (let i = 0; i < urlParts.length; i++) {
                    if (pathParts[i] !== urlParts[i]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) return true;
            }
            
            // Проверяем совпадение в конце URL (для случаев с завершающими слешами)
            if (urlToCheck.endsWith('/' + normalizedPath) || urlToCheck.endsWith('/' + normalizedPath + '/') ||
                urlToCheck.endsWith('/' + pathWithoutIndex) || urlToCheck.endsWith('/' + pathWithoutIndex + '/')) {
                return true;
            }
            
            // Сравниваем последние части пути
            if (pathParts.length > 0 && urlParts.length > 0) {
                const lastPathPart = pathParts[pathParts.length - 1];
                const lastUrlPart = urlParts[urlParts.length - 1];
                
                // Если последняя часть совпадает
                if (lastPathPart === lastUrlPart || lastPathPart === lastUrlPart.replace('.html', '')) {
                    // Проверяем, что предыдущие части пути тоже совпадают
                    if (pathParts.length === urlParts.length) {
                        let matches = true;
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            if (pathParts[i] !== urlParts[i]) {
                                matches = false;
                                break;
                            }
                        }
                        if (matches) return true;
                    }
                }
            }
            
            return false;
        });
        
        if (currentIndex !== -1) {
            console.log('Found page at index:', currentIndex, pageOrder[currentIndex]);
            console.log('URL checked:', urlToCheck, 'Path:', pageOrder[currentIndex].path);
            return {
                current: pageOrder[currentIndex],
                prev: currentIndex > 0 ? pageOrder[currentIndex - 1] : null,
                next: currentIndex < pageOrder.length - 1 ? pageOrder[currentIndex + 1] : null
            };
        }
        
        // Если не найдено, выводим отладочную информацию
        console.log('Page not found! URL:', currentUrl, 'Normalized:', urlToCheck);
        console.log('Available paths:', pageOrder.map(p => p.path).slice(0, 10));
        
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
