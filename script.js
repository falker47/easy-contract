document.getElementById('year').textContent = new Date().getFullYear();

const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const cameraBtn = document.getElementById('cameraBtn');
const dropZone = document.getElementById('dropZone');
const uploadSection = document.getElementById('uploadSection');
const uploadIdle = document.getElementById('uploadIdle');
const fileInfo = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const scoreContainer = document.getElementById('scoreContainer');
const scoreValue = document.getElementById('scoreValue');
const resultsDivider = resultsSection.querySelector('.divider');
const markdownOutput = document.getElementById('markdownOutput');
const closeBtn = document.getElementById('closeBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

let currentFiles = [];

fileInput.addEventListener('change', (event) => handleFileSelection(event.target.files));
cameraInput.addEventListener('change', (event) => handleFileSelection(event.target.files));
cameraBtn.addEventListener('click', () => cameraInput.click());

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadSection.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    uploadSection.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadSection.classList.remove('dragover');

    if (event.dataTransfer.files.length) {
        handleFileSelection(event.dataTransfer.files);
    }
});

function handleFileSelection(fileList) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const hasPdf = files.some((file) => file.type === 'application/pdf');
    const hasExistingFiles = currentFiles.length > 0;

    if (hasPdf) {
        if (files.length > 1 || hasExistingFiles) resetFile();
        processFile(files.find((file) => file.type === 'application/pdf'));
        return;
    }

    const pdfByExt = files.find((file) => file.name.toLowerCase().endsWith('.pdf'));
    if (pdfByExt) {
        if (files.length > 1 || hasExistingFiles) resetFile();
        processFile(pdfByExt);
        return;
    }

    if (currentFiles.some((file) => file.type === 'application/pdf')) {
        resetFile();
    }

    const validImages = files.filter(
        (file) => validTypes.includes(file.type) && file.type !== 'application/pdf'
    );

    if (validImages.length === 0) {
        alert('Carica un PDF oppure immagini JPG, PNG, WebP o HEIC.');
        return;
    }

    validImages.forEach(processFile);
}

function processFile(file) {
    if (!file) return;

    const currentTotalSize = currentFiles.reduce((total, item) => total + (item.size || 0), 0);
    const maxSize = 4.5 * 1024 * 1024;

    if (currentTotalSize + file.size > maxSize) {
        alert('Limite dimensioni raggiunto: massimo circa 4,5 MB complessivi.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        currentFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            base64: event.target.result
        });
        updateUI();
    };
    reader.readAsDataURL(file);
}

function updateUI() {
    if (currentFiles.length === 0) {
        fileInfo.classList.add('hidden');
        analyzeBtn.disabled = true;
        fileNameSpan.textContent = '';
        fileNameSpan.removeAttribute('title');
        return;
    }

    fileInfo.classList.remove('hidden');
    analyzeBtn.disabled = false;

    if (currentFiles.length === 1) {
        fileNameSpan.textContent = currentFiles[0].name;
        fileNameSpan.title = currentFiles[0].name;
    } else {
        fileNameSpan.textContent = `${currentFiles.length} file selezionati`;
        fileNameSpan.removeAttribute('title');
    }
}

removeFileBtn.addEventListener('click', resetFile);

function resetFile() {
    fileInput.value = '';
    cameraInput.value = '';
    currentFiles = [];
    updateUI();
}

function setAnalyzing(isAnalyzing) {
    uploadSection.classList.toggle('is-analyzing', isAnalyzing);
    uploadIdle.classList.toggle('hidden', isAnalyzing);
    loading.classList.toggle('hidden', !isAnalyzing);
    analyzeBtn.disabled = isAnalyzing || currentFiles.length === 0;
}

