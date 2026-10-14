const fs = require('fs');

let script = fs.readFileSync('script.js', 'utf8');

// 1. Add state variables
script = script.replace(
    /let readingAnswers = JSON\.parse\(localStorage\.getItem\('readingAnswers'\)\) \|\| \{\};/,
    `let readingAnswers = JSON.parse(localStorage.getItem('readingAnswers')) || {};
    let grammarData = [];
    let grammarScores = JSON.parse(localStorage.getItem('grammarScores')) || {};
    let currentGrammarTopic = null;
    let currentGrammarTest = null;
    let grammarFilter = 'all';
    let grammarReviewFilter = 'mistakes';`
);

// 2. Adjust adjustStudyToolsVisibility
script = script.replace(
    /if \(currentMode === 'writing' \|\| currentMode === 'reading' \|\| currentMode === 'listening'\) \{/,
    "if (currentMode === 'writing' || currentMode === 'reading' || currentMode === 'listening' || currentMode === 'grammar') {"
);

// 3. In mode button event listener
script = script.replace(
    /\}\s*else if \(currentMode === 'listening'\)\s*\{\s*cardsWrapper\.style\.display = 'none';\s*partsWrapper\.style\.display = 'block';\s*updateActivePartButton\(\);\s*renderReadingContent\('listening'\);\s*\}\s*else\s*\{/s,
    `} else if (currentMode === 'listening') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'block';
                updateActivePartButton();
                renderReadingContent('listening');
            } else if (currentMode === 'grammar') {
                cardsWrapper.style.display = 'none';
                partsWrapper.style.display = 'none';
                renderGrammarContent();
            } else {`
);

// 4. Initial UI mode setup
script = script.replace(
    /cardsWrapper\.style\.display = \(currentMode === 'writing' \|\| currentMode === 'reading' \|\| currentMode === 'listening'\) \? 'none' : 'block';/,
    "cardsWrapper.style.display = (currentMode === 'writing' || currentMode === 'reading' || currentMode === 'listening' || currentMode === 'grammar') ? 'none' : 'block';"
);
script = script.replace(
    /partsWrapper\.style\.display = \(currentMode === 'writing' \|\| currentMode === 'lessons'\) \? 'none' : 'block';/,
    "partsWrapper.style.display = (currentMode === 'writing' || currentMode === 'lessons' || currentMode === 'grammar') ? 'none' : 'block';"
);

// 5. Search listener
script = script.replace(
    /\}\s*else if \(currentMode === 'listening'\)\s*\{\s*renderReadingContent\('listening', query\);\s*\}\s*else\s*\{/s,
    `} else if (currentMode === 'listening') {
                renderReadingContent('listening', query);
            } else if (currentMode === 'grammar') {
                renderGrammarContent(query);
            } else {`
);

// 6. Print PDF listener
script = script.replace(
    /\}\s*else if \(currentMode === 'reading' \|\| currentMode === 'listening'\)\s*\{/,
    "} else if (currentMode === 'reading' || currentMode === 'listening' || currentMode === 'grammar') {"
);

// 7. In loadData: currentMode check
script = script.replace(
    /if \(currentLevel !== 'intermediate' && currentMode === 'reading'\) \{\s*currentMode = 'speaking';\s*localStorage\.setItem\('currentMode', currentMode\);\s*\}/,
    `if (currentLevel !== 'intermediate' && (currentMode === 'reading' || currentMode === 'listening' || currentMode === 'grammar')) {
                currentMode = 'speaking';
                localStorage.setItem('currentMode', currentMode);
            }`
);

// 8. In loadData: files definition
script = script.replace(
    /let speakingFile, writingFile, lessonFile, readingFile, levelTitle;/,
    "let speakingFile, writingFile, lessonFile, readingFile, grammarFile, levelTitle;"
);

script = script.replace(
    /\}\s*else if \(currentLevel === 'intermediate'\) \{\s*speakingFile = 'intermediate_speaking\.json';\s*writingFile = 'intermediate_writing\.json';\s*lessonFile = null;\s*readingFile = 'intermediate_reading\.json';\s*levelTitle = 'English Exam \(Intermediate\)';\s*\}/,
    `} else if (currentLevel === 'intermediate') {
                speakingFile = 'intermediate_speaking.json';
                writingFile = 'intermediate_writing.json';
                lessonFile = null;
                readingFile = 'intermediate_reading.json';
                grammarFile = 'intermediate_grammar.json';
                levelTitle = 'English Exam (Intermediate)';
            }`
);

