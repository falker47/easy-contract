// Set current year
document.getElementById('year').textContent = new Date().getFullYear();

// Elements
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const cameraBtn = document.getElementById('cameraBtn');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const analyzeBtn = document.getElementById('analyzeBtn');

// File Upload Logic
let currentFiles = []; // Array of { base64: string, name: string, type: string }

fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files));
cameraInput.addEventListener('change', (e) => handleFileSelection(e.target.files));

// Camera Button Logic
cameraBtn.addEventListener('click', () => {
    cameraInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.parentNode.classList.add('dragover');
});
dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.parentNode.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.parentNode.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFileSelection(e.dataTransfer.files);
    }
});

function handleFileSelection(fileList) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

    // Check if new files contain PDF
    const hasPdf = files.some(f => f.type === 'application/pdf');
    // Check if we already have files
    const hasExistingfiles = currentFiles.length > 0;

    // Logic: 
    // 1. If PDF is selected -> Clear everything else and set as single file (simplest logic for now).
    // 2. If Images are selected -> Append to existing images (unless existing was a PDF, then clear).

    // If new file is PDF, strictly reset and take only that PDF
    if (hasPdf) {
        if (files.length > 1 || hasExistingfiles) {
            // Warn or just do it? Let's just do it but maybe warn if we want to be fancy.
            // For now: "PDF mode: Single file only" logic is easiest/safest.
            resetFile();
        }
        // Take the first PDF found
        const pdf = files.find(f => f.type === 'application/pdf');
        processFile(pdf); // Will add it
        return;
    }

    // Fallback: Check extensions if no MIME type detected (e.g. windows registry issue or weird filename)
    const pdfByExt = files.find(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfByExt) {
        if (files.length > 1 || hasExistingfiles) {
            resetFile();
        }
        processFile(pdfByExt);
        return;
    }

    // If we have existing PDF, clear it before adding images
    if (currentFiles.some(f => f.type === 'application/pdf')) {
        resetFile();
    }

    // Process all images
    let validImages = files.filter(f => validTypes.includes(f.type) && f.type !== 'application/pdf');

    if (validImages.length === 0 && !hasPdf) {
        alert("Per favore carica un file PDF o immagini valide (JPG, PNG).");
        return;
    }

    validImages.forEach(processFile);
}

function processFile(file) {
    // Netlify Functions have a 6MB payload limit total.
    // Check total size estimate.
    const currentTotalSize = currentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB safe limit

    if (currentTotalSize + file.size > maxSize) {
        alert("⚠️ Limite dimensioni raggiunto! (Max ~4.5MB totali)");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        currentFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            base64: e.target.result
        });
        updateUI();
    };
    reader.readAsDataURL(file);
}

function updateUI() {
    if (currentFiles.length === 0) {
        fileInfo.classList.add('hidden');
        analyzeBtn.disabled = true;
        fileNameSpan.textContent = "";
        return;
    }

    fileInfo.classList.remove('hidden');
    analyzeBtn.disabled = false;

    if (currentFiles.length === 1) {
        fileNameSpan.textContent = currentFiles[0].name;
    } else {
        fileNameSpan.textContent = `${currentFiles.length} file selezionati`;
    }
}

removeFileBtn.addEventListener('click', resetFile);

function resetFile() {
    fileInput.value = "";
    cameraInput.value = "";
    currentFiles = [];
    updateUI();
}

