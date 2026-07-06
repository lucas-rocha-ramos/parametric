// ============================================================
// ===== CONFIGURAÇÕES E CONSTANTES =====
// ============================================================

const APERTURE_VALUES = [
    { label: 'f/1.4', value: 1.4, blur: 12 },
    { label: 'f/2.0', value: 2.0, blur: 10 },
    { label: 'f/2.8', value: 2.8, blur: 8 },
    { label: 'f/4.0', value: 4.0, blur: 6 },
    { label: 'f/5.6', value: 5.6, blur: 4 },
    { label: 'f/8.0', value: 8.0, blur: 2.5 },
    { label: 'f/11', value: 11, blur: 1.5 },
    { label: 'f/16', value: 16, blur: 0.8 },
    { label: 'f/22', value: 22, blur: 0.3 }
];

const COMPOSITIONS = [
    { id: 'rule-of-thirds', label: 'REGRA DOS TERÇOS', positions: ['padrão', 'invertido', 'vertical', 'horizontal'] },
    { id: 'symmetry', label: 'SIMETRIA', positions: ['vertical', 'horizontal', 'central'] },
    { id: 'phi-grid', label: 'PROPORÇÃO ÁUREA', positions: ['padrão', 'invertido'] },
    { id: 'fibonacci-spiral', label: 'ESPIRAL DE FIBONACCI', positions: ['superior-esquerdo', 'superior-direito', 'inferior-esquerdo', 'inferior-direito'] },
    { id: 'golden-triangles', label: 'TRIÂNGULOS ÁUREOS', positions: ['superior', 'inferior', 'esquerda', 'direita'] },
    { id: 'vanishing-point', label: 'PONTO DE FUGA', positions: ['centro', 'superior', 'inferior', 'esquerda', 'direita'] },
    { id: 'framing-depth', label: 'ENQUADRAMENTO', positions: ['padrão', 'invertido'] },
    { id: 'landscape-depth', label: 'PROFUNDIDADE', positions: ['superior', 'inferior'] },
    { id: 'leading-lines', label: 'LINHAS GUIA', positions: ['direita', 'esquerda', 'centro'] },
    { id: 'lines-patterns', label: 'PADRÕES E LINHAS', positions: ['horizontal', 'vertical', 'diagonal', 'curvo'] },
    { id: 'fill-the-frame', label: 'PREENCHE O QUADRO', positions: ['centro', 'superior', 'inferior'] },
    { id: 'negative-space', label: 'ESPAÇO NEGATIVO', positions: ['superior', 'inferior', 'esquerda', 'direita'] },
    { id: 'left-to-right', label: 'LEITURA ESQUERDA-DIREITA', positions: ['esquerda→direita', 'direita→esquerda'] },
    { id: 'dynamic-symmetry', label: 'SIMETRIA DINÂMICA', positions: ['padrão', 'invertido'] },
    { id: 'harmonic-armature', label: 'ARMADURA HARMÔNICA', positions: ['padrão', 'refletido'] }
];

// ============================================================
// ===== ESTADO GLOBAL =====
// ============================================================

const state = {
    currentComposition: COMPOSITIONS[0],
    currentPositionIndex: 0,
    facingMode: 'environment',
    currentMode: 'camera',
    currentApertureIndex: 2,
    isApertureActive: false,
    isRecording: false,
    isCameraReady: false,
    zoom: 1,
    stream: null,
    bodyPixModel: null,
    segmentationReady: false,
    lastSegmentation: null,
    isProcessing: false,
    frameCount: 0,
    processEveryNFrames: 2,
    mediaRecorder: null,
    recordedChunks: [],
    recordingTimer: null,
    seconds: 0,
    availableCameras: [],
    currentCameraIndex: 0,
    featherRadius: 5,
    capturedPhotoData: null,
    capturedMaskData: null
};

// ============================================================
// ===== REFERÊNCIAS DOM =====
// ============================================================

