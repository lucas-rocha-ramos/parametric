// js/app.js
import { CameraManager } from './camera.js';
import { SegmentationManager } from './segmentation.js';
import { COMPOSITIONS, renderGuideOverlay, downloadMedia } from './utils.js';

let cameraManager;
let segmentationManager;
let currentComposition = COMPOSITIONS[0];
let currentPositionIndex = 0;
let currentMode = 'camera';
let currentApertureIndex = 2;
let isApertureActive = false;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let seconds = 0;

export async function initApp() {
    // Obter referências dos elementos
    const videoElement = document.getElementById('video');
    const canvasOutput = document.getElementById('canvas-output');
    
    if (!videoElement || !canvasOutput) {
        console.error('Elementos não encontrados');
        return;
    }

    // Inicializar gerenciadores
    cameraManager = new CameraManager(videoElement);
    segmentationManager = new SegmentationManager(canvasOutput);
    
    try {
        await cameraManager.init();
        await segmentationManager.loadModel();
        
        // Configurar canvas
        const rect = videoElement.getBoundingClientRect();
        segmentationManager.resizeCanvas(rect.width, rect.height);
        
        // Renderizar composição inicial
        renderGuideOverlay(currentComposition, getCurrentPosition());
        updateLabel();
        
        // Iniciar loop de processamento
        startProcessingLoop();
        
        // Configurar eventos
        setupEvents();
        
        console.log('✅ App inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar app:', error);
        showPermissionError(error.message);
    }
}

function getCurrentPosition() {
    return currentComposition.positions[currentPositionIndex % currentComposition.positions.length];
}

function updateLabel() {
    const label = document.getElementById('guideLabel');
    const pos = getCurrentPosition();
    if (label) {
        label.innerHTML = `${currentComposition.label} <span class="position-indicator">📍 ${pos}</span>`;
    }
}

function updateChips() {
    document.querySelectorAll('.comp-chip').forEach(chip => {
        const id = chip.dataset.id;
        const isActive = id === currentComposition.id;
        chip.classList.toggle('active', isActive);
        if (isActive) {
            const pos = getCurrentPosition();
            const posDisplay = chip.querySelector('.pos-indicator');
            if (posDisplay) posDisplay.textContent = `📍 ${pos}`;
        }
    });
}

function nextPosition() {
    currentPositionIndex = (currentPositionIndex + 1) % currentComposition.positions.length;
    renderGuideOverlay(currentComposition, getCurrentPosition());
    updateChips();
    updateLabel();
}

function startProcessingLoop() {
    let animationFrame;
    
    const processLoop = async () => {
        const videoElement = document.getElementById('video');
        const canvasOutput = document.getElementById('canvas-output');
        
        if (currentMode === 'portrait' || currentMode === 'cinema') {
            if (segmentationManager.isReady) {
                const facingMode = cameraManager.facingMode || 'environment';
                await segmentationManager.processFrame(videoElement, facingMode, currentApertureIndex);
            }
        } else {
            const ctx = canvasOutput?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
            }
        }
        
        animationFrame = requestAnimationFrame(processLoop);
    };
    
    processLoop();
}

