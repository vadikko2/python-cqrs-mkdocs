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
            // Saga
            { title: 'Saga Pattern', url: 'saga/', path: 'saga/index' },
            { title: 'Saga Flow Diagrams', url: 'saga/flow/', path: 'saga/flow' },
            { title: 'Saga Storage', url: 'saga/storage/', path: 'saga/storage' },
            { title: 'Saga Recovery', url: 'saga/recovery/', path: 'saga/recovery' },
            { title: 'Saga Compensation', url: 'saga/compensation/', path: 'saga/compensation' },
            { title: 'Saga Fallback Pattern', url: 'saga/fallback/', path: 'saga/fallback/index' },
            { title: 'Saga Fallback Mechanics', url: 'saga/fallback/mechanics/', path: 'saga/fallback/mechanics' },
            { title: 'Saga Fallback Circuit Breaker', url: 'saga/fallback/circuit_breaker/', path: 'saga/fallback/circuit_breaker' },
            { title: 'Saga Fallback Examples', url: 'saga/fallback/examples/', path: 'saga/fallback/examples' },
            { title: 'Saga Examples', url: 'saga/examples/', path: 'saga/examples' },
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

    // Функция для получения правильного относительного пути
    function getRelativeUrl(targetPage, currentUrl) {
        // Используем path из pageOrder вместо url для более точного построения путей
        const targetPath = targetPage.path || targetPage.url || targetPage;
        
        // Нормализуем текущий URL - убираем префикс python-cqrs-mkdocs и нормализуем
        let normalizedCurrent = currentUrl.replace(/\/index\.html$/, '').replace(/\/$/, '');
        normalizedCurrent = normalizedCurrent.replace(/^\/python-cqrs-mkdocs/, '').replace(/^\/+/, '');
        
        // Если это главная страница
        if (targetPath === 'index' || targetPath === '../' || targetPath === 'index.html' || targetPath === '') {
            const currentDepth = normalizedCurrent.split('/').filter(p => p && p !== 'index.html').length;
            if (currentDepth === 0) {
                return './';
            }
            // В MkDocs с use_directory_urls главная страница - это просто относительный путь вверх
            return '../'.repeat(currentDepth);
        }
        
        // Получаем части путей
        const currentParts = normalizedCurrent.split('/').filter(part => part && part !== 'python-cqrs-mkdocs' && part !== 'index.html');
        let targetParts = targetPath.split('/').filter(part => part && part !== 'index.html');
        
        // В MkDocs с use_directory_urls страницы с path заканчивающимся на 'index' 
        // доступны без '/index' в URL (например, 'stream_handling/index' -> 'stream_handling/')
        // Убираем 'index' из конца пути для правильного построения URL
        if (targetParts.length > 0 && targetParts[targetParts.length - 1] === 'index') {
            targetParts = targetParts.slice(0, -1);
        }
        
        // Находим общий префикс
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
        
        // Строим относительный путь
        if (levelsUp === 0 && targetPathFromCommon === '') {
            return './';
        }
        
        // Строим путь, избегая двойных слешей
        let relativePath = '';
        if (levelsUp > 0) {
            relativePath = '../'.repeat(levelsUp);
        }
        if (targetPathFromCommon) {
            relativePath += targetPathFromCommon + '/';
        }
        
        // Убираем двойные слеши
        relativePath = relativePath.replace(/\/+/g, '/');
        
        return relativePath;
    }

    // Функция для создания плиток навигации вверху страницы
    function createNavigationTiles(prevPage, nextPage) {
        const container = document.createElement('div');
        container.className = 'nav-tiles-container';
        
        const cards = [];
        
        // Плитка "Предыдущая"
        if (prevPage) {
            const relativeUrl = getRelativeUrl(prevPage, window.location.pathname);
            const card = document.createElement('article');
            card.className = 'md-typeset nav-tile nav-tile-prev';
            card.innerHTML = `
                <a href="${relativeUrl}" class="nav-tile-link">
                    <span class="nav-tile-icon">←</span>
                    <div class="nav-tile-content">
                        <span class="nav-tile-label">Previous</span>
                        <span class="nav-tile-title">${prevPage.title}</span>
                    </div>
                </a>
            `;
            cards.push(card);
        }
        
        // Плитка "Следующая"
        if (nextPage) {
            const relativeUrl = getRelativeUrl(nextPage, window.location.pathname);
            const card = document.createElement('article');
            card.className = 'md-typeset nav-tile nav-tile-next';
            card.innerHTML = `
                <a href="${relativeUrl}" class="nav-tile-link">
                    <div class="nav-tile-content">
                        <span class="nav-tile-label">Next</span>
                        <span class="nav-tile-title">${nextPage.title}</span>
                    </div>
                    <span class="nav-tile-icon">→</span>
                </a>
            `;
            cards.push(card);
        }
        
        if (cards.length > 0) {
            cards.forEach(card => container.appendChild(card));
            return container;
        }
        
        return null;
    }


    // Функция для добавления плиток навигации на страницу
    function addNavigationButtons() {
        // Проверяем, что DOM полностью загружен
        if (!document.body) {
            return;
        }
        
        // Добавляем плитки на все страницы, включая главную
        const pageInfo = getCurrentPageInfo();
        
        if (pageInfo.current) {
            // Создаем плитки навигации
            const tiles = createNavigationTiles(pageInfo.prev, pageInfo.next);
            
            if (tiles) {
                // Ищем место для вставки плиток - в конце контента
                const content = document.querySelector('.md-content__inner');
                if (content) {
                    // Добавляем плитки в конец контента
                    content.appendChild(tiles);
                } else {
                    // Fallback - добавляем в конец main контента
                    const main = document.querySelector('main .md-content') || document.querySelector('main');
                    if (main) {
                        main.appendChild(tiles);
                    }
                }
            }
        }
    }

    // Функция для удаления стандартных кнопок навигации из подвала
    function removeFooterNavigation() {
        console.log('Attempting to remove footer navigation...');
        
        // Различные селекторы для навигационных элементов
        const selectors = [
            '.md-footer-nav',
            '.md-footer-nav__link',
            '.md-footer-nav__link--prev',
            '.md-footer-nav__link--next',
            '.md-footer__inner .md-footer-nav',
            '.md-footer__inner > .md-footer-nav',
            'nav.md-footer-nav',
            'a.md-footer-nav__link',
            '[rel="prev"]',
            '[rel="next"]'
        ];
        
        let removedCount = 0;
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Проверяем, что элемент действительно в подвале
                    if (el.closest('.md-footer') || el.closest('footer')) {
                        console.log('Removing element:', selector, el);
                        el.remove();
                        removedCount++;
                    }
                });
            } catch (e) {
                console.warn('Error with selector', selector, e);
            }
        });
        
        // Также удаляем через поиск по тексту (на случай, если классы другие)
        const footer = document.querySelector('.md-footer') || document.querySelector('footer');
        if (footer) {
            // Удаляем все ссылки с rel="prev" или rel="next"
            const relLinks = footer.querySelectorAll('a[rel="prev"], a[rel="next"]');
            relLinks.forEach(link => {
                if (!link.closest('.nav-tiles-container')) {
                    console.log('Removing navigation link by rel attribute');
                    link.remove();
                    removedCount++;
                }
            });
            
            // Удаляем ссылки по тексту
            const allLinks = footer.querySelectorAll('a');
            allLinks.forEach(link => {
                const text = link.textContent.trim().toLowerCase();
                // Проверяем различные варианты текста
                if ((text.includes('previous') || text.includes('next') || 
                     text.includes('предыдущ') || text.includes('следующ')) &&
                    !link.closest('.nav-tiles-container')) {
                    // Дополнительная проверка - что это действительно навигация
                    const parent = link.parentElement;
                    if (parent && (
                        parent.classList.contains('md-footer-nav') ||
                        parent.classList.contains('md-footer-nav__link') ||
                        parent.closest('.md-footer-nav')
                    )) {
                        console.log('Removing navigation link by text:', text);
                        // Удаляем родительский элемент, если это контейнер навигации
                        if (parent.classList.contains('md-footer-nav__link')) {
                            parent.remove();
                        } else {
                            link.remove();
                        }
                        removedCount++;
                    }
                }
            });
            
            // Удаляем пустые контейнеры навигации
            const emptyNavs = footer.querySelectorAll('.md-footer-nav:empty, nav:empty');
            emptyNavs.forEach(nav => nav.remove());
        }
        
        // Удаляем родительские контейнеры, если они пустые
        const footerNav = document.querySelector('.md-footer-nav');
        if (footerNav && footerNav.children.length === 0) {
            footerNav.remove();
            removedCount++;
        }
        
        console.log('Removed', removedCount, 'footer navigation elements');
        
        return removedCount > 0;
    }

    // Инициализация при загрузке страницы
    function init() {
        // Функция для запуска удаления с повторными попытками
        function attemptRemoveFooterNav(attempts = 0, maxAttempts = 15) {
            const removed = removeFooterNavigation();
            
            // Если элементы не найдены и еще есть попытки, повторяем
            if (attempts < maxAttempts) {
                setTimeout(() => {
                    attemptRemoveFooterNav(attempts + 1, maxAttempts);
                }, 300);
            }
        }
        
        // Функция для полной инициализации
        function fullInit() {
            addNavigationButtons();
            // Пробуем удалить с разными задержками
            attemptRemoveFooterNav();
        }
        
        // Ждем полной загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fullInit);
        } else {
            // Если DOM уже загружен, запускаем сразу
            fullInit();
        }
        
        // Также ждем полной загрузки страницы (включая все ресурсы)
        window.addEventListener('load', () => {
            setTimeout(() => attemptRemoveFooterNav(), 500);
        });
        
        // Также удаляем при изменении DOM (для SPA навигации)
        const observer = new MutationObserver((mutations) => {
            let shouldRemove = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (
                            node.classList.contains('md-footer-nav') ||
                            node.classList.contains('md-footer-nav__link') ||
                            (node.closest && node.closest('.md-footer'))
                        )) {
                            shouldRemove = true;
                        }
                        // Также проверяем дочерние элементы
                        if (node.querySelector && (
                            node.querySelector('.md-footer-nav') ||
                            node.querySelector('.md-footer-nav__link')
                        )) {
                            shouldRemove = true;
                        }
                    }
                });
            });
            
            if (shouldRemove) {
                setTimeout(() => attemptRemoveFooterNav(), 200);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Запускаем инициализацию
    init();

})();