const dom = {
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas-output'),
    overlayGrid: document.getElementById('overlayGrid'),
    guideLabel: document.getElementById('guideLabel'),
    focusIndicator: document.getElementById('focusIndicator'),
    apertureControl: document.getElementById('apertureControl'),
    apertureValue: document.getElementById('apertureValue'),
    apertureSlider: document.getElementById('apertureSlider'),
    zoomSlider: document.getElementById('zoomSlider'),
    zoomThumb: document.getElementById('zoomThumb'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    cameraSelector: document.getElementById('cameraSelector'),
    compScore: document.getElementById('compScore'),
    lightScore: document.getElementById('lightScore'),
    frameScore: document.getElementById('frameScore'),
    overallScore: document.getElementById('overallScore'),
    timerBadge: document.getElementById('timerBadge'),
    aiSuggestion: document.getElementById('aiSuggestion'),
    shutterBtn: document.getElementById('shutterBtn'),
    flipBtn: document.getElementById('flipBtn'),
    apertureBtn: document.getElementById('apertureBtn'),
    compositionScroll: document.getElementById('compositionScroll'),
    videoWrapper: document.getElementById('videoWrapper')
};

// ============================================================
// ===== FUNÇÕES UTILITÁRIAS =====
// ============================================================

function getCurrentPosition() {
    const comp = state.currentComposition;
    return comp.positions[state.currentPositionIndex % comp.positions.length];
}

function updateLabel() {
    const pos = getCurrentPosition();
    dom.guideLabel.innerHTML = `${state.currentComposition.label} <span class="position-indicator">📍 ${pos}</span>`;
}

function updateChips() {
    document.querySelectorAll('.comp-chip').forEach(chip => {
        const id = chip.dataset.id;
        const isActive = id === state.currentComposition.id;
        chip.classList.toggle('active', isActive);
        if (isActive) {
            const pos = getCurrentPosition();
            const posDisplay = chip.querySelector('.pos-indicator');
            if (posDisplay) posDisplay.textContent = `📍 ${pos}`;
        }
    });
}

function showSuggestion(text) {
    dom.aiSuggestion.textContent = text;
}

function getAperture() {
    return APERTURE_VALUES[state.currentApertureIndex];
}

// ============================================================
// ===== RENDERIZAÇÃO DE GUIAS =====
// ============================================================

function renderGuideOverlay(comp, position) {
    const grid = dom.overlayGrid;
    grid.innerHTML = '';
    updateLabel();

    const container = document.createElement('div');
    container.style.cssText = 'width:100%;height:100%;position:relative;';

    const id = comp.id;
    const isInverted = position === 'invertido' || position === 'refletido' || position === 'inferior';

    switch (id) {
        case 'rule-of-thirds': {
            const lines = [
                { left: '33.33%', top: '0', width: '1px', height: '100%' },
                { left: '66.66%', top: '0', width: '1px', height: '100%' },
                { top: '33.33%', left: '0', width: '100%', height: '1px' },
                { top: '66.66%', left: '0', width: '100%', height: '1px' }
            ];
            if (position === 'vertical') lines.splice(2, 2);
            else if (position === 'horizontal') lines.splice(0, 2);
            lines.forEach(l => {
                const div = document.createElement('div');
                div.className = 'grid-line';
                Object.assign(div.style, l);
                container.appendChild(div);
            });
            break;
        }
        case 'symmetry': {
            if (position === 'vertical') {
                const div = document.createElement('div');
                div.className = 'grid-line';
                div.style.cssText = 'left:50%;top:0;width:1px;height:100%;';
                container.appendChild(div);
            } else if (position === 'horizontal') {
                const div = document.createElement('div');
                div.className = 'grid-line';
                div.style.cssText = 'top:50%;left:0;width:100%;height:1px;';
                container.appendChild(div);
            } else {
                const div1 = document.createElement('div');
                div1.className = 'grid-line';
                div1.style.cssText = 'left:50%;top:0;width:1px;height:100%;';
                container.appendChild(div1);
                const div2 = document.createElement('div');
                div2.className = 'grid-line';
                div2.style.cssText = 'top:50%;left:0;width:100%;height:1px;';
                container.appendChild(div2);
            }
            break;
        }
        case 'phi-grid': {
            const ratio = isInverted ? 61.8 : 38.2;
            const div1 = document.createElement('div');
            div1.className = 'grid-line';
            div1.style.cssText = `left:${ratio}%;top:0;width:1px;height:100%;`;
            container.appendChild(div1);
            const div2 = document.createElement('div');
            div2.className = 'grid-line';
            div2.style.cssText = `top:${ratio}%;left:0;width:100%;height:1px;`;
            container.appendChild(div2);
            break;
        }
        case 'fibonacci-spiral': {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.cssText = 'position:absolute;top:0;left:0;';
            let cx = 50, cy = 50;
            if (position === 'superior-esquerdo') { cx = 20; cy = 20; }
            else if (position === 'superior-direito') { cx = 80; cy = 20; }
            else if (position === 'inferior-esquerdo') { cx = 20; cy = 80; }
            else if (position === 'inferior-direito') { cx = 80; cy = 80; }
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M${cx},${cy} Q${cx+10},${cy-10} ${cx+20},${cy} Q${cx+30},${cy+10} ${cx+20},${cy+20} Q${cx+10},${cy+30} ${cx},${cy+20} Q${cx-10},${cy+10} ${cx},${cy}`);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'rgba(255,215,0,0.35)');
            path.setAttribute('stroke-width', '1');
            svg.appendChild(path);
            container.appendChild(svg);
            break;
        }
        case 'golden-triangles': {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.cssText = 'position:absolute;top:0;left:0;';
            let points = '50,5 5,95 95,95';
            if (position === 'inferior') points = '50,95 5,5 95,5';
            else if (position === 'esquerda') points = '5,50 95,5 95,95';
            else if (position === 'direita') points = '95,50 5,5 5,95';
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', points);
            poly.setAttribute('fill', 'none');
            poly.setAttribute('stroke', 'rgba(255,215,0,0.3)');
            poly.setAttribute('stroke-width', '0.8');
            svg.appendChild(poly);
            container.appendChild(svg);
            break;
        }
        case 'vanishing-point': {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.cssText = 'position:absolute;top:0;left:0;';
            let vx = 50, vy = 50;
            if (position === 'superior') { vx = 50; vy = 10; }
            else if (position === 'inferior') { vx = 50; vy = 90; }
            else if (position === 'esquerda') { vx = 10; vy = 50; }
            else if (position === 'direita') { vx = 90; vy = 50; }
            const lines = [[vx,vy,10,10], [vx,vy,90,10], [vx,vy,10,90], [vx,vy,90,90]];
            lines.forEach(([x1,y1,x2,y2]) => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1 + '%');
                line.setAttribute('y1', y1 + '%');
                line.setAttribute('x2', x2 + '%');
                line.setAttribute('y2', y2 + '%');
                line.setAttribute('stroke', 'rgba(255,215,0,0.12)');
                line.setAttribute('stroke-width', '0.5');
                svg.appendChild(line);
            });
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', vx + '%');
            dot.setAttribute('cy', vy + '%');
            dot.setAttribute('r', '2');
            dot.setAttribute('fill', 'rgba(255,215,0,0.5)');
            svg.appendChild(dot);
            container.appendChild(svg);
            break;
        }
        default: {
            const div1 = document.createElement('div');
            div1.className = 'grid-line';
            div1.style.cssText = 'left:33.33%;top:0;width:1px;height:100%;opacity:0.15;';
            container.appendChild(div1);
            const div2 = document.createElement('div');
            div2.className = 'grid-line';
            div2.style.cssText = 'left:66.66%;top:0;width:1px;height:100%;opacity:0.15;';
            container.appendChild(div2);
            const div3 = document.createElement('div');
            div3.className = 'grid-line';
            div3.style.cssText = 'top:33.33%;left:0;width:100%;height:1px;opacity:0.15;';
            container.appendChild(div3);
            const div4 = document.createElement('div');
            div4.className = 'grid-line';
            div4.style.cssText = 'top:66.66%;left:0;width:100%;height:1px;opacity:0.15;';
            container.appendChild(div4);
            break;
        }
    }
    grid.appendChild(container);
}

// ============================================================
// ===== DESFOQUE PROFISSIONAL =====
// ============================================================

function applyProfessionalBlur(imageData, width, height, radius, mask, feather) {
    if (radius < 0.3) return imageData;

    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    const r = Math.round(radius);
    const featherPx = feather || 5;

    const kernelSize = r * 2 + 1;
    const kernel = [];
    let sum = 0;
    const sigma = r * 0.5;

    for (let i = -r; i <= r; i++) {
        const val = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel.push(val);
        sum += val;
    }

    const half = r;
    const hasMask = mask && mask.length > 0;

    if (!hasMask) {
        // Horizontal
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let rSum = 0, gSum = 0, bSum = 0;
                let weightSum = 0;
                for (let i = 0; i < kernel.length; i++) {
                    const dx = i - half;
                    const px = Math.min(width - 1, Math.max(0, x + dx));
                    const pIdx = (y * width + px) * 4;
                    const w = kernel[i];
                    rSum += tempData[pIdx] * w;
                    gSum += tempData[pIdx + 1] * w;
                    bSum += tempData[pIdx + 2] * w;
                    weightSum += w;
                }
                if (weightSum > 0) {
                    data[idx] = rSum / weightSum;
                    data[idx + 1] = gSum / weightSum;
                    data[idx + 2] = bSum / weightSum;
                }
            }
        }
        const tempV = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let rSum = 0, gSum = 0, bSum = 0;
                let weightSum = 0;
                for (let i = 0; i < kernel.length; i++) {
                    const dy = i - half;
                    const py = Math.min(height - 1, Math.max(0, y + dy));
                    const pIdx = (py * width + x) * 4;
                    const w = kernel[i];
                    rSum += tempV[pIdx] * w;
                    gSum += tempV[pIdx + 1] * w;
                    bSum += tempV[pIdx + 2] * w;
                    weightSum += w;
                }
                if (weightSum > 0) {
                    data[idx] = rSum / weightSum;
                    data[idx + 1] = gSum / weightSum;
                    data[idx + 2] = bSum / weightSum;
                }
            }
        }
        return imageData;
    }

    // Com máscara - blur apenas no fundo
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let isPerson = mask[y * width + x] > 0.5;
            
            let blendFactor = 0;
            if (featherPx > 0) {
                let edgeCount = 0;
                let total = 0;
                for (let dy = -featherPx; dy <= featherPx; dy++) {
                    for (let dx = -featherPx; dx <= featherPx; dx++) {
                        const px = Math.min(width - 1, Math.max(0, x + dx));
                        const py = Math.min(height - 1, Math.max(0, y + dy));
                        if (mask[py * width + px] > 0.5) edgeCount++;
                        total++;
                    }
                }
                blendFactor = edgeCount / total;
                blendFactor = 1 / (1 + Math.exp(-10 * (blendFactor - 0.5)));
            }

            if (!isPerson || (blendFactor > 0.1 && blendFactor < 0.9)) {
                let rSum = 0, gSum = 0, bSum = 0;
                let weightSum = 0;
                
                for (let i = 0; i < kernel.length; i++) {
                    const dx = i - half;
                    const px = Math.min(width - 1, Math.max(0, x + dx));
                    const pIdx = (y * width + px) * 4;
                    const w = kernel[i];
                    rSum += tempData[pIdx] * w;
                    gSum += tempData[pIdx + 1] * w;
                    bSum += tempData[pIdx + 2] * w;
                    weightSum += w;
                }
                
                if (weightSum > 0) {
                    const blurR = rSum / weightSum;
                    const blurG = gSum / weightSum;
                    const blurB = bSum / weightSum;
                    
                    if (isPerson) {
                        const mix = Math.pow(blendFactor, 1.5);
                        data[idx] = data[idx] * mix + blurR * (1 - mix);
                        data[idx + 1] = data[idx + 1] * mix + blurG * (1 - mix);
                        data[idx + 2] = data[idx + 2] * mix + blurB * (1 - mix);
                    } else {
                        data[idx] = blurR;
                        data[idx + 1] = blurG;
                        data[idx + 2] = blurB;
                    }
                }
            }
        }
    }

    const tempV = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let isPerson = mask[y * width + x] > 0.5;
            
            let blendFactor = 0;
            if (featherPx > 0) {
                let edgeCount = 0;
                let total = 0;
                for (let dy = -featherPx; dy <= featherPx; dy++) {
                    for (let dx = -featherPx; dx <= featherPx; dx++) {
                        const px = Math.min(width - 1, Math.max(0, x + dx));
                        const py = Math.min(height - 1, Math.max(0, y + dy));
                        if (mask[py * width + px] > 0.5) edgeCount++;
                        total++;
                    }
                }
                blendFactor = edgeCount / total;
                blendFactor = 1 / (1 + Math.exp(-10 * (blendFactor - 0.5)));
            }

            if (!isPerson || (blendFactor > 0.1 && blendFactor < 0.9)) {
                let rSum = 0, gSum = 0, bSum = 0;
                let weightSum = 0;
                
                for (let i = 0; i < kernel.length; i++) {
                    const dy = i - half;
                    const py = Math.min(height - 1, Math.max(0, y + dy));
                    const pIdx = (py * width + x) * 4;
                    const w = kernel[i];
                    rSum += tempV[pIdx] * w;
                    gSum += tempV[pIdx + 1] * w;
                    bSum += tempV[pIdx + 2] * w;
                    weightSum += w;
                }
                
                if (weightSum > 0) {
                    const blurR = rSum / weightSum;
                    const blurG = gSum / weightSum;
                    const blurB = bSum / weightSum;
                    
                    if (isPerson) {
                        const mix = Math.pow(blendFactor, 1.5);
                        data[idx] = data[idx] * mix + blurR * (1 - mix);
                        data[idx + 1] = data[idx + 1] * mix + blurG * (1 - mix);
                        data[idx + 2] = data[idx + 2] * mix + blurB * (1 - mix);
                    } else {
                        data[idx] = blurR;
                        data[idx + 1] = blurG;
                        data[idx + 2] = blurB;
                    }
                }
            }
        }
    }

    return imageData;
}

function smoothMask(mask, width, height, iterations) {
    iterations = iterations || 2;
    const temp = new Float32Array(mask);
    
    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let sum = 0;
                let count = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const px = x + dx;
                        const py = y + dy;
                        const pIdx = py * width + px;
                        sum += mask[pIdx];
                        count++;
                    }
                }
                temp[idx] = sum / count;
            }
        }
        for (let i = 0; i < mask.length; i++) {
            mask[i] = temp[i];
        }
    }
    return mask;
}

// ============================================================
// ===== GERENCIAMENTO DA CÂMERA =====
// ============================================================

async function detectCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        state.availableCameras = devices.filter(d => d.kind === 'videoinput');
        renderCameraButtons();
        return state.availableCameras;
    } catch (e) {
        console.error('Erro ao detectar câmeras:', e);
        return [];
    }
}

function renderCameraButtons() {
    const container = dom.cameraSelector;
    container.innerHTML = '';
    state.availableCameras.forEach((cam, idx) => {
        const btn = document.createElement('button');
        btn.className = `cam-btn ${idx === state.currentCameraIndex ? 'active' : ''}`;
        btn.textContent = cam.label ? cam.label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) : `Cam ${idx+1}`;
        btn.dataset.index = idx;
        btn.addEventListener('click', () => switchCamera(idx));
        container.appendChild(btn);
    });
}

async function switchCamera(index) {
    if (index === state.currentCameraIndex) return;
    if (!state.availableCameras[index]) return;
    state.currentCameraIndex = index;
    const deviceId = state.availableCameras[index].deviceId;
    stopCamera();
    await startCamera(deviceId);
    document.querySelectorAll('.cam-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(t => t.stop());
        state.stream = null;
        state.isCameraReady = false;
    }
}

async function startCamera(deviceId = null) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Navegador não suporta câmera');
        }

        const constraints = {
            video: {
                facingMode: deviceId ? undefined : state.facingMode,
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        };

        if (!deviceId) {
            delete constraints.video.deviceId;
        }

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (dom.video) {
            dom.video.srcObject = state.stream;
            await dom.video.play();
            state.isCameraReady = true;
            showSuggestion('📸 Câmera pronta!');

            setTimeout(() => {
                const rect = dom.video.getBoundingClientRect();
                dom.canvas.width = Math.floor(rect.width * 0.7);
                dom.canvas.height = Math.floor(rect.height * 0.7);
            }, 100);
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showPermissionError('Permissão negada. Permita o acesso à câmera nas configurações do Safari.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showPermissionError('Nenhuma câmera encontrada.');
        } else {
            showPermissionError(error.message || 'Erro ao acessar a câmera.');
        }
    }
}

function setZoom(value) {
    state.zoom = Math.max(1, Math.min(4, value));
    if (dom.video) {
        dom.video.style.transform = `scale(${state.zoom})`;
    }
    const pct = ((state.zoom - 1) / 3) * 100;
    if (dom.zoomThumb) dom.zoomThumb.style.top = (100 - pct) + '%';
    showSuggestion(`🔍 ${state.zoom.toFixed(1)}x`);
}

// ============================================================
// ===== IA DE SEGMENTAÇÃO (BODYPIX) =====
// ============================================================

async function loadBodyPix() {
    try {
        dom.loadingIndicator.classList.add('active');
        dom.loadingIndicator.querySelector('.text').textContent = '🔄 Carregando IA de segmentação...';

        state.bodyPixModel = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });

        state.segmentationReady = true;
        dom.loadingIndicator.classList.remove('active');
        showSuggestion('🧠 IA de segmentação pronta!');
        console.log('✅ BodyPix carregado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar BodyPix:', error);
        dom.loadingIndicator.classList.remove('active');
        dom.loadingIndicator.querySelector('.text').textContent = '⚠️ IA indisponível';
        showSuggestion('⚠️ Modo IA indisponível - use Foto ou Vídeo');
        state.segmentationReady = false;
    }
}

async function processWithBodyPix() {
    if (!dom.video || !dom.canvas || !state.bodyPixModel || !state.segmentationReady || state.isProcessing) {
        return;
    }

    try {
        state.isProcessing = true;

        state.frameCount++;
        if (state.frameCount % state.processEveryNFrames !== 0) {
            state.isProcessing = false;
            return;
        }

        const displayWidth = dom.canvas.width || 640;
        const displayHeight = dom.canvas.height || 480;

        const segmentation = await state.bodyPixModel.segmentPerson(dom.video, {
            flipHorizontal: state.facingMode === 'user',
            internalResolution: 'high',
            segmentationThreshold: 0.55,
            maxDetections: 5,
            scoreThreshold: 0.4
        });

        if (!segmentation || !segmentation.data) {
            state.isProcessing = false;
            return;
        }

        state.lastSegmentation = segmentation;

        const ctx = dom.canvas.getContext('2d');
        ctx.drawImage(dom.video, 0, 0, displayWidth, displayHeight);
        const imageData = ctx.getImageData(0, 0, displayWidth, displayHeight);

        const segData = segmentation.data;
        const segWidth = segmentation.width;
        const segHeight = segmentation.height;
        const mask = new Float32Array(displayWidth * displayHeight);

        for (let y = 0; y < displayHeight; y++) {
            for (let x = 0; x < displayWidth; x++) {
                const srcX = (x / displayWidth) * segWidth;
                const srcY = (y / displayHeight) * segHeight;
                
                const x0 = Math.floor(srcX);
                const x1 = Math.min(x0 + 1, segWidth - 1);
                const y0 = Math.floor(srcY);
                const y1 = Math.min(y0 + 1, segHeight - 1);
                
                const fx = srcX - x0;
                const fy = srcY - y0;
                
                const idx00 = y0 * segWidth + x0;
                const idx01 = y0 * segWidth + x1;
                const idx10 = y1 * segWidth + x0;
                const idx11 = y1 * segWidth + x1;
                
                const v00 = segData[idx00];
                const v01 = segData[idx01];
                const v10 = segData[idx10];
                const v11 = segData[idx11];
                
                const v0 = v00 * (1 - fx) + v01 * fx;
                const v1 = v10 * (1 - fx) + v11 * fx;
                mask[y * displayWidth + x] = v0 * (1 - fy) + v1 * fy;
            }
        }

        smoothMask(mask, displayWidth, displayHeight, 1);

        const aperture = getAperture();
        const blurRadius = aperture.blur * 0.8;

        if (blurRadius > 0.3) {
            applyProfessionalBlur(imageData, displayWidth, displayHeight, blurRadius, mask, state.featherRadius);
        }

        ctx.putImageData(imageData, 0, 0);
        dom.apertureValue.textContent = aperture.label;

        state.isProcessing = false;
    } catch (error) {
        console.error('Erro no processamento:', error);
        state.isProcessing = false;
    }
}

// ============================================================
// ===== LOOP PRINCIPAL =====
// ============================================================

let animationFrame = null;

function startProcessingLoop() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }

    const processLoop = async () => {
        if (state.currentMode === 'portrait' || state.currentMode === 'cinema') {
            if (state.segmentationReady && state.bodyPixModel) {
                await processWithBodyPix();
            } else if (!state.segmentationReady) {
                await loadBodyPix();
            }
        } else {
            const ctx = dom.canvas?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
            }
        }
        animationFrame = requestAnimationFrame(processLoop);
    };

    processLoop();
}

// ============================================================
// ===== EDITOR DE FOTO - PÓS-PROCESSAMENTO =====
// ============================================================

let editorState = {
    imageData: null,
    originalImageData: null,
    maskData: null,
    apertureIndex: 2,
    featherRadius: 5,
    isProcessing: false,
    canvas: null,
    ctx: null,
    imageUrl: null
};

function createPhotoEditor(imageUrl, maskData = null) {
    // Remover editor existente
    const existingEditor = document.querySelector('.photo-editor');
    if (existingEditor) existingEditor.remove();

    const editor = document.createElement('div');
    editor.className = 'photo-editor active';
    editor.innerHTML = `
        <div class="header">
            <h3>✎ Editar Foto</h3>
            <button class="close-btn" id="editorClose">✕</button>
        </div>
        <div class="preview-container">
            <canvas id="editorCanvas"></canvas>
        </div>
        <div class="controls-editor">
            <div class="slider-group">
                <div class="label-row">
                    <label>📸 Abertura</label>
                    <span class="value" id="editorApertureValue">f/2.8</span>
                </div>
                <input type="range" id="editorApertureSlider" 
                       min="0" max="${APERTURE_VALUES.length - 1}" 
                       value="${state.currentApertureIndex}" step="1" />
            </div>
            <div class="slider-group">
                <div class="label-row">
                    <label>✨ Suavização de bordas</label>
                    <span class="value" id="editorFeatherValue">5px</span>
                </div>
                <input type="range" id="editorFeatherSlider" 
                       min="1" max="15" value="5" step="1" />
            </div>
            <div class="action-row">
                <button class="btn-reset" id="editorReset">↺ Reset</button>
                <button class="btn-cancel-editor" id="editorCancel">Cancelar</button>
                <button class="btn-save-editor" id="editorSave">💾 Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(editor);

    // Inicializar editor
    const canvas = document.getElementById('editorCanvas');
    const ctx = canvas.getContext('2d');
    
    editorState.imageUrl = imageUrl;
    editorState.maskData = maskData;
    editorState.canvas = canvas;
    editorState.ctx = ctx;
    editorState.apertureIndex = state.currentApertureIndex;
    editorState.featherRadius = 5;
    
    // Carregar imagem
    const img = new Image();
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        editorState.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        editorState.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Aplicar efeito inicial
        applyEditorEffect();
        showSuggestion('✎ Ajuste os controles e salve');
    };
    img.onerror = function() {
        console.error('Erro ao carregar imagem');
        showSuggestion('⚠️ Erro ao carregar imagem');
    };
    img.src = imageUrl;

    // Eventos do editor
    document.getElementById('editorClose').addEventListener('click', closeEditor);
    document.getElementById('editorCancel').addEventListener('click', closeEditor);
    document.getElementById('editorReset').addEventListener('click', resetEditor);
    document.getElementById('editorSave').addEventListener('click', saveEditorPhoto);

    document.getElementById('editorApertureSlider').addEventListener('input', function() {
        editorState.apertureIndex = parseInt(this.value);
        const aperture = APERTURE_VALUES[editorState.apertureIndex];
        document.getElementById('editorApertureValue').textContent = aperture.label;
        applyEditorEffect();
    });

    document.getElementById('editorFeatherSlider').addEventListener('input', function() {
        editorState.featherRadius = parseInt(this.value);
        document.getElementById('editorFeatherValue').textContent = `${editorState.featherRadius}px`;
        applyEditorEffect();
    });
}

function closeEditor() {
    const editor = document.querySelector('.photo-editor');
    if (editor) {
        editor.classList.remove('active');
        setTimeout(() => editor.remove(), 300);
        showSuggestion('📸 Edição cancelada');
    }
}

function resetEditor() {
    if (editorState.originalImageData && editorState.canvas) {
        editorState.imageData = new ImageData(
            new Uint8ClampedArray(editorState.originalImageData.data),
            editorState.originalImageData.width,
            editorState.originalImageData.height
        );
        // Reset sliders
        document.getElementById('editorApertureSlider').value = 2;
        document.getElementById('editorFeatherSlider').value = 5;
        editorState.apertureIndex = 2;
        editorState.featherRadius = 5;
        document.getElementById('editorApertureValue').textContent = 'f/2.8';
        document.getElementById('editorFeatherValue').textContent = '5px';
        applyEditorEffect();
        showSuggestion('↺ Reset aplicado');
    }
}

function saveEditorPhoto() {
    if (!editorState.canvas) return;
    
    const dataUrl = editorState.canvas.toDataURL('image/jpeg', 1.0);
    downloadMedia(dataUrl, 'jpg');
    showSuggestion('💾 Foto salva com sucesso!');
    setTimeout(() => closeEditor(), 500);
}

function applyEditorEffect() {
    if (!editorState.imageData || !editorState.canvas || editorState.isProcessing) return;
    
    try {
        editorState.isProcessing = true;
        
        const canvas = editorState.canvas;
        const ctx = editorState.ctx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Começar com a imagem original
        const imageData = new ImageData(
            new Uint8ClampedArray(editorState.originalImageData.data),
            width,
            height
        );
        
        const aperture = APERTURE_VALUES[editorState.apertureIndex];
        const blurRadius = aperture.blur * 0.8;
        const featherRadius = editorState.featherRadius;
        
        // Se tiver máscara, aplicar desfoque
        if (editorState.maskData && blurRadius > 0.3) {
            const maskWidth = 640;
            const maskHeight = 480;
            const mask = new Float32Array(width * height);
            
            // Redimensionar máscara
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const srcX = (x / width) * maskWidth;
                    const srcY = (y / height) * maskHeight;
                    const x0 = Math.floor(srcX);
                    const x1 = Math.min(x0 + 1, maskWidth - 1);
                    const y0 = Math.floor(srcY);
                    const y1 = Math.min(y0 + 1, maskHeight - 1);
                    const fx = srcX - x0;
                    const fy = srcY - y0;
                    
                    const idx00 = y0 * maskWidth + x0;
                    const idx01 = y0 * maskWidth + x1;
                    const idx10 = y1 * maskWidth + x0;
                    const idx11 = y1 * maskWidth + x1;
                    
                    const v00 = editorState.maskData[idx00] || 0;
                    const v01 = editorState.maskData[idx01] || 0;
                    const v10 = editorState.maskData[idx10] || 0;
                    const v11 = editorState.maskData[idx11] || 0;
                    
                    const v0 = v00 * (1 - fx) + v01 * fx;
                    const v1 = v10 * (1 - fx) + v11 * fx;
                    mask[y * width + x] = v0 * (1 - fy) + v1 * fy;
                }
            }
            
            applyProfessionalBlur(imageData, width, height, blurRadius, mask, featherRadius);
        }
        
        ctx.putImageData(imageData, 0, 0);
        editorState.imageData = imageData;
        editorState.isProcessing = false;
        
    } catch (error) {
        console.error('Erro no editor:', error);
        editorState.isProcessing = false;
    }
}

