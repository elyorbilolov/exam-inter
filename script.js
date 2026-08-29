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
    let readingData = [];
    let readingAnswers = JSON.parse(localStorage.getItem('readingAnswers')) || {};
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
        
        // Hide flashcards in writing, reading and listening modes
        if (currentMode === 'writing' || currentMode === 'reading' || currentMode === 'listening') {
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
        
        return text.replace(/\b[a-zA-Z]{4,}\b/g, (match) => {
            if (stopwords.has(match.toLowerCase())) return match;
            return `<span class="blurred-keyword" title="Bosing: ko'rish/yashirish" onclick="this.classList.toggle('revealed')">${match}</span>`;
        });
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
            } else if (currentMode === 'reading') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'block';
                updateActivePartButton();
                renderReadingContent('reading');
            } else if (currentMode === 'listening') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'block';
                updateActivePartButton();
                renderReadingContent('listening');
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
            } else if (currentMode === 'reading') {
                renderReadingContent('reading');
            } else if (currentMode === 'listening') {
                renderReadingContent('listening');
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
            } else if (currentMode === 'reading') {
                renderReadingContent('reading');
            } else if (currentMode === 'listening') {
                renderReadingContent('listening');
            } else {
                renderContent(currentCard, currentPart);
            }
        });
    }

    // Initialize UI with current mode
    cardsWrapper.style.display = (currentMode === 'writing' || currentMode === 'reading' || currentMode === 'listening') ? 'none' : 'block';
    partsWrapper.style.display = (currentMode === 'writing' || currentMode === 'lessons') ? 'none' : 'block';
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
            } else if (currentMode === 'reading') {
                renderReadingContent('reading', query);
            } else if (currentMode === 'listening') {
                renderReadingContent('listening', query);
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
            } else if (currentMode === 'reading' || currentMode === 'listening') {
                window.print();
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
            if (currentLevel !== 'intermediate' && currentMode === 'reading') {
                currentMode = 'speaking';
                localStorage.setItem('currentMode', currentMode);
            }

            let speakingFile, writingFile, lessonFile, readingFile, levelTitle;
            if (currentLevel === 'beginner') {
                speakingFile = 'beginer_speaking.json';
                writingFile = 'beginer_writing.json';
                lessonFile = null;
                readingFile = null;
                levelTitle = 'English Exam (Beginner)';
            } else if (currentLevel === 'elementary') {
                speakingFile = 'elementary_speaking.json';
                writingFile = 'elementary_writing.json';
                lessonFile = null;
                readingFile = null;
                levelTitle = 'English Exam (Elementary)';
            } else if (currentLevel === 'pre-intermediate') {
                speakingFile = 'pre-intermediate_speaking.json';
                writingFile = 'pre-intermediate_writing.json';
                lessonFile = 'pre-intermediate_lesson.json';
                readingFile = null;
                levelTitle = 'English Exam (Pre-Intermediate)';
            } else if (currentLevel === 'intermediate') {
                speakingFile = 'intermediate_speaking.json';
                writingFile = 'intermediate_writing.json';
                lessonFile = null;
                readingFile = 'intermediate_reading.json';
                levelTitle = 'English Exam (Intermediate)';
            }

            document.querySelector('h1').textContent = levelTitle;

            // Reset loaded data
            examData = [];
            writingData = {};
            lessonsData = [];
            readingData = [];

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

            // Load reading & listening data if applicable
            if (readingFile) {
                const resReading = await fetch(`${readingFile}?v=${new Date().getTime()}`);
                if (!resReading.ok) throw new Error(`${readingFile} faylni yuklab bo'lmadi`);
                readingData = await resReading.json();
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
                
                // If currentCard is not directly in map but stripped version is (e.g. Card A -> A)
                if (!cardMap.has(currentCard)) {
                    const stripped = currentCard.replace('Card ', '').trim();
                    if (cardMap.has(stripped)) {
                        currentCard = stripped;
                        localStorage.setItem('currentCard', currentCard);
                    }
                }
                
                // If currentCard looks like a lesson number, reset it to first card
                if (currentCard.match(/^\d+(\.\d+)?$/) || !cardMap.has(currentCard)) {
                    currentCard = uniqueCards.length > 0 ? uniqueCards[0].name : "Card A";
                    localStorage.setItem('currentCard', currentCard);
                }
            }

            // Hide/show mode navigation and parts wrapper
            const lessonsBtn = document.getElementById('lessons-mode-btn');
            const readingBtn = document.getElementById('reading-mode-btn');
            const listeningBtn = document.getElementById('listening-mode-btn');

            if (currentLevel === 'pre-intermediate') {
                if (lessonsBtn) lessonsBtn.style.display = 'flex';
            } else {
                if (lessonsBtn) lessonsBtn.style.display = 'none';
            }

            if (currentLevel === 'intermediate') {
                if (readingBtn) readingBtn.style.display = 'flex';
                if (listeningBtn) listeningBtn.style.display = 'flex';
            } else {
                if (readingBtn) readingBtn.style.display = 'none';
                if (listeningBtn) listeningBtn.style.display = 'none';
            }

            if (currentMode === 'lessons') {
                cardsWrapper.style.display = 'block';
                partsWrapper.style.display = 'none';
            } else if (currentMode === 'writing') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'none';
            } else if (currentMode === 'reading' || currentMode === 'listening') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'block';
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
            } else if (currentMode === 'reading') {
                renderReadingContent('reading');
            } else if (currentMode === 'listening') {
                renderReadingContent('listening');
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
            if (titleText.includes('/')) {
                titleText = titleText.split('/')[0].trim();
            }
            titleText = titleText.replace('Card ', '').trim();
            
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
        if (!text) return '';
        let processed = String(text).replace(/\\n/g, '\n');

        // Rich text tags:
        // [red]...[/red], <red>...</red>, [r]...[/r], <r>...</r> -> Red
        processed = processed.replace(/\[red\](.*?)\[\/red\]/gi, '<span class="text-red">$1</span>');
        processed = processed.replace(/<red>(.*?)<\/red>/gi, '<span class="text-red">$1</span>');
        processed = processed.replace(/\[r\](.*?)\[\/r\]/gi, '<span class="text-red">$1</span>');
        processed = processed.replace(/<r>(.*?)<\/r>/gi, '<span class="text-red">$1</span>');

        // [blue]...[/blue], [green]...[/green], [yellow]...[/yellow], [orange]...[/orange]
        processed = processed.replace(/\[blue\](.*?)\[\/blue\]/gi, '<span class="text-blue">$1</span>');
        processed = processed.replace(/<blue>(.*?)<\/blue>/gi, '<span class="text-blue">$1</span>');
        processed = processed.replace(/\[green\](.*?)\[\/green\]/gi, '<span class="text-green">$1</span>');
        processed = processed.replace(/<green>(.*?)<\/green>/gi, '<span class="text-green">$1</span>');
        processed = processed.replace(/\[yellow\](.*?)\[\/yellow\]/gi, '<span class="text-yellow">$1</span>');
        processed = processed.replace(/<yellow>(.*?)<\/yellow>/gi, '<span class="text-yellow">$1</span>');
        processed = processed.replace(/\[orange\](.*?)\[\/orange\]/gi, '<span class="text-orange">$1</span>');
        processed = processed.replace(/<orange>(.*?)<\/orange>/gi, '<span class="text-orange">$1</span>');

        // **bold**
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Search query highlight
        if (query) {
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?<!<[^>]*>)(${escaped})`, 'gi');
            processed = processed.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
        return processed;
    }

    function getWordCount(text) {
        return text.trim().split(/\s+/).length;
    }

    function getTopicIcon(text) {
        if (!text) return '📝';
        const lower = text.toLowerCase();
        
        // Exercise, Sport, Health & Sleep
        if (lower.includes('exercise') || lower.includes('health') || lower.includes('sport') || lower.includes('diet') || lower.includes('sleep') || lower.includes('gym') || lower.includes('fit')) return '🏃‍♂️';
        
        // Social Media & Internet
        if (lower.includes('social media') || lower.includes('internet') || lower.includes('online') || lower.includes('telegram') || lower.includes('instagram') || lower.includes('facebook') || lower.includes('network')) return '📱';
        
        // Countryside & Nature
        if (lower.includes('countryside') || lower.includes('nature') || lower.includes('village') || lower.includes('plant') || lower.includes('animal') || lower.includes('environment') || lower.includes('rural')) return '🏡';
        
        // Hobby, Music & Art
        if (lower.includes('hobby') || lower.includes('music') || lower.includes('art') || lower.includes('photo') || lower.includes('instrument') || lower.includes('guitar') || lower.includes('drawing')) return '🎨';
        
        // Advertising & Shopping
        if (lower.includes('advertising') || lower.includes('advertisement') || lower.includes('shopping') || lower.includes('buy') || lower.includes('consumer') || lower.includes('market') || lower.includes('product')) return '📢';
        
        // Competition & Motivation
        if (lower.includes('competition') || lower.includes('compete') || lower.includes('motivat') || lower.includes('challenge') || lower.includes('goal') || lower.includes('ambition')) return '🏆';
        
        // Computer Skills & Work & Job
        if (lower.includes('computer') || lower.includes('job') || lower.includes('career') || lower.includes('work') || lower.includes('profession') || lower.includes('employ') || lower.includes('office')) return '💻';
        
        // Films & Video Games
        if (lower.includes('video game') || lower.includes('game') || lower.includes('film') || lower.includes('movie') || lower.includes('cinema') || lower.includes('actor')) return '🎮';
        
        // English & Language
        if (lower.includes('english') || lower.includes('language') || lower.includes('speak') || lower.includes('vocabulary') || lower.includes('grammar') || lower.includes('linguist')) return '🇬🇧';
        
        // Teamwork
        if (lower.includes('teamwork') || lower.includes('team') || lower.includes('cooperat') || lower.includes('group') || lower.includes('partner')) return '🤝';
        
        // Technology
        if (lower.includes('technology') || lower.includes('tech') || lower.includes('robot') || lower.includes('ai') || lower.includes('digital') || lower.includes('device')) return '🚀';
        
        // Travel & Holiday & Hometown
        if (lower.includes('travel') || lower.includes('trip') || lower.includes('holiday') || lower.includes('vacation') || lower.includes('country') || lower.includes('place') || lower.includes('hometown') || lower.includes('tourism')) return '✈️';
        
        // Food & Cooking
        if (lower.includes('food') || lower.includes('cook') || lower.includes('meal') || lower.includes('dish') || lower.includes('restaurant') || lower.includes('kitchen')) return '🍕';
        
        // Happiness & Emotion & Personality
        if (lower.includes('happy') || lower.includes('happiness') || lower.includes('unhappy') || lower.includes('feeling') || lower.includes('emotion') || lower.includes('introvert') || lower.includes('extrovert')) return '😊';
        
        // Books & Reading & Education
        if (lower.includes('book') || lower.includes('read') || lower.includes('study') || lower.includes('school') || lower.includes('university') || lower.includes('education') || lower.includes('student')) return '📚';
        
        // Weather & Seasons
        if (lower.includes('weather') || lower.includes('season') || lower.includes('summer') || lower.includes('winter') || lower.includes('rain') || lower.includes('climate')) return '☀️';

        return '📝';
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
            // Show all parts for the current card/lesson to print them together
            let allCardData;
            if (currentMode === 'lessons') {
                allCardData = lessonsData.filter(item => item["lesson"] === currentCard);
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
            let letter = currentCard;
            let cardLabel = `Card ${currentCard}`;
            
            if (currentCard.startsWith('Card ')) {
                letter = currentCard.replace('Card ', '').trim();
                cardLabel = currentCard;
            } else if (currentCard.includes('/')) {
                const parts = currentCard.split('/').map(p => p.trim());
                letter = parts[0];
                cardLabel = parts[1];
            }
            
            if (letter.length === 1) {
                header.innerHTML = `
                    <div class="print-card-label" style="font-size: 20pt !important; font-weight: 800; line-height: 1.1; color: black; text-transform: uppercase;">${letter}</div>
                    <div style="font-size: 11pt; color: #444; font-weight: 700; margin-top: 1mm; text-transform: uppercase; letter-spacing: 0.5px;">${cardLabel}</div>
                `;
            } else {
                header.innerHTML = `
                    <div class="print-card-label">${currentCard}</div>
                `;
            }
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
            
            const topicIcon = getTopicIcon(data.sovol_en + ' ' + (data.sovol_uz || ''));
            const titleHtml = `
                <div class="essay-header-row">
                    <span class="essay-topic-icon-badge">${topicIcon}</span>
                    <div class="essay-title-group">
                        <span class="en-text essay-title">${highlightText(data.sovol_en, searchQuery)}</span>
                        ${data.sovol_uz ? `<span class="uz-text essay-title-uz">(${highlightText(data.sovol_uz, searchQuery)})</span>` : ''}
                    </div>
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

    function renderReadingContent(activeType = 'reading', searchQuery = '') {
        contentArea.innerHTML = '';
        
        if (!readingData || readingData.length === 0) {
            contentArea.innerHTML = `<div class="loader">Reading & Listening ma'lumotlari topilmadi.</div>`;
            return;
        }

        // Filter items by type ('reading' or 'listening')
        let itemsForMode = readingData.filter(item => item.type === activeType);

        if (itemsForMode.length === 0) {
            contentArea.innerHTML = `<div class="loader">${activeType === 'listening' ? 'Listening' : 'Reading'} ma'lumotlari mavjud emas.</div>`;
            return;
        }

        let totalQuestionsCount = 0;
        let totalAnsweredCount = 0;
        let totalCorrectCount = 0;

        // Calculate score for this active mode
        itemsForMode.forEach(item => {
            if (item.sections) {
                item.sections.forEach(sec => {
                    if (sec.questions) {
                        sec.questions.forEach(q => {
                            totalQuestionsCount++;
                            if (readingAnswers[q.id]) {
                                totalAnsweredCount++;
                                if (readingAnswers[q.id].isCorrect) {
                                    totalCorrectCount++;
                                }
                            }
                        });
                    }
                });
            }
        });

        // Filter by search query if present
        let filtered = itemsForMode;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = itemsForMode.filter(item => {
                const text = (item.title + ' ' + (item.title_uz || '') + ' ' + (item.passage || '') + ' ' + (item.audio_transcript || '')).toLowerCase();
                return text.includes(query);
            });
        }

        if (filtered.length === 0) {
            contentArea.innerHTML = `<div class="loader">Qidiruv bo'yicha ma'lumot topilmadi.</div>`;
            return;
        }

        const moduleContainer = document.createElement('div');
        moduleContainer.className = 'reading-module-container';

        // Score summary header
        const scoreBox = document.createElement('div');
        scoreBox.className = 'reading-score-summary';
        scoreBox.innerHTML = `
            <div class="reading-score-text">
                🎯 ${activeType === 'listening' ? '🎧 Listening' : '📖 Reading'} Natijalari: <strong>${totalCorrectCount} / ${totalQuestionsCount}</strong> to'g'ri (Javob berildi: ${totalAnsweredCount}/${totalQuestionsCount})
            </div>
            <button class="reading-reset-btn" title="Ushbu bo'lim javoblarini tozalash">🔄 Qaytadan boshlash (Reset)</button>
        `;

        const resetBtn = scoreBox.querySelector('.reading-reset-btn');
        resetBtn.addEventListener('click', () => {
            if (confirm(`Haqiqatan ham ${activeType === 'listening' ? 'Listening' : 'Reading'} test javoblaringizni o'chirib, qaytadan topshirmoqchimisiz?`)) {
                itemsForMode.forEach(item => {
                    if (item.sections) {
                        item.sections.forEach(sec => {
                            if (sec.questions) {
                                sec.questions.forEach(q => {
                                    delete readingAnswers[q.id];
                                });
                            }
                        });
                    }
                });
                localStorage.setItem('readingAnswers', JSON.stringify(readingAnswers));
                renderReadingContent(activeType, searchQuery);
            }
        });

        moduleContainer.appendChild(scoreBox);

        filtered.forEach(item => {
            const cardEl = document.createElement('div');
            cardEl.className = 'reading-main-card';

            const isListening = item.type === 'listening';
            const badgeClass = isListening ? 'reading-type-badge listening' : 'reading-type-badge';
            const badgeLabel = isListening ? '🎧 Real Audio Listening Exam' : '📖 Academic Reading Passage';

            // Top banner with modern interactive audio controls
            const headerHtml = `
                <div class="reading-header-banner">
                    <div class="reading-title-box">
                        <span style="font-size: 1.8rem;">${item.topic_icon || (isListening ? '🎧' : '🤖')}</span>
                        <div>
                            <span class="${badgeClass}">${badgeLabel}</span>
                            <h3 style="margin: 4px 0 2px 0; font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${highlightText(item.title, searchQuery)}</h3>
                            <span style="font-size: 0.88rem; color: var(--text-sub); font-style: italic;">(${item.title_uz || ''})</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button class="audio-play-stream-btn" data-id="${item.id}">
                            <span>🔊</span> ${isListening ? "Audioni tinglash" : "Matnni o'qish (Audio)"}
                        </button>
                        <button class="passage-toggle-uz-btn" data-id="${item.id}">
                            <span>🌐</span> O'zbekcha tarjima
                        </button>
                    </div>
                </div>
            `;

            // Passage or Audio Transcript Box
            let passageHtml = '';
            if (isListening) {
                passageHtml = `
                    <div class="reading-passage-box">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-weight: 800; color: #f43f5e; display: flex; align-items: center; gap: 6px;">
                                <span>🎙️</span> Audio Transcript (Suhbat matni):
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-sub);">Ingliz tilida tinglang va savollarga javob bering</span>
                        </div>
                        <div class="passage-en-content">${highlightText(item.audio_transcript, searchQuery)}</div>
                        <div class="reading-passage-uz" id="uz-${item.id}">
                            <div style="font-weight: 700; color: var(--text-sub); margin-bottom: 6px;">O'zbekcha tarjimasi:</div>
                            ${highlightText(item.audio_transcript_uz || '', searchQuery)}
                        </div>
                    </div>
                `;
            } else {
                passageHtml = `
                    <div class="reading-passage-box">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 6px;">
                                <span>📄</span> Matn (Passage):
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-sub);">Matnni diqqat bilan o'qing va testlarni yeching</span>
                        </div>
                        <div class="passage-en-content">${highlightText(item.passage, searchQuery)}</div>
                        <div class="reading-passage-uz" id="uz-${item.id}">
                            <div style="font-weight: 700; color: var(--text-sub); margin-bottom: 6px;">O'zbekcha tarjimasi:</div>
                            ${highlightText(item.passage_uz || '', searchQuery)}
                        </div>
                    </div>
                `;
            }

            // Render Active Section based on currentPart (Part 1 or Part 2)
            let sectionsHtml = '';
            if (item.sections) {
                const activeIndex = (currentPart === 'Part 2') ? 1 : 0;
                const activeSection = item.sections[activeIndex] || item.sections[0];
                const secList = activeSection ? [activeSection] : item.sections;

                secList.forEach(sec => {
                    let questionsHtml = '';
                    if (sec.type === 'multiple_choice') {
                        sec.questions.forEach(q => {
                            const userAnswer = readingAnswers[q.id] ? readingAnswers[q.id].userVal : null;
                            const isAnswered = userAnswer !== null && userAnswer !== undefined;

                            let optionsHtml = '';
                            q.options.forEach(opt => {
                                const letterMatch = opt.match(/^([A-Z])\)/);
                                const optLetter = letterMatch ? letterMatch[1] : opt[0];
                                let optClass = 'quiz-option-btn';
                                
                                if (isAnswered) {
                                    if (optLetter === q.correct) {
                                        optClass += ' selected-correct';
                                    } else if (optLetter === userAnswer) {
                                        optClass += ' selected-wrong';
                                    }
                                }

                                optionsHtml += `
                                    <button class="${optClass}" data-qid="${q.id}" data-val="${optLetter}" ${isAnswered ? 'disabled' : ''}>
                                        <span>${highlightText(opt, searchQuery)}</span>
                                        ${isAnswered && optLetter === q.correct ? '<span>✅</span>' : (isAnswered && optLetter === userAnswer ? '<span>❌</span>' : '')}
                                    </button>
                                `;
                            });

                            const isCorrect = isAnswered && userAnswer === q.correct;
                            const statusBadge = isAnswered 
                                ? (isCorrect ? '<span style="color: #10b981; font-weight: 800; font-size: 0.85rem;">To\'g\'ri ✅</span>' : '<span style="color: #f43f5e; font-weight: 800; font-size: 0.85rem;">Noto\'g\'ri (To\'g\'ri javob: ' + q.correct + ') ❌</span>')
                                : '';

                            questionsHtml += `
                                <div class="quiz-question-item" id="qitem-${q.id}">
                                    <div class="quiz-question-text">
                                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                            <span>${q.number}. ${highlightText(q.question, searchQuery)}</span>
                                            ${statusBadge}
                                        </div>
                                        <span class="quiz-question-text-uz">(${highlightText(q.question_uz || '', searchQuery)})</span>
                                    </div>
                                    <div class="quiz-options-list">
                                        ${optionsHtml}
                                    </div>
                                    <div class="question-explanation-box" id="exp-${q.id}" style="${isAnswered ? 'display: block;' : ''}">
                                        💡 <strong>Izoh:</strong> ${q.explanation || ''}
                                    </div>
                                </div>
                            `;
                        });
                    } else if (sec.type === 'true_false') {
                        sec.questions.forEach(q => {
                            const userAnswer = readingAnswers[q.id] ? readingAnswers[q.id].userVal : null;
                            const isAnswered = userAnswer !== null && userAnswer !== undefined;

                            let trueBtnClass = 'tf-btn';
                            let falseBtnClass = 'tf-btn';

                            if (isAnswered) {
                                if (q.correct === 'TRUE') {
                                    trueBtnClass += ' selected-correct';
                                    if (userAnswer === 'FALSE') falseBtnClass += ' selected-wrong';
                                } else {
                                    falseBtnClass += ' selected-correct';
                                    if (userAnswer === 'TRUE') trueBtnClass += ' selected-wrong';
                                }
                            }

                            const isCorrect = isAnswered && userAnswer === q.correct;
                            const statusBadge = isAnswered 
                                ? (isCorrect ? '<span style="color: #10b981; font-weight: 800; font-size: 0.85rem;">To\'g\'ri ✅</span>' : '<span style="color: #f43f5e; font-weight: 800; font-size: 0.85rem;">Noto\'g\'ri (Javob: ' + q.correct + ') ❌</span>')
                                : '';

                            questionsHtml += `
                                <div class="quiz-question-item" id="qitem-${q.id}">
                                    <div class="quiz-question-text">
                                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                            <span>${highlightText(q.statement, searchQuery)}</span>
                                            ${statusBadge}
                                        </div>
                                        <span class="quiz-question-text-uz">(${highlightText(q.statement_uz || '', searchQuery)})</span>
                                    </div>
                                    <div class="tf-buttons-row">
                                        <button class="${trueBtnClass}" data-qid="${q.id}" data-val="TRUE" ${isAnswered ? 'disabled' : ''}>
                                            ✅ TRUE
                                        </button>
                                        <button class="${falseBtnClass}" data-qid="${q.id}" data-val="FALSE" ${isAnswered ? 'disabled' : ''}>
                                            ❌ FALSE
                                        </button>
                                    </div>
                                    <div class="question-explanation-box" id="exp-${q.id}" style="${isAnswered ? 'display: block;' : ''}">
                                        💡 <strong>Izoh:</strong> ${q.explanation || ''}
                                    </div>
                                </div>
                            `;
                        });
                    } else if (sec.type === 'fill_in_blank') {
                        sec.questions.forEach(q => {
                            const userAnswer = readingAnswers[q.id] ? readingAnswers[q.id].userVal : '';
                            const isAnswered = readingAnswers[q.id] !== undefined && readingAnswers[q.id] !== null;
                            const isCorrect = isAnswered && readingAnswers[q.id].isCorrect;

                            const statusBadge = isAnswered 
                                ? (isCorrect ? '<span style="color: #10b981; font-weight: 800; font-size: 0.85rem;">To\'g\'ri ✅ (' + q.correct + ')</span>' : '<span style="color: #f43f5e; font-weight: 800; font-size: 0.85rem;">Noto\'g\'ri (To\'g\'ri javob: ' + q.correct + ') ❌</span>')
                                : '';

                            questionsHtml += `
                                <div class="quiz-question-item" id="qitem-${q.id}">
                                    <div class="quiz-question-text">
                                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                            <span>${q.number}. ${highlightText(q.sentence, searchQuery)}</span>
                                            ${statusBadge}
                                        </div>
                                        <span class="quiz-question-text-uz">(${highlightText(q.sentence_uz || '', searchQuery)})</span>
                                    </div>
                                    <div class="fib-input-box">
                                        <input type="text" placeholder="Bitta so'z yozing..." value="${userAnswer}" id="inp-${q.id}" ${isAnswered ? 'disabled' : ''}>
                                        <button class="fib-check-btn" data-qid="${q.id}" ${isAnswered ? 'disabled style="opacity: 0.5;"' : ''}>Tekshirish</button>
                                    </div>
                                    <div class="question-explanation-box" id="exp-${q.id}" style="${isAnswered ? 'display: block;' : ''}">
                                        💡 <strong>To'g'ri javob:</strong> <span style="color: #10b981; font-weight: 800;">${q.correct}</span>. ${q.explanation || ''}
                                    </div>
                                </div>
                            `;
                        });
                    }

                    sectionsHtml += `
                        <div class="quiz-section">
                            <div class="quiz-section-title">
                                <span>📝 ${sec.title}</span>
                                <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sub);">(${sec.title_uz || ''})</span>
                            </div>
                            ${sec.instruction ? `<p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px; font-style: italic;">${sec.instruction}</p>` : ''}
                            ${questionsHtml}
                        </div>
                    `;
                });
            }

            cardEl.innerHTML = `
                ${headerHtml}
                ${passageHtml}
                ${sectionsHtml}
            `;

            // Event Listeners for translation and audio
            const toggleUzBtn = cardEl.querySelector('.passage-toggle-uz-btn');
            const uzBox = cardEl.querySelector(`#uz-${item.id}`);
            toggleUzBtn.addEventListener('click', () => {
                if (uzBox.style.display === 'block') {
                    uzBox.style.display = 'none';
                    toggleUzBtn.innerHTML = '<span>🌐</span> O\'zbekcha tarjima';
                } else {
                    uzBox.style.display = 'block';
                    toggleUzBtn.innerHTML = '<span>🙈</span> Tarjimani yashirish';
                }
            });

            const audioStreamBtn = cardEl.querySelector('.audio-play-stream-btn');
            audioStreamBtn.addEventListener('click', () => {
                const textToRead = isListening ? item.audio_transcript : item.passage;
                speak(textToRead);
            });

            // Handle Multiple Choice & True/False clicks
            const choiceButtons = cardEl.querySelectorAll('.quiz-option-btn, .tf-btn');
            choiceButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const qid = btn.getAttribute('data-qid');
                    const selectedVal = btn.getAttribute('data-val');
                    
                    // Find question object
                    let foundQ = null;
                    item.sections.forEach(s => {
                        s.questions.forEach(q => {
                            if (q.id === qid) foundQ = q;
                        });
                    });

                    if (!foundQ) return;

                    const isCorrect = (selectedVal.toUpperCase() === foundQ.correct.toUpperCase());
                    readingAnswers[qid] = {
                        userVal: selectedVal,
                        isCorrect: isCorrect
                    };
                    localStorage.setItem('readingAnswers', JSON.stringify(readingAnswers));

                    // Re-render
                    renderReadingContent(activeType, searchQuery);
                });
            });

            // Handle Fill in blank check
            const fibButtons = cardEl.querySelectorAll('.fib-check-btn');
            fibButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const qid = btn.getAttribute('data-qid');
                    const inp = cardEl.querySelector(`#inp-${qid}`);
                    if (!inp) return;

                    const val = inp.value.trim().toUpperCase();
                    if (!val) {
                        alert("Iltimos, javobni kiriting!");
                        return;
                    }

                    // Find question object
                    let foundQ = null;
                    item.sections.forEach(s => {
                        s.questions.forEach(q => {
                            if (q.id === qid) foundQ = q;
                        });
                    });

                    if (!foundQ) return;

                    const acceptableList = (foundQ.acceptable || [foundQ.correct]).map(a => a.trim().toUpperCase());
                    const isCorrect = acceptableList.includes(val) || val === foundQ.correct.toUpperCase();

                    readingAnswers[qid] = {
                        userVal: val,
                        isCorrect: isCorrect
                    };
                    localStorage.setItem('readingAnswers', JSON.stringify(readingAnswers));

                    // Re-render
                    renderReadingContent(activeType, searchQuery);
                });
            });

            moduleContainer.appendChild(cardEl);
        });

        contentArea.appendChild(moduleContainer);
        updateProgress(totalCorrectCount, totalQuestionsCount || 1);
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

            if (currentMode === 'reading') {
                renderReadingContent('reading');
            } else if (currentMode === 'listening') {
                renderReadingContent('listening');
            } else {
                renderContent(currentCard, currentPart);
            }
        });
    });

    initLevelSelection();
});
