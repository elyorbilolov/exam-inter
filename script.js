document.addEventListener('DOMContentLoaded', () => {
    console.log("--- VERSION 3.0: CLEAN SLATE BLUE ---");
    const contentArea = document.getElementById('content-area');
    const cardsNav = document.getElementById('cards-nav');
    const partButtons = document.querySelectorAll('.part-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const progressBar = document.getElementById('progress-bar');
    const searchInput = document.getElementById('search-input');
    const printPdfBtn = document.getElementById('print-pdf');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const cardsWrapper = document.getElementById('cards-wrapper');
    const partsWrapper = document.querySelector('.parts-wrapper');
    
    let examData = [];
    let writingData = {};
    let currentMode = localStorage.getItem('currentMode') || 'speaking';
    let currentCard = localStorage.getItem('currentCard') || "Card A";
    let currentPart = localStorage.getItem('currentPart') || "Part 1";
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let theme = localStorage.getItem('theme') || 'light';

    // Mode Switch Logic
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.getAttribute('data-mode');
            localStorage.setItem('currentMode', currentMode);
            
            if (currentMode === 'writing') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'none';
                renderWritingContent();
            } else {
                cardsWrapper.style.display = 'block';
                partsWrapper.style.display = 'block';
                renderContent(currentCard, currentPart);
            }
        });
    });

    // Initialize UI with current mode
    if (currentMode === 'writing') {
        cardsWrapper.style.display = 'none';
        partsWrapper.style.display = 'none';
        modeButtons.forEach(b => {
            if (b.getAttribute('data-mode') === 'writing') b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    // Search Listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (currentMode === 'writing') {
                renderWritingContent(query);
            } else {
                renderContent(currentCard, currentPart, query);
            }
        });
    }

    // Print PDF Listener
    if (printPdfBtn) {
        printPdfBtn.addEventListener('click', () => {
            if (currentMode === 'writing') {
                exportWritingToPDF();
            } else {
                exportToPDF();
            }
        });
    }

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
            // Load speaking data
            const resExam = await fetch('exam.json?v=' + new Date().getTime());
            if (!resExam.ok) throw new Error('Exam JSON faylni yuklab bo\'lmadi');
            examData = await resExam.json();

            // Load writing data
            const resWriting = await fetch('writing.json?v=' + new Date().getTime());
            if (!resWriting.ok) throw new Error('Writing JSON faylni yuklab bo\'lmadi');
            writingData = await resWriting.json();
            
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
            
            if (currentMode === 'writing') {
                renderWritingContent();
            } else {
                renderContent(currentCard, currentPart);
            }
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

    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    async function exportWritingToPDF() {
        renderWritingContent(); // Ensure all rendered
        setTimeout(() => {
            window.print();
        }, 500);
    }

    async function exportToPDF() {
        const originalPart = currentPart;
        const loader = document.getElementById('loader');
        
        // Show all parts for the current card
        const allCardData = examData.filter(item => item["Mavzular"] === currentCard);
        
        // Create a temporary container for printing to avoid flickering if possible, 
        // but for simplicity we'll just render everything to contentArea
        contentArea.innerHTML = '<div class="loader">PDF tayyorlanmoqda...</div>';
        
        // Custom render for print
        let printHTML = `
            <div class="print-header" style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: black !important; font-size: 24pt !important;">${currentCard} - ${allCardData[0]?.["Mavzular nomi"] || ""}</h1>
                <p>English Exam Questions & Answers</p>
            </div>
        `;

        // Sort by Part then Sovollar number if possible
        const sortedData = allCardData.sort((a, b) => {
            if (a["Qism"] !== b["Qism"]) return a["Qism"].localeCompare(b["Qism"]);
            return (parseInt(a["Sovollar"]) || 0) - (parseInt(b["Sovollar"]) || 0);
        });

        // We'll reuse renderContent's logic but in a string-building way for speed
        // Or just call renderContent with a special flag
        
        // Let's actually just render ALL content to the contentArea
        renderContentForPrint(sortedData);
        
        setTimeout(() => {
            window.print();
            // Restore original view
            renderContent(currentCard, originalPart);
        }, 500);
    }

    function renderContentForPrint(data) {
        contentArea.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'print-title-container';
        header.innerHTML = `
            <div class="print-card-label">${currentCard}</div>
            <div class="print-topic-label">${data[0]?.["Mavzular nomi"] || ""}</div>
        `;
        contentArea.appendChild(header);

        data.forEach((item, index) => {
            if (!item["Sovollar"]) return;
            
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';
            
            // Simplified version for print (no buttons)
            let answerHTML = '';
            if (item["FullAnswer_EN"]) {
                const parts = [
                    { label: "Answer", en: item["FullAnswer_EN"], uz: item["FullAnswer_UZ"] },
                    { label: "Reason", en: item["Reason_EN"], uz: item["Reason_UZ"] },
                    { label: "Example", en: item["Example_EN"], uz: item["Example_UZ"] },
                    { label: "Extra Info", en: item["ExtraInfo_EN"], uz: item["ExtraInfo_UZ"] }
                ];

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
                const cleanAnswerEN = item["Jovoblar (EN)"] ? item["Jovoblar (EN)"].replace(/\n/g, '<br>') : "No answer";
                const cleanAnswerUZ = item["Jovoblar (UZ)"] ? item["Jovoblar (UZ)"].replace(/\n/g, '<br>') : "Javob yo'q";
                
                answerHTML = `
                    <div class="answer-content">
                        <span class="en-text" style="color: black; font-weight: 600;">${cleanAnswerEN}</span>
                        <span class="uz-text" style="display: block; margin-top: 5px;">(${cleanAnswerUZ})</span>
                    </div>
                `;
            }

            cardEl.innerHTML = `
                <div class="question-section">
                    <div class="en-text">${item["Sovollar"]}</div>
                    <div class="uz-text">(${item["Sovollar (UZ)"] || ""})</div>
                </div>
                <div class="answer-section">
                    ${answerHTML}
                </div>
            `;
            contentArea.appendChild(cardEl);
        });
    }

    function renderWritingContent(searchQuery = '') {
        contentArea.innerHTML = '';
        const items = Object.entries(writingData);
        
        let filtered = items;
        if (searchQuery) {
            filtered = items.filter(([id, data]) => {
                const combinedText = Object.values(data).join(' ').toLowerCase();
                const query = searchQuery.toLowerCase();
                return combinedText.includes(query);
            });
        }

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">Qidiruv bo'yicha natija topilmadi.</div>`;
            return;
        }

        filtered.forEach(([id, data]) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card writing-card';
            
            // Build dynamic prompt content
            let promptHtml = `
                <span class="en-text essay-title">${highlightText(data.sovol_en, searchQuery)}</span>
                <span class="uz-text essay-title-uz">${highlightText(data.sovol_uz, searchQuery)}</span>
            `;

            // If there's extra prompt data (bullet points)
            if (data.sovol_en_2) {
                promptHtml += `<ul class="prompt-list">`;
                // Look for sovol_en_2, 3, 4, 5...
                for (let i = 2; i <= 10; i++) {
                    const enKey = `sovol_en_${i}`;
                    const uzKey = `sovol_uz_${i}`;
                    if (data[enKey]) {
                        promptHtml += `
                            <li class="prompt-item">
                                <div style="font-weight: 600;">${highlightText(data[enKey], searchQuery)}</div>
                                <div style="font-size: 0.75rem; opacity: 0.7;">${highlightText(data[uzKey] || '', searchQuery)}</div>
                            </li>
                        `;
                    } else {
                        break;
                    }
                }
                promptHtml += `</ul>`;
            }

            cardEl.innerHTML = `
                <div class="card-actions">
                    <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                </div>
                <div class="question-section">
                    ${promptHtml}
                </div>
                <div class="writing-answer-container">
                    <div class="writing-answer-content">
                        <div class="essay-body-en">${highlightText(data.jovob_en, searchQuery)}</div>
                        <div class="essay-body-uz">${highlightText(data.jovob_uz, searchQuery)}</div>
                    </div>
                </div>
            `;

            const audioBtn = cardEl.querySelector('.audio-btn');
            audioBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let fullSpeech = data.sovol_en;
                for (let i = 2; i <= 10; i++) {
                    if (data[`sovol_en_${i}`]) fullSpeech += ". " + data[`sovol_en_${i}`];
                    else break;
                }
                speak(fullSpeech);
                setTimeout(() => speak(data.jovob_en), 2000);
            });

            cardEl.addEventListener('click', () => {
                cardEl.classList.toggle('active');
            });

            contentArea.appendChild(cardEl);
        });
        updateProgress(100, 100);
    }

    function renderContent(card, part, searchQuery = '') {
        contentArea.innerHTML = '';
        
        let filtered;
        if (searchQuery) {
            // Global search
            filtered = examData.filter(item => {
                const qEn = (item["Sovollar"] || "").toLowerCase();
                const qUz = (item["Sovollar (UZ)"] || "").toLowerCase();
                const aEn = (item["FullAnswer_EN"] || item["Jovoblar (EN)"] || "").toLowerCase();
                const aUz = (item["FullAnswer_UZ"] || item["Jovoblar (UZ)"] || "").toLowerCase();
                const query = searchQuery.toLowerCase();
                return qEn.includes(query) || qUz.includes(query) || aEn.includes(query) || aUz.includes(query);
            });
        } else {
            // Normal filter
            filtered = examData.filter(item => 
                item["Mavzular"] === card && item["Qism"] === part
            );
        }

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">${searchQuery ? 'Qidiruv bo\'yicha natija topilmadi.' : 'Ma\'lumotlar topilmadi.'}</div>`;
            return;
        }

        updateProgress(100, 100);

        filtered.forEach((item, index) => {
            if (!item["Sovollar"]) return;
            
            // Unique ID including card and part for global search results
            const questionId = `${item["Mavzular"]}-${item["Qism"]}-${index}`;
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';

            const isFav = favorites.includes(questionId);
            
            let answerHTML = '';
            let textToSpeak = '';

            if (item["FullAnswer_EN"]) {
                const parts = [
                    { label: "Answer", en: item["FullAnswer_EN"], uz: item["FullAnswer_UZ"] },
                    { label: "Reason", en: item["Reason_EN"], uz: item["Reason_UZ"] },
                    { label: "Example", en: item["Example_EN"], uz: item["Example_UZ"] },
                    { label: "Extra Info", en: item["ExtraInfo_EN"], uz: item["ExtraInfo_UZ"] }
                ];
                textToSpeak = parts.map(p => p.en).filter(Boolean).join('. ');
                answerHTML = parts.map(p => {
                    if (!p.en) return '';
                    return `
                        <div class="answer-block">
                            <span class="answer-label">${p.label}:</span>
                            <span class="en-text highlight">${highlightText(p.en, searchQuery)}</span>
                            <span class="uz-text small">(${highlightText(p.uz, searchQuery)})</span>
                        </div>
                    `;
                }).join('');
            } else {
                const cleanAnswerEN = item["Jovoblar (EN)"] ? item["Jovoblar (EN)"].replace(/\n/g, '<br>') : "No answer";
                const cleanAnswerUZ = item["Jovoblar (UZ)"] ? item["Jovoblar (UZ)"].replace(/\n/g, '<br>') : "Javob yo'q";
                textToSpeak = item["Jovoblar (EN)"] || "";
                answerHTML = `
                    <div class="answer-content">
                        <span class="en-text" style="color: var(--primary); font-weight: 600;">${highlightText(cleanAnswerEN, searchQuery)}</span>
                        <span class="uz-text" style="display: block; margin-top: 5px;">(${highlightText(cleanAnswerUZ, searchQuery)})</span>
                    </div>
                `;
            }

            const sourceHTML = searchQuery ? `<div class="search-result-source">${item["Mavzular"]} | ${item["Mavzular nomi"]}</div>` : '';

            cardEl.innerHTML = `
                ${sourceHTML}
                <div class="card-actions">
                    <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                    <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                </div>
                <div class="question-section">
                    <span class="en-text">${highlightText(item["Sovollar"], searchQuery)}</span>
                    <span class="uz-text">(${highlightText(item["Sovollar (UZ)"] || "Tarjima yo'q", searchQuery)})</span>
                </div>
                <div class="answer-section">
                    ${answerHTML}
                </div>
            `;

            const audioBtn = cardEl.querySelector('.audio-btn');
            const favBtn = cardEl.querySelector('.fav-btn');

            audioBtn.addEventListener('click', () => {
                speak(item["Sovollar"]);
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
