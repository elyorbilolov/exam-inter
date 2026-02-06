document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const cardsNav = document.getElementById('cards-nav');
    const partButtons = document.querySelectorAll('.part-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const progressBar = document.getElementById('progress-bar');
    const searchInput = document.getElementById('search-input');
    
    let examData = [];
    let currentCard = localStorage.getItem('currentCard') || "Card A";
    let currentPart = localStorage.getItem('currentPart') || "Part 1";
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let theme = localStorage.getItem('theme') || 'light';

    // Search Listener
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderContent(currentCard, currentPart, query);
    });

    // Theme Logic

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

    function renderContent(card, part, searchQuery = '') {
        contentArea.innerHTML = '';
        
        // Filter by Card and Part first
        let filtered = examData.filter(item => 
            item["Mavzular"] === card && item["Qism"] === part
        );

        // Then filter by search query if it exists
        if (searchQuery) {
            filtered = filtered.filter(item => {
                const question = (item["Sovollar"] || '').toLowerCase();
                const answerEn = (item["FullAnswer_EN"] || item["Jovoblar (EN)"] || '').toLowerCase();
                const answerUz = (item["FullAnswer_UZ"] || item["Jovoblar (UZ)"] || '').toLowerCase();
                return question.includes(searchQuery) || answerEn.includes(searchQuery) || answerUz.includes(searchQuery);
            });
        }

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">${searchQuery ? 'Qidiruv bo\'yicha natija topilmadi.' : 'Ma\'lumotlar topilmadi.'}</div>`;
            return;
        }

        updateProgress(100, 100);

        filtered.forEach((item, index) => {
            if (!item["Sovollar"]) return;
            
            const questionId = `${card}-${part}-${index}`;
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';

            const isFav = favorites.includes(questionId);
            
            let answerHTML = '';
            let textToSpeak = '';

            // Check if it's the new Detailed Structure (Card A type)
            if (item["FullAnswer_EN"]) {
                const parts = [
                    { label: "Answer", en: item["FullAnswer_EN"], uz: item["FullAnswer_UZ"] },
                    { label: "Reason", en: item["Reason_EN"], uz: item["Reason_UZ"] },
                    { label: "Example", en: item["Example_EN"], uz: item["Example_UZ"] },
                    { label: "Extra Info", en: item["ExtraInfo_EN"], uz: item["ExtraInfo_UZ"] }
                ];

                // Join texts for speech
                textToSpeak = parts.map(p => p.en).filter(Boolean).join('. ');

                answerHTML = parts.map(p => {
                    if (!p.en) return '';
                    return `
                        <div class="answer-block">
                            <span class="answer-label">${p.label}:</span>
                            <span class="en-text highlight">${p.en}</span>
                            <span class="uz-text small">(${p.uz})</span>
                        </div>
                    `;
                }).join('');
            } else {
                // Old Structure
                const cleanAnswerEN = item["Jovoblar (EN)"] ? item["Jovoblar (EN)"].replace(/\n/g, '<br>') : "No answer";
                const cleanAnswerUZ = item["Jovoblar (UZ)"] ? item["Jovoblar (UZ)"].replace(/\n/g, '<br>') : "Javob yo'q";
                textToSpeak = item["Jovoblar (EN)"] || "";
                
                answerHTML = `
                    <div class="answer-content">
                        <span class="en-text" style="color: var(--primary); font-weight: 600;">${cleanAnswerEN}</span>
                        <span class="uz-text" style="display: block; margin-top: 5px;">(${cleanAnswerUZ})</span>
                    </div>
                `;
            }

            cardEl.innerHTML = `
                <div class="card-actions">
                    <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                    <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                </div>
                <div class="question-section">
                    <span class="en-text">${item["Sovollar"]}</span>
                    <span class="uz-text">(${item["Sovollar (UZ)"] || "Tarjima yo'q"})</span>
                </div>
                <div class="answer-section">
                    ${answerHTML}
                </div>
            `;

            const audioBtn = cardEl.querySelector('.audio-btn');
            const favBtn = cardEl.querySelector('.fav-btn');

            audioBtn.addEventListener('click', () => {
                const questionText = item["Sovollar"];
                speak(questionText);
                setTimeout(() => speak(textToSpeak), 1500);
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
