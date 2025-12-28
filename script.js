// Set current year
document.getElementById('year').textContent = new Date().getFullYear();

// Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const markdownOutput = document.getElementById('markdownOutput');
const scoreValue = document.getElementById('scoreValue');
const scoreContainer = document.getElementById('scoreContainer');
const closeBtn = document.getElementById('closeBtn');

let currentFileBase64 = null;

// File Upload Logic
fileInput.addEventListener('change', handleFileSelect);
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
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
    }
});

function handleFileSelect() {
    const file = fileInput.files[0];
    if (file && file.type === "application/pdf") {
        fileNameSpan.textContent = file.name;
        fileInfo.classList.remove('hidden');
        analyzeBtn.disabled = false;

        // Read file as Base64
        const reader = new FileReader();
        reader.onload = function (e) {
            currentFileBase64 = e.target.result; // data:application/pdf;base64,...
        };
        reader.readAsDataURL(file);
    } else {
        resetFile();
        alert("Per favore carica un file PDF valido.");
    }
}

removeFileBtn.addEventListener('click', resetFile);

function resetFile() {
    fileInput.value = "";
    currentFileBase64 = null;
    fileInfo.classList.add('hidden');
    analyzeBtn.disabled = true;
    fileNameSpan.textContent = "";
}

// Analysis Logic
analyzeBtn.addEventListener('click', async () => {
    if (!currentFileBase64) return;

    // UI State
    analyzeBtn.disabled = true;
    loading.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    try {
        // Call Netlify Function
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: currentFileBase64 })
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
