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
    ctx: null
};

// Criar editor de foto
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
    
    // Carregar imagem
    const img = new Image();
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        editorState.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        editorState.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        editorState.maskData = maskData;
        editorState.canvas = canvas;
        editorState.ctx = ctx;
        editorState.apertureIndex = state.currentApertureIndex;
        
        // Aplicar efeito inicial
        applyEditorEffect();
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
    }
}

function resetEditor() {
    if (editorState.originalImageData && editorState.canvas) {
        editorState.imageData = new ImageData(
            new Uint8ClampedArray(editorState.originalImageData.data),
            editorState.originalImageData.width,
            editorState.originalImageData.height
        );
        applyEditorEffect();
        showSuggestion('↺ Reset aplicado');
    }
}

function saveEditorPhoto() {
    if (!editorState.canvas) return;
    
    const dataUrl = editorState.canvas.toDataURL('image/jpeg', 1.0);
    downloadMedia(dataUrl, 'jpg');
    showSuggestion('💾 Foto salva com sucesso!');
    closeEditor();
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
            // Redimensionar máscara para o tamanho da imagem
            const maskWidth = editorState.maskData.width || width;
            const maskHeight = editorState.maskData.height || height;
            const mask = new Float32Array(width * height);
            
            // Interpolação da máscara
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
            
            // Aplicar desfoque com feather ajustável
            applyProfessionalBlur(imageData, width, height, blurRadius, mask, featherRadius);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Atualizar imagem processada
        editorState.imageData = imageData;
        editorState.isProcessing = false;
        
    } catch (error) {
        console.error('Erro no editor:', error);
        editorState.isProcessing = false;
    }
}

// ============================================================
// ===== FUNÇÃO DE CAPTURA MODIFICADA =====
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

        // Criar máscara
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const segX = Math.floor((x / width) * segWidth);
                const segY = Math.floor((y / height) * segHeight);
                const segIdx = segY * segWidth + segX;
                mask[y * width + x] = segData[segIdx] > 0.5 ? 1 : 0;
            }
        }

        // Suavizar a máscara
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

// ============================================================
// ===== FUNÇÃO DE DOWNLOAD MELHORADA =====
// ============================================================

function downloadMedia(url, ext) {
    // Verificar se é uma URL de blob ou data
    if (url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `photo-${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }
    
    // Para data URLs, converter para blob
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
            // Fallback: usar link direto
            const link = document.createElement('a');
            link.href = url;
            link.download = `photo-${Date.now()}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
}

// ============================================================
// ===== FUNÇÃO DE SEGMENTAÇÃO MELHORADA =====
// ============================================================

// Exportar funções para uso global
window.createPhotoEditor = createPhotoEditor;
window.closeEditor = closeEditor;
window.saveEditorPhoto = saveEditorPhoto;
window.resetEditor = resetEditor;
window.downloadMedia = downloadMedia;