analyzeBtn.addEventListener('click', async () => {
    if (currentFiles.length === 0) return;

    document.body.classList.remove('has-results');
    resultsSection.classList.add('hidden');
    setAnalyzing(true);

    const payload = {
        fileData: currentFiles.map((file) => file.base64)
    };

    try {
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `Errore server (${response.status})`;
            const responseText = await response.text();

            if (responseText) {
                try {
                    const errData = JSON.parse(responseText);
                    if (errData?.error) {
                        errorMessage += `: ${errData.error}`;
                    }
                } catch {
                    if (responseText.includes('Task timed out')) {
                        errorMessage += ': timeout durante l\'analisi.';
                    } else {
                        const compactText = responseText.replace(/\s+/g, ' ').trim();
                        if (compactText) {
                            errorMessage += `: ${compactText.substring(0, 140)}`;
                        }
                    }
                }
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        renderResults(data.result);
    } catch (error) {
        console.error(error);
        alert(`Errore durante l'analisi: ${error.message}`);
    } finally {
        setAnalyzing(false);
    }
});

function parseAttentionIndex(markdown) {
    const lines = markdown.split(/\r?\n/);
    let score = null;
    const removable = new Set();

    for (let index = 0; index < lines.length; index += 1) {
        const plainLine = lines[index]
            .replace(/\*\*/g, '')
            .replace(/^\s*[🧭🛡️]\s*/, '')
            .trim();

        const indexMatch = plainLine.match(
            /(?:Necessità di verifica|Indice di attenzione):\s*(\d{1,2})\/10(?:\s*[—-]\s*([^\n]+))?/i
        );

        if (indexMatch) {
            score = `${indexMatch[1]}/10`;
            removable.add(index);
            continue;
        }

        const legacyScoreMatch = plainLine.match(/^Score:\s*(\d{1,2})\/10(?:\s*\(([^)]+)\))?/i);
        if (legacyScoreMatch) {
            if (!score) score = `${legacyScoreMatch[1]}/10`;
            removable.add(index);
            continue;
        }

        if (/Logica\s+Voti/i.test(plainLine)) {
            removable.add(index);
        }
    }

    if (!score) {
        const fallback = markdown.match(/(\d{1,2})\/10/);
        if (fallback) score = fallback[0];
    }

    const cleanedMarkdown = lines
        .filter((_, index) => !removable.has(index))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return { score, cleanedMarkdown };
}

function enhanceRenderedReport() {
    const headings = Array.from(markdownOutput.querySelectorAll('h3'));

    headings.forEach((heading) => {
        const title = heading.textContent.trim().toLowerCase();
        const nextElement = heading.nextElementSibling;

        heading.classList.add('report-heading');

        if (title === 'sintesi' || title === 'in sintesi') {
            heading.classList.add('report-heading-summary');
            if (nextElement?.tagName === 'UL') {
                nextElement.classList.add('summary-grid');
            }
        }

        if (title === 'impatto economico') {
            heading.classList.add('report-heading-money');
            if (nextElement?.tagName === 'UL') {
                nextElement.classList.add('economic-grid');

                const breakdownItem = Array.from(nextElement.children).find((item) =>
                    item.querySelector(':scope > ul')
                );

                if (breakdownItem) {
                    breakdownItem.classList.add('money-breakdown');
                    const moneyGrid = breakdownItem.querySelector(':scope > ul');
                    const count = moneyGrid?.children.length || 0;

                    if (moneyGrid) {
                        moneyGrid.classList.add('money-grid', `money-count-${Math.min(count, 6)}`);
                    }
                }
            }
        }

        if (title === 'da verificare' || title === 'punti da verificare') {
            heading.classList.add('report-heading-check');
            if (nextElement && ['OL', 'UL'].includes(nextElement.tagName)) {
                nextElement.classList.add('attention-list');
            }
        }

        if (title === 'prossimo passo') {
            heading.classList.add('report-heading-next');
            if (nextElement?.tagName === 'P') {
                nextElement.classList.add('next-step');
            }
        }
    });
}

function renderResults(text) {
    const parsed = parseAttentionIndex(text);

    if (parsed.score) {
        scoreValue.textContent = parsed.score;
        scoreContainer.classList.remove('hidden');
        resultsDivider.classList.remove('hidden');
    } else {
        scoreContainer.classList.add('hidden');
        resultsDivider.classList.add('hidden');
    }

    const rawHtml = marked.parse(parsed.cleanedMarkdown);
    markdownOutput.innerHTML = DOMPurify.sanitize(rawHtml);
    enhanceRenderedReport();

    document.body.classList.add('has-results');
    resultsSection.classList.remove('hidden');
    requestAnimationFrame(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

closeBtn.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    document.body.classList.remove('has-results');
    resetFile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

helpBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
        helpModal.classList.add('hidden');
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !helpModal.classList.contains('hidden')) {
        helpModal.classList.add('hidden');
    }
});

exportPdfBtn.addEventListener('click', () => {
    resultsSection.setAttribute('data-date', new Date().toLocaleDateString('it-IT'));
    window.print();
});
