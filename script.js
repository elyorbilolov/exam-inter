document.addEventListener('DOMContentLoaded', () => {
    console.log("--- VERSION 4.3: PRE-INTERMEDIATE INTEGRATION ---");
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
    let currentLevel = localStorage.getItem('selectedLevel') || null;
    let currentMode = localStorage.getItem('currentMode') || 'speaking';
    let currentCard = localStorage.getItem('currentCard') || "Card A";
    let currentPart = localStorage.getItem('currentPart') || "Part 1";
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let learnedWriting = JSON.parse(localStorage.getItem('learnedWriting')) || [];
    let theme = localStorage.getItem('theme') || 'light';

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
            if (currentLevel === 'pre-intermediate') {
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
            if (currentLevel === 'pre-intermediate') {
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
            
            let examFile, writingFile, levelTitle;
            if (currentLevel === 'beginner') {
                examFile = 'exam.json';
                writingFile = 'writing.json';
                levelTitle = 'English Exam (Beginner)';
            } else if (currentLevel === 'elementary') {
                examFile = 'exam_elementary.json';
                writingFile = 'writing_elementary.json';
                levelTitle = 'English Exam (Elementary)';
            } else if (currentLevel === 'pre-intermediate') {
                examFile = 'pre-intermediate_lesson.json';
                writingFile = null;
                levelTitle = 'English Exam (Pre-Intermediate)';
            }

            document.querySelector('h1').textContent = levelTitle;

            // Load speaking/lesson data
            const resExam = await fetch(`${examFile}?v=${new Date().getTime()}`);
            if (!resExam.ok) throw new Error(`${examFile} faylni yuklab bo'lmadi`);
            examData = await resExam.json();

            // Load writing data if applicable
            if (writingFile) {
                const resWriting = await fetch(`${writingFile}?v=${new Date().getTime()}`);
                if (!resWriting.ok) throw new Error(`${writingFile} faylni yuklab bo'lmadi`);
                writingData = await resWriting.json();
            } else {
                writingData = {};
            }
            
            const uniqueCards = [];
            const cardMap = new Map();
            
            if (currentLevel === 'pre-intermediate') {
                examData.forEach(item => {
                    const lessonName = item["lesson"];
                    if (lessonName && !cardMap.has(lessonName)) {
                        cardMap.set(lessonName, `Lesson ${lessonName}`);
                        uniqueCards.push({ name: lessonName, topic: `Lesson ${lessonName}` });
                    }
                });
                
                // If currentCard is not valid for pre-intermediate, reset it to first lesson
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

            // Hide/show mode navigation and parts wrapper for pre-intermediate
            if (currentLevel === 'pre-intermediate') {
                const modeNav = document.querySelector('.main-mode-nav');
                if (modeNav) modeNav.style.display = 'none';
                partsWrapper.style.display = 'none';
            } else {
                const modeNav = document.querySelector('.main-mode-nav');
                if (modeNav) modeNav.style.display = 'flex';
                if (currentMode === 'speaking') {
                    partsWrapper.style.display = 'block';
                } else {
                    partsWrapper.style.display = 'none';
                }
            }

            renderCardButtons(uniqueCards);
            updateActivePartButton();
            
            if (currentLevel === 'pre-intermediate') {
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
            if (currentLevel === 'pre-intermediate') {
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
            // Show all parts for the current card/lesson
            let allCardData;
            if (currentLevel === 'pre-intermediate') {
                allCardData = examData.filter(item => item["lesson"] === currentCard);
            } else {
                allCardData = examData.filter(item => item["Mavzular"] === currentCard);
            }
            
            if (!allCardData || allCardData.length === 0) {
                alert("Chop etish uchun ma'lumot topilmadi.");
                return;
            }

            // Create a temporary container for printing to avoid flickering if possible, 
            // but for simplicity we'll just render everything to contentArea
            contentArea.innerHTML = '<div class="loader">PDF tayyorlanmoqda...</div>';
            
            let sortedData;
            if (currentLevel === 'pre-intermediate') {
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
        
        if (currentLevel === 'pre-intermediate') {
            header.innerHTML = `
                <div class="print-card-label">Pre-Intermediate</div>
                <div class="print-topic-label">Lesson ${currentCard}</div>
            `;
        } else {
            header.innerHTML = `
                <div class="print-card-label">${currentCard}</div>
                <div class="print-topic-label">${data[0]?.["Mavzular nomi"] || ""}</div>
            `;
        }
        contentArea.appendChild(header);

        data.forEach((item, index) => {
            if (currentLevel === 'pre-intermediate') {
                if (!item["Verb + Collocation"]) return;
            } else {
                if (!item["Sovollar"]) return;
            }
            
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';
            
            // Simplified version for print (no buttons)
            let answerHTML = '';
            if (currentLevel === 'pre-intermediate') {
                const parts = [
                    { label: "Answer", en: item["Answer"] },
                    { label: "Reason", en: item["Reason"] },
                    { label: "Example", en: item["Example"] },
                    { label: "Extra Info", en: item["Extra Info"] },
                    { label: "Translation (UZ)", uz: item["Tarjima"] }
                ];
                answerHTML = parts.map(p => {
                    if (p.en) {
                        return `
                            <div class="answer-block">
                                <span class="answer-label">${p.label}:</span>
                                <span class="en-text highlight">${p.en}</span>
                            </div>
                        `;
                    } else if (p.uz) {
                        return `
                            <div class="answer-block">
                                <span class="answer-label">${p.label}:</span>
                                <span class="uz-text small" style="margin-left: 0;">(${p.uz})</span>
                            </div>
                        `;
                    }
                    return '';
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
                            <div class="essay-body-en" style="margin-top: 8px;">${highlightText(data.jovob_en, searchQuery)}</div>
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
        if (currentLevel === 'pre-intermediate') {
            if (searchQuery) {
                // Global search for pre-intermediate
                filtered = examData.filter(item => {
                    const phraseEn = (item["Verb + Collocation"] || "").toLowerCase();
                    const phraseUz = (item["O‘zbekcha tarjima"] || "").toLowerCase();
                    const answer = (item["Answer"] || "").toLowerCase();
                    const reason = (item["Reason"] || "").toLowerCase();
                    const example = (item["Example"] || "").toLowerCase();
                    const extraInfo = (item["Extra Info"] || "").toLowerCase();
                    const translation = (item["Tarjima"] || "").toLowerCase();
                    const query = searchQuery.toLowerCase();
                    return phraseEn.includes(query) || phraseUz.includes(query) || 
                           answer.includes(query) || reason.includes(query) || 
                           example.includes(query) || extraInfo.includes(query) || 
                           translation.includes(query);
                });
            } else {
                // Filter by lesson
                filtered = examData.filter(item => 
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

        filtered.forEach((item, index) => {
            if (currentLevel === 'pre-intermediate') {
                if (!item["Verb + Collocation"]) return;
            } else {
                if (!item["Sovollar"]) return;
            }
            
            // Unique ID including card and part for global search results
            const questionId = currentLevel === 'pre-intermediate'
                ? `pre-int-${item["lesson"]}-${index}`
                : `${item["Mavzular"]}-${item["Qism"]}-${index}`;
            const cardEl = document.createElement('div');
            cardEl.className = 'question-card';

            const isFav = favorites.includes(questionId);
            
            let answerHTML = '';
            let textToSpeak = '';

            if (currentLevel === 'pre-intermediate') {
                const parts = [
                    { label: "Answer", en: item["Answer"] },
                    { label: "Reason", en: item["Reason"] },
                    { label: "Example", en: item["Example"] },
                    { label: "Extra Info", en: item["Extra Info"] },
                    { label: "Translation (UZ)", uz: item["Tarjima"] }
                ];
                textToSpeak = parts.map(p => p.en).filter(Boolean).join('. ');
                answerHTML = parts.map(p => {
                    if (p.en) {
                        return `
                            <div class="answer-block">
                                <span class="answer-label">${p.label}:</span>
                                <span class="en-text highlight">${highlightText(p.en, searchQuery)}</span>
                            </div>
                        `;
                    } else if (p.uz) {
                        return `
                            <div class="answer-block">
                                <span class="answer-label">${p.label}:</span>
                                <span class="uz-text small" style="margin-left: 0;">(${highlightText(p.uz, searchQuery)})</span>
                            </div>
                        `;
                    }
                    return '';
                }).join('');
            } else if (item["FullAnswer_EN"]) {
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

            if (currentLevel === 'pre-intermediate') {
                const sourceHTML = searchQuery ? `<div class="search-result-source">Lesson ${item["lesson"]}</div>` : '';
                const headingEn = item["Verb + Collocation"];
                const headingUz = item["O‘zbekcha tarjima"];

                cardEl.innerHTML = `
                    ${sourceHTML}
                    <div class="card-actions">
                        <button class="action-btn audio-btn" title="Eshitish">🔊</button>
                        <button class="action-btn fav-btn ${isFav ? 'active' : ''}" title="Saralangan">⭐</button>
                    </div>
                    <div class="question-section">
                        <span class="en-text" style="color: var(--secondary); font-size: 1rem;">${highlightText(headingEn, searchQuery)}</span>
                        <span class="uz-text">(${highlightText(headingUz || "Tarjima yo'q", searchQuery)})</span>
                    </div>
                    <div class="answer-section">
                        ${answerHTML}
                    </div>
                `;
            } else {
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
            }

            const audioBtn = cardEl.querySelector('.audio-btn');
            const favBtn = cardEl.querySelector('.fav-btn');

            audioBtn.addEventListener('click', () => {
                if (currentLevel === 'pre-intermediate') {
                    speak(item["Verb + Collocation"]);
                } else {
                    speak(item["Sovollar"]);
                }
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

    initLevelSelection();
});
