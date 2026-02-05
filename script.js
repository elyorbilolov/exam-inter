document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const cardsNav = document.getElementById('cards-nav');
    const partButtons = document.querySelectorAll('.part-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const progressBar = document.getElementById('progress-bar');
    
    let examData = [];
    let currentCard = localStorage.getItem('currentCard') || "Card A";
    let currentPart = localStorage.getItem('currentPart') || "Part 1";
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let theme = localStorage.getItem('theme') || 'light';

    // Theme Logic
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';

    themeToggle.addEventListener('click', () => {
        theme = theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    });

    async function loadData() {
        try {
            const response = await fetch('exam.json');
            if (!response.ok) throw new Error('JSON faylni yuklab bo\'lmadi');
            examData = await response.json();
            
            const uniqueCards = [];
            const cardMap = new Map();
            
            examData.forEach(item => {
                const cardName = item["Mavzular"];
                const topicName = item["Mavzular nomi"];
                if (cardName && !cardMap.has(cardName)) {
                    cardMap.set(cardName, topicName);
                    uniqueCards.push({ name: cardName, topic: topicName });
                }
            });

            renderCardButtons(uniqueCards);
            updateActivePartButton();
            renderContent(currentCard, currentPart);
        } catch (error) {
            contentArea.innerHTML = `<div class="loader" style="color: red;">Xatolik: ${error.message}</div>`;
        }
    }

    function updateActivePartButton() {
        partButtons.forEach(btn => {
            if (btn.getAttribute('data-part') === currentPart) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function renderCardButtons(cards) {
        cardsNav.innerHTML = '';
        cards.forEach(card => {
            const btn = document.createElement('button');
            btn.className = `card-btn ${card.name === currentCard ? 'active' : ''}`;
            btn.innerHTML = `
                <div class="card-btn-content">
                    <span class="card-title">${card.name}</span>
                    <span class="card-topic">${card.topic}</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.card-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCard = card.name;
                localStorage.setItem('currentCard', currentCard);
                renderContent(currentCard, currentPart);
            });
            cardsNav.appendChild(btn);
        });
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }

    function toggleFavorite(id) {
        const index = favorites.indexOf(id);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    function updateProgress(current, total) {
        const percent = (current / total) * 100;
        progressBar.style.width = `${percent}%`;
    }

    function renderContent(card, part) {
        contentArea.innerHTML = '';
        const filtered = examData.filter(item => 
            item["Mavzular"] === card && item["Qism"] === part
        );

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">${card} uchun ${part} ma'lumotlari topilmadi.</div>`;
            return;
        }

        updateProgress(0, filtered.length);
        let seenCount = 0;

        filtered.forEach((item, index) => {
            if (!item["Sovollar"]) return;
            
            const questionId = `${card}-${part}-${index}`;
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';

            const cleanAnswerEN = item["Jovoblar (EN)"] ? item["Jovoblar (EN)"].replace(/\n/g, '<br>') : "No answer";
            const cleanAnswerUZ = item["Jovoblar (UZ)"] ? item["Jovoblar (UZ)"].replace(/\n/g, '<br>') : "Javob yo'q";

            const isFav = favorites.includes(questionId);

            cardEl.innerHTML = `
                <div class="card-actions">
                    <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                    <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                </div>
                <div class="question-section">
                    <span class="en-text">${item["Sovollar"]}</span>
                    <span class="uz-text">(${item["Sovollar (UZ)"] || "Tarjima yo'q"})</span>
                </div>
                <button class="show-answer-btn">Javobni ko'rsat</button>
                <div class="answer-section hidden">
                    <div class="answer-content">
                        <span class="en-text" style="color: var(--primary); font-weight: 600;">${cleanAnswerEN}</span>
                        <span class="uz-text" style="display: block; margin-top: 5px;">(${cleanAnswerUZ})</span>
                    </div>
                </div>
            `;

            const showBtn = cardEl.querySelector('.show-answer-btn');
            const ansSection = cardEl.querySelector('.answer-section');
            const audioBtn = cardEl.querySelector('.audio-btn');
            const favBtn = cardEl.querySelector('.fav-btn');

            showBtn.addEventListener('click', () => {
                ansSection.classList.toggle('hidden');
                showBtn.textContent = ansSection.classList.contains('hidden') ? "Javobni ko'rsat" : "Javobni yashirish";
                
                if (!ansSection.classList.contains('hidden') && !cardEl.dataset.seen) {
                    cardEl.dataset.seen = "true";
                    seenCount++;
                    updateProgress(seenCount, filtered.length);
                }
            });

            audioBtn.addEventListener('click', () => {
                speak(item["Sovollar"]);
                // Optional: speak answer too if visible
                if (!ansSection.classList.contains('hidden')) {
                    setTimeout(() => speak(item["Jovoblar (EN)"]), 1500);
                }
            });

            favBtn.addEventListener('click', () => {
                toggleFavorite(questionId);
                favBtn.classList.toggle('active');
            });

            contentArea.appendChild(cardEl);
        });
    }

    partButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            partButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPart = btn.getAttribute('data-part');
            localStorage.setItem('currentPart', currentPart);
            renderContent(currentCard, currentPart);
        });
    });

    loadData();
});