// ============================================================
// ===== CAPTURA DE FOTO E VÍDEO =====
// ============================================================

function capturePhoto(portrait = false) {
    if (!dom.video || !state.isCameraReady) {
        showSuggestion('⏳ Aguarde...');
        return;
    }

    const canvas = document.createElement('canvas');
    const width = dom.video.videoWidth || 640;
    const height = dom.video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    let maskData = null;
    let processedUrl = null;

    if (portrait && state.segmentationReady && state.lastSegmentation) {
        ctx.drawImage(dom.video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        const segData = state.lastSegmentation.data;
        const segWidth = state.lastSegmentation.width;
        const segHeight = state.lastSegmentation.height;
        const mask = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const segX = Math.floor((x / width) * segWidth);
                const segY = Math.floor((y / height) * segHeight);
                const segIdx = segY * segWidth + segX;
                mask[y * width + x] = segData[segIdx] > 0.5 ? 1 : 0;
            }
        }

        smoothMask(mask, width, height, 2);
        maskData = mask;

        const aperture = getAperture();
        const blurRadius = aperture.blur * 0.7;

        if (blurRadius > 0.3) {
            applyProfessionalBlur(imageData, width, height, blurRadius, mask, 5);
        }

        ctx.putImageData(imageData, 0, 0);
        processedUrl = canvas.toDataURL('image/jpeg', 0.95);
        showSuggestion(`👤 Retrato Pro ${aperture.label} - Abrindo editor...`);
        
        // Abrir editor com a foto processada e a máscara
        setTimeout(() => {
            createPhotoEditor(processedUrl, maskData);
        }, 300);
        
    } else if (portrait) {
        ctx.drawImage(dom.video, 0, 0, width, height);
        processedUrl = canvas.toDataURL('image/jpeg', 0.95);
        showSuggestion('👤 Retrato (modo simples) - Abrindo editor...');
        
        setTimeout(() => {
            createPhotoEditor(processedUrl, null);
        }, 300);
        
    } else {
        ctx.drawImage(dom.video, 0, 0, width, height);
        processedUrl = canvas.toDataURL('image/jpeg', 0.95);
        showSuggestion(`📸 ${state.currentComposition.label} - Abrindo editor...`);
        
        setTimeout(() => {
            createPhotoEditor(processedUrl, null);
        }, 300);
    }

    updateScores();
}

