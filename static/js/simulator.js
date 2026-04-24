/**
 * PC Building Simulator - Comprehensive Interactive UI
 * Handles drag-drop, canvas visualization, specs display, and build management
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
    particles: []
};

// Particle effect for assembly feedback
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
        this.vy += 0.1; // gravity
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

// Canvas and 2D drawing
const canvas = document.getElementById('pcCanvas');
const ctx = canvas.getContext('2d');
const canvasRect = canvas.getBoundingClientRect();

// PC Component positions on canvas (for 2D visualization)
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

// Colors for components
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
    setupEventListeners();
    setupCanvasEvents();
    drawPC();
    animationLoop();
});

// Load components from API
async function loadComponents() {
    try {
        const response = await fetch('/api/components');
        state.components = await response.json();
        displayComponents('cpu');
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

// Display components by category
function displayComponents(category) {
    state.selectedCategory = category;
    const componentsList = document.getElementById('componentsList');
    componentsList.innerHTML = '';

    const components = state.components[category] || [];
    
    components.forEach(component => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.draggable = true;
        div.dataset.componentId = component.id;
        div.dataset.category = category;
        
        div.innerHTML = `
            <h4>${component.name}</h4>
            <p><strong>${component.brand}</strong></p>
            <p>Power: ${component.power}W</p>
            <p class="component-price">$${component.price}</p>
            <p class="drag-indicator">🖱️ Drag to add</p>
        `;
        
        // Setup drag event
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        
        // Also allow click to add via modal
        div.addEventListener('click', () => {
            if (event.target.closest('.drag-indicator') === null) {
                openComponentModal(component, category);
            }
        });
        
        componentsList.appendChild(div);
    });
}

// Drag start handler
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
    dragImage.style.padding = '10px';
    dragImage.style.borderRadius = '4px';
    dragImage.style.fontWeight = 'bold';
    dragImage.style.zIndex = '-1000';
    dragImage.textContent = component.name;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 10, 10);
    setTimeout(() => dragImage.remove(), 0);
    
    // Add visual feedback
    this.style.opacity = '0.5';
    this.style.borderColor = componentColors[category];
}

// Drag end handler
function handleDragEnd(e) {
    this.style.opacity = '1';
    this.style.borderColor = '#e0e0e0';
}

// Canvas drag events
function setupCanvasEvents() {
    canvas.addEventListener('dragover', handleCanvasDragOver);
    canvas.addEventListener('drop', handleCanvasDrop);
    canvas.addEventListener('dragleave', handleCanvasDragLeave);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Find which slot is being hovered
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    state.hoveredSlot = null;
    for (const [slotName, pos] of Object.entries(componentPositions)) {
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
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
    
    if (!state.draggingComponent || !state.draggedComponentCategory) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find which slot the drop happened on
    let targetSlot = null;
    for (const [slotName, pos] of Object.entries(componentPositions)) {
        // Map canvas slots to build categories
        const categoryMap = {
            case: 'case',
            motherboard: 'motherboard',
            cpu: 'cpu',
            cooler: 'cooler',
            ram: 'ram',
            gpu: 'gpu',
            psu: 'psu',
            storage: 'storage'
        };
        
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
            targetSlot = categoryMap[slotName];
            break;
        }
    }
    
    if (targetSlot && state.draggedComponentCategory === targetSlot) {
        // Valid drop
        addComponentToBuild(state.draggingComponent, state.draggedComponentCategory);
        
        // Create particles at drop location
        for (let i = 0; i < 8; i++) {
            state.particles.push(new Particle(x, y, componentColors[state.draggedComponentCategory]));
        }
        
        // Show success feedback
        showNotification(`✓ ${state.draggingComponent.name} installed!`);
    } else if (!targetSlot) {
        showNotification('❌ Drop outside valid slot area');
    } else {
        showNotification('❌ Wrong component type for this slot');
    }
    
    state.hoveredSlot = null;
    state.draggingComponent = null;
    state.draggedComponentCategory = null;
}

function handleCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
    
    // Check which slot is being hovered
    state.hoveredSlot = null;
    for (const [slotName, pos] of Object.entries(componentPositions)) {
        if (state.mouseX >= pos.x && state.mouseX <= pos.x + pos.width && 
            state.mouseY >= pos.y && state.mouseY <= pos.y + pos.height) {
            state.hoveredSlot = slotName;
            break;
        }
    }
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check which slot was clicked
    for (const [slotName, pos] of Object.entries(componentPositions)) {
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
            const categoryMap = {
                case: 'case',
                motherboard: 'motherboard',
                cpu: 'cpu',
                cooler: 'cooler',
                ram: 'ram',
                gpu: 'gpu',
                psu: 'psu',
                storage: 'storage'
            };
            
            const category = categoryMap[slotName];
            if (state.build[category]) {
                // Show component details
                const component = state.components[category]?.find(c => c.id === state.build[category]);
                if (component) {
                    openComponentModal(component, category);
                }
            }
            break;
        }
    }
}

// Canvas drag and drop support
canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvas.style.borderColor = '#667eea';
    canvas.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.5)';
});

canvas.addEventListener('dragleave', () => {
    canvas.style.borderColor = '#e0e0e0';
    canvas.style.boxShadow = 'none';
});

// Canvas mouse tracking
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mouseleave', () => {
    state.hoveredSlot = null;
});

// Open component details modal
function openComponentModal(component, category) {
    state.selectedComponent = { ...component, category };
    const modal = document.getElementById('componentModal');
    const detailsDiv = document.getElementById('componentDetails');
    
    let detailsHTML = `<h3>${component.name}</h3>`;
    
    // Display different details based on component type
    for (const [key, value] of Object.entries(component)) {
        if (key !== 'id' && key !== 'brand' && key !== 'name') {
            let displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            detailsHTML += `
                <div class="detail-item">
                    <span class="detail-label">${displayKey}:</span>
                    <span class="detail-value">${value}</span>
                </div>
            `;
        }
    }
    
    detailsDiv.innerHTML = detailsHTML;
    modal.style.display = 'block';
}

// Add component to build
function addComponentToBuild(component, category) {
    state.build[category] = component.id;
    updateBuildDisplay();
    checkCompatibility();
    drawPC();
    
    // Close modal
    document.getElementById('componentModal').style.display = 'none';
}

// Update build display on right panel
function updateBuildDisplay() {
    Object.entries(state.build).forEach(([category, componentId]) => {
        const slot = document.querySelector(`[data-slot="${category}"]`);
        if (slot) {
            if (componentId) {
                const allComponents = state.components[category] || [];
                const component = allComponents.find(c => c.id === componentId);
                if (component) {
                    slot.querySelector('.slot-value').textContent = component.name;
                    slot.style.borderLeftColor = componentColors[category];
                }
            } else {
                slot.querySelector('.slot-value').textContent = 'Not selected';
                slot.style.borderLeftColor = '#667eea';
            }
        }
    });
    updateStats();
}

// Show animation when adding component
let animationFrames = 0;
let animatingSlot = null;

function showAddAnimation(slot) {
    animatingSlot = slot;
    animationFrames = 0;
}

// Draw 2D PC visualization
function drawPC() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid();
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Interactive PC Assembly', 10, 20);
    
    // Draw components
    drawComponentSlots();
    
    // Draw particles
    state.particles = state.particles.filter(p => p.life > 0);
    state.particles.forEach(p => {
        p.update();
        p.draw(ctx);
    });
    
    // Draw tooltip if hovering
    if (state.hoveredSlot) {
        drawTooltip();
    }
}

function drawGrid() {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function drawComponentSlots() {
    // Sort by order
    const sortedSlots = Object.entries(componentPositions).sort((a, b) => a[1].order - b[1].order);
    
    sortedSlots.forEach(([slotName, pos]) => {
        // Map slot names to categories
        const categoryMap = {
            case: 'case',
            motherboard: 'motherboard',
            cpu: 'cpu',
            cooler: 'cooler',
            ram: 'ram',
            gpu: 'gpu',
            psu: 'psu',
            storage: 'storage'
        };
        
        const category = categoryMap[slotName];
        const isInstalled = state.build[category] !== null;
        const isHovered = state.hoveredSlot === slotName;
        
        // Draw slot background
        if (isHovered) {
            ctx.fillStyle = componentColors[category] + '30'; // 30% opacity
            ctx.shadowColor = componentColors[category];
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            ctx.fillStyle = isInstalled ? componentColors[category] : '#e8e8e8';
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        
        // Draw border
        ctx.strokeStyle = isHovered ? componentColors[category] : '#999';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        // Draw label
        ctx.fillStyle = isInstalled ? '#fff' : '#666';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pos.label, pos.x + pos.width / 2, pos.y + pos.height / 2 - 10);
        
        // Draw component name if installed
        if (isInstalled) {
            const component = state.components[category]?.find(c => c.id === state.build[category]);
            if (component) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                const text = component.name.substring(0, 15);
                ctx.fillText(text, pos.x + pos.width / 2, pos.y + pos.height / 2 + 10);
                
                // Draw price
                ctx.fillStyle = '#ffeb3b';
                ctx.font = 'bold 9px Arial';
                ctx.fillText(`$${component.price}`, pos.x + pos.width / 2, pos.y + pos.height / 2 + 22);
            }
        } else {
            // Draw "empty" indicator
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText('Empty', pos.x + pos.width / 2, pos.y + pos.height / 2 + 10);
            
            if (isHovered) {
                ctx.fillStyle = componentColors[category];
                ctx.font = '9px Arial';
                ctx.fillText('Drop here', pos.x + pos.width / 2, pos.y + pos.height / 2 + 22);
            }
        }
        
        ctx.shadowColor = 'transparent';
    });
}

function drawTooltip() {
    const pos = componentPositions[state.hoveredSlot];
    const categoryMap = {
        case: 'case', motherboard: 'motherboard', cpu: 'cpu', cooler: 'cooler',
        ram: 'ram', gpu: 'gpu', psu: 'psu', storage: 'storage'
    };
    const category = categoryMap[state.hoveredSlot];
    const component = state.components[category]?.find(c => c.id === state.build[category]);
    
    if (component) {
        // Show installed component tooltip
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(state.mouseX + 10, state.mouseY - 30, 150, 50);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(component.name.substring(0, 20), state.mouseX + 15, state.mouseY - 10);
        
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffeb3b';
        ctx.fillText(`$${component.price} | ${component.power}W`, state.mouseX + 15, state.mouseY + 5);
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('🖱️ Click to view details', state.mouseX + 15, state.mouseY + 18);
    }
}

// Check compatibility
async function checkCompatibility() {
    try {
        const response = await fetch('/api/compatibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.build)
        });
        const result = await response.json();
        
        const statusDiv = document.getElementById('compatibilityStatus');
        const issuesDiv = document.getElementById('compatibilityIssues');
        
        if (result.compatible) {
            statusDiv.className = 'compatibility-status compatible';
            statusDiv.textContent = '✓ All components compatible';
            issuesDiv.className = 'compatibility-issues';
        } else {
            statusDiv.className = 'compatibility-status incompatible';
            statusDiv.textContent = '✗ Compatibility issues found';
            
            let issuesHTML = '<ul>';
            result.issues.forEach(issue => {
                issuesHTML += `<li>${issue}</li>`;
            });
            issuesHTML += '</ul>';
            issuesDiv.innerHTML = issuesHTML;
            issuesDiv.className = 'compatibility-issues show';
        }
    } catch (error) {
        console.error('Error checking compatibility:', error);
    }
}

// Update build statistics
async function updateStats() {
    try {
        const response = await fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.build)
        });
        const stats = await response.json();
        
        document.getElementById('totalPrice').textContent = `$${stats.totalPrice}`;
        document.getElementById('powerConsumption').textContent = `${stats.totalPower}W`;
        document.getElementById('totalRam').textContent = `${stats.memoryGB.toFixed(1)}GB`;
        document.getElementById('totalStorage').textContent = `${stats.storageGB}GB`;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Remove component from build
function removeComponent(category) {
    state.build[category] = null;
    updateBuildDisplay();
    checkCompatibility();
    drawPC();
    showNotification(`✓ ${category.toUpperCase()} removed`);
}

// Clear all components
function clearBuild() {
    if (confirm('⚠️ Remove all components? This action cannot be undone.')) {
        state.build = {
            cpu: null, motherboard: null, ram: null, gpu: null,
            storage: null, psu: null, case: null, cooler: null
        };
        updateBuildDisplay();
        checkCompatibility();
        drawPC();
        showNotification('🗑️ Build cleared');
    }
}

// Save build
function saveBuild() {
    if (Object.values(state.build).every(v => v === null)) {
        showNotification('❌ Add at least one component first');
        return;
    }
    document.getElementById('saveBuildModal').style.display = 'block';
}

// Confirm save
async function confirmSave() {
    const buildName = document.getElementById('buildNameInput').value || 'Untitled Build';
    
    try {
        const response = await fetch('/api/builds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: buildName, ...state.build })
        });
        
        const result = await response.json();
        showNotification(`💾 Build saved: "${buildName}"`);
        document.getElementById('saveBuildModal').style.display = 'none';
        document.getElementById('buildNameInput').value = '';
    } catch (error) {
        console.error('Error saving build:', error);
        showNotification('❌ Error saving build');
    }
}

// Load build
async function loadBuild() {
    try {
        const response = await fetch('/api/builds');
        const builds = await response.json();
        
        const buildsList = document.getElementById('buildsList');
        buildsList.innerHTML = '';
        
        if (builds.length === 0) {
            buildsList.innerHTML = '<p style="text-align: center; color: #999;">No saved builds yet</p>';
        } else {
            builds.forEach(build => {
                const div = document.createElement('div');
                div.className = 'build-item';
                const date = new Date(build.created_at).toLocaleDateString();
                div.innerHTML = `
                    <div>
                        <div class="build-item-name">${build.name}</div>
                        <div class="build-item-date">${date}</div>
                    </div>
                    <div class="build-item-actions">
                        <button onclick="loadBuildData('${build.id}')">Load</button>
                        <button onclick="deleteBuild('${build.id}')">Delete</button>
                    </div>
                `;
                buildsList.appendChild(div);
            });
        }
        
        document.getElementById('loadBuildModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading builds:', error);
    }
}

// Load specific build data
async function loadBuildData(buildId) {
    try {
        const response = await fetch(`/api/builds/${buildId}`);
        const build = await response.json();
        
        state.build = {
            cpu: build.cpu || null,
            motherboard: build.motherboard || null,
            ram: build.ram || null,
            gpu: build.gpu || null,
            storage: build.storage || null,
            psu: build.psu || null,
            case: build.case || null,
            cooler: build.cooler || null
        };
        
        updateBuildDisplay();
        checkCompatibility();
        drawPC();
        
        document.getElementById('loadBuildModal').style.display = 'none';
        showNotification(`✓ Loaded: ${build.name}`);
    } catch (error) {
        console.error('Error loading build:', error);
    }
}

// Delete build
async function deleteBuild(buildId) {
    if (confirm('Delete this build?')) {
        try {
            await fetch(`/api/builds/${buildId}`, { method: 'DELETE' });
            loadBuild();
            showNotification('🗑️ Build deleted');
        } catch (error) {
            console.error('Error deleting build:', error);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Category tabs
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayComponents(btn.dataset.category);
        });
    });
    
    // Remove component buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slot = e.target.closest('.component-slot');
            removeComponent(slot.dataset.slot);
        });
    });
    
    // Build action buttons
    document.getElementById('saveBuildBtn').addEventListener('click', saveBuild);
    document.getElementById('clearBuildBtn').addEventListener('click', clearBuild);
    document.getElementById('loadBuildBtn').addEventListener('click', loadBuild);
    document.getElementById('confirmSaveBtn').addEventListener('click', confirmSave);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
    
    // Modal click outside to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Add component button in modal
    document.getElementById('addComponentBtn').addEventListener('click', () => {
        if (state.selectedComponent) {
            addComponentToBuild(state.selectedComponent, state.selectedComponent.category);
            showNotification(`✓ ${state.selectedComponent.name} added!`);
        }
    });
}

// Show notification toast
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Animation loop
function animationLoop() {
    drawPC();
    requestAnimationFrame(animationLoop);
}

// Handle window resize
window.addEventListener('resize', () => {
    drawPC();
});
    requestAnimationFrame(animate);