function setupEvents() {
    const wrapper = document.getElementById('videoWrapper');
    
    // Foco ao tocar na tela
    wrapper.addEventListener('click', function(e) {
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
    wrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            document.getElementById('zoomSlider').classList.add('active');
        }
    }, { passive: true });

    wrapper.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const delta = (dist - lastTouchDist) / 300;
            const newZoom = Math.max(1, Math.min(4, cameraManager.zoom + delta));
            cameraManager.setZoom(newZoom);
            updateZoomUI(newZoom);
            lastTouchDist = dist;
        }
    }, { passive: true });

    wrapper.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            setTimeout(() => document.getElementById('zoomSlider').classList.remove('active'), 1500);
        }
    }, { passive: true });

    // Botão flip
    document.getElementById('flipBtn').addEventListener('click', () => {
        cameraManager.toggleCamera();
    });

    // Botão shutter
    document.getElementById('shutterBtn').addEventListener('click', handleShutter);

    // Botão abertura
    document.getElementById('apertureBtn').addEventListener('click', () => {
        isApertureActive = !isApertureActive;
        document.getElementById('apertureControl').classList.toggle('active', isApertureActive);
        if (isApertureActive) {
            document.getElementById('ai-suggestion').textContent = '⭕ Ajuste a abertura';
        }
    });

    // Slider de abertura
    document.getElementById('apertureSlider').addEventListener('input', function() {
        currentApertureIndex = parseInt(this.value);
        const aperture = APERTURE_VALUES[currentApertureIndex];
        document.getElementById('apertureValue').textContent = aperture.label;
        document.getElementById('ai-suggestion').textContent = `⭕ ${aperture.label}`;
    });

    // Modos
    document.querySelectorAll('.mode-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.mode-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.mode;
            
            const isIA = currentMode === 'portrait' || currentMode === 'cinema';
            document.getElementById('canvas-output').classList.toggle('active', isIA);
            document.getElementById('apertureControl').classList.toggle('active', isIA);
            
            const shutter = document.getElementById('shutterBtn');
            if (currentMode === 'video' || currentMode === 'cinema') {
                shutter.classList.add('recording');
                document.getElementById('ai-suggestion').textContent = currentMode === 'cinema' ? 
                    '🎬 Cinema Pro - Toque para gravar' : '🎥 Toque para gravar';
            } else {
                shutter.classList.remove('recording');
                document.getElementById('ai-suggestion').textContent = currentMode === 'portrait' ? 
                    '👤 Retrato Professional com IA' : '📸 Toque para capturar';
            }
        });
    });

    // Composições
    document.querySelectorAll('.comp-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const id = this.dataset.id;
            const comp = COMPOSITIONS.find(c => c.id === id);
            if (comp) {
                currentComposition = comp;
                currentPositionIndex = 0;
                renderGuideOverlay(comp, getCurrentPosition());
                updateChips();
                updateLabel();
                this.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                document.getElementById('ai-suggestion').textContent = `📍 ${comp.label}`;
            }
        });
    });

    // Clique na tela para mudar posição
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.closest('.comp-chip') || target.closest('.action-btn') || 
            target.closest('.mode-filter-btn') || target.closest('.cam-btn') ||
            target.closest('.shutter-btn') || target.closest('.zoom-slider') ||
            target.closest('.aperture-control') || target.closest('.photo-preview')) {
            return;
        }
        if (currentMode !== 'video' && currentMode !== 'cinema') {
            nextPosition();
            document.getElementById('ai-suggestion').textContent = `📍 ${getCurrentPosition()}`;
        }
    });

    // Slider de zoom
    const slider = document.getElementById('zoomSlider');
    slider.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.getBoundingClientRect();
        const y = (touch.clientY - rect.top) / rect.height;
        const zoomVal = 1 + (1 - y) * 3;
        cameraManager.setZoom(zoomVal);
        updateZoomUI(zoomVal);
    }, { passive: false });

    slider.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.getBoundingClientRect();
        const y = (touch.clientY - rect.top) / rect.height;
        const zoomVal = 1 + (1 - Math.max(0, Math.min(1, y))) * 3;
        cameraManager.setZoom(zoomVal);
        updateZoomUI(zoomVal);
    }, { passive: false });
}

function setFocus(x, y) {
    const indicator = document.getElementById('focusIndicator');
    indicator.style.left = (x * 100) + '%';
    indicator.style.top = (y * 100) + '%';
    indicator.classList.remove('active');
    void indicator.offsetWidth;
    indicator.classList.add('active');
    setTimeout(() => indicator.classList.remove('active'), 500);
    document.getElementById('ai-suggestion').textContent = '🎯 Foco ajustado';
}

function updateZoomUI(zoom) {
    const pct = ((zoom - 1) / 3) * 100;
    const thumb = document.getElementById('zoomThumb');
    if (thumb) thumb.style.top = (100 - pct) + '%';
    document.getElementById('ai-suggestion').textContent = `🔍 ${zoom.toFixed(1)}x`;
}

function handleShutter() {
    const videoElement = document.getElementById('video');
    if (!cameraManager.isReady || !videoElement) {
        document.getElementById('ai-suggestion').textContent = '⏳ Aguarde...';
        return;
    }
    
    if (currentMode === 'video') {
        toggleRecording(false);
    } else if (currentMode === 'cinema') {
        toggleRecording(true);
    } else if (currentMode === 'portrait') {
        capturePhoto(true);
    } else {
        capturePhoto(false);
    }
}

function capturePhoto(portrait = false) {
    const videoElement = document.getElementById('video');
    if (!videoElement || !cameraManager.isReady) {
        document.getElementById('ai-suggestion').textContent = '⏳ Aguarde...';
        return;
    }
    
    let dataUrl;
    if (portrait && segmentationManager.isReady) {
        dataUrl = segmentationManager.capturePhoto(videoElement, cameraManager.facingMode, currentApertureIndex);
        const aperture = APERTURE_VALUES[currentApertureIndex];
        document.getElementById('ai-suggestion').textContent = `👤 Retrato Pro ${aperture.label}`;
    } else if (portrait) {
        const canvas = document.createElement('canvas');
        const width = videoElement.videoWidth || 640;
        const height = videoElement.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, width, height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        document.getElementById('ai-suggestion').textContent = '👤 Retrato (simples)';
    } else {
        const canvas = document.createElement('canvas');
        const width = videoElement.videoWidth || 640;
        const height = videoElement.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, width, height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        document.getElementById('ai-suggestion').textContent = `📸 ${currentComposition.label}`;
    }
    
    showPreview(dataUrl, portrait ? 'portrait' : 'photo');
    updateScores();
}