// 9. Load grammarData
script = script.replace(
    /if \(readingFile\) \{\s*const resReading = await fetch\(readingFile\);\s*if \(!resReading\.ok\) throw new Error\(`\$\{readingFile\} faylni yuklab bo'lmadi`\);\s*readingData = await resReading\.json\(\);\s*\}/,
    `if (readingFile) {
                const resReading = await fetch(readingFile);
                if (!resReading.ok) throw new Error(\`\${readingFile} faylni yuklab bo'lmadi\`);
                readingData = await resReading.json();
            }

            if (grammarFile) {
                const resGrammar = await fetch(grammarFile);
                if (!resGrammar.ok) throw new Error(\`\${grammarFile} faylni yuklab bo'lmadi\`);
                grammarData = await resGrammar.json();
            } else {
                grammarData = [];
            }`
);

// 10. Hide/show grammarBtn
script = script.replace(
    /const lessonsBtn = document\.getElementById\('lessons-mode-btn'\);\s*const readingBtn = document\.getElementById\('reading-mode-btn'\);\s*const listeningBtn = document\.getElementById\('listening-mode-btn'\);/,
    `const lessonsBtn = document.getElementById('lessons-mode-btn');
            const readingBtn = document.getElementById('reading-mode-btn');
            const listeningBtn = document.getElementById('listening-mode-btn');
            const grammarBtn = document.getElementById('grammar-mode-btn');`
);

script = script.replace(
    /if \(currentLevel === 'intermediate'\) \{\s*if \(readingBtn\) readingBtn\.style\.display = 'flex';\s*if \(listeningBtn\) listeningBtn\.style\.display = 'flex';\s*\} else \{\s*if \(readingBtn\) readingBtn\.style\.display = 'none';\s*if \(listeningBtn\) listeningBtn\.style\.display = 'none';\s*\}/,
    `if (currentLevel === 'intermediate') {
                if (readingBtn) readingBtn.style.display = 'flex';
                if (listeningBtn) listeningBtn.style.display = 'flex';
                if (grammarBtn) grammarBtn.style.display = 'flex';
            } else {
                if (readingBtn) readingBtn.style.display = 'none';
                if (listeningBtn) listeningBtn.style.display = 'none';
                if (grammarBtn) grammarBtn.style.display = 'none';
            }`
);

// 11. In loadData mode render
script = script.replace(
    /\}\s*else if \(currentMode === 'listening'\)\s*\{\s*renderReadingContent\('listening'\);\s*\}\s*else\s*\{/s,
    `} else if (currentMode === 'listening') {
                renderReadingContent('listening');
            } else if (currentMode === 'grammar') {
                renderGrammarContent();
            } else {`
);

