document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const cardsNav = document.getElementById('cards-nav');
    const partButtons = document.querySelectorAll('.part-btn');
    
    let examData = [];
    let currentCard = "Card A";
    let currentPart = "Part 1";

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
            renderContent(currentCard, currentPart);
        } catch (error) {
            contentArea.innerHTML = `<div class="loader" style="color: red;">Xatolik: ${error.message}</div>`;
        }
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
                renderContent(currentCard, currentPart);
            });
            cardsNav.appendChild(btn);
        });
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

        filtered.forEach(item => {
            if (!item["Sovollar"]) return;
            
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';

            const cleanAnswerEN = item["Jovoblar (EN)"] ? item["Jovoblar (EN)"].replace(/\n/g, '<br>') : "No answer";
            const cleanAnswerUZ = item["Jovoblar (UZ)"] ? item["Jovoblar (UZ)"].replace(/\n/g, '<br>') : "Javob yo'q";

            const questionHtml = `
                <div class="question-section">
                    <span class="en-text">${item["Sovollar"]}</span>
                    <span class="uz-text">(${item["Sovollar (UZ)"] || "Tarjima yo'q"})</span>
                </div>
                <div class="answer-section">
                    <span class="ans-label">Javob / Answer:</span>
                    <div class="answer-content">
                        <span class="en-text" style="color: #34495e; font-weight: normal;">${cleanAnswerEN}</span>
                        <span class="uz-text" style="display: block; margin-top: 5px;">(${cleanAnswerUZ})</span>
                    </div>
                </div>
            `;

            cardEl.innerHTML = questionHtml;
            contentArea.appendChild(cardEl);
        });
    }

    partButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            partButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPart = btn.getAttribute('data-part');
            renderContent(currentCard, currentPart);
        });
    });

    loadData();
});
