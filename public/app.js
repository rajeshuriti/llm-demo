// Initialize diagram rendering engine with proper configuration for v10+
document.addEventListener('DOMContentLoaded', function() {
    // Check if mermaid is loaded
    if (typeof mermaid === 'undefined') {
        console.error('Mermaid.js library not loaded!');
        return;
    }

    // Initialize Mermaid
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true
        },
        sequence: {
            useMaxWidth: true
        },
        gantt: {
            useMaxWidth: true
        }
    });

    console.log('Diagram engine initialized successfully');

    // Initialize the application
    initializeApplication();
});

// Application state
let currentDiagramCode = '';
let currentDiagramId = '';

// DOM elements
const form = document.getElementById('diagramForm');
const descriptionTextarea = document.getElementById('description');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const successState = document.getElementById('successState');
const diagramPreview = document.getElementById('diagramPreview');
const generatedCode = document.getElementById('generatedCode');
const codeContainer = document.getElementById('codeContainer');
const examplesGrid = document.getElementById('examplesGrid');

// Initialize application (moved to the diagram engine initialization above)
function initializeApplication() {
    setupEventListeners();
    loadExamples();
    updateCharacterCount();
}

// Event listeners
function setupEventListeners() {
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Character count update
    descriptionTextarea.addEventListener('input', updateCharacterCount);
    
    // Prevent form submission on Enter in textarea
    descriptionTextarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleFormSubmit(e);
        }
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const description = formData.get('description').trim();
    const diagramType = formData.get('diagramType');
    
    if (!description) {
        showError('Please enter a description for your diagram.');
        return;
    }
    
    if (description.length < 10) {
        showError('Description must be at least 10 characters long.');
        return;
    }
    
    await generateDiagram(description, diagramType);
}

// Generate diagram using API
async function generateDiagram(description, diagramType) {
    try {
        showLoading();
        
        const response = await fetch('/api/diagrams/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description,
                diagramType
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.details || result.error || 'Failed to generate diagram');
        }
        
        await displayDiagram(result.data, result.metadata);
        
    } catch (error) {
        console.error('Error generating diagram:', error);
        showError(error.message || 'Failed to generate diagram. Please try again.');
    }
}

// Display generated diagram
async function displayDiagram(data, metadata) {
    try {
        currentDiagramCode = data.mermaidCode;

        // Generate unique ID for this diagram
        currentDiagramId = 'diagram-' + Date.now();

        // Clear previous diagram
        diagramPreview.innerHTML = '';

        // Create container for the diagram
        const diagramContainer = document.createElement('div');
        diagramContainer.id = currentDiagramId;
        diagramContainer.className = 'diagram-container';
        diagramPreview.appendChild(diagramContainer);

        // Render the diagram using the correct Mermaid v10+ API
        try {
            // Method 1: Try the new render API
            const { svg } = await mermaid.render(currentDiagramId + '-svg', currentDiagramCode);
            diagramContainer.innerHTML = svg;
        } catch (renderError) {
            console.log('New render API failed, trying alternative method:', renderError);

            // Method 2: Fallback to direct element rendering
            diagramContainer.innerHTML = `<div class="mermaid">${currentDiagramCode}</div>`;

            // Re-initialize and render
            await mermaid.init(undefined, diagramContainer.querySelector('.mermaid'));
        }

        // Update code display
        generatedCode.textContent = currentDiagramCode;

        // Update metadata
        updateMetadata(data, metadata);

        // Show success state
        showSuccess();

    } catch (error) {
        console.error('Error rendering diagram:', error);
        console.error('Diagram code that failed:', currentDiagramCode);
        showError(`Failed to render diagram. Error: ${error.message}`);
    }
}

// Update metadata display
function updateMetadata(data, metadata) {
    document.getElementById('generationTime').textContent = data.generationTime || 'N/A';
    document.getElementById('detectedType').textContent = data.diagramType || 'Unknown';
    document.getElementById('codeLength').textContent = `${data.mermaidCode.length} characters`;
    
    // Show warnings if any
    const warningsContainer = document.getElementById('warningsContainer');
    const warningsList = document.getElementById('warningsList');
    
    if (data.warnings && data.warnings.length > 0) {
        warningsList.innerHTML = '';
        data.warnings.forEach(warning => {
            const li = document.createElement('li');
            li.textContent = warning;
            warningsList.appendChild(li);
        });
        warningsContainer.style.display = 'block';
    } else {
        warningsContainer.style.display = 'none';
    }
}