// Analysis Logic
analyzeBtn.addEventListener('click', async () => {
    if (currentFiles.length === 0) return;

    // UI State
    analyzeBtn.disabled = true;
    loading.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    // Prepare payload: array of base64 strings
    const payload = {
        fileData: currentFiles.map(f => f.base64)
    };

    try {
        // Call Netlify Function
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Try to parse JSON error, fallback to text
            let errorMessage = `Errore Server (${response.status})`;
            try {
                const errData = await response.json();
                if (errData.error) errorMessage += ": " + errData.error;
            } catch (e) {
                // Not JSON, probably timeout or HTML error page
                const text = await response.text();
                // Check for common Netlify errors
                if (text.includes("Task timed out")) errorMessage += ": Timeout (Il modello ci ha messo troppo).";
                else errorMessage += ": " + text.substring(0, 100);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        const text = data.result;

        renderResults(text);

    } catch (error) {
        console.error(error);
        alert("Errore durante l'analisi: " + error.message);
    } finally {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

function renderResults(text) {
    // Extract Score using Regex (same as Python logic)
    const scoreMatch = text.match(/(\d{1,2})\/10/);
    if (scoreMatch) {
        scoreValue.textContent = scoreMatch[0];
        scoreContainer.classList.remove('hidden');

        // Remove "In Breve" marker split if desired, or just render all.
        // The Python code removed the security score section from text to avoid duplication.
        // Let's attempt to clean it up lightly if "In Breve" exists.
        if (text.includes("💡 In Breve")) {
            // Keep everything starting from In Breve
            const parts = text.split("💡 In Breve");
            if (parts.length > 1) {
                text = "### 💡 In Breve" + parts.slice(1).join("💡 In Breve");
                // We add '###' to make it a header in markdown if not already
            }
        }
    } else {
        scoreContainer.classList.add('hidden');
    }

    // Parse Markdown
    // Configure marked to be safe? DOMPurify handles sanitization.
    const rawHtml = marked.parse(text);
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    markdownOutput.innerHTML = cleanHtml;
    resultsSection.classList.remove('hidden');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Close Button Logic
closeBtn.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    resetFile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Help Modal Logic
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

helpBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.classList.add('hidden');
    }
});

// PDF Export Logic
const exportPdfBtn = document.getElementById('exportPdfBtn');

exportPdfBtn.addEventListener('click', () => {
    const resultsSection = document.getElementById('resultsSection');

    // Create a clone to avoid modifying the original
    const clone = resultsSection.cloneNode(true);

    // Remove header buttons from clone
    const headerActions = clone.querySelector('.header-actions');
    if (headerActions) headerActions.remove();

    // === LIGHT THEME STYLING FOR PDF ===
    // Container
    clone.style.backgroundColor = '#ffffff';
    clone.style.padding = '30px';
    clone.style.borderRadius = '0';
    clone.style.color = '#1a1a1a';
    clone.style.fontFamily = 'Inter, Arial, sans-serif';

    // Section title
    const sectionTitle = clone.querySelector('.section-title');
    if (sectionTitle) {
        sectionTitle.style.color = '#2563eb';
        sectionTitle.style.marginBottom = '20px';
    }

    // Score container
    const scoreContainer = clone.querySelector('.score-container');
    if (scoreContainer) {
        scoreContainer.style.backgroundColor = '#f0f9ff';
        scoreContainer.style.padding = '15px 20px';
        scoreContainer.style.borderRadius = '8px';
        scoreContainer.style.marginBottom = '20px';
    }

    const scoreLabel = clone.querySelector('.score-label');
    if (scoreLabel) scoreLabel.style.color = '#334155';

    const scoreValue = clone.querySelector('.score-value');
    if (scoreValue) scoreValue.style.color = '#2563eb';

    // Divider
    const divider = clone.querySelector('.divider');
    if (divider) {
        divider.style.backgroundColor = '#e2e8f0';
        divider.style.margin = '25px 0';
    }

    // Markdown body
    const markdownBody = clone.querySelector('.markdown-body');
    if (markdownBody) {
        markdownBody.style.color = '#1e293b';
        markdownBody.style.lineHeight = '1.7';

        // All headers
        markdownBody.querySelectorAll('h1, h2, h3').forEach(h => {
            h.style.color = '#1e40af';
            h.style.marginTop = '20px';
            h.style.marginBottom = '10px';
        });

        // Strong/bold text
        markdownBody.querySelectorAll('strong').forEach(s => {
            s.style.color = '#0f172a';
        });

        // List items
        markdownBody.querySelectorAll('li').forEach(li => {
            li.style.color = '#334155';
            li.style.marginBottom = '8px';
        });

        // Paragraphs
        markdownBody.querySelectorAll('p').forEach(p => {
            p.style.color = '#334155';
            p.style.marginBottom = '12px';
        });
    }

    // Add header with branding
    const header = document.createElement('div');
    header.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #2563eb;">
            <h1 style="margin: 0; font-size: 24px; color: #2563eb;">📝 Easy Contract</h1>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Analisi Contrattuale AI - ${new Date().toLocaleDateString('it-IT')}</p>
        </div>
    `;
    clone.insertBefore(header, clone.firstChild);

    // Remove the original section-title (we have header now)
    if (sectionTitle) sectionTitle.remove();

    const opt = {
        margin: [15, 15, 15, 15],
        filename: 'Analisi-Contratto-EasyContract.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    // Show loading state
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = '⏳...';

    html2pdf().set(opt).from(clone).save().then(() => {
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = '📄 PDF';
    }).catch((err) => {
        console.error('PDF export error:', err);
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = '📄 PDF';
        alert('Errore durante l\'esportazione PDF');
    });
});
