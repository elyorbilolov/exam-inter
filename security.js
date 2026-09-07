// ==========================================
// ANTI-THEFT & DEVTOOLS TAMPER PROTECTION
// ==========================================
(function() {
    'use strict';

    // Disable Right-Click Context Menu on entire document
    document.addEventListener('contextmenu', function(e) {
        // Allow inside inputs or word popup
        if (!e.target.closest('.word-popup-card') && !e.target.closest('input')) {
            e.preventDefault();
            return false;
        }
    });

    // Disable Key Shortcuts for Developer Tools and Source Viewing
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
            return false;
        }
        // Ctrl+S (Save Page)
        if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            return false;
        }
    });

    // Console Warning
    try {
        console.clear();
        console.log("%cDIQQAT / STOP!", "color: red; font-size: 30px; font-weight: bold;");
        console.log("%cBu tizim xavfsizlik himoyasi ostida. Kodlarni ko'chirish yoki buzib kirish qat'iyan taqiqlanadi.", "font-size: 15px; color: #f59e0b;");
    } catch(e) {}
})();
