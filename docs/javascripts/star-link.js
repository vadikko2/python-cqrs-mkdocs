(function() {
    'use strict';

    const STAR_EMOJIS = ['⭐', '✨'];

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function randomizeStars(starLink) {
        const delays = shuffle([0, 0.05, 0.1, 0.15, 0.2]);
        starLink.style.setProperty('--delay-star', delays[0] + 's');
        starLink.style.setProperty('--delay-sparkle-1', delays[1] + 's');
        starLink.style.setProperty('--delay-sparkle-2', delays[2] + 's');
        starLink.style.setProperty('--delay-before', delays[3] + 's');
        starLink.style.setProperty('--delay-after', delays[4] + 's');

        starLink.style.setProperty('--star-before', '"' + randomChoice(STAR_EMOJIS) + '"');
        starLink.style.setProperty('--star-after', '"' + randomChoice(STAR_EMOJIS) + '"');

        const flying = starLink.querySelectorAll('.star-link-icon-star, .star-link-icon-sparkle');
        flying.forEach(function(el) {
            el.textContent = randomChoice(STAR_EMOJIS);
        });
    }

    function initStarLink() {
        const starLink = document.querySelector('.star-link');
        if (!starLink) return;

        randomizeStars(starLink);

        starLink.addEventListener('mouseenter', function() {
            randomizeStars(starLink);
        });

        const cycleTrigger = starLink.querySelector('.star-link-icon-star');
        if (cycleTrigger) {
            cycleTrigger.addEventListener('animationiteration', function() {
                randomizeStars(starLink);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStarLink);
    } else {
        initStarLink();
    }
})();
