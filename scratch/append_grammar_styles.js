const fs = require('fs');

const css = `
/* =========================================================
   INTERMEDIATE GRAMMAR & VOCABULARY TEST STYLES
   ========================================================= */

.grammar-view {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 0.3s ease;
}

/* Header & Banner */
.grammar-header-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.grammar-header-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--uz-color));
}

.grammar-header-title h2 {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.grammar-header-title p {
  font-size: 0.95rem;
  color: var(--text-sub);
  line-height: 1.5;
}

.grammar-stats-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.grammar-stat-chip {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 0.85rem;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.grammar-stat-chip strong {
  color: var(--primary);
}

/* Mixed Exam Hero Card */
.grammar-mixed-hero {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(244, 63, 94, 0.12));
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: var(--border-radius);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: var(--shadow-md);
}

.grammar-mixed-hero-content {
  flex: 1;
}

.grammar-mixed-badge {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 6px;
}

.grammar-mixed-hero h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.grammar-mixed-hero p {
  font-size: 0.88rem;
  color: var(--text-sub);
}

.grammar-hero-btn {
  background: linear-gradient(135deg, var(--primary), #6366f1);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.grammar-hero-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.45);
}

/* Filter Bar */
.grammar-filter-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.grammar-filter-btn {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-sub);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.grammar-filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
}

/* Topics Grid */
.grammar-topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 16px;
}

.grammar-topic-card {
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
}

.grammar-topic-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: rgba(99, 102, 241, 0.4);
}

.grammar-card-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.grammar-card-icon {
  font-size: 1.8rem;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.grammar-card-titles {
  flex: 1;
}

.grammar-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
}

.grammar-card-uz {
  font-size: 0.82rem;
  color: var(--uz-color);
  font-weight: 600;
  margin-top: 2px;
}

.grammar-card-desc {
  font-size: 0.85rem;
  color: var(--text-sub);
  line-height: 1.45;
  margin-bottom: 16px;
  flex: 1;
}

.grammar-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--glass-border);
}

.grammar-score-pill {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  color: var(--uz-color);
  border: 1px solid rgba(16, 185, 129, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.grammar-score-pill.pending {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-sub);
  border-color: rgba(148, 163, 184, 0.2);
}

.grammar-start-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 18px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
}

.grammar-start-btn:hover {
  background: #4338ca;
  transform: translateY(-1px);
}

/* =========================================================
   TEST RUNNER VIEW
   ========================================================= */

.grammar-runner-card {
  background: var(--card-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.grammar-runner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.grammar-runner-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grammar-back-btn {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
  padding: 7px 14px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.grammar-back-btn:hover {
  background: rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.3);
  color: var(--secondary);
}

.grammar-test-title-badge {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
}

.grammar-q-counter-badge {
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 700;
}

.grammar-progress-bar-wrap {
  width: 100%;
  height: 7px;
  background: var(--nav-bg);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.grammar-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--uz-color));
  transition: width 0.3s ease;
}

/* Question Area */
.grammar-question-card {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 22px;
}

.grammar-context-box {
  background: rgba(59, 130, 246, 0.08);
  border-left: 3px solid #3b82f6;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.5;
  margin-bottom: 16px;
}

.grammar-sentence-prompt {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.6;
  margin-bottom: 10px;
}

.grammar-blank-slot {
  display: inline-block;
  min-width: 90px;
  padding: 2px 10px;
  border-bottom: 2px solid var(--primary);
  color: var(--primary);
  font-weight: 700;
  text-align: center;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 4px 4px 0 0;
}

.grammar-uz-translation-row {
  font-size: 0.9rem;
  color: var(--uz-color);
  font-weight: 500;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Options Grid */
.grammar-options-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.grammar-opt-btn {
  background: var(--card-bg);
  border: 1.5px solid var(--glass-border);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  font-family: inherit;
  color: var(--text-main);
}

.grammar-opt-btn:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.06);
  transform: translateX(4px);
}

.grammar-opt-btn.selected {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.15);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

.grammar-opt-letter {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--primary);
  flex-shrink: 0;
}

.grammar-opt-btn.selected .grammar-opt-letter {
  background: var(--primary);
  color: #fff;
}

.grammar-opt-text {
  font-size: 1.02rem;
  font-weight: 500;
  flex: 1;
}

/* Runner Footer */
.grammar-runner-footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
}

.grammar-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  padding: 8px 0;
}

.grammar-num-pill {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--nav-bg);
  color: var(--text-sub);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.grammar-num-pill.active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
}

.grammar-num-pill.answered:not(.active) {
  border-color: var(--uz-color);
  color: var(--uz-color);
  background: rgba(16, 185, 129, 0.12);
}

.grammar-nav-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.grammar-nav-btn {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
  padding: 10px 22px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grammar-nav-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

.grammar-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.grammar-finish-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  padding: 11px 26px;
  border-radius: 22px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all 0.2s ease;
}

.grammar-finish-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.45);
}

/* =========================================================
   RESULTS & DETAILED MISTAKES REVIEW VIEW
   ========================================================= */

.grammar-results-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 0.3s ease;
}

.grammar-results-banner {
  background: var(--card-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 28px 24px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.grammar-score-ring {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid var(--uz-color);
  background: rgba(16, 185, 129, 0.1);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
}

.grammar-score-ring.warning {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
}

.grammar-score-ring.danger {
  border-color: var(--secondary);
  background: rgba(244, 63, 94, 0.1);
  box-shadow: 0 0 20px rgba(244, 63, 94, 0.2);
}

.grammar-score-percent {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1;
}

.grammar-score-fraction {
  font-size: 0.8rem;
  color: var(--text-sub);
  margin-top: 4px;
  font-weight: 600;
}

.grammar-rating-badge {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-main);
}

.grammar-stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.grammar-stat-box {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 10px 18px;
  text-align: center;
}

.grammar-stat-box .val {
  font-size: 1.25rem;
  font-weight: 800;
}

.grammar-stat-box .lbl {
  font-size: 0.78rem;
  color: var(--text-sub);
  margin-top: 2px;
}

.grammar-stat-box.correct .val { color: var(--uz-color); }
.grammar-stat-box.wrong .val { color: var(--secondary); }

/* Review Filter Tabs */
.grammar-review-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid var(--glass-border);
  padding-bottom: 8px;
  margin-top: 6px;
}

.grammar-review-tab {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-sub);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grammar-review-tab.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* Detailed Review Cards */
.grammar-reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grammar-review-card {
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
}

.grammar-review-card.is-correct {
  border-left: 4px solid var(--uz-color);
}

.grammar-review-card.is-wrong {
  border-left: 4px solid var(--secondary);
}

.grammar-review-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.grammar-review-num {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
}

.grammar-status-pill {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.grammar-status-pill.correct {
  background: rgba(16, 185, 129, 0.15);
  color: var(--uz-color);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.grammar-status-pill.wrong {
  background: rgba(244, 63, 94, 0.15);
  color: var(--secondary);
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.grammar-review-sentence {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.5;
}

.grammar-answers-comparison {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 12px;
}

.grammar-ans-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
}

.grammar-ans-row .label {
  width: 140px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-sub);
  flex-shrink: 0;
}

.grammar-ans-val {
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.grammar-ans-val.user-wrong {
  background: rgba(244, 63, 94, 0.12);
  color: var(--secondary);
  text-decoration: line-through;
}

.grammar-ans-val.correct-ans {
  background: rgba(16, 185, 129, 0.12);
  color: var(--uz-color);
}

.grammar-explanation-box {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.5;
}

.grammar-explanation-box strong {
  color: var(--primary);
}

.grammar-review-trans {
  font-size: 0.85rem;
  color: var(--uz-color);
  font-style: italic;
}

/* Results Bottom Actions */
.grammar-results-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 10px;
}

.grammar-results-btn {
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.grammar-results-btn.primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.grammar-results-btn.primary:hover {
  background: #4338ca;
  transform: translateY(-2px);
}

.grammar-results-btn.secondary {
  background: var(--nav-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
}

.grammar-results-btn.secondary:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

/* Mobile Responsiveness for Grammar */
@media (max-width: 640px) {
  .grammar-header-card {
    padding: 18px 14px;
  }

  .grammar-mixed-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
  }

  .grammar-hero-btn {
    width: 100%;
    text-align: center;
  }

  .grammar-topics-grid {
    grid-template-columns: 1fr;
  }

  .grammar-runner-card {
    padding: 16px 12px;
  }

  .grammar-opt-btn {
    padding: 12px 14px;
  }

  .grammar-opt-text {
    font-size: 0.95rem;
  }

  .grammar-nav-actions {
    flex-direction: row;
    gap: 8px;
  }

  .grammar-nav-btn,
  .grammar-finish-btn {
    flex: 1;
    text-align: center;
    padding: 10px 14px;
    font-size: 0.85rem;
  }

  .grammar-ans-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .grammar-ans-row .label {
    width: auto;
  }
}
`;

fs.appendFileSync('style.css', css, 'utf8');
console.log('Successfully appended grammar styles to style.css');
