const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const gridSizeInput = document.getElementById('gridSize');
const sizeValue = document.getElementById('sizeValue');
const zoomLevelInput = document.getElementById('zoomLevel');
const zoomValue = document.getElementById('zoomValue');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const undoBtn = document.getElementById('undoBtn');
const toolBtns = document.querySelectorAll('.tool-btn');
const colorPaletteEl = document.getElementById('colorPalette');
const previewModal = document.getElementById('previewModal');
const previewCanvas = document.getElementById('previewCanvas');
const previewSize = document.getElementById('previewSize');
const confirmDownload = document.getElementById('confirmDownload');
const closeModal = document.querySelector('.close');

let gridSize = 32;
let cellSize = 15;
let isDrawing = false;
let currentTool = 'pen';
let grid = [];
let history = [];
let currentStroke = null;
let colorHistory = new Set();

// 基本カラーパレット
const basicColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#C0C0C0'
];

function initGrid() {
    grid = Array(gridSize).fill().map(() => Array(gridSize).fill('#ffffff'));
    updateCanvasSize();
    history = [];
    saveHistory();
    updateUndoButton();
    drawGrid();
}

function updateCanvasSize() {
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
}

function updateZoom() {
    cellSize = parseInt(zoomLevelInput.value);
    const percentage = Math.round((cellSize / 15) * 100);
    zoomValue.textContent = `${percentage}%`;
    updateCanvasSize();
    drawGrid();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillStyle = grid[row][col];
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
    }

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }
}

function getGridPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    return { x, y };
}

function paintCell(x, y) {
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        const oldColor = grid[y][x];
        let newColor;
        
        if (currentTool === 'pen') {
            newColor = colorPicker.value;
            addColorToHistory(newColor);
        } else if (currentTool === 'eraser') {
            newColor = '#ffffff';
        }
        
        if (oldColor !== newColor) {
            grid[y][x] = newColor;
            currentStroke.push({ x, y, oldColor, newColor });
            drawGrid();
        }
    }
}

function floodFill(x, y, targetColor, replacementColor) {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
    if (grid[y][x] !== targetColor || targetColor === replacementColor) return;
    
    const oldColor = grid[y][x];
    grid[y][x] = replacementColor;
    currentStroke.push({ x, y, oldColor, newColor: replacementColor });
    
    floodFill(x + 1, y, targetColor, replacementColor);
    floodFill(x - 1, y, targetColor, replacementColor);
    floodFill(x, y + 1, targetColor, replacementColor);
    floodFill(x, y - 1, targetColor, replacementColor);
}

function saveHistory() {
    const gridCopy = grid.map(row => [...row]);
    history.push(gridCopy);
    if (history.length > 50) {
        history.shift();
    }
    updateUndoButton();
}

function undo() {
    if (history.length > 1) {
        history.pop();
        grid = history[history.length - 1].map(row => [...row]);
        drawGrid();
        updateUndoButton();
    }
}

function updateUndoButton() {
    undoBtn.disabled = history.length <= 1;
}

function addColorToHistory(color) {
    colorHistory.add(color.toUpperCase());
    updateColorPalette();
}

function updateColorPalette() {
    colorPaletteEl.innerHTML = '';
    
    // 基本カラーを追加
    basicColors.forEach(color => {
        createColorSwatch(color);
    });
    
    // 使用した色を追加
    const recentColors = Array.from(colorHistory).slice(-10).reverse();
    recentColors.forEach(color => {
        if (!basicColors.includes(color)) {
            createColorSwatch(color);
        }
    });
}

function createColorSwatch(color) {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    
    if (color.toUpperCase() === colorPicker.value.toUpperCase()) {
        swatch.classList.add('active');
    }
    
    swatch.addEventListener('click', () => {
        colorPicker.value = color;
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
    });
    
    colorPaletteEl.appendChild(swatch);
}

function showPreview() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    const tempCtx = tempCanvas.getContext('2d');
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            tempCtx.fillStyle = grid[row][col];
            tempCtx.fillRect(col, row, 1, 1);
        }
    }
    
    previewCanvas.width = gridSize;
    previewCanvas.height = gridSize;
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.drawImage(tempCanvas, 0, 0);
    
    const scale = Math.min(300 / gridSize, 300 / gridSize);
    previewCanvas.style.width = (gridSize * scale) + 'px';
    previewCanvas.style.height = (gridSize * scale) + 'px';
    
    previewSize.textContent = `${gridSize} × ${gridSize} px`;
    previewModal.style.display = 'block';
}

function downloadImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    const tempCtx = tempCanvas.getContext('2d');
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            tempCtx.fillStyle = grid[row][col];
            tempCtx.fillRect(col, row, 1, 1);
        }
    }
    
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = tempCanvas.toDataURL();
    link.click();
    
    previewModal.style.display = 'none';
}

// Event Listeners
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    currentStroke = [];
    const pos = getGridPosition(e);
    
    if (currentTool === 'fill') {
        const targetColor = grid[pos.y][pos.x];
        const replacementColor = colorPicker.value;
        addColorToHistory(replacementColor);
        floodFill(pos.x, pos.y, targetColor, replacementColor);
        drawGrid();
        if (currentStroke.length > 0) {
            saveHistory();
        }
    } else {
        paintCell(pos.x, pos.y);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing && currentTool !== 'fill') {
        const pos = getGridPosition(e);
        paintCell(pos.x, pos.y);
    }
});

canvas.addEventListener('mouseup', () => {
    if (currentTool == `pen` && isDrawing && currentStroke && currentStroke.length > 0) {
        saveHistory();
    }
    isDrawing = false;
    currentStroke = null;
});

canvas.addEventListener('mouseleave', () => {
    if (currentTool == 'pen' && isDrawing && currentStroke && currentStroke.length > 0) {
        saveHistory();
    }
    isDrawing = false;
    currentStroke = null;
});

gridSizeInput.addEventListener('input', (e) => {
    gridSize = parseInt(e.target.value);
    sizeValue.textContent = `${gridSize}x${gridSize}`;
    initGrid();
});

zoomLevelInput.addEventListener('input', updateZoom);

clearBtn.addEventListener('click', () => {
    if (confirm('キャンバスをクリアしますか?')) {
        initGrid();
    }
});

undoBtn.addEventListener('click', undo);

downloadBtn.addEventListener('click', showPreview);

confirmDownload.addEventListener('click', downloadImage);

closeModal.addEventListener('click', () => {
    previewModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = 'none';
    }
});

colorPicker.addEventListener('input', () => {
    updateColorPalette();
});

toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
    });
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

// 初期化
initGrid();
updateColorPalette();