/**
 * PC Building Simulator - Comprehensive Interactive 2D UI
 * Complete with drag-drop, canvas visualization, detailed specs, build management
 * Fully editable and maintainable code structure
 */

// ==================== GLOBAL STATE ====================
const state = {
    components: {},
    build: {
        cpu: null,
        motherboard: null,
        ram: null,
        gpu: null,
        storage: null,
        psu: null,
        case: null,
        cooler: null
    },
    selectedCategory: 'cpu',
    selectedComponent: null,
    componentDetails: {},
    draggingComponent: null,
    draggedComponentCategory: null,
    mouseX: 0,
    mouseY: 0,
    hoveredSlot: null,
    particles: [],
    compatibility: {
        compatible: false,
        issues: []
    },
    stats: {
        totalPower: 0,
        totalCost: 0,
        totalMemory: 0,
        gpuMemory: 0
    },
    // ==================== COMPONENT POSITIONING (FOR IMPORT-READY DESIGNS) ====================
    componentPositions: {}, // Dynamic positions for placed components
    canvasDragging: {
        active: false,
        category: null,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0
    },
    selectedOnCanvas: null // Currently selected component on canvas for dragging
};

// ==================== PARTICLE EFFECT CLASS ====================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4 - 2;
        this.life = 1;
        this.decay = 0.02;
        this.size = 5 + Math.random() * 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ==================== CANVAS SETUP ====================
const canvas = document.getElementById('pcCanvas');
const ctx = canvas.getContext('2d');

// ==================== COMPONENT DESIGN IMPORTS (PLACEHOLDER) ====================
// This structure is ready to load component images/designs from external files
// Example usage after adding images:
// const componentImages = {
//     cpu: new Image(),
//     motherboard: new Image(),
//     ram: new Image(),
//     gpu: new Image(),
//     storage: new Image(),
//     psu: new Image(),
//     case: new Image(),
//     cooler: new Image()
// };
//
// componentImages.cpu.src = '/static/img/components/cpu.png';
// componentImages.motherboard.src = '/static/img/components/motherboard.png';
// etc...

const componentImages = {}; // Ready for importing component designs

// Component positions on the 2D canvas visualization
const componentPositions = {
    case: { x: 20, y: 20, width: 200, height: 380, label: 'CASE', order: 1 },
    psu: { x: 230, y: 320, width: 80, height: 80, label: 'PSU', order: 2 },
    motherboard: { x: 45, y: 80, width: 140, height: 110, label: 'MOTHERBOARD', order: 3 },
    cpu: { x: 80, y: 110, width: 50, height: 50, label: 'CPU', order: 4 },
    cooler: { x: 80, y: 170, width: 50, height: 50, label: 'COOLER', order: 5 },
    ram: { x: 50, y: 200, width: 40, height: 60, label: 'RAM', order: 6 },
    gpu: { x: 230, y: 80, width: 80, height: 60, label: 'GPU', order: 7 },
    storage: { x: 230, y: 150, width: 80, height: 40, label: 'STORAGE', order: 8 }
};

// Component colors for canvas visualization
const componentColors = {
    case: '#8B4513',
    motherboard: '#2E7D32',
    cpu: '#FF6B6B',
    cooler: '#00BCD4',
    ram: '#9C27B0',
    gpu: '#FFC107',
    psu: '#FF5722',
    storage: '#607D8B'
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    await loadComponents();
    setupCategoryButtons();
    setupEventListeners();
    setupCanvasEvents();
    updateBuildDisplay(); // Initialize empty slots
    displayComponents('cpu');
    drawPC();
    startAnimationLoop();
}

// ==================== LOAD COMPONENTS FROM API ====================
async function loadComponents() {
    try {
        const response = await fetch('/api/components');
        const data = await response.json();
        state.components = data;
        console.log('Components loaded:', state.components);
    } catch (error) {
        console.error('Error loading components:', error);
        showNotification('Error: Could not load components', 'error');
    }
}

// ==================== CATEGORY MANAGEMENT ====================
function setupCategoryButtons() {
    const categories = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'];
    const categoryTabsContainer = document.querySelector('.category-tabs');
    
    if (!categoryTabsContainer) return;
    
    categoryTabsContainer.innerHTML = '';
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${category === 'cpu' ? 'active' : ''}`;
        btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        btn.onclick = () => selectCategory(category);
        categoryTabsContainer.appendChild(btn);
    });
}

function selectCategory(category) {
    state.selectedCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayComponents(category);
}

// ==================== DISPLAY COMPONENTS ====================
function displayComponents(category) {
    const componentsList = document.getElementById('componentsList');
    if (!componentsList) return;
    
    componentsList.innerHTML = '';
    const components = state.components[category] || [];
    
    if (components.length === 0) {
        componentsList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No components available</p>';
        return;
    }
    
    components.forEach(component => {
        const componentElement = document.createElement('div');
        componentElement.className = 'component-item';
        componentElement.draggable = true;
        componentElement.dataset.componentId = component.id;
        componentElement.dataset.category = category;
        
        const priceText = component.price ? `$${component.price}` : 'N/A';
        
        componentElement.innerHTML = `
            <h4>${component.name}</h4>
            <p class="brand-name">${component.brand || 'Generic'}</p>
            <p style="font-size: 0.8em; color: #999;">${component.model || ''}</p>
            <div class="component-price">${priceText}</div>
            <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                ${getComponentShortSpec(component, category)}
            </div>
        `;
        
        componentElement.addEventListener('dragstart', handleDragStart);
        componentElement.addEventListener('dragend', handleDragEnd);
        componentElement.addEventListener('click', (e) => {
            if (e.target.closest('.remove-btn')) return;
            openComponentModal(component, category);
        });
        
        componentsList.appendChild(componentElement);
    });
}

function getComponentShortSpec(component, category) {
    let spec = '';
    switch(category) {
        case 'cpu':
            spec = `${component.cores || 'N/A'} cores • ${component.clockSpeed || 'N/A'} GHz`;
            break;
        case 'motherboard':
            spec = `${component.chipset || 'N/A'} • ${component.socket || 'N/A'}`;
            break;
        case 'ram':
            spec = `${component.capacity || 'N/A'} GB • ${component.speed || 'N/A'} MHz`;
            break;
        case 'gpu':
            spec = `${component.gMemory || 'N/A'} GB • ${component.architecture || 'N/A'}`;
            break;
        case 'storage':
            spec = `${component.capacity || 'N/A'} • ${component.type || 'N/A'}`;
            break;
        case 'psu':
            spec = `${component.wattage || 'N/A'}W • ${component.efficiency || 'N/A'}`;
            break;
        case 'case':
            spec = `${component.formFactor || 'N/A'} • ${component.material || 'N/A'}`;
            break;
        case 'cooler':
            spec = `${component.type || 'N/A'} • ${component.maxTDP || 'N/A'}W TDP`;
            break;
        default:
            spec = 'Details available';
    }
    return spec;
}

// ==================== DRAG AND DROP HANDLERS ====================
function handleDragStart(e) {
    const componentId = this.dataset.componentId;
    const category = this.dataset.category;
    
    const component = state.components[category].find(c => c.id === componentId);
    
    state.draggingComponent = component;
    state.draggedComponentCategory = category;
    
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', componentId);
    
    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.background = componentColors[category];
    dragImage.style.color = 'white';
    dragImage.style.padding = '10px 15px';
    dragImage.style.borderRadius = '4px';
    dragImage.style.fontWeight = 'bold';
    dragImage.style.zIndex = '-1000';
    dragImage.style.fontSize = '12px';
    dragImage.textContent = component.name;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 10, 10);
    setTimeout(() => dragImage.remove(), 0);
    
    this.style.opacity = '0.5';
    this.style.borderColor = componentColors[category];
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    this.style.borderColor = '#e0e0e0';
}

// ==================== CANVAS DRAG AND DROP ====================
function setupCanvasEvents() {
    canvas.addEventListener('dragover', handleCanvasDragOver);
    canvas.addEventListener('drop', handleCanvasDrop);
    canvas.addEventListener('dragleave', handleCanvasDragLeave);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasComponentDrag);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('click', handleCanvasClick);
}

// ==================== CANVAS DRAG FROM LIST ====================
function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    state.hoveredSlot = null;
    for (const [slotName, pos] of Object.entries(componentPositions)) {
        if (x >= pos.x && x <= pos.x + pos.width && 
            y >= pos.y && y <= pos.y + pos.height) {
            state.hoveredSlot = slotName;
            break;
        }
    }
}

function handleCanvasDragLeave(e) {
    state.hoveredSlot = null;
}

function handleCanvasDrop(e) {
    e.preventDefault();
    
    if (!state.draggingComponent || !state.draggedComponentCategory) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find which slot the drop happened on
    let targetSlot = null;
    for (const [slotName, pos] of Object.entries(componentPositions)) {
        if (x >= pos.x && x <= pos.x + pos.width && 
            y >= pos.y && y <= pos.y + pos.height) {
            targetSlot = slotName;
            break;
        }
    }
    
    if (targetSlot && state.draggedComponentCategory === targetSlot) {
        addComponentToBuild(state.draggingComponent, state.draggedComponentCategory);
        showNotification(`${state.draggingComponent.name} added to build!`, 'success');
        showAddAnimation(targetSlot);
    } else if (targetSlot) {
        showNotification('Component type does not match this slot!', 'error');
    }
    
    state.hoveredSlot = null;
    state.draggingComponent = null;
    state.draggedComponentCategory = null;
}

// ==================== CANVAS COMPONENT DRAGGING (ON CANVAS) ====================
function handleCanvasMouseDown(e) {
    if (e.button !== 0) return; // Left click only
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a placed component
    for (const [category, component] of Object.entries(state.build)) {
        if (component && state.componentPositions[category]) {
            const pos = state.componentPositions[category];
            if (x >= pos.x && x <= pos.x + pos.width && 
                y >= pos.y && y <= pos.y + pos.height) {
                
                state.canvasDragging.active = true;
                state.canvasDragging.category = category;
                state.canvasDragging.startX = x;
                state.canvasDragging.startY = y;
                state.canvasDragging.offsetX = x - pos.x;
                state.canvasDragging.offsetY = y - pos.y;
                state.selectedOnCanvas = category;
                
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
                return;
            }
        }
    }
}

function handleCanvasComponentDrag(e) {
    if (!state.canvasDragging.active) {
        // Hover effect for components
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        let hoveringComponent = null;
        for (const [category, component] of Object.entries(state.build)) {
            if (component && state.componentPositions[category]) {
                const pos = state.componentPositions[category];
                if (x >= pos.x && x <= pos.x + pos.width && 
                    y >= pos.y && y <= pos.y + pos.height) {
                    hoveringComponent = category;
                    break;
                }
            }
        }
        
        canvas.style.cursor = hoveringComponent ? 'grab' : 'default';
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate new position
    let newX = x - state.canvasDragging.offsetX;
    let newY = y - state.canvasDragging.offsetY;
    
    // Clamp to canvas boundaries
    const category = state.canvasDragging.category;
    const width = 80;
    const height = 60;
    
    newX = Math.max(0, Math.min(newX, canvas.width - width));
    newY = Math.max(0, Math.min(newY, canvas.height - height));
    
    // Update component position
    if (!state.componentPositions[category]) {
        state.componentPositions[category] = {};
    }
    state.componentPositions[category].x = newX;
    state.componentPositions[category].y = newY;
    
    // Check for collisions and adjust if needed
    checkComponentCollisions(category);
    
    drawPC();
}

function handleCanvasMouseUp(e) {
    if (state.canvasDragging.active) {
        canvas.style.cursor = 'default';
        state.canvasDragging.active = false;
        state.canvasDragging.category = null;
        drawPC();
    }
}

// ==================== COLLISION DETECTION ====================
function checkComponentCollisions(movingCategory) {
    const movingPos = state.componentPositions[movingCategory];
    const movingWidth = 80;
    const movingHeight = 60;
    const padding = 10; // Minimum space between components
    
    for (const [category, component] of Object.entries(state.build)) {
        if (category === movingCategory || !component || !state.componentPositions[category]) {
            continue;
        }
        
        const otherPos = state.componentPositions[category];
        const otherWidth = 80;
        const otherHeight = 60;
        
        // Simple AABB collision check
        if (checkAABBCollision(
            movingPos.x, movingPos.y, movingWidth, movingHeight,
            otherPos.x, otherPos.y, otherWidth, otherHeight,
            padding
        )) {
            // Collision detected - resolve by moving the placed component
            resolveCollision(movingCategory, category, movingPos, otherPos);
        }
    }
}

function checkAABBCollision(x1, y1, w1, h1, x2, y2, w2, h2, padding = 0) {
    return !(x1 + w1 + padding < x2 || 
             x2 + w2 + padding < x1 || 
             y1 + h1 + padding < y2 || 
             y2 + h2 + padding < y1);
}

function resolveCollision(movingCategory, staticCategory, movingPos, staticPos) {
    // Push the static component away
    const dx = staticPos.x - movingPos.x;
    const dy = staticPos.y - movingPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const pushDistance = 100;
        const pushX = (dx / distance) * pushDistance;
        const pushY = (dy / distance) * pushDistance;
        
        staticPos.x = Math.max(0, Math.min(staticPos.x + pushX, canvas.width - 80));
        staticPos.y = Math.max(0, Math.min(staticPos.y + pushY, canvas.height - 60));
    }
}

function handleCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check for clicks on placed components first
    let clickedOnComponent = false;
    for (const [category, component] of Object.entries(state.build)) {
        if (component && state.componentPositions[category]) {
            const pos = state.componentPositions[category];
            if (x >= pos.x && x <= pos.x + pos.width && 
                y >= pos.y && y <= pos.y + pos.height) {
                
                state.selectedOnCanvas = category;
                clickedOnComponent = true;
                drawPC();
                break;
            }
        }
    }
    
    // If not clicked on component, deselect
    if (!clickedOnComponent) {
        state.selectedOnCanvas = null;
        drawPC();
    }
}

// ==================== COMPONENT MODAL ====================
function openComponentModal(component, category) {
    const modal = document.getElementById('componentModal');
    if (!modal) return;
    
    state.selectedComponent = component;
    state.componentDetails = { component, category };
    
    // Update header
    const headerDiv = modal.querySelector('.component-details-header');
    if (headerDiv) {
        headerDiv.innerHTML = `
            <h3>${component.name}</h3>
            <p class="component-brand">${component.brand || 'Generic'}</p>
        `;
    }
    
    // Update specs
    const specsDiv = modal.querySelector('.component-specs-grid');
    if (specsDiv) {
        specsDiv.innerHTML = buildComponentDetailsHTML(component, category);
    }
    
    // Setup add button
    const addBtn = modal.querySelector('#addComponentBtn');
    if (addBtn) {
        addBtn.textContent = state.build[category] ? 'Replace Component' : 'Add to Build';
        addBtn.onclick = () => {
            addComponentToBuild(component, category);
            modal.style.display = 'none';
        };
    }
    
    modal.style.display = 'block';
}

function buildComponentDetailsHTML(component, category) {
    let html = '';
    
    const specMap = {
        cpu: ['model', 'cores', 'threads', 'clockSpeed', 'tdp', 'socket', 'architecture', 'cache'],
        motherboard: ['model', 'chipset', 'socket', 'formFactor', 'ramSlots', 'pciSlots', 'features'],
        ram: ['model', 'capacity', 'speed', 'type', 'latency', 'voltage'],
        gpu: ['model', 'gMemory', 'memoryType', 'architecture', 'tdp', 'connectivity'],
        storage: ['model', 'capacity', 'type', 'interface', 'readSpeed', 'writeSpeed', 'formFactor'],
        psu: ['model', 'wattage', 'efficiency', 'modularity', 'connectors'],
        case: ['model', 'formFactor', 'material', 'color', 'driveBays', 'features'],
        cooler: ['model', 'type', 'maxTDP', 'noise', 'compatibility']
    };
    
    const specs = specMap[category] || [];
    specs.forEach(specKey => {
        if (component[specKey] !== undefined && component[specKey] !== null) {
            const label = specKey.replace(/([A-Z])/g, ' $1').trim();
            const value = component[specKey];
            html += `
                <div class="spec-item">
                    <div class="spec-label">${label}</div>
                    <div class="spec-value">${value}</div>
                </div>
            `;
        }
    });
    
    // Add price at the end
    html += `
        <div class="spec-item" style="grid-column: 1 / -1; background: #e8f4f8; border-left: 3px solid #27ae60;">
            <div class="spec-label">Price</div>
            <div class="spec-value" style="color: #27ae60; font-size: 1.2em;">$${component.price || 'N/A'}</div>
        </div>
    `;
    
    return html;
}

// ==================== BUILD MANAGEMENT ====================
function addComponentToBuild(component, category) {
    state.build[category] = component;
    
    // Initialize component position on canvas with random offset
    if (!state.componentPositions[category]) {
        const randomX = Math.random() * (canvas.width - 100);
        const randomY = Math.random() * (canvas.height - 100);
        state.componentPositions[category] = {
            x: Math.max(0, randomX),
            y: Math.max(0, randomY),
            width: 80,
            height: 60
        };
    }
    
    updateBuildDisplay();
    checkCompatibility();
    updateStats();
    drawPC();
    showNotification(`${component.name} added to build!`, 'success');
}

function updateBuildDisplay() {
    const categories = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'];
    
    // Update each slot based on data-slot attribute
    categories.forEach(category => {
        const slot = document.querySelector(`.component-slot[data-slot="${category}"]`);
        if (!slot) return;
        
        const slotValue = slot.querySelector('.slot-value');
        const removeBtn = slot.querySelector('.remove-btn');
        
        if (state.build[category]) {
            const component = state.build[category];
            slotValue.textContent = component.name;
            slotValue.style.color = '#667eea';
            slot.style.borderLeftColor = componentColors[category];
            
            // Setup remove button
            if (removeBtn) {
                removeBtn.style.display = 'block';
                removeBtn.onclick = (e) => {
                    e.preventDefault();
                    removeComponent(category);
                };
            }
        } else {
            slotValue.textContent = 'Not selected';
            slotValue.style.color = '#999';
            slot.style.borderLeftColor = '#667eea';
            
            // Hide remove button
            if (removeBtn) {
                removeBtn.style.display = 'none';
            }
        }
    });
}

function removeComponent(category) {
    state.build[category] = null;
    state.componentPositions[category] = null;
    state.selectedOnCanvas = null;
    updateBuildDisplay();
    checkCompatibility();
    updateStats();
    drawPC();
    showNotification(`${category} removed from build`, 'info');
}

function clearBuild() {
    if (confirm('Are you sure you want to clear the entire build?')) {
        state.build = {
            cpu: null,
            motherboard: null,
            ram: null,
            gpu: null,
            storage: null,
            psu: null,
            case: null,
            cooler: null
        };
        state.componentPositions = {};
        state.selectedOnCanvas = null;
        updateBuildDisplay();
        checkCompatibility();
        updateStats();
        drawPC();
        showNotification('Build cleared', 'info');
    }
}

// ==================== COMPATIBILITY CHECK ====================
async function checkCompatibility() {
    try {
        const response = await fetch('/api/compatibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.build)
        });
        const data = await response.json();
        state.compatibility = {
            compatible: data.compatible,
            issues: data.issues || []
        };
        displayCompatibilityStatus();
    } catch (error) {
        console.error('Error checking compatibility:', error);
    }
}

function displayCompatibilityStatus() {
    const statusDiv = document.querySelector('.compatibility-status');
    const issuesDiv = document.querySelector('.compatibility-issues');
    
    if (!statusDiv) return;
    
    statusDiv.className = `compatibility-status ${state.compatibility.compatible ? 'compatible' : 'incompatible'}`;
    statusDiv.innerHTML = state.compatibility.compatible 
        ? '✓ Build is compatible!' 
        : '✗ Compatibility issues found';
    
    if (issuesDiv) {
        if (state.compatibility.issues.length > 0) {
            issuesDiv.innerHTML = '<ul>' + 
                state.compatibility.issues.map(issue => `<li>${issue}</li>`).join('') + 
                '</ul>';
            issuesDiv.classList.add('show');
        } else {
            issuesDiv.classList.remove('show');
        }
    }
}

// ==================== STATISTICS ====================
async function updateStats() {
    try {
        const response = await fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.build)
        });
        const data = await response.json();
        state.stats = data;
        displayStats();
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function displayStats() {
    const statsDiv = document.querySelector('.build-stats');
    if (!statsDiv) return;
    
    statsDiv.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Total Power</div>
            <div class="stat-value">${state.stats.totalPower || 0}W</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Total Cost</div>
            <div class="stat-value">$${(state.stats.totalCost || 0).toFixed(2)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">RAM</div>
            <div class="stat-value">${state.stats.totalMemory || 0}GB</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">GPU Memory</div>
            <div class="stat-value">${state.stats.gpuMemory || 0}GB</div>
        </div>
    `;
}

