// js/segmentation.js
import { applyProfessionalBlur } from './utils.js';

export class SegmentationManager {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.model = null;
        this.isReady = false;
        this.lastSegmentation = null;
        this.isProcessing = false;
        this.frameCount = 0;
        this.processEveryNFrames = 2;
        this.currentApertureIndex = 2;
        this.usingBodyPix = false;
    }

    async loadModel() {
        try {
            this.model = await bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.5,
                quantBytes: 2
            });
            this.isReady = true;
            this.usingBodyPix = true;
            console.log('✅ BodyPix carregado com sucesso!');
            return true;
        } catch (error) {
            console.error('❌ Erro ao carregar BodyPix:', error);
            this.isReady = false;
            return false;
        }
    }

    async processFrame(videoElement, facingMode, apertureIndex) {
        if (!this.isReady || !this.model || this.isProcessing) return;
        
        this.currentApertureIndex = apertureIndex;
        this.frameCount++;
        
        if (this.frameCount % this.processEveryNFrames !== 0) return;

        try {
            this.isProcessing = true;
            
            const displayWidth = this.canvas.width || 640;
            const displayHeight = this.canvas.height || 480;
            
            const segmentation = await this.model.segmentPerson(videoElement, {
                flipHorizontal: facingMode === 'user',
                internalResolution: 'low',
                segmentationThreshold: 0.65
            });

            if (!segmentation || !segmentation.data) {
                this.isProcessing = false;
                return;
            }

            this.lastSegmentation = segmentation;
            
            this.ctx.drawImage(videoElement, 0, 0, displayWidth, displayHeight);
            const imageData = this.ctx.getImageData(0, 0, displayWidth, displayHeight);
            
            const segData = segmentation.data;
            const segWidth = segmentation.width;
            const segHeight = segmentation.height;
            const mask = new Float32Array(displayWidth * displayHeight);
            
            for (let y = 0; y < displayHeight; y++) {
                for (let x = 0; x < displayWidth; x++) {
                    const segX = Math.floor((x / displayWidth) * segWidth);
                    const segY = Math.floor((y / displayHeight) * segHeight);
                    const segIdx = segY * segWidth + segX;
                    mask[y * displayWidth + x] = segData[segIdx] > 0.5 ? 1 : 0;
                }
            }
            
            const aperture = APERTURE_VALUES[this.currentApertureIndex];
            const blurRadius = aperture.blur * 0.7;
            
            if (blurRadius > 0.5) {
                applyProfessionalBlur(imageData, displayWidth, displayHeight, blurRadius, mask, 3);
            }
            
            this.ctx.putImageData(imageData, 0, 0);
            
            this.isProcessing = false;
        } catch (error) {
            console.error('Erro no processamento:', error);
            this.isProcessing = false;
        }
    }

    capturePhoto(videoElement, facingMode, apertureIndex) {
        if (!this.isReady || !this.lastSegmentation) {
            return this.captureSimplePhoto(videoElement);
        }

        const canvas = document.createElement('canvas');
        const width = videoElement.videoWidth || 640;
        const height = videoElement.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(videoElement, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        
        const segData = this.lastSegmentation.data;
        const segWidth = this.lastSegmentation.width;
        const segHeight = this.lastSegmentation.height;
        const mask = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const segX = Math.floor((x / width) * segWidth);
                const segY = Math.floor((y / height) * segHeight);
                const segIdx = segY * segWidth + segX;
                mask[y * width + x] = segData[segIdx] > 0.5 ? 1 : 0;
            }
        }
        
        const aperture = APERTURE_VALUES[apertureIndex];
        const blurRadius = aperture.blur * 0.6;
        
        if (blurRadius > 0.5) {
            applyProfessionalBlur(imageData, width, height, blurRadius, mask, 4);
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    captureSimplePhoto(videoElement) {
        const canvas = document.createElement('canvas');
        const width = videoElement.videoWidth || 640;
        const height = videoElement.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    resizeCanvas(width, height) {
        this.canvas.width = Math.floor(width * 0.7);
        this.canvas.height = Math.floor(height * 0.7);
    }

    getApertureLabel(index) {
        return APERTURE_VALUES[index]?.label || 'f/2.8';
    }
}

// Importar APERTURE_VALUES (será injetado)
import { APERTURE_VALUES } from './utils.js';
