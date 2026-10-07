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
                    const compactText = responseText.replace(/\s+/g, ' ').trim();
                    const looksLikeHtml = /^<!?html|^<html|<title>.*timeout/i.test(compactText);

                    if (response.status === 504 || /Task timed out|Inactivity Timeout/i.test(responseText)) {
                        errorMessage = "Timeout del servizio AI. Riprova tra poco.";
                    } else if (!looksLikeHtml && compactText) {
                        errorMessage += `: ${compactText.substring(0, 140)}`;
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

const REPORT_ICONS = Object.freeze({
    summary: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path>',
    money: '<path d="M18.5 6.5A7 7 0 1 0 18.5 17.5"></path><path d="M5 10h9"></path><path d="M5 14h8"></path>',
    categories: '<path d="m12 2 9 5-9 5-9-5 9-5Z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 17 9 5 9-5"></path>',
    check: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
    next: '<circle cx="12" cy="12" r="9"></circle><path d="M8 12h8"></path><path d="m13 9 3 3-3 3"></path>'
});

function addReportIcon(target, iconKey) {
    if (!target || !REPORT_ICONS[iconKey] || target.querySelector(':scope > .report-heading-icon')) return;

    const badge = document.createElement('span');
    badge.className = `report-heading-icon report-heading-icon-${iconKey}`;
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${REPORT_ICONS[iconKey]}</svg>`;
    target.prepend(badge);
}

function enhanceRenderedReport() {
    const headings = Array.from(markdownOutput.querySelectorAll('h3'));

    headings.forEach((heading) => {
        const title = heading.textContent.trim().toLowerCase();
        const nextElement = heading.nextElementSibling;

        heading.classList.add('report-heading');

        if (title === 'sintesi' || title === 'in sintesi') {
            heading.classList.add('report-heading-summary');
            addReportIcon(heading, 'summary');
            if (nextElement?.tagName === 'UL') {
                nextElement.classList.add('summary-grid');
            }
        }

        if (title === 'impatto economico') {
            heading.classList.add('report-heading-money');
            addReportIcon(heading, 'money');
            if (nextElement?.tagName === 'UL') {
                nextElement.classList.add('economic-grid');

                const breakdownItem = Array.from(nextElement.children).find((item) =>
                    item.querySelector(':scope > ul')
                );

                if (breakdownItem) {
                    const moneyGrid = breakdownItem.querySelector(':scope > ul');
                    const count = moneyGrid?.children.length || 0;

                    if (moneyGrid) {
                        const classificationHeading = document.createElement('h3');
                        classificationHeading.className = 'report-heading report-heading-categories';
                        classificationHeading.textContent = 'Come sono classificate le somme';
                        addReportIcon(classificationHeading, 'categories');

                        moneyGrid.classList.add(
                            'money-grid',
                            'report-money-classifications',
                            `money-count-${Math.min(count, 6)}`
                        );

                        nextElement.insertAdjacentElement('afterend', classificationHeading);
                        classificationHeading.insertAdjacentElement('afterend', moneyGrid);
                        breakdownItem.remove();
                    }
                }
            }
        }

        if (title === 'come sono classificate le somme') {
            heading.classList.add('report-heading-categories');
            addReportIcon(heading, 'categories');
        }

        if (title === 'da verificare' || title === 'punti da verificare') {
            heading.classList.add('report-heading-check');
            addReportIcon(heading, 'check');
            if (nextElement && ['OL', 'UL'].includes(nextElement.tagName)) {
                nextElement.classList.add('attention-list');
            }
        }

        if (title === 'prossimo passo') {
            heading.classList.add('report-heading-next');
            addReportIcon(heading, 'next');
            if (nextElement?.tagName === 'P') {
                nextElement.classList.add('next-step');
            }
        }
    });
}

function updateReportLayout() {
    markdownOutput.classList.remove('report-stacked');

    if (window.matchMedia('(max-width: 680px)').matches) return;

    const summaryGrid = markdownOutput.querySelector('.summary-grid');
    const economicGrid = markdownOutput.querySelector('.economic-grid');

    if (!summaryGrid || !economicGrid) return;

    const summaryHeight = summaryGrid.getBoundingClientRect().height;
    const economicHeight = economicGrid.getBoundingClientRect().height;
    const shorterHeight = Math.max(1, Math.min(summaryHeight, economicHeight));
    const heightDelta = Math.abs(summaryHeight - economicHeight);
    const heightRatio = Math.max(summaryHeight, economicHeight) / shorterHeight;

    const shouldStack = heightDelta > 96 && heightRatio > 1.28;
    markdownOutput.classList.toggle('report-stacked', shouldStack);
}

let reportLayoutFrame = null;

function scheduleReportLayoutUpdate() {
    if (reportLayoutFrame !== null) {
        cancelAnimationFrame(reportLayoutFrame);
    }

    reportLayoutFrame = requestAnimationFrame(() => {
        reportLayoutFrame = null;
        updateReportLayout();
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
        updateReportLayout();
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

window.addEventListener('resize', scheduleReportLayoutUpdate);

exportPdfBtn.addEventListener('click', () => {
    resultsSection.setAttribute('data-date', new Date().toLocaleDateString('it-IT'));
    window.print();
});
