const initApp = () => {
    const contentArea = document.getElementById('content-area');
    const cardsNav = document.getElementById('cards-nav');
    const partButtons = document.querySelectorAll('.part-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const progressBar = document.getElementById('progress-bar');
    
    let examData = [];
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let currentCard = localStorage.getItem('currentCard') || "Card A";
    let currentPart = localStorage.getItem('currentPart') || "Part 1";
    let theme = localStorage.getItem('theme') || 'light';

    // Set Theme
    document.documentElement.setAttribute('data-theme', theme);
    if(themeToggle) themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';

    if(themeToggle) {
        themeToggle.addEventListener('click', () => {
            theme = theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        });
    }

    const speak = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const toggleFavorite = (id) => {
        const index = favorites.indexOf(id);
        if (index > -1) favorites.splice(index, 1);
        else favorites.push(id);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    };

    const renderContent = (card, part) => {
        if(!contentArea) return;
        contentArea.innerHTML = '';
        const filtered = examData.filter(item => item["Mavzular"] === card && item["Qism"] === part);

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">${card} uchun ${part} ma'lumotlari topilmadi.</div>`;
            return;
        }

        filtered.forEach((item, index) => {
            const qId = `${card}-${part}-${index}`;
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';
            const isFav = favorites.includes(qId);
            
            const enAns = (item["Jovoblar (EN)"] || "").replace(/\n/g, '<br>');
            const uzAns = (item["Jovoblar (UZ)"] || "").replace(/\n/g, '<br>');

            cardEl.innerHTML = `
                <div class="card-actions">
                    <button class="action-btn audio-btn">🔊</button>
                    <button class="action-btn fav-btn ${isFav ? 'active' : ''}">⭐</button>
                </div>
                <div class="question-body">
                    <span class="en-text">${item["Sovollar"]}</span>
                    <span class="uz-text">${item["Sovollar (UZ)"] || ""}</span>
                </div>
                <div class="answer-section">
                    <div class="answer-content">
                        <span class="en-text">${enAns}</span>
                        <span class="uz-text">(${uzAns})</span>
                    </div>
                </div>
            `;

            cardEl.querySelector('.audio-btn').onclick = () => {
                speak(item["Sovollar"]);
                setTimeout(() => speak(item["Jovoblar (EN)"]), 1500);
            };
            cardEl.querySelector('.fav-btn').onclick = function() {
                toggleFavorite(qId);
                this.classList.toggle('active');
            };
            contentArea.appendChild(cardEl);
        });
    };

    const renderCardButtons = (cards) => {
        if(!cardsNav) return;
        cardsNav.innerHTML = '';
        cards.forEach(card => {
            const btn = document.createElement('button');
            btn.className = `card-btn ${card.name === currentCard ? 'active' : ''}`;
            btn.innerHTML = `<span class="card-title">${card.name}</span><span class="card-topic">${card.topic}</span>`;
            btn.onclick = () => {
                document.querySelectorAll('.card-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCard = card.name;
                localStorage.setItem('currentCard', currentCard);
                renderContent(currentCard, currentPart);
            };
            cardsNav.appendChild(btn);
        });
    };

    async function loadData() {
        try {
            const res = await fetch('exam.json');
            if(!res.ok) throw new Error('Network error');
            examData = await res.json();
            
            const cardMap = new Map();
            const uniqueCards = [];
            examData.forEach(item => {
                if (item["Mavzular"] && !cardMap.has(item["Mavzular"])) {
                    cardMap.set(item["Mavzular"], item["Mavzular nomi"]);
                    uniqueCards.push({ name: item["Mavzular"], topic: item["Mavzular nomi"] });
                }
            });

            renderCardButtons(uniqueCards);
            renderContent(currentCard, currentPart);
        } catch (e) {
            if(contentArea) contentArea.innerHTML = `<div class="loader" style="color:red">Xatolik: Ma'lumotni yuklab bo'lmadi.</div>`;
        }
    }

    partButtons.forEach(btn => {
        btn.onclick = () => {
            partButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPart = btn.getAttribute('data-part');
            localStorage.setItem('currentPart', currentPart);
            renderContent(currentCard, currentPart);
        };
    });

    loadData();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