// 12. Add renderGrammarContent function implementation
const grammarFnCode = `
    // =========================================================
    // GRAMMAR & VOCABULARY TEST ENGINE (v9.5)
    // =========================================================

    function startGrammarTest(topic) {
        if (!topic || !topic.questions || topic.questions.length === 0) return;
        currentGrammarTest = {
            topicId: topic.id,
            topicTitle: topic.title,
            topicTitleUz: topic.titleUz || '',
            topicIcon: topic.icon || '📝',
            questions: [...topic.questions],
            currentIndex: 0,
            userAnswers: {},
            isCompleted: false,
            startTime: Date.now()
        };
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderGrammarContent();
    }

    function startMixedGrammarTest() {
        if (!grammarData || grammarData.length === 0) return;
        const allQuestions = [];
        grammarData.forEach(topic => {
            if (topic.questions) {
                topic.questions.forEach(q => {
                    allQuestions.push({
                        ...q,
                        topicTitle: topic.title,
                        topicIcon: topic.icon || '📝'
                    });
                });
            }
        });
        if (allQuestions.length === 0) return;
        // Shuffle questions
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 25);
        currentGrammarTest = {
            topicId: 'mixed_exam',
            topicTitle: '🌟 Umumiy Aralash Imtihon',
            topicTitleUz: 'Grammatika va Lug\\'at (25 ta tasodifiy savol)',
            topicIcon: '🌟',
            questions: shuffled,
            currentIndex: 0,
            userAnswers: {},
            isCompleted: false,
            startTime: Date.now()
        };
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderGrammarContent();
    }

    function finishGrammarTest() {
        if (!currentGrammarTest) return;
        const total = currentGrammarTest.questions.length;
        let correct = 0;
        currentGrammarTest.questions.forEach(q => {
            if (currentGrammarTest.userAnswers[q.id] === q.correctAnswer) {
                correct++;
            }
        });
        const percent = Math.round((correct / total) * 100);
        
        // Save score
        const prev = grammarScores[currentGrammarTest.topicId] || {};
        grammarScores[currentGrammarTest.topicId] = {
            bestScore: Math.max(percent, prev.bestScore || 0),
            lastScore: percent,
            correct: correct,
            total: total,
            date: new Date().toLocaleDateString('uz-UZ')
        };
        localStorage.setItem('grammarScores', JSON.stringify(grammarScores));
        
        currentGrammarTest.isCompleted = true;
        currentGrammarTest.endTime = Date.now();
        currentGrammarTest.correctCount = correct;
        currentGrammarTest.percent = percent;
        grammarReviewFilter = (correct < total) ? 'mistakes' : 'all';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderGrammarContent();
    }

    function exitGrammarTest() {
        if (!currentGrammarTest) return;
        if (!currentGrammarTest.isCompleted && Object.keys(currentGrammarTest.userAnswers).length > 0) {
            const confirmed = confirm("Haqiqatan ham testdan chiqmoqchimisiz? Natijangiz saqlanmaydi.");
            if (!confirmed) return;
        }
        currentGrammarTest = null;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderGrammarContent();
    }

    function renderGrammarContent(searchQuery = '') {
        contentArea.innerHTML = '';

        if (!grammarData || grammarData.length === 0) {
            contentArea.innerHTML = '<div class="loader">Grammar & Vocabulary ma\\'lumotlari topilmadi.</div>';
            return;
        }

        const container = document.createElement('div');
        container.className = 'grammar-view';

        // ---------------------------------------------------------
        // 1. ACTIVE TEST RUNNER
        // ---------------------------------------------------------
        if (currentGrammarTest && !currentGrammarTest.isCompleted) {
            const t = currentGrammarTest;
            const q = t.questions[t.currentIndex];
            const qIndex = t.currentIndex;
            const totalQ = t.questions.length;
            const progressPercent = Math.round(((qIndex + 1) / totalQ) * 100);
            const userChoice = t.userAnswers[q.id] || null;

            // Highlight blank in sentence
            const formattedSentence = q.sentence.replace(
                /_{3,}/g, 
                \`<span class="grammar-blank-slot">\${userChoice ? userChoice : '_______'}</span>\`
            );

            const letters = ['A', 'B', 'C', 'D'];

            container.innerHTML = \`
                <div class="grammar-runner-card">
                    <div class="grammar-runner-header">
                        <div class="grammar-runner-left">
                            <button class="grammar-back-btn" id="grammar-exit-btn">
                                ⬅️ Chiqish
                            </button>
                            <span class="grammar-test-title-badge">\${t.topicIcon} \${t.topicTitle}</span>
                        </div>
                        <div class="grammar-q-counter-badge">
                            Savol \${qIndex + 1} / \${totalQ}
                        </div>
                    </div>

                    <div class="grammar-progress-bar-wrap">
                        <div class="grammar-progress-fill" style="width: \${progressPercent}%"></div>
                    </div>

                    <div class="grammar-question-card">
                        \${q.context ? \`<div class="grammar-context-box">📖 \${q.context}</div>\` : ''}
                        
                        <div class="grammar-sentence-prompt">
                            \${formattedSentence}
                        </div>

                        \${q.translation ? \`
                            <div class="grammar-uz-translation-row">
                                <span>🇺🇿 \${q.translation}</span>
                            </div>
                        \` : ''}

                        <div class="grammar-options-container" id="grammar-options-group">
                            \${q.options.map((opt, i) => \`
                                <button class="grammar-opt-btn \${userChoice === opt ? 'selected' : ''}" data-val="\${opt}">
                                    <span class="grammar-opt-letter">\${letters[i] || (i + 1)}</span>
                                    <span class="grammar-opt-text">\${opt}</span>
                                </button>
                            \`).join('')}
                        </div>
                    </div>

                    <div class="grammar-runner-footer">
                        <div class="grammar-pills-row">
                            \${t.questions.map((item, idx) => {
                                const isAns = !!t.userAnswers[item.id];
                                const isCur = idx === qIndex;
                                return \`<button class="grammar-num-pill \${isCur ? 'active' : ''} \${isAns ? 'answered' : ''}" data-idx="\${idx}">\${idx + 1}</button>\`;
                            }).join('')}
                        </div>

                        <div class="grammar-nav-actions">
                            <button class="grammar-nav-btn" id="grammar-prev-btn" \${qIndex === 0 ? 'disabled' : ''}>
                                ⬅️ Oldingi
                            </button>

                            \${qIndex === totalQ - 1 ? \`
                                <button class="grammar-finish-btn" id="grammar-finish-btn">
                                    🏁 Testni yakunlash
                                </button>
                            \` : \`
                                <button class="grammar-nav-btn" id="grammar-next-btn">
                                    Keyingisi ➡️
                                </button>
                            \`}
                        </div>
                    </div>
                </div>
            \`;

            contentArea.appendChild(container);

            // Bind Test Runner Listeners
            const exitBtn = container.querySelector('#grammar-exit-btn');
            if (exitBtn) exitBtn.addEventListener('click', exitGrammarTest);

            const optButtons = container.querySelectorAll('.grammar-opt-btn');
            optButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const chosen = btn.getAttribute('data-val');
                    t.userAnswers[q.id] = chosen;
                    renderGrammarContent();
                });
            });

            const prevBtn = container.querySelector('#grammar-prev-btn');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (t.currentIndex > 0) {
                        t.currentIndex--;
                        renderGrammarContent();
                    }
                });
            }

            const nextBtn = container.querySelector('#grammar-next-btn');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (t.currentIndex < totalQ - 1) {
                        t.currentIndex++;
                        renderGrammarContent();
                    }
                });
            }

            const finishBtn = container.querySelector('#grammar-finish-btn');
            if (finishBtn) {
                finishBtn.addEventListener('click', finishGrammarTest);
            }

            const numPills = container.querySelectorAll('.grammar-num-pill');
            numPills.forEach(pill => {
                pill.addEventListener('click', () => {
                    const idx = parseInt(pill.getAttribute('data-idx'), 10);
                    if (!isNaN(idx) && idx >= 0 && idx < totalQ) {
                        t.currentIndex = idx;
                        renderGrammarContent();
                    }
                });
            });

            return;
        }

        // ---------------------------------------------------------
        // 2. RESULTS & DETAILED MISTAKES REVIEW VIEW
        // ---------------------------------------------------------
        if (currentGrammarTest && currentGrammarTest.isCompleted) {
            const t = currentGrammarTest;
            const total = t.questions.length;
            const correct = t.correctCount || 0;
            const wrong = total - correct;
            const percent = t.percent || 0;

            let ringClass = '';
            let ratingTitle = '🎉 A\\'lo natija! (Excellent)';
            if (percent < 50) {
                ringClass = 'danger';
                ratingTitle = '❌ Qayta topshirish tavsiya etiladi (Keep Trying)';
            } else if (percent < 75) {
                ringClass = 'warning';
                ratingTitle = '⚠️ Yaxshi, lekin xatolar ustida ishlang (Good effort)';
            } else if (percent < 90) {
                ratingTitle = '👍 Juda yaxshi natija! (Very Good)';
            }

            // Filter review items
            const filteredQuestions = t.questions.filter(q => {
                const userAns = t.userAnswers[q.id];
                const isCorr = userAns === q.correctAnswer;
                if (grammarReviewFilter === 'mistakes') return !isCorr;
                if (grammarReviewFilter === 'correct') return isCorr;
                return true;
            });

            container.innerHTML = \`
                <div class="grammar-results-container">
                    <div class="grammar-results-banner">
                        <div class="grammar-score-ring \${ringClass}">
                            <div class="grammar-score-percent">\${percent}%</div>
                            <div class="grammar-score-fraction">\${correct} / \${total}</div>
                        </div>

                        <div class="grammar-rating-badge">\${ratingTitle}</div>

                        <div class="grammar-stats-row">
                            <div class="grammar-stat-box correct">
                                <div class="val">✅ \${correct} ta</div>
                                <div class="lbl">To'g'ri javoblar</div>
                            </div>
                            <div class="grammar-stat-box wrong">
                                <div class="val">❌ \${wrong} ta</div>
                                <div class="lbl">Xatolar soni</div>
                            </div>
                            <div class="grammar-stat-box">
                                <div class="val">📊 \${percent}%</div>
                                <div class="lbl">Umumiy ball</div>
                            </div>
                        </div>

                        <div class="grammar-results-actions">
                            <button class="grammar-results-btn primary" id="grammar-retake-btn">
                                🔄 Qayta topshirish
                            </button>
                            <button class="grammar-results-btn secondary" id="grammar-topics-back-btn">
                                📋 Mavzular ro'yxatiga qaytish
                            </button>
                        </div>
                    </div>

                    <!-- Review Filter Tabs -->
                    <div class="grammar-review-tabs">
                        <button class="grammar-review-tab \${grammarReviewFilter === 'mistakes' ? 'active' : ''}" data-filter="mistakes">
                            ❌ Xatolar tahlili (\${wrong})
                        </button>
                        <button class="grammar-review-tab \${grammarReviewFilter === 'all' ? 'active' : ''}" data-filter="all">
                            📋 Barcha savollar (\${total})
                        </button>
                        <button class="grammar-review-tab \${grammarReviewFilter === 'correct' ? 'active' : ''}" data-filter="correct">
                            ✅ To'g'rilar (\${correct})
                        </button>
                    </div>

                    <!-- Detailed Reviews List -->
                    <div class="grammar-reviews-list">
                        \${filteredQuestions.length === 0 ? \`
                            <div class="grammar-review-card" style="text-align: center; color: var(--text-sub); padding: 30px;">
                                Ushbu bo'lim bo'yicha savollar yo'q.
                            </div>
                        \` : filteredQuestions.map((q, idx) => {
                            const userAns = t.userAnswers[q.id];
                            const isCorr = userAns === q.correctAnswer;
                            const originalIdx = t.questions.findIndex(item => item.id === q.id);

                            return \`
                                <div class="grammar-review-card \${isCorr ? 'is-correct' : 'is-wrong'}">
                                    <div class="grammar-review-top">
                                        <span class="grammar-review-num">Savol #\${originalIdx + 1}</span>
                                        <span class="grammar-status-pill \${isCorr ? 'correct' : 'wrong'}">
                                            \${isCorr ? '✅ To\\'g\\'ri' : '❌ Xato'}
                                        </span>
                                    </div>

                                    \${q.context ? \`<div class="grammar-context-box">📖 \${q.context}</div>\` : ''}

                                    <div class="grammar-review-sentence">
                                        \${q.sentence.replace(/_{3,}/g, \`<strong>\${q.correctAnswer}</strong>\`)}
                                    </div>

                                    <div class="grammar-answers-comparison">
                                        <div class="grammar-ans-row">
                                            <span class="label">Sizning javobingiz:</span>
                                            <span class="grammar-ans-val \${isCorr ? 'correct-ans' : 'user-wrong'}">
                                                \${userAns || "(Javob berilmadi)"}
                                            </span>
                                        </div>
                                        \${!isCorr ? \`
                                            <div class="grammar-ans-row">
                                                <span class="label">To'g'ri javob:</span>
                                                <span class="grammar-ans-val correct-ans">
                                                    \${q.correctAnswer}
                                                </span>
                                            </div>
                                        \` : ''}
                                    </div>

                                    \${q.explanation ? \`
                                        <div class="grammar-explanation-box">
                                            💡 <strong>Qoida va tushuntirish:</strong> \${q.explanation}
                                        </div>
                                    \` : ''}

                                    \${q.translation ? \`
                                        <div class="grammar-review-trans">
                                            🇺🇿 \${q.translation}
                                        </div>
                                    \` : ''}
                                </div>
                            \`;
                        }).join('')}
                    </div>

                    <div class="grammar-results-actions" style="margin-top: 10px;">
                        <button class="grammar-results-btn primary" id="grammar-retake-btn-2">
                            🔄 Testni qayta topshirish
                        </button>
                        <button class="grammar-results-btn secondary" id="grammar-topics-back-btn-2">
                            📋 Barcha mavzularga qaytish
                        </button>
                    </div>
                </div>
            \`;

            contentArea.appendChild(container);

            // Bind Results Listeners
            const retake = () => {
                currentGrammarTest.currentIndex = 0;
                currentGrammarTest.userAnswers = {};
                currentGrammarTest.isCompleted = false;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderGrammarContent();
            };
            const goBack = () => {
                currentGrammarTest = null;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderGrammarContent();
            };

            const rBtn1 = container.querySelector('#grammar-retake-btn');
            const rBtn2 = container.querySelector('#grammar-retake-btn-2');
            if (rBtn1) rBtn1.addEventListener('click', retake);
            if (rBtn2) rBtn2.addEventListener('click', retake);

            const bBtn1 = container.querySelector('#grammar-topics-back-btn');
            const bBtn2 = container.querySelector('#grammar-topics-back-btn-2');
            if (bBtn1) bBtn1.addEventListener('click', goBack);
            if (bBtn2) bBtn2.addEventListener('click', goBack);

            const reviewTabs = container.querySelectorAll('.grammar-review-tab');
            reviewTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    grammarReviewFilter = tab.getAttribute('data-filter');
                    renderGrammarContent();
                });
            });

            return;
        }

        // ---------------------------------------------------------
        // 3. TOPICS CATALOG / DASHBOARD
        // ---------------------------------------------------------
        let topicsToDisplay = [...grammarData];

        if (grammarFilter === 'grammar') {
            topicsToDisplay = topicsToDisplay.filter(t => t.category === 'grammar');
        } else if (grammarFilter === 'vocab') {
            topicsToDisplay = topicsToDisplay.filter(t => t.category === 'vocabulary');
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            topicsToDisplay = topicsToDisplay.filter(t => {
                const titleMatch = (t.title || '').toLowerCase().includes(q);
                const uzMatch = (t.titleUz || '').toLowerCase().includes(q);
                const descMatch = (t.description || '').toLowerCase().includes(q);
                return titleMatch || uzMatch || descMatch;
            });
        }

        const totalQuestionsCount = grammarData.reduce((acc, t) => acc + (t.questions ? t.questions.length : 0), 0);
        const completedCount = Object.keys(grammarScores).filter(k => k !== 'mixed_exam').length;

        container.innerHTML = \`
            <div class="grammar-header-card">
                <div class="grammar-header-title">
                    <h2>📝 Intermediate Grammar & Vocabulary Tests</h2>
                    <p>O'z bilimingizni sinab ko'ring! Mavzuni tanlang, <strong>Start</strong> tugmasini bosing va test yakunida barcha xatolaringiz ustida ishlang.</p>
                </div>

                <div class="grammar-stats-strip">
                    <div class="grammar-stat-chip">📚 Jami mavzular: <strong>\${grammarData.length} ta</strong></div>
                    <div class="grammar-stat-chip">❓ Jami savollar: <strong>\${totalQuestionsCount} ta</strong></div>
                    <div class="grammar-stat-chip">🏆 Ishlangan: <strong>\${completedCount} / \${grammarData.length}</strong></div>
                </div>
            </div>

            <!-- Mixed Exam Hero Card -->
            <div class="grammar-mixed-hero">
                <div class="grammar-mixed-hero-content">
                    <span class="grammar-mixed-badge">🌟 FULL EXAM</span>
                    <h3>Umumiy Aralash Imtihon (25 ta savol)</h3>
                    <p>Barcha 11 ta grammatika va lug'at mavzularidan tasodifiy 25 ta savol saralab olinadi. Yakunda xatolar va tushuntirishlar ko'rsatiladi.</p>
                </div>
                <button class="grammar-hero-btn" id="start-mixed-exam-btn">
                    🚀 Imtihonni boshlash
                </button>
            </div>

            <!-- Filter Tabs -->
            <div class="grammar-filter-bar">
                <button class="grammar-filter-btn \${grammarFilter === 'all' ? 'active' : ''}" data-filter="all">
                    🌟 Barchasi (\${grammarData.length})
                </button>
                <button class="grammar-filter-btn \${grammarFilter === 'grammar' ? 'active' : ''}" data-filter="grammar">
                    ⚡ Grammatika (7)
                </button>
                <button class="grammar-filter-btn \${grammarFilter === 'vocab' ? 'active' : ''}" data-filter="vocab">
                    💼 Lug'at (4)
                </button>
            </div>

            <!-- Topics Grid -->
            <div class="grammar-topics-grid">
                \${topicsToDisplay.map((topic, index) => {
                    const qCount = topic.questions ? topic.questions.length : 0;
                    const score = grammarScores[topic.id];
                    const hasScore = score && typeof score.bestScore === 'number';

                    return \`
                        <div class="grammar-topic-card" data-topic-id="\${topic.id}">
                            <div>
                                <div class="grammar-card-top">
                                    <div class="grammar-card-icon">\${topic.icon || '📝'}</div>
                                    <div class="grammar-card-titles">
                                        <div class="grammar-card-title">\${topic.title}</div>
                                        \${topic.titleUz ? \`<div class="grammar-card-uz">\${topic.titleUz}</div>\` : ''}
                                    </div>
                                </div>
                                <div class="grammar-card-desc">\${topic.description || ''}</div>
                            </div>

                            <div class="grammar-card-bottom">
                                \${hasScore ? \`
                                    <span class="grammar-score-pill">
                                        🏆 \${score.bestScore}% (\${score.correct}/\${score.total})
                                    </span>
                                \` : \`
                                    <span class="grammar-score-pill pending">
                                        \${qCount} ta savol
                                    </span>
                                \`}
                                <button class="grammar-start-btn" data-topic-id="\${topic.id}">
                                    🚀 Start
                                </button>
                            </div>
                        </div>
                    \`;
                }).join('')}
            </div>
        \`;

        contentArea.appendChild(container);

        // Bind Catalog Listeners
        const mixedBtn = container.querySelector('#start-mixed-exam-btn');
        if (mixedBtn) mixedBtn.addEventListener('click', startMixedGrammarTest);

        const filterBtns = container.querySelectorAll('.grammar-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                grammarFilter = btn.getAttribute('data-filter');
                renderGrammarContent(searchQuery);
            });
        });

        const topicCards = container.querySelectorAll('.grammar-topic-card, .grammar-start-btn');
        topicCards.forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const tid = el.getAttribute('data-topic-id');
                const targetTopic = grammarData.find(t => t.id === tid);
                if (targetTopic) startGrammarTest(targetTopic);
            });
        });
    }
`;

// Insert after renderReadingContent
const needleRegex = /contentArea\.appendChild\(moduleContainer\);\s*updateProgress\(totalCorrectCount,\s*totalQuestionsCount\s*\|\|\s*1\);\s*\}/;
if (!needleRegex.test(script)) {
    console.error("Could not find needle in script.js");
    process.exit(1);
}

script = script.replace(needleRegex, (match) => {
    return match + "\n" + grammarFnCode;
});

fs.writeFileSync('script.js', script, 'utf8');
console.log('Successfully updated script.js with Grammar & Vocab test engine!');
