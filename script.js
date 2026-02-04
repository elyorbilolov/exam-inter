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
            
            const uniqueCards = [...new Set(examData.map(item => item["Unnamed: 0"]))].filter(Boolean);
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
            btn.className = `card-btn ${card === currentCard ? 'active' : ''}`;
            btn.textContent = card;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.card-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCard = card;
                renderContent(currentCard, currentPart);
            });
            cardsNav.appendChild(btn);
        });
    }

    function renderContent(card, part) {
        contentArea.innerHTML = '';
        const filtered = examData.filter(item => 
            item["Unnamed: 0"] === card && item["Unnamed: 1"] === part
        );

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">${card} uchun ${part} ma'lumotlari topilmadi.</div>`;
            return;
        }

        filtered.forEach(item => {
            if (!item.Question) return;
            
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';

            // \n larni bo'shliqqa almashtiramiz, shunda matn yonma-yon chiqadi
            const cleanAnswerEN = item["Answer (EN):"] ? item["Answer (EN):"].replace(/\n/g, ' ') : "No answer";
            const cleanAnswerUZ = item["Javob (UZ):"] ? item["Javob (UZ):"].replace(/\n/g, ' ') : "Javob yo'q";

            const questionHtml = `
                <div class="question-section">
                    <span class="en-text">${item.Question}</span>
                    <span class="uz-text">(${item["UZ tarjima:"] || "Tarjima yo'q"})</span>
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
