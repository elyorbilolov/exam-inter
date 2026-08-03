document.addEventListener('DOMContentLoaded', () => {
    console.log("--- VERSION 4.4: FILES RENAMED & PRE-INTERMEDIATE EXAM INTEGRATED ---");
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
    let lessonsData = [];
    let currentLevel = localStorage.getItem('selectedLevel') || null;
    let currentMode = localStorage.getItem('currentMode') || 'speaking';
    let currentCard = localStorage.getItem('currentCard') || "Card A";
    let currentPart = localStorage.getItem('currentPart') || "Part 1";
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let learnedWriting = JSON.parse(localStorage.getItem('learnedWriting')) || [];
    let theme = localStorage.getItem('theme') || 'light';

    // Study tools state
    let isFlashcardModeActive = localStorage.getItem('isFlashcardModeActive') === 'true';
    let isKeywordBlurActive = localStorage.getItem('isKeywordBlurActive') === 'true';
    let flashcardRatings = JSON.parse(localStorage.getItem('flashcardRatings')) || {};
    let activeSpeechRecognition = null;
    let activeSpeechBtn = null;

    const flashcardToggleBtn = document.getElementById('flashcard-toggle');
    const keywordBlurToggleBtn = document.getElementById('keyword-blur-toggle');
    const studyToolsBar = document.getElementById('study-tools-bar');

    function updateStudyToolButtons() {
        if (!flashcardToggleBtn || !keywordBlurToggleBtn) return;
        
        if (isFlashcardModeActive) {
            flashcardToggleBtn.classList.add('active');
            flashcardToggleBtn.innerHTML = '<span class="tool-icon">🃏</span> Flashcards: ON';
        } else {
            flashcardToggleBtn.classList.remove('active');
            flashcardToggleBtn.innerHTML = '<span class="tool-icon">🃏</span> Flashcards: OFF';
        }

        if (isKeywordBlurActive) {
            keywordBlurToggleBtn.classList.add('active');
            keywordBlurToggleBtn.innerHTML = '<span class="tool-icon">👁️</span> Hide Keywords: ON';
        } else {
            keywordBlurToggleBtn.classList.remove('active');
            keywordBlurToggleBtn.innerHTML = '<span class="tool-icon">👁️</span> Hide Keywords: OFF';
        }

        adjustStudyToolsVisibility();
    }

    function adjustStudyToolsVisibility() {
        if (!flashcardToggleBtn || !studyToolsBar) return;
        
        // Hide flashcards in writing mode
        if (currentMode === 'writing') {
            flashcardToggleBtn.style.display = 'none';
        } else {
            flashcardToggleBtn.style.display = 'flex';
        }

        // Show study tools bar only when level is selected (main content is active)
        if (currentLevel) {
            studyToolsBar.style.display = 'flex';
        } else {
            studyToolsBar.style.display = 'none';
        }
    }

    function blurKeywords(text) {
        if (!isKeywordBlurActive) return text;
        
        const stopwords = new Set([
            'about', 'there', 'their', 'would', 'could', 'should', 'other', 'these', 'those', 
            'where', 'which', 'after', 'before', 'every', 'first', 'under', 'really', 'always',
            'because', 'through', 'between', 'during', 'without', 'against'
        ]);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        function traverseAndBlur(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const words = node.nodeValue.split(/(\s+)/);
                const blurredWords = words.map(w => {
                    const cleanWord = w.toLowerCase().replace(/[.,!?;:()]/g, "");
                    if (cleanWord.length >= 5 && !stopwords.has(cleanWord) && /[a-z]/i.test(cleanWord)) {
                        return `<span class="blurred-keyword" onclick="event.stopPropagation(); this.classList.toggle('revealed')" title="Bosing va oching">${w}</span>`;
                    }
                    return w;
                });
                const tempSpan = document.createElement('span');
                tempSpan.innerHTML = blurredWords.join('');
                node.parentNode.replaceChild(tempSpan, node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (!node.classList.contains('answer-label') && !node.classList.contains('blurred-keyword')) {
                    Array.from(node.childNodes).forEach(traverseAndBlur);
                }
            }
        }
        
        Array.from(tempDiv.childNodes).forEach(traverseAndBlur);
        return tempDiv.innerHTML;
    }

    const levelSelector = document.getElementById('level-selector');
    const mainContent = document.getElementById('main-content');
    const homeBtn = document.getElementById('home-btn');
    const levelBtns = document.querySelectorAll('.level-card-btn');

    // Mode Switch Logic
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.getAttribute('data-mode');
            localStorage.setItem('currentMode', currentMode);
            
            // Adjust study tools visibility for mode switch
            adjustStudyToolsVisibility();
            
            if (currentMode === 'lessons') {
                cardsWrapper.style.display = 'block';
                partsWrapper.style.display = 'none';
                
                const uniqueCards = [];
                const cardMap = new Map();
                lessonsData.forEach(item => {
                    const lessonName = item["lesson"];
                    if (lessonName && !cardMap.has(lessonName)) {
                        cardMap.set(lessonName, `Lesson ${lessonName}`);
                        uniqueCards.push({ name: lessonName, topic: `Lesson ${lessonName}` });
                    }
                });
                
                if (!cardMap.has(currentCard)) {
                    currentCard = uniqueCards.length > 0 ? uniqueCards[0].name : "1.1";
                    localStorage.setItem('currentCard', currentCard);
                }
                
                renderCardButtons(uniqueCards);
                renderContent(currentCard, currentPart);
            } else if (currentMode === 'writing') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'none';
                renderWritingContent();
            } else {
                cardsWrapper.style.display = 'block';
                partsWrapper.style.display = 'block';
                
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
                
                if (currentCard.match(/^\d+(\.\d+)?$/) || !cardMap.has(currentCard)) {
                    currentCard = uniqueCards.length > 0 ? uniqueCards[0].name : "Card A";
                    localStorage.setItem('currentCard', currentCard);
                }
                
                renderCardButtons(uniqueCards);
                renderContent(currentCard, currentPart);
            }
        });
    });

    // Initialize study tools listeners
    if (flashcardToggleBtn && keywordBlurToggleBtn) {
        flashcardToggleBtn.addEventListener('click', () => {
            isFlashcardModeActive = !isFlashcardModeActive;
            localStorage.setItem('isFlashcardModeActive', isFlashcardModeActive);
            updateStudyToolButtons();
            
            if (currentMode === 'writing') {
                renderWritingContent();
            } else {
                renderContent(currentCard, currentPart);
            }
        });

        keywordBlurToggleBtn.addEventListener('click', () => {
            isKeywordBlurActive = !isKeywordBlurActive;
            localStorage.setItem('isKeywordBlurActive', isKeywordBlurActive);
            updateStudyToolButtons();
            
            if (currentMode === 'writing') {
                renderWritingContent();
            } else {
                renderContent(currentCard, currentPart);
            }
        });
    }

    // Initialize UI with current mode
    cardsWrapper.style.display = currentMode === 'writing' ? 'none' : 'block';
    partsWrapper.style.display = (currentMode === 'speaking') ? 'block' : 'none';
    modeButtons.forEach(b => {
        if (b.getAttribute('data-mode') === currentMode) b.classList.add('active');
        else b.classList.remove('active');
    });
    updateStudyToolButtons();

    // Search Listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (currentMode === 'lessons') {
                renderContent(currentCard, currentPart, query);
            } else if (currentMode === 'writing') {
                renderWritingContent(query);
            } else {
                renderContent(currentCard, currentPart, query);
            }
        });
    }

    // Print PDF Listener
    if (printPdfBtn) {
        printPdfBtn.addEventListener('click', () => {
            if (currentMode === 'lessons') {
                exportToPDF();
            } else if (currentMode === 'writing') {
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

    function initLevelSelection() {
        if (currentLevel) {
            levelSelector.style.display = 'none';
            mainContent.style.display = 'block';
            homeBtn.style.display = 'flex';
            loadData();
        } else {
            levelSelector.style.display = 'flex';
            mainContent.style.display = 'none';
            homeBtn.style.display = 'none';
            progressBar.style.width = '0%';
        }
        adjustStudyToolsVisibility();
    }

    levelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentLevel = btn.getAttribute('data-level');
            localStorage.setItem('selectedLevel', currentLevel);
            initLevelSelection();
        });
    });

    homeBtn.addEventListener('click', () => {
        currentLevel = null;
        localStorage.removeItem('selectedLevel');
        initLevelSelection();
    });

    async function loadData() {
        if (!currentLevel) return;
        
        try {
            contentArea.innerHTML = '<div class="loader">Yuklanmoqda...</div>';
            
            // Ensure currentMode is valid for currentLevel
            if (currentLevel !== 'pre-intermediate' && currentMode === 'lessons') {
                currentMode = 'speaking';
                localStorage.setItem('currentMode', currentMode);
            }

            let speakingFile, writingFile, lessonFile, levelTitle;
            if (currentLevel === 'beginner') {
                speakingFile = 'beginer_speaking.json';
                writingFile = 'beginer_writing.json';
                lessonFile = null;
                levelTitle = 'English Exam (Beginner)';
            } else if (currentLevel === 'elementary') {
                speakingFile = 'elementary_speaking.json';
                writingFile = 'elementary_writing.json';
                lessonFile = null;
                levelTitle = 'English Exam (Elementary)';
            } else if (currentLevel === 'pre-intermediate') {
                speakingFile = 'pre-intermediate_speaking.json';
                writingFile = 'pre-intermediate_writing.json';
                lessonFile = 'pre-intermediate_lesson.json';
                levelTitle = 'English Exam (Pre-Intermediate)';
            }

            document.querySelector('h1').textContent = levelTitle;

            // Reset loaded data
            examData = [];
            writingData = {};
            lessonsData = [];

            // Load speaking/exam data
            if (speakingFile) {
                const resExam = await fetch(`${speakingFile}?v=${new Date().getTime()}`);
                if (!resExam.ok) throw new Error(`${speakingFile} faylni yuklab bo'lmadi`);
                examData = await resExam.json();
            }

            // Load writing data if applicable
            if (writingFile) {
                const resWriting = await fetch(`${writingFile}?v=${new Date().getTime()}`);
                if (!resWriting.ok) throw new Error(`${writingFile} faylni yuklab bo'lmadi`);
                writingData = await resWriting.json();
            }

            // Load lessons data if applicable
            if (lessonFile) {
                const resLesson = await fetch(`${lessonFile}?v=${new Date().getTime()}`);
                if (!resLesson.ok) throw new Error(`${lessonFile} faylni yuklab bo'lmadi`);
                lessonsData = await resLesson.json();
            }
            
            const uniqueCards = [];
            const cardMap = new Map();
            
            if (currentMode === 'lessons') {
                lessonsData.forEach(item => {
                    const lessonName = item["lesson"];
                    if (lessonName && !cardMap.has(lessonName)) {
                        cardMap.set(lessonName, `Lesson ${lessonName}`);
                        uniqueCards.push({ name: lessonName, topic: `Lesson ${lessonName}` });
                    }
                });
                
                // If currentCard is not valid for lessons, reset it
                if (!cardMap.has(currentCard)) {
                    currentCard = uniqueCards.length > 0 ? uniqueCards[0].name : "1.1";
                    localStorage.setItem('currentCard', currentCard);
                }
            } else {
                examData.forEach(item => {
                    const cardName = item["Mavzular"];
                    const topicName = item["Mavzular nomi"];
                    if (cardName && !cardMap.has(cardName)) {
                        cardMap.set(cardName, topicName);
                        uniqueCards.push({ name: cardName, topic: topicName });
                    }
                });
                
                // If currentCard looks like a lesson number, reset it to first card
                if (currentCard.match(/^\d+(\.\d+)?$/) || !cardMap.has(currentCard)) {
                    currentCard = uniqueCards.length > 0 ? uniqueCards[0].name : "Card A";
                    localStorage.setItem('currentCard', currentCard);
                }
            }

            // Hide/show mode navigation and parts wrapper
            const lessonsBtn = document.getElementById('lessons-mode-btn');
            if (currentLevel === 'pre-intermediate') {
                if (lessonsBtn) lessonsBtn.style.display = 'flex';
            } else {
                if (lessonsBtn) lessonsBtn.style.display = 'none';
            }

            if (currentMode === 'lessons') {
                cardsWrapper.style.display = 'block';
                partsWrapper.style.display = 'none';
            } else if (currentMode === 'writing') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'none';
            } else {
                cardsWrapper.style.display = 'block';
                partsWrapper.style.display = 'block';
            }

            // Sync mode buttons active class
            modeButtons.forEach(b => {
                if (b.getAttribute('data-mode') === currentMode) b.classList.add('active');
                else b.classList.remove('active');
            });

            renderCardButtons(uniqueCards);
            updateActivePartButton();
            
            if (currentMode === 'lessons') {
                renderContent(currentCard, currentPart);
            } else if (currentMode === 'writing') {
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
            
            let titleText = card.name;
            let topicText = card.topic;
            if (currentMode === 'lessons') {
                titleText = `Lesson`;
                topicText = card.name;
            }

            btn.innerHTML = `
                <div class="card-btn-content">
                    <span class="card-title">${titleText}</span>
                    <span class="card-topic">${topicText}</span>
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

    function getWordCount(text) {
        return text.trim().split(/\s+/).length;
    }

    function toggleLearned(id) {
        const index = learnedWriting.indexOf(id);
        if (index > -1) {
            learnedWriting.splice(index, 1);
        } else {
            learnedWriting.push(id);
        }
        localStorage.setItem('learnedWriting', JSON.stringify(learnedWriting));
    }

    async function exportWritingToPDF() {
        renderWritingContent(); // Ensure all rendered
        setTimeout(() => {
            window.print();
        }, 500);
    }

    async function exportToPDF() {
        const originalPart = currentPart;
        
        try {
            // Show only the selected part for the current card/lesson to fit in 1 page
            let allCardData;
            if (currentMode === 'lessons') {
                allCardData = lessonsData.filter(item => item["lesson"] === currentCard);
            } else {
                allCardData = examData.filter(item => item["Mavzular"] === currentCard && item["Qism"] === currentPart);
            }
            
            if (!allCardData || allCardData.length === 0) {
                alert("Chop etish uchun ma'lumot topilmadi.");
                return;
            }
 
            // Create a temporary container for printing to avoid flickering if possible, 
            // but for simplicity we'll just render everything to contentArea
            contentArea.innerHTML = '<div class="loader">PDF tayyorlanmoqda...</div>';
            
            let sortedData;
            if (currentMode === 'lessons') {
                sortedData = allCardData;
            } else {
                // Sort by Part then Sovollar number if possible
                sortedData = allCardData.sort((a, b) => {
                    if (a["Qism"] !== b["Qism"]) return a["Qism"].localeCompare(b["Qism"]);
                    return (parseInt(a["Sovollar"]) || 0) - (parseInt(b["Sovollar"]) || 0);
                });
            }
 
            // Let's actually just render ALL content to the contentArea
            renderContentForPrint(sortedData);
            
            // Wait for DOM to update then print
            setTimeout(() => {
                window.print();
                // Restore original view after print dialog closes
                setTimeout(() => {
                    renderContent(currentCard, originalPart);
                }, 100);
            }, 800);
            
        } catch (e) {
            console.error("PDF export error:", e);
            alert("Xatolik yuz berdi: " + e.message);
            renderContent(currentCard, originalPart);
        }
    }
 
    function renderContentForPrint(data) {
        contentArea.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'print-title-container';
        
        if (currentMode === 'lessons') {
            header.innerHTML = `
                <div class="print-card-label">Lesson ${currentCard}</div>
            `;
        } else {
            const partText = data[0]?.["Qism"] || "";
            header.innerHTML = `
                <div class="print-card-label">${currentCard} - ${partText}</div>
            `;
        }
        contentArea.appendChild(header);

        data.forEach((item, index) => {
            if (currentMode === 'lessons') {
                if (!item["Verb + Collocation"]) return;
            } else {
                if (!item["Sovollar"]) return;
            }
            
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';
            
            // Simplified version for print (no buttons)
            let answerHTML = '';
            if (currentMode === 'lessons') {
                const parts = [
                    { label: "Answer", en: item["Answer"], uz: item["Answer translate"] },
                    { label: "Reason", en: item["Reason"], uz: item["Reason translate"] },
                    { label: "Example", en: item["Example"], uz: item["Example translate"] },
                    { label: "Extra Info", en: item["Extra Info"], uz: item["Extra Info translate"] }
                ];
                answerHTML = parts.map(p => {
                    if (!p.en) return '';
                    return `
                        <div class="answer-block">
                            <span class="answer-label">${p.label}:</span>
                            <span class="en-text highlight">${p.en}</span>
                            <span class="uz-text small">(${p.uz || "Tarjima yo'q"})</span>
                        </div>
                    `;
                }).join('');
                
                cardEl.innerHTML = `
                    <div class="question-section">
                        <div class="en-text" style="color: black;">${item["Verb + Collocation"]}</div>
                        <div class="uz-text">(${item["O‘zbekcha tarjima"] || ""})</div>
                    </div>
                    <div class="answer-section">
                        ${answerHTML}
                    </div>
                `;
            } else {
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
            }
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
            const isLearned = learnedWriting.includes(id);
            const wordCount = getWordCount(data.jovob_en);
            
            const cardEl = document.createElement('div');
            cardEl.className = `question-card writing-card ${isLearned ? 'learned' : ''}`;
            
            // Build dynamic prompt content
            const titleHtml = `
                <div class="essay-header-row">
                    <span class="en-text essay-title">${highlightText(data.sovol_en, searchQuery)}</span>
                    <span class="uz-text essay-title-uz">(${highlightText(data.sovol_uz, searchQuery)})</span>
                </div>
            `;

            let extraPromptHtml = '';
            if (data.sovol_en_2) {
                extraPromptHtml += `<ul class="prompt-list">`;
                for (let i = 2; i <= 10; i++) {
                    const enKey = `sovol_en_${i}`;
                    const uzKey = `sovol_uz_${i}`;
                    if (data[enKey]) {
                        extraPromptHtml += `
                            <li class="prompt-item">
                                <span style="font-weight: 600; color: var(--primary);">${highlightText(data[enKey], searchQuery)}</span>
                                <span style="font-size: 0.75rem; opacity: 0.7; margin-left: 5px;">(${highlightText(data[uzKey] || '', searchQuery)})</span>
                            </li>
                        `;
                    } else {
                        break;
                    }
                }
                extraPromptHtml += `</ul>`;
            }

            cardEl.innerHTML = `
                <div class="card-actions">
                    <button class="action-btn learned-btn ${isLearned ? 'active' : ''}" title="Yodlab bo'lingan">✅</button>
                    <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                    <span class="expand-icon">▼</span>
                </div>
                <div class="question-section">
                    ${titleHtml}
                </div>
                <div class="writing-answer-container">
                    <div class="writing-answer-content">
                        ${extraPromptHtml}
                        
                        <div class="model-answers-wrapper">
                            <div class="essay-body-en" style="margin-top: 8px;">${blurKeywords(highlightText(data.jovob_en, searchQuery))}</div>
                            <div class="essay-body-uz">${highlightText(data.jovob_uz, searchQuery)}</div>
                        </div>

                        <div class="essay-footer">
                            <span class="word-count-badge">📝 Model: ${wordCount} so'z</span>
                            <button class="practice-toggle-btn">✍️ Mashq qilish</button>
                        </div>
                        <div class="practice-area" style="display: none;">
                            <div class="practice-controls">
                                <span class="user-word-count">Siz: 0 so'z</span>
                                <button class="toggle-answer-btn">👁️ Javobni ko'rish</button>
                            </div>
                            <textarea placeholder="Inshoni shu yerga yozib mashq qiling..."></textarea>
                            <div class="practice-actions">
                                <button class="check-practice-btn">Tekshirish</button>
                                <span class="practice-feedback"></span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const audioBtn = cardEl.querySelector('.audio-btn');
            const learnedBtn = cardEl.querySelector('.learned-btn');
            const practiceBtn = cardEl.querySelector('.practice-toggle-btn');
            const practiceArea = cardEl.querySelector('.practice-area');
            const checkBtn = cardEl.querySelector('.check-practice-btn');
            const textarea = cardEl.querySelector('textarea');
            const feedback = cardEl.querySelector('.practice-feedback');
            
            // New v4.2 elements
            const modelWrapper = cardEl.querySelector('.model-answers-wrapper');
            const toggleAnswerBtn = cardEl.querySelector('.toggle-answer-btn');
            const userWordCountSpan = cardEl.querySelector('.user-word-count');

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

            learnedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLearned(id);
                learnedBtn.classList.toggle('active');
                cardEl.classList.toggle('learned');
            });

            textarea.addEventListener('click', (e) => e.stopPropagation());
            
            textarea.addEventListener('input', (e) => {
                const count = getWordCount(e.target.value);
                userWordCountSpan.textContent = `Siz: ${count} so'z`;
            });

            toggleAnswerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (modelWrapper.style.display === 'none') {
                    modelWrapper.style.display = 'block';
                    toggleAnswerBtn.textContent = '🙈 Yashirish';
                } else {
                    modelWrapper.style.display = 'none';
                    toggleAnswerBtn.textContent = '👁️ Javobni ko\'rish';
                }
            });

            practiceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = practiceArea.style.display === 'none';
                
                if (isHidden) {
                    // Open Practice Mode
                    practiceArea.style.display = 'block';
                    practiceBtn.textContent = '❌ Yopish';
                    // Hide model answers by default
                    modelWrapper.style.display = 'none';
                    toggleAnswerBtn.textContent = '👁️ Javobni ko\'rish';
                    setTimeout(() => textarea.focus(), 100);
                } else {
                    // Close Practice Mode
                    practiceArea.style.display = 'none';
                    practiceBtn.textContent = '✍️ Mashq qilish';
                    // Show model answers again
                    modelWrapper.style.display = 'block';
                }
            });

            checkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userText = textarea.value.trim();
                const originalText = data.jovob_en.trim();
                
                if (!userText) {
                    feedback.textContent = "Iltimos, oldin biror narsa yozing.";
                    feedback.style.color = "orange";
                    return;
                }

                // Visual Diff Logic
                const userWords = userText.split(/\s+/);
                const originalWords = originalText.split(/\s+/);
                let diffHtml = '<div class="diff-container">';
                let matches = 0;

                const maxLen = Math.max(userWords.length, originalWords.length);
                for (let i = 0; i < maxLen; i++) {
                    const uW = userWords[i] ? userWords[i].toLowerCase().replace(/[.,!?;:]/g, "") : null;
                    const oW = originalWords[i] ? originalWords[i].toLowerCase().replace(/[.,!?;:]/g, "") : null;

                    if (uW === oW && uW !== null) {
                        diffHtml += `<span class="word-correct">${userWords[i]}</span> `;
                        matches++;
                    } else if (uW !== null) {
                        diffHtml += `<span class="word-error">${userWords[i]}</span> `;
                        if (oW !== null) {
                            diffHtml += `<span class="word-missing">(${originalWords[i]})</span> `;
                        }
                    } else if (oW !== null) {
                        diffHtml += `<span class="word-missing">(${originalWords[i]})</span> `;
                    }
                }
                diffHtml += '</div>';

                const accuracy = Math.round((matches / originalWords.length) * 100);
                feedback.innerHTML = `Aniqlik: ${accuracy}%<br>${diffHtml}`;
                feedback.style.color = accuracy > 70 ? "#10b981" : "#f43f5e";
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
        if (currentMode === 'lessons') {
            if (searchQuery) {
                // Global search for lessons
                filtered = lessonsData.filter(item => {
                    const phraseEn = (item["Verb + Collocation"] || "").toLowerCase();
                    const phraseUz = (item["O‘zbekcha tarjima"] || "").toLowerCase();
                    const answer = (item["Answer"] || "").toLowerCase();
                    const answerTr = (item["Answer translate"] || "").toLowerCase();
                    const reason = (item["Reason"] || "").toLowerCase();
                    const reasonTr = (item["Reason translate"] || "").toLowerCase();
                    const example = (item["Example"] || "").toLowerCase();
                    const exampleTr = (item["Example translate"] || "").toLowerCase();
                    const extraInfo = (item["Extra Info"] || "").toLowerCase();
                    const extraInfoTr = (item["Extra Info translate"] || "").toLowerCase();
                    const query = searchQuery.toLowerCase();
                    return phraseEn.includes(query) || phraseUz.includes(query) || 
                           answer.includes(query) || answerTr.includes(query) ||
                           reason.includes(query) || reasonTr.includes(query) || 
                           example.includes(query) || exampleTr.includes(query) ||
                           extraInfo.includes(query) || extraInfoTr.includes(query);
                });
            } else {
                // Filter by lesson
                filtered = lessonsData.filter(item => 
                    item["lesson"] === card
                );
            }
        } else {
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
        }

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">${searchQuery ? 'Qidiruv bo\'yicha natija topilmadi.' : 'Ma\'lumotlar topilmadi.'}</div>`;
            return;
        }

        updateProgress(100, 100);

        let targetContainer = contentArea;
        if (isFlashcardModeActive) {
            const container = document.createElement('div');
            container.className = 'flashcards-container';
            contentArea.appendChild(container);
            targetContainer = container;
        }

        filtered.forEach((item, index) => {
            if (currentMode === 'lessons') {
                if (!item["Verb + Collocation"]) return;
            } else {
                if (!item["Sovollar"]) return;
            }
            
            // Unique ID including card and part for global search results
            const questionId = currentMode === 'lessons'
                ? `pre-int-lesson-${item["lesson"]}-${index}`
                : `${item["Mavzular"]}-${item["Qism"]}-${index}`;
            
            const cardEl = document.createElement('div');
            cardEl.id = `card-${questionId}`;
            
            if (isFlashcardModeActive) {
                cardEl.className = 'question-card flashcard';
                if (flashcardRatings[questionId]) {
                    if (flashcardRatings[questionId] === 'know') {
                        cardEl.style.border = '2px solid #10b981';
                    } else {
                        cardEl.style.border = '2px solid #f43f5e';
                    }
                }
            } else {
                cardEl.className = 'question-card';
            }

            const isFav = favorites.includes(questionId);
            
            let answerHTML = '';
            let textToSpeak = '';
            let headingEn = '';
            let headingUz = '';

            if (currentMode === 'lessons') {
                headingEn = item["Verb + Collocation"] || '';
                headingUz = item["O‘zbekcha tarjima"] || '';

                const parts = [
                    { label: "Answer", en: item["Answer"], uz: item["Answer translate"] },
                    { label: "Reason", en: item["Reason"], uz: item["Reason translate"] },
                    { label: "Example", en: item["Example"], uz: item["Example translate"] },
                    { label: "Extra Info", en: item["Extra Info"], uz: item["Extra Info translate"] }
                ];
                textToSpeak = parts.map(p => p.en).filter(Boolean).join('. ');
                answerHTML = parts.map(p => {
                    if (!p.en) return '';
                    const highlightedEn = highlightText(p.en, searchQuery);
                    const blurredEn = isKeywordBlurActive ? blurKeywords(highlightedEn) : highlightedEn;
                    return `
                        <div class="answer-block">
                            <span class="answer-label">${p.label}:</span>
                            <span class="en-text highlight">${blurredEn}</span>
                            <span class="uz-text small">(${highlightText(p.uz || "Tarjima yo'q", searchQuery)})</span>
                        </div>
                    `;
                }).join('');
            } else if (item["FullAnswer_EN"]) {
                headingEn = item["Sovollar"] || '';
                headingUz = item["Sovollar (UZ)"] || '';

                const parts = [
                    { label: "Answer", en: item["FullAnswer_EN"], uz: item["FullAnswer_UZ"] },
                    { label: "Reason", en: item["Reason_EN"], uz: item["Reason_UZ"] },
                    { label: "Example", en: item["Example_EN"], uz: item["Example_UZ"] },
                    { label: "Extra Info", en: item["ExtraInfo_EN"], uz: item["ExtraInfo_UZ"] }
                ];
                textToSpeak = parts.map(p => p.en).filter(Boolean).join('. ');
                answerHTML = parts.map(p => {
                    if (!p.en) return '';
                    const highlightedEn = highlightText(p.en, searchQuery);
                    const blurredEn = isKeywordBlurActive ? blurKeywords(highlightedEn) : highlightedEn;
                    return `
                        <div class="answer-block">
                            <span class="answer-label">${p.label}:</span>
                            <span class="en-text highlight">${blurredEn}</span>
                            <span class="uz-text small">(${highlightText(p.uz, searchQuery)})</span>
                        </div>
                    `;
                }).join('');
            } else {
                headingEn = item["Sovollar"] || '';
                headingUz = item["Sovollar (UZ)"] || '';

                const cleanAnswerEN = item["Jovoblar (EN)"] ? item["Jovoblar (EN)"].replace(/\n/g, '<br>') : "No answer";
                const cleanAnswerUZ = item["Jovoblar (UZ)"] ? item["Jovoblar (UZ)"].replace(/\n/g, '<br>') : "Javob yo'q";
                textToSpeak = item["Jovoblar (EN)"] || "";
                const highlightedEn = highlightText(cleanAnswerEN, searchQuery);
                const blurredEn = isKeywordBlurActive ? blurKeywords(highlightedEn) : highlightedEn;
                answerHTML = `
                    <div class="answer-content">
                        <span class="en-text" style="color: var(--primary); font-weight: 600;">${blurredEn}</span>
                        <span class="uz-text" style="display: block; margin-top: 5px;">(${highlightText(cleanAnswerUZ, searchQuery)})</span>
                    </div>
                `;
            }

            if (isFlashcardModeActive) {
                cardEl.innerHTML = `
                    <div class="flashcard-inner">
                        <div class="flashcard-front">
                            <div class="question-section" style="border: none; padding: 0;">
                                <span class="en-text" style="${currentMode === 'lessons' ? 'color: var(--secondary); font-size: 1.1rem;' : 'font-size: 1.1rem;'}">${highlightText(headingEn, searchQuery)}</span>
                                <span class="uz-text" style="display: block; margin-top: 8px;">(${highlightText(headingUz || "Tarjima yo'q", searchQuery)})</span>
                            </div>
                            <div class="flashcard-prompt">Bosing va aylantiring / Tap to flip</div>
                        </div>
                        <div class="flashcard-back">
                            <div class="card-actions" style="margin-top: 0; margin-bottom: 10px;">
                                <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                                <button class="action-btn mic-btn" title="Ovozli javob mashqi">🎤</button>
                                <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                            </div>
                            <div class="question-section" style="margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; width: 100%;">
                                <span class="en-text" style="${currentMode === 'lessons' ? 'color: var(--secondary); font-size: 0.95rem;' : 'font-size: 0.95rem;'}">${highlightText(headingEn, searchQuery)}</span>
                            </div>
                            <div class="answer-section" style="flex-grow: 1;">
                                ${answerHTML}
                            </div>
                            <div class="speech-practice-container" style="display: none; padding: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;"></div>
                            <div class="flashcard-actions">
                                <button class="flashcard-rate-btn know">Bilaman ✅</button>
                                <button class="flashcard-rate-btn dontknow">Bilmayman ❌</button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                if (currentMode === 'lessons') {
                    const sourceHTML = searchQuery ? `<div class="search-result-source">Lesson ${item["lesson"]}</div>` : '';

                    cardEl.innerHTML = `
                        ${sourceHTML}
                        <div class="card-actions">
                            <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                            <button class="action-btn mic-btn" title="Ovozli javob mashqi">🎤</button>
                            <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                        </div>
                        <div class="question-section">
                            <span class="en-text" style="color: var(--secondary); font-size: 1rem;">${highlightText(headingEn, searchQuery)}</span>
                            <span class="uz-text">(${highlightText(headingUz || "Tarjima yo'q", searchQuery)})</span>
                        </div>
                        <div class="answer-section">
                            ${answerHTML}
                        </div>
                        <div class="speech-practice-container" style="display: none; padding: 10px; border-top: 1px solid rgba(255,255,255,0.05);"></div>
                    `;
                } else {
                    const sourceHTML = searchQuery ? `<div class="search-result-source">${item["Mavzular"]} | ${item["Mavzular nomi"]}</div>` : '';

                    cardEl.innerHTML = `
                        ${sourceHTML}
                        <div class="card-actions">
                            <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                            <button class="action-btn mic-btn" title="Ovozli javob mashqi">🎤</button>
                            <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                        </div>
                        <div class="question-section">
                            <span class="en-text">${highlightText(headingEn, searchQuery)}</span>
                            <span class="uz-text">(${highlightText(headingUz || "Tarjima yo'q", searchQuery)})</span>
                        </div>
                        <div class="answer-section">
                            ${answerHTML}
                        </div>
                        <div class="speech-practice-container" style="display: none; padding: 10px; border-top: 1px solid rgba(255,255,255,0.05);"></div>
                    `;
                }
            }

            if (isFlashcardModeActive) {
                cardEl.addEventListener('click', (e) => {
                    if (e.target.closest('button, input, textarea, select, .speech-practice-area, .blurred-keyword')) {
                        return;
                    }
                    cardEl.classList.toggle('flipped');
                });
                
                const knowBtn = cardEl.querySelector('.flashcard-rate-btn.know');
                const dontknowBtn = cardEl.querySelector('.flashcard-rate-btn.dontknow');
                
                knowBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    flashcardRatings[questionId] = 'know';
                    localStorage.setItem('flashcardRatings', JSON.stringify(flashcardRatings));
                    cardEl.style.border = '2px solid #10b981';
                });
                
                dontknowBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    flashcardRatings[questionId] = 'dontknow';
                    localStorage.setItem('flashcardRatings', JSON.stringify(flashcardRatings));
                    cardEl.style.border = '2px solid #f43f5e';
                });
            }

            const audioBtn = cardEl.querySelector('.audio-btn');
            const favBtn = cardEl.querySelector('.fav-btn');
            const micBtn = cardEl.querySelector('.mic-btn');
            let speechArea = null;

            audioBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                speak(headingEn);
                setTimeout(() => speak(textToSpeak), 1500);
            });

            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(questionId);
                favBtn.classList.toggle('active');
            });

            micBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const container = cardEl.querySelector('.speech-practice-container');
                if (!container) return;

                if (!speechArea) {
                    speechArea = document.createElement('div');
                    speechArea.className = 'speech-practice-area';
                    speechArea.innerHTML = `
                        <div class="speech-practice-controls">
                            <button class="start-record-btn">🎙️ Gapirishni boshlash</button>
                            <span class="recording-status">Tayyor</span>
                        </div>
                        <div class="speech-transcript-box">
                            <span style="opacity: 0.5; font-style: italic;">Gapirgan gaplaringiz bu yerda chiqadi...</span>
                        </div>
                        <div class="speech-practice-actions">
                            <button class="check-speech-btn" style="display: none;">Tekshirish</button>
                            <span class="speech-feedback"></span>
                        </div>
                    `;

                    const startRecordBtn = speechArea.querySelector('.start-record-btn');
                    const recordingStatus = speechArea.querySelector('.recording-status');
                    const transcriptBox = speechArea.querySelector('.speech-transcript-box');
                    const checkSpeechBtn = speechArea.querySelector('.check-speech-btn');
                    const speechFeedback = speechArea.querySelector('.speech-feedback');

                    let recognition = null;
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    let isRecording = false;
                    let finalTranscript = '';

                    if (SpeechRecognition) {
                        recognition = new SpeechRecognition();
                        recognition.continuous = true;
                        recognition.interimResults = true;
                        recognition.lang = 'en-US';

                        recognition.onstart = () => {
                            isRecording = true;
                            startRecordBtn.classList.add('recording');
                            startRecordBtn.innerHTML = '🛑 To\'xtatish';
                            recordingStatus.textContent = 'Eshitilmoqda...';
                            finalTranscript = '';
                            transcriptBox.innerHTML = '<span style="opacity: 0.5; font-style: italic;">Gapiring...</span>';
                            checkSpeechBtn.style.display = 'none';
                            speechFeedback.innerHTML = '';
                        };

                        recognition.onresult = (event) => {
                            let interimTranscript = '';
                            for (let i = event.resultIndex; i < event.results.length; ++i) {
                                if (event.results[i].isFinal) {
                                    finalTranscript += event.results[i][0].transcript;
                                } else {
                                    interimTranscript += event.results[i][0].transcript;
                                }
                            }
                            const liveText = finalTranscript + interimTranscript;
                            transcriptBox.textContent = liveText || "Gapiring...";
                        };

                        recognition.onerror = (event) => {
                            console.error("Speech recognition error", event.error);
                            recordingStatus.textContent = `Xatolik: ${event.error}`;
                            stopRecording();
                        };

                        recognition.onend = () => {
                            isRecording = false;
                            startRecordBtn.classList.remove('recording');
                            startRecordBtn.innerHTML = '🎙️ Gapirishni boshlash';
                            recordingStatus.textContent = 'Yozib olindi';
                            
                            const text = transcriptBox.textContent.trim();
                            if (text && text !== "Gapiring..." && text !== "Gapirgan gaplaringiz bu yerda chiqadi...") {
                                checkSpeechBtn.style.display = 'inline-block';
                            }
                            
                            if (activeSpeechRecognition === recognition) {
                                activeSpeechRecognition = null;
                                activeSpeechBtn = null;
                            }
                        };
                    }

                    function startRecording() {
                        if (!recognition) {
                            alert("Sizning brauzeringiz ovozli yozishni qo'llab-quvvatlamaydi. Iltimos Chrome yoki Edge dan foydalaning.");
                            return;
                        }
                        
                        if (activeSpeechRecognition && activeSpeechRecognition !== recognition) {
                            try {
                                activeSpeechRecognition.stop();
                            } catch(e) {}
                        }

                        try {
                            recognition.start();
                            activeSpeechRecognition = recognition;
                            activeSpeechBtn = startRecordBtn;
                        } catch(err) {
                            console.error(err);
                        }
                    }

                    function stopRecording() {
                        if (recognition) {
                            try {
                                recognition.stop();
                            } catch(e) {}
                        }
                    }

                    startRecordBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        if (isRecording) {
                            stopRecording();
                        } else {
                            startRecording();
                        }
                    });

                    checkSpeechBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const userText = transcriptBox.textContent.trim();
                        const originalText = textToSpeak.trim();
                        
                        if (!userText || userText === "Gapiring...") {
                            speechFeedback.textContent = "Matn aniqlanmadi.";
                            speechFeedback.style.color = "orange";
                            return;
                        }

                        const userWords = userText.split(/\s+/);
                        const originalWords = originalText.split(/\s+/);
                        let diffHtml = '<div class="speech-diff-result">';
                        let matches = 0;

                        const maxLen = Math.max(userWords.length, originalWords.length);
                        for (let i = 0; i < maxLen; i++) {
                            const uW = userWords[i] ? userWords[i].toLowerCase().replace(/[.,!?;:]/g, "") : null;
                            const oW = originalWords[i] ? originalWords[i].toLowerCase().replace(/[.,!?;:]/g, "") : null;

                            if (uW === oW && uW !== null) {
                                diffHtml += `<span class="word-correct" style="color: #10b981; font-weight: 700;">${userWords[i]}</span> `;
                                matches++;
                            } else if (uW !== null) {
                                diffHtml += `<span class="word-error" style="color: #f43f5e; text-decoration: line-through;">${userWords[i]}</span> `;
                                if (oW !== null) {
                                    diffHtml += `<span class="word-missing" style="color: var(--text-second); opacity: 0.8;">(${originalWords[i]})</span> `;
                                }
                            } else if (oW !== null) {
                                diffHtml += `<span class="word-missing" style="color: var(--text-second); opacity: 0.8;">(${originalWords[i]})</span> `;
                            }
                        }
                        diffHtml += '</div>';

                        const accuracy = Math.round((matches / originalWords.length) * 100);
                        speechFeedback.innerHTML = `Aniqlik: ${accuracy}%<br>${diffHtml}`;
                        speechFeedback.style.color = accuracy > 70 ? "#10b981" : "#f43f5e";
                    });

                    container.appendChild(speechArea);
                    container.style.display = 'block';
                } else {
                    if (container.style.display === 'none') {
                        container.style.display = 'block';
                    } else {
                        container.style.display = 'none';
                        if (activeSpeechBtn && activeSpeechBtn.classList.contains('recording')) {
                            activeSpeechBtn.click();
                        }
                    }
                }
            });

            targetContainer.appendChild(cardEl);
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

    initLevelSelection();
});