function showPreview(url, type) {
    const preview = document.createElement('div');
    preview.className = 'photo-preview';
    preview.innerHTML = `
        <img src="${url}" alt="Foto" />
        <div style="color:#888;font-size:9px;margin-top:4px;">
            ${type === 'portrait' ? `👤 Retrato Pro ${getAperture().label}` : '📷 Foto'} • ${state.currentComposition.label}
        </div>
        <div class="photo-actions">
            <button class="btn-close" onclick="this.closest('.photo-preview').remove()">Fechar</button>
            <button class="btn-save" onclick="downloadMedia('${url}','jpg')">💾 Salvar</button>
            <button class="btn-edit" onclick="editPhoto('${url}')" style="background:var(--gold);color:#000;">✎ Editar</button>
        </div>
    `;
    document.body.appendChild(preview);
}

// Função para editar foto do preview
window.editPhoto = function(url) {
    // Fechar preview
    const preview = document.querySelector('.photo-preview');
    if (preview) preview.remove();
    
    // Abrir editor
    createPhotoEditor(url, state.capturedMaskData);
};

function downloadMedia(url, ext) {
    if (url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `photo-${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }
    
    fetch(url)
        .then(res => res.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `photo-${Date.now()}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            }, 100);
        })
        .catch(err => {
            console.error('Erro ao baixar:', err);
            const link = document.createElement('a');
            link.href = url;
            link.download = `photo-${Date.now()}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
}

function updateScores() {
    const compScore = Math.floor(60 + Math.random() * 35);
    const lightScore = Math.floor(50 + Math.random() * 40);
    const frameScore = Math.floor(55 + Math.random() * 40);
    dom.compScore.textContent = compScore + '%';
    dom.lightScore.textContent = lightScore + '%';
    dom.frameScore.textContent = frameScore + '%';
    dom.overallScore.textContent = Math.floor((compScore + lightScore + frameScore) / 3);
}

function toggleRecording(cinemaMode = false) {
    if (state.isRecording) {
        if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
            state.mediaRecorder.stop();
        }
        state.isRecording = false;
        dom.shutterBtn.classList.remove('recording');
        dom.timerBadge.classList.remove('active');
        dom.timerBadge.textContent = '00:00';
        if (state.recordingTimer) {
            clearInterval(state.recordingTimer);
            state.recordingTimer = null;
        }
        state.seconds = 0;
        showSuggestion(cinemaMode ? '🎬 Cinema Pro salvo!' : '✅ Vídeo salvo!');
        return;
    }

    if (!state.isCameraReady) {
        showSuggestion('⏳ Aguarde...');
        return;
    }

    try {
        if (typeof MediaRecorder === 'undefined') {
            throw new Error('MediaRecorder não suportado');
        }

        let sourceStream = state.stream;
        if (cinemaMode && dom.canvas && dom.canvas.captureStream) {
            sourceStream = dom.canvas.captureStream(15);
        }

        const options = { mimeType: 'video/mp4' };
        state.mediaRecorder = new MediaRecorder(sourceStream, options);
        state.recordedChunks = [];

        state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                state.recordedChunks.push(event.data);
            }
        };

        state.mediaRecorder.onstop = () => {
            if (state.recordedChunks.length === 0) {
                showSuggestion('⚠️ Nenhum dado');
                return;
            }
            const blob = new Blob(state.recordedChunks, { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const preview = document.createElement('div');
            preview.className = 'photo-preview';
            preview.innerHTML = `
                <video src="${url}" controls autoplay></video>
                <div style="color:#888;font-size:9px;margin-top:4px;">
                    ${cinemaMode ? `🎬 Cinema Pro ${getAperture().label}` : '🎥 Vídeo'} • ${state.currentComposition.label}
                </div>
                <div class="photo-actions">
                    <button class="btn-close" onclick="this.closest('.photo-preview').remove()">Fechar</button>
                    <button class="btn-save" onclick="downloadMedia('${url}','mp4')">💾 Salvar</button>
                </div>
            `;
            document.body.appendChild(preview);
            state.recordedChunks = [];
        };

        state.mediaRecorder.start(100);
        state.isRecording = true;
        dom.shutterBtn.classList.add('recording');
        dom.timerBadge.classList.add('active');
        state.seconds = 0;
        state.recordingTimer = setInterval(() => {
            state.seconds++;
            const mins = String(Math.floor(state.seconds / 60)).padStart(2, '0');
            const secs = String(state.seconds % 60).padStart(2, '0');
            dom.timerBadge.textContent = `${mins}:${secs}`;
        }, 1000);
        showSuggestion(cinemaMode ? '🎬 Gravando Cinema Pro...' : '🔴 Gravando...');
    } catch (err) {
        console.error('Erro:', err);
        showSuggestion('⚠️ Erro: ' + err.message);
    }
}

function handleShutter() {
    if (!state.isCameraReady) {
        showSuggestion('⏳ Aguarde...');
        return;
    }

    if (state.currentMode === 'video') {
        toggleRecording(false);
    } else if (state.currentMode === 'cinema') {
        toggleRecording(true);
    } else if (state.currentMode === 'portrait') {
        capturePhoto(true);
    } else {
        capturePhoto(false);
    }
}

// ============================================================
// ===== EVENTOS =====
// ============================================================

function setupEvents() {
    // Foco ao tocar na tela
    dom.videoWrapper.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn') || e.target.closest('.shutter-btn') ||
            e.target.closest('.mode-filter-btn') || e.target.closest('.comp-chip') ||
            e.target.closest('.cam-btn') || e.target.closest('.zoom-slider') ||
            e.target.closest('.aperture-control')) {
            return;
        }
        const rect = this.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setFocus(x, y);
    });

    // Zoom com pinça
    let lastTouchDist = 0;
    dom.videoWrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            dom.zoomSlider.classList.add('active');
        }
    }, { passive: true });

    dom.videoWrapper.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const delta = (dist - lastTouchDist) / 300;
            const newZoom = Math.max(1, Math.min(4, state.zoom + delta));
            setZoom(newZoom);
            lastTouchDist = dist;
        }
    }, { passive: true });

    dom.videoWrapper.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            setTimeout(() => dom.zoomSlider.classList.remove('active'), 1500);
        }
    }, { passive: true });

    // Botão flip
    dom.flipBtn.addEventListener('click', () => {
        if (state.availableCameras.length > 1) {
            const next = (state.currentCameraIndex + 1) % state.availableCameras.length;
            switchCamera(next);
        } else {
            state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
            stopCamera();
            startCamera();
        }
    });

    // Botão shutter
    dom.shutterBtn.addEventListener('click', handleShutter);

    // Botão abertura
    dom.apertureBtn.addEventListener('click', () => {
        state.isApertureActive = !state.isApertureActive;
        dom.apertureControl.classList.toggle('active', state.isApertureActive);
        if (state.isApertureActive) {
            showSuggestion('⭕ Ajuste a abertura');
        }
    });

    // Slider de abertura
    dom.apertureSlider.addEventListener('input', function() {
        state.currentApertureIndex = parseInt(this.value);
        const aperture = getAperture();
        dom.apertureValue.textContent = aperture.label;
        showSuggestion(`⭕ ${aperture.label}`);
    });

    // Modos
    document.querySelectorAll('.mode-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.mode-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            state.currentMode = this.dataset.mode;

            const isIA = state.currentMode === 'portrait' || state.currentMode === 'cinema';
            dom.canvas.classList.toggle('active', isIA);
            dom.apertureControl.classList.toggle('active', isIA);

            if (isIA && !state.segmentationReady) {
                showSuggestion('⏳ Carregando IA de segmentação...');
                loadBodyPix();
            }

            if (state.currentMode === 'video' || state.currentMode === 'cinema') {
                dom.shutterBtn.classList.add('recording');
                showSuggestion(state.currentMode === 'cinema' ?
                    '🎬 Cinema Pro - Toque para gravar' : '🎥 Toque para gravar');
            } else {
                dom.shutterBtn.classList.remove('recording');
                showSuggestion(state.currentMode === 'portrait' ?
                    '👤 Retrato Professional com IA' : '📸 Toque para capturar');
            }
        });
    });

    // Composições
    document.querySelectorAll('.comp-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const id = this.dataset.id;
            const comp = COMPOSITIONS.find(c => c.id === id);
            if (comp) {
                state.currentComposition = comp;
                state.currentPositionIndex = 0;
                renderGuideOverlay(comp, getCurrentPosition());
                updateChips();
                updateLabel();
                this.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                showSuggestion(`📍 ${comp.label}`);
            }
        });
    });

    // Clique na tela para mudar posição
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.closest('.comp-chip') || target.closest('.action-btn') ||
            target.closest('.mode-filter-btn') || target.closest('.cam-btn') ||
            target.closest('.shutter-btn') || target.closest('.zoom-slider') ||
            target.closest('.aperture-control') || target.closest('.photo-preview') ||
            target.closest('.photo-editor')) {
            return;
        }
        if (state.currentMode !== 'video' && state.currentMode !== 'cinema') {
            state.currentPositionIndex = (state.currentPositionIndex + 1) % state.currentComposition.positions.length;
            renderGuideOverlay(state.currentComposition, getCurrentPosition());
            updateChips();
            updateLabel();
            showSuggestion(`📍 ${getCurrentPosition()}`);
        }
    });

    // Slider de zoom
    dom.zoomSlider.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.getBoundingClientRect();
        const y = (touch.clientY - rect.top) / rect.height;
        const zoomVal = 1 + (1 - y) * 3;
        setZoom(zoomVal);
    }, { passive: false });

    dom.zoomSlider.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.getBoundingClientRect();
        const y = (touch.clientY - rect.top) / rect.height;
        const zoomVal = 1 + (1 - Math.max(0, Math.min(1, y))) * 3;
        setZoom(zoomVal);
    }, { passive: false });
}

function setFocus(x, y) {
    dom.focusIndicator.style.left = (x * 100) + '%';
    dom.focusIndicator.style.top = (y * 100) + '%';
    dom.focusIndicator.classList.remove('active');
    void dom.focusIndicator.offsetWidth;
    dom.focusIndicator.classList.add('active');
    setTimeout(() => dom.focusIndicator.classList.remove('active'), 500);
    showSuggestion('🎯 Foco ajustado');
}

// ============================================================
// ===== PERMISSÃO =====
// ============================================================

function showPermissionError(msg) {
    const overlay = document.createElement('div');
    overlay.className = 'permission-overlay';
    overlay.innerHTML = `
        <h2>📷 Acesso à Câmera</h2>
        <p>O Photo Composition AI precisa acessar sua câmera.</p>
        <button class="permission-btn" id="retryBtn">🔄 Tentar Novamente</button>
        <div class="error-msg">${msg}</div>
    `;
    dom.videoWrapper.appendChild(overlay);

    document.getElementById('retryBtn').addEventListener('click', () => {
        overlay.remove();
        initApp();
    });
}

// ============================================================
// ===== INICIALIZAÇÃO =====
// ============================================================

async function initApp() {
    try {
        // Renderizar composições
        dom.compositionScroll.innerHTML = COMPOSITIONS.map(comp => `
            <div class="comp-chip ${comp.id === state.currentComposition.id ? 'active' : ''}" data-id="${comp.id}">
                ${comp.label}
                <span class="pos-indicator">${comp.id === state.currentComposition.id ? `📍 ${getCurrentPosition()}` : ''}</span>
            </div>
        `).join('');

        // Renderizar guia inicial
        renderGuideOverlay(state.currentComposition, getCurrentPosition());

        // Detectar câmeras
        await detectCameras();

        // Iniciar câmera
        await startCamera();

        // Carregar BodyPix
        await loadBodyPix();

        // Configurar eventos
        setupEvents();

        // Iniciar loop de processamento
        startProcessingLoop();

        console.log('✅ App inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showSuggestion('⚠️ Erro: ' + error.message);
    }
}

// ============================================================
// ===== INICIAR =====
// ============================================================

// Verificar suporte
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('root').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;padding:30px;text-align:center;background:#000;color:#fff;">
            <h2 style="font-size:18px;margin-bottom:6px;">📱 Dispositivo não compatível</h2>
            <p style="color:#888;max-width:240px;">Seu navegador não suporta acesso à câmera.</p>
        </div>
    `;
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}

// ============================================================
// ===== SUGESTÕES IA (INTERVALO) =====
// ============================================================

setInterval(() => {
    const el = dom.aiSuggestion;
    if (el && state.isCameraReady && !el.textContent.includes('📍') && !el.textContent.includes('⭕') &&
        !el.textContent.includes('🔴') && !el.textContent.includes('✅') && !el.textContent.includes('🎬') &&
        !el.textContent.includes('⏳') && !el.textContent.includes('⚠️') && !el.textContent.includes('📸') &&
        !el.textContent.includes('🎯') && !el.textContent.includes('🔍') && !el.textContent.includes('👤') &&
        !el.textContent.includes('🧠') && !el.textContent.includes('🎥') && !el.textContent.includes('Pro') &&
        !el.textContent.includes('✎')) {
        const actions = [
            'Mova para esquerda', 'Mova para direita', 'Aproxime', 'Afaste',
            'Alinhe ao horizonte', 'Posicione no ponto ideal',
            `Aplique ${state.currentComposition.label}`
        ];
        el.textContent = actions[Math.floor(Math.random() * actions.length)];
    }
}, 6000);