// ==================== BUILD SAVE/LOAD ====================
function saveBuild() {
    const modal = document.getElementById('saveBuildModal');
    if (!modal) {
        showNotification('Save modal not available', 'error');
        return;
    }
    
    const input = modal.querySelector('#buildNameInput');
    if (input) {
        input.value = 'My Build';
        input.focus();
    }
    
    // Setup confirm button
    const confirmBtn = modal.querySelector('#confirmSaveBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const buildName = input.value.trim() || 'My Build';
            try {
                const response = await fetch('/api/builds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: buildName,
                        components: state.build,
                        stats: state.stats
                    })
                });
                const data = await response.json();
                if (data.success || response.ok) {
                    showNotification(`Build "${buildName}" saved!`, 'success');
                    modal.style.display = 'none';
                }
            } catch (error) {
                console.error('Error saving build:', error);
                showNotification('Error saving build', 'error');
            }
        };
    }
    
    modal.style.display = 'block';
}

async function loadBuild() {
    const modal = document.getElementById('loadBuildModal');
    if (!modal) {
        showNotification('Load modal not available', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/builds');
        const builds = await response.json();
        
        const list = modal.querySelector('#buildsList');
        if (!list) {
            showNotification('Builds list element not found', 'error');
            return;
        }
        
        list.innerHTML = '';
        
        if (builds.length === 0) {
            list.innerHTML = '<p style="padding: 20px; text-align: center;">No saved builds</p>';
        } else {
            builds.forEach(build => {
                const item = document.createElement('div');
                item.className = 'build-item';
                item.innerHTML = `
                    <div class="build-item-name">${build.name}</div>
                    <div class="build-item-date">${new Date(build.date || build.created_at).toLocaleDateString()}</div>
                    <div class="build-item-actions">
                        <button class="btn btn-primary" onclick="loadBuildData('${build.id}')">Load</button>
                        <button class="btn btn-secondary" onclick="deleteBuild('${build.id}')">Delete</button>
                    </div>
                `;
                list.appendChild(item);
            });
        }
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading builds:', error);
        showNotification('Error loading builds', 'error');
    }
}

async function loadBuildData(buildId) {
    try {
        const response = await fetch(`/api/builds/${buildId}`);
        const build = await response.json();
        
        state.build = build.components;
        state.stats = build.stats;
        
        // Reset component positions for loaded build
        state.componentPositions = {};
        const categories = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'];
        categories.forEach(category => {
            if (state.build[category]) {
                const randomX = Math.random() * (canvas.width - 100);
                const randomY = Math.random() * (canvas.height - 100);
                state.componentPositions[category] = {
                    x: Math.max(0, randomX),
                    y: Math.max(0, randomY),
                    width: 80,
                    height: 60
                };
            }
        });
        
        updateBuildDisplay();
        checkCompatibility();
        updateStats();
        drawPC();
        
        const modal = document.getElementById('loadBuildModal');
        if (modal) modal.style.display = 'none';
        
        showNotification(`Build "${build.name}" loaded!`, 'success');
    } catch (error) {
        console.error('Error loading build:', error);
        showNotification('Error loading build', 'error');
    }
}

async function deleteBuild(buildId) {
    if (confirm('Delete this build?')) {
        try {
            await fetch(`/api/builds/${buildId}`, { method: 'DELETE' });
            loadBuild();
            showNotification('Build deleted', 'info');
        } catch (error) {
            console.error('Error deleting build:', error);
            showNotification('Error deleting build', 'error');
        }
    }
}

// ==================== CANVAS DRAWING ====================
function drawPC() {
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f5f7fa');
    gradient.addColorStop(1, '#c3cfe2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    drawGrid();
    drawComponentSlots();
    drawPlacedComponents();
    drawParticles();
    drawTooltip();
    drawSelectedHighlight();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawComponentSlots() {
    Object.entries(componentPositions).forEach(([category, pos]) => {
        const component = state.build[category];
        const isHovered = state.hoveredSlot === category;
        const isOccupied = !!component;
        
        // Draw slot background
        ctx.fillStyle = isHovered ? componentColors[category] + '40' : componentColors[category] + '20';
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        
        // Draw slot border
        ctx.strokeStyle = isHovered ? componentColors[category] : '#999';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(pos.label, pos.x + pos.width / 2, pos.y + 18);
        
        // Draw component name if present
        if (isOccupied && component) {
            ctx.fillStyle = '#666';
            ctx.font = '11px Arial';
            const text = component.name.substring(0, 12) + (component.name.length > 12 ? '...' : '');
            ctx.fillText(text, pos.x + pos.width / 2, pos.y + pos.height / 2 + 5);
        } else {
            ctx.fillStyle = '#aaa';
            ctx.font = '10px Arial';
            ctx.fillText('Empty', pos.x + pos.width / 2, pos.y + pos.height / 2 + 5);
        }
    });
}

// ==================== PLACED COMPONENTS RENDERING (IMPORT-READY) ====================
function drawPlacedComponents() {
    // Draw components that have been placed and moved on the canvas
    const categories = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'];
    
    categories.forEach(category => {
        if (state.build[category] && state.componentPositions[category]) {
            drawComponent(category, state.build[category], state.componentPositions[category]);
        }
    });
}

function drawComponent(category, component, position) {
    const pos = position;
    const width = pos.width || 80;
    const height = pos.height || 60;
    
    const isSelected = state.selectedOnCanvas === category;
    
    // ==================== COMPONENT DESIGN PLACEHOLDER ====================
    // This structure is ready for importing component images/designs
    // Simply replace the drawing code below with: ctx.drawImage(componentImages[category], pos.x, pos.y, width, height);
    
    // Draw component background
    ctx.fillStyle = isSelected ? componentColors[category] : componentColors[category] + 'dd';
    ctx.fillRect(pos.x, pos.y, width, height);
    
    // Draw border
    ctx.strokeStyle = isSelected ? '#FFD700' : componentColors[category];
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(pos.x, pos.y, width, height);
    
    // Draw component label and info
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(category.toUpperCase(), pos.x + width / 2, pos.y + 15);
    
    ctx.font = '9px Arial';
    ctx.fillStyle = '#fff';
    const name = component.name.substring(0, 10);
    ctx.fillText(name, pos.x + width / 2, pos.y + 32);
    
    // Draw price if space available
    if (component.price) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 8px Arial';
        ctx.fillText(`$${component.price}`, pos.x + width / 2, pos.y + 45);
    }
    
    // Draw drag handle indicator if selected
    if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(pos.x - 2, pos.y - 2, width + 4, height + 4);
        ctx.setLineDash([]);
        
        // Draw move cursor icon
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('⟷', pos.x + width / 2, pos.y - 8);
    }
}

function drawSelectedHighlight() {
    if (state.selectedOnCanvas) {
        const category = state.selectedOnCanvas;
        const pos = state.componentPositions[category];
        
        if (pos) {
            // Draw selection indicator
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(pos.x - 5, pos.y - 5, (pos.width || 80) + 10, (pos.height || 60) + 10);
            ctx.globalAlpha = 1;
        }
    }
}

function drawParticles() {
    state.particles.forEach((particle, index) => {
        particle.update();
        if (particle.life <= 0) {
            state.particles.splice(index, 1);
        } else {
            particle.draw(ctx);
        }
    });
}

function drawTooltip() {
    if (state.hoveredSlot && !state.build[state.hoveredSlot]) {
        const pos = componentPositions[state.hoveredSlot];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(state.mouseX + 10, state.mouseY + 10, 150, 40);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(`Drop ${state.hoveredSlot} here`, state.mouseX + 20, state.mouseY + 25);
    }
    
    // Draw info about selected component
    if (state.selectedOnCanvas && state.componentPositions[state.selectedOnCanvas]) {
        const component = state.build[state.selectedOnCanvas];
        if (component) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(state.mouseX + 10, state.mouseY - 50, 180, 50);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(component.name.substring(0, 20), state.mouseX + 15, state.mouseY - 30);
            
            ctx.font = '9px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`💰 $${component.price}`, state.mouseX + 15, state.mouseY - 15);
            
            ctx.fillStyle = '#4CAF50';
            ctx.fillText('🖱️ Drag to move', state.mouseX + 15, state.mouseY - 3);
        }
    }
}

function showAddAnimation(slot) {
    const pos = componentPositions[slot];
    const centerX = pos.x + pos.width / 2;
    const centerY = pos.y + pos.height / 2;
    
    for (let i = 0; i < 8; i++) {
        state.particles.push(new Particle(centerX, centerY, componentColors[slot]));
    }
}

// ==================== ANIMATION LOOP ====================
function startAnimationLoop() {
    function animate() {
        drawPC();
        requestAnimationFrame(animate);
    }
    animate();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = function(e) {
            e.preventDefault();
            this.closest('.modal').style.display = 'none';
        };
    });
    
    // Outside click closes modal
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    // Build action buttons
    const clearBtn = document.getElementById('clearBuildBtn');
    const saveBtn = document.getElementById('saveBuildBtn');
    const loadBtn = document.getElementById('loadBuildBtn');
    
    if (clearBtn) clearBtn.onclick = (e) => { e.preventDefault(); clearBuild(); };
    if (saveBtn) saveBtn.onclick = (e) => { e.preventDefault(); saveBuild(); };
    if (loadBtn) loadBtn.onclick = (e) => { e.preventDefault(); loadBuild(); };
    
    // Setup remove buttons for component slots
    document.querySelectorAll('.component-slot .remove-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const slot = e.target.closest('.component-slot');
            const category = slot.dataset.slot;
            removeComponent(category);
        };
    });
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '6px';
    notification.style.color = 'white';
    notification.style.fontSize = '14px';
    notification.style.zIndex = '10000';
    notification.style.animation = 'slideInUp 0.3s ease';
    
    if (type === 'success') {
        notification.style.backgroundColor = '#27ae60';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#e74c3c';
    } else {
        notification.style.backgroundColor = '#3498db';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== WINDOW RESIZE HANDLER ====================
window.addEventListener('resize', () => {
    drawPC();
});
