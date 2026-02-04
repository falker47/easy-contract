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
// PDF Export Logic
const exportPdfBtn = document.getElementById('exportPdfBtn');

exportPdfBtn.addEventListener('click', () => {
    const resultsSection = document.getElementById('resultsSection');

    // 1. Create a temporary container for the PDF content to simulate A4 width
    // We append this to the body so styles resolve correctly
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'fixed';
    pdfContainer.style.top = '-10000px'; // Off-screen
    pdfContainer.style.left = '0';
    pdfContainer.style.width = '210mm'; // A4 width
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.zIndex = '-9999';
    document.body.appendChild(pdfContainer);

    // 2. Clone the content into the container
    const clone = resultsSection.cloneNode(true);
    pdfContainer.appendChild(clone);

    // 3. Remove non-printable elements
    const headerActions = clone.querySelector('.header-actions');
    if (headerActions) headerActions.remove();

    // 4. Force LIGHT THEME styles explicitly on the clone structure
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.padding = '20px 40px'; // Margins inside the A4 sheet
    clone.style.fontFamily = 'Arial, sans-serif';
    clone.style.border = 'none';

    // Headers
    clone.querySelectorAll('h1, h2, h3').forEach(h => {
        h.style.color = '#1a56db'; // Blue headers
        h.style.marginTop = '20px';
        h.style.marginBottom = '10px';
        h.style.textShadow = 'none'; // No shadow
    });

    // Paragraphs and text - Enforce PURE BLACK on all common text elements
    clone.querySelectorAll('p, li, div, span, strong, td, th, blockquote, pre, code, em, b, i, u').forEach(el => {
        el.style.color = '#000000'; // Pure black for max contrast
        el.style.textShadow = 'none';
    });

    // Score Box specific styling
    const scoreContainer = clone.querySelector('.score-container');
    if (scoreContainer) {
        scoreContainer.style.backgroundColor = '#f0f9ff';
        scoreContainer.style.border = '1px solid #bae6fd';
        scoreContainer.style.padding = '15px';
        scoreContainer.style.borderRadius = '8px';
        scoreContainer.style.marginBottom = '20px';
        scoreContainer.style.boxShadow = 'none';

        // Fix score text colors specifically
        const scoreLabel = scoreContainer.querySelector('.score-label');
        const scoreValue = scoreContainer.querySelector('.score-value');
        if (scoreLabel) scoreLabel.style.color = '#000000';
        if (scoreValue) scoreValue.style.color = '#1a56db';
    }

    // Markdown content tweaks
    const markdownBody = clone.querySelector('.markdown-body');
    if (markdownBody) {
        markdownBody.style.fontSize = '12px'; // Readable print size
        markdownBody.style.lineHeight = '1.6';
        markdownBody.style.fontFamily = 'Arial, sans-serif';
    }

    // Add Header Branding
    const header = document.createElement('div');
    header.innerHTML = `
        <div style="border-bottom: 2px solid #1a56db; margin-bottom: 20px; padding-bottom: 10px;">
            <h1 style="color: #1a56db; font-size: 20px; margin: 0; padding: 0;">Easy Contract</h1>
            <p style="color: #444; font-size: 10px; margin: 0; padding: 0;">Report Generato il ${new Date().toLocaleDateString('it-IT')}</p>
        </div>
    `;
    clone.insertBefore(header, clone.firstChild);

    // Remove old titles if redundant
    const oldTitle = clone.querySelector('.section-title');
    if (oldTitle) oldTitle.style.display = 'none';

    // 5. Options
    const opt = {
        margin: [10, 10, 15, 10], // mm margins [top, left, bottom, right]
        filename: 'Report_EasyContract.pdf',
        image: { type: 'jpeg', quality: 1.0 }, // Max quality
        html2canvas: {
            scale: 4, // Higher scale for crystal clear text
            useCORS: true,
            scrollY: 0,
            letterRendering: true, // Improves text kerning
            windowWidth: 794 // A4 width in px at 96dpi approx
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 6. Generate
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = '⏳...';

    html2pdf().set(opt).from(clone).save().then(() => {
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = '📄 PDF';
        // Cleanup
        document.body.removeChild(pdfContainer);
    }).catch((err) => {
        console.error(err);
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = '📄 PDF';
        alert("Errore PDF");
        // Cleanup on error too
        if (document.body.contains(pdfContainer)) document.body.removeChild(pdfContainer);
    });
});