// Load examples from API
async function loadExamples() {
    try {
        const response = await fetch('/api/diagrams/examples');
        const result = await response.json();
        
        if (result.success) {
            displayExamples(result.data);
        }
    } catch (error) {
        console.error('Error loading examples:', error);
        // Show fallback examples
        displayFallbackExamples();
    }
}

// Display examples in the UI
function displayExamples(examples) {
    examplesGrid.innerHTML = '';
    
    examples.slice(0, 5).forEach(example => {
        const exampleElement = document.createElement('div');
        exampleElement.className = 'example-item';
        exampleElement.innerHTML = `
            <div class="example-title">${example.title}</div>
            <div class="example-description">${example.description.substring(0, 80)}...</div>
        `;
        
        exampleElement.addEventListener('click', () => {
            descriptionTextarea.value = example.description;
            updateCharacterCount();
            
            // Set diagram type if specified
            if (example.expectedType && example.expectedType !== 'auto') {
                document.getElementById('diagramType').value = example.expectedType;
            }
        });
        
        examplesGrid.appendChild(exampleElement);
    });
}

// Fallback examples if API fails
function displayFallbackExamples() {
    const fallbackExamples = [
        {
            title: 'Coffee Making Process',
            description: 'Create a flowchart showing the process of making coffee: start, boil water, grind beans, brew coffee, serve'
        },
        {
            title: 'User Login Flow',
            description: 'Show the sequence of user login: user enters credentials, system validates, checks database, returns success or error'
        },
        {
            title: 'Simple Class Diagram',
            description: 'Create a class diagram showing Vehicle as parent class with Car and Motorcycle as children'
        }
    ];
    
    displayExamples(fallbackExamples);
}

// Update character count
function updateCharacterCount() {
    const count = descriptionTextarea.value.length;
    charCount.textContent = count;
    
    if (count > 1800) {
        charCount.style.color = '#e53e3e';
    } else if (count > 1500) {
        charCount.style.color = '#f6ad55';
    } else {
        charCount.style.color = '#718096';
    }
}

// Show loading state
function showLoading() {
    hideAllStates();
    loadingState.style.display = 'block';
    
    // Update button state
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoading = generateBtn.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    generateBtn.disabled = true;
}

// Show error state
function showError(message) {
    hideAllStates();
    errorState.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    
    // Reset button state
    resetButtonState();
}

// Show success state
function showSuccess() {
    hideAllStates();
    successState.style.display = 'block';
    
    // Reset button state
    resetButtonState();
}

// Hide all states
function hideAllStates() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    successState.style.display = 'none';
}

// Reset button state
function resetButtonState() {
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoading = generateBtn.querySelector('.btn-loading');
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    generateBtn.disabled = false;
}

// Clear error and reset form
function clearError() {
    hideAllStates();
    descriptionTextarea.focus();
}

// Toggle code visibility
function toggleCode() {
    const isVisible = codeContainer.style.display !== 'none';
    codeContainer.style.display = isVisible ? 'none' : 'block';
    document.getElementById('toggleCodeText').textContent = isVisible ? 'Show Code' : 'Hide Code';
}

// Copy code to clipboard
async function copyCode() {
    if (!currentDiagramCode) {
        alert('No code to copy');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(currentDiagramCode);
        
        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy code:', error);
        
        // Fallback: select text
        const range = document.createRange();
        range.selectNode(generatedCode);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        
        alert('Code selected. Press Ctrl+C to copy.');
    }
}

// Download diagram as SVG
function downloadSVG() {
    if (!currentDiagramId) {
        alert('No diagram to download');
        return;
    }
    
    try {
        const svgElement = document.querySelector(`#${currentDiagramId} svg`);
        if (!svgElement) {
            throw new Error('SVG not found');
        }
        
        // Clone and prepare SVG for download
        const svgClone = svgElement.cloneNode(true);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // Create download link
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mindflow-diagram.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Failed to download SVG:', error);
        alert('Failed to download diagram. Please try again.');
    }
}

// Show about modal
function showAbout() {
    document.getElementById('aboutModal').style.display = 'flex';
}

// Show help (placeholder)
function showHelp() {
    alert('Help documentation coming soon! For now, try the examples to get started with diagram creation.');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
    
    // Ctrl/Cmd + Enter to generate diagram
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === descriptionTextarea) {
            e.preventDefault();
            handleFormSubmit(e);
        }
    }
});