function showPreview(url, type) {
    const preview = document.createElement('div');
    preview.className = 'photo-preview';
    preview.innerHTML = `
        <img src="${url}" alt="Foto" />
        <div style="color:#888;font-size:9px;margin-top:4px;">
            ${type === 'portrait' ? `👤 Retrato Pro ${APERTURE_VALUES[currentApertureIndex].label}` : '📷 Foto'} • ${currentComposition.label}
        </div>
        <div class="photo-actions">
            <button class="btn-close" onclick="this.closest('.photo-preview').remove()">Fechar</button>
            <button class="btn-save" onclick="downloadMedia('${url}','jpg')">💾 Salvar</button>
        </div>
    `;
    document.body.appendChild(preview);
}

function updateScores() {
    const compScore = Math.floor(60 + Math.random() * 35);
    const lightScore = Math.floor(50 + Math.random() * 40);
    const frameScore = Math.floor(55 + Math.random() * 40);
    document.getElementById('compScore').textContent = compScore + '%';
    document.getElementById('lightScore').textContent = lightScore + '%';
    document.getElementById('frameScore').textContent = frameScore + '%';
    document.getElementById('overallScore').textContent = Math.floor((compScore + lightScore + frameScore) / 3);
}

function toggleRecording(cinemaMode = false) {
    const videoElement = document.getElementById('video');
    const canvasOutput = document.getElementById('canvas-output');
    
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        isRecording = false;
        document.getElementById('shutterBtn').classList.remove('recording');
        document.getElementById('timerBadge').classList.remove('active');
        document.getElementById('timerBadge').textContent = '00:00';
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        seconds = 0;
        document.getElementById('ai-suggestion').textContent = cinemaMode ? '🎬 Cinema Pro salvo!' : '✅ Vídeo salvo!';
        return;
    }

    if (!cameraManager.isReady) {
        document.getElementById('ai-suggestion').textContent = '⏳ Aguarde...';
        return;
    }
    
    try {
        if (typeof MediaRecorder === 'undefined') {
            throw new Error('MediaRecorder não suportado');
        }

        let sourceStream = cameraManager.stream;
        if (cinemaMode && canvasOutput && canvasOutput.captureStream) {
            sourceStream = canvasOutput.captureStream(15);
        }

        const options = { mimeType: 'video/mp4' };
        mediaRecorder = new MediaRecorder(sourceStream, options);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            if (recordedChunks.length === 0) {
                document.getElementById('ai-suggestion').textContent = '⚠️ Nenhum dado';
                return;
            }
            const blob = new Blob(recordedChunks, { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const preview = document.createElement('div');
            preview.className = 'photo-preview';
            preview.innerHTML = `
                <video src="${url}" controls autoplay></video>
                <div style="color:#888;font-size:9px;margin-top:4px;">
                    ${cinemaMode ? `🎬 Cinema Pro ${APERTURE_VALUES[currentApertureIndex].label}` : '🎥 Vídeo'} • ${currentComposition.label}
                </div>
                <div class="photo-actions">
                    <button class="btn-close" onclick="this.closest('.photo-preview').remove()">Fechar</button>
                    <button class="btn-save" onclick="downloadMedia('${url}','mp4')">💾 Salvar</button>
                </div>
            `;
            document.body.appendChild(preview);
            recordedChunks = [];
        };

        mediaRecorder.start(100);
        isRecording = true;
        document.getElementById('shutterBtn').classList.add('recording');
        document.getElementById('timerBadge').classList.add('active');
        seconds = 0;
        recordingTimer = setInterval(() => {
            seconds++;
            const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            document.getElementById('timerBadge').textContent = `${mins}:${secs}`;
        }, 1000);
        document.getElementById('ai-suggestion').textContent = cinemaMode ? '🎬 Gravando Cinema Pro...' : '🔴 Gravando...';
    } catch (err) {
        console.error('Erro:', err);
        document.getElementById('ai-suggestion').textContent = '⚠️ Erro: ' + err.message;
    }
}

function showPermissionError(msg) {
    const wrapper = document.getElementById('videoWrapper');
    const overlay = document.createElement('div');
    overlay.className = 'permission-overlay';
    overlay.innerHTML = `
        <h2>📷 Acesso à Câmera</h2>
        <p>O Photo Composition AI precisa acessar sua câmera.</p>
        <button class="permission-btn" id="retryBtn">🔄 Tentar Novamente</button>
        <div class="error-msg">${msg}</div>
    `;
    wrapper.appendChild(overlay);
    
    document.getElementById('retryBtn').addEventListener('click', () => {
        overlay.remove();
        initApp();
    });
}

// Expor para window (para funções inline)
window.downloadMedia = downloadMedia;
