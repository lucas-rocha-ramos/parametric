// js/camera.js

export class CameraManager {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
        this.isReady = false;
        this.facingMode = 'environment';
        this.availableCameras = [];
        this.currentCameraIndex = 0;
        this.zoom = 1;
    }

    async init() {
        try {
            await this.detectCameras();
            await this.startCamera();
        } catch (error) {
            console.error('Erro ao iniciar câmera:', error);
            throw error;
        }
    }

    async detectCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(d => d.kind === 'videoinput');
            return this.availableCameras;
        } catch (e) {
            console.error('Erro ao detectar câmeras:', e);
            return [];
        }
    }

    async startCamera(deviceId = null) {
        try {
            const constraints = {
                video: {
                    facingMode: deviceId ? undefined : this.facingMode,
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            };

            if (!deviceId) {
                delete constraints.video.deviceId;
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (this.video) {
                this.video.srcObject = this.stream;
                await this.video.play();
                this.isReady = true;
                console.log('✅ Câmera iniciada com sucesso!');
            }
        } catch (error) {
            console.error('❌ Erro ao iniciar câmera:', error);
            throw error;
        }
    }

    toggleCamera() {
        if (this.availableCameras.length > 1) {
            const next = (this.currentCameraIndex + 1) % this.availableCameras.length;
            this.switchCamera(next);
        } else {
            this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
            this.stop();
            this.startCamera();
        }
    }

    async switchCamera(index) {
        if (index === this.currentCameraIndex) return;
        if (!this.availableCameras[index]) return;
        
        this.currentCameraIndex = index;
        const deviceId = this.availableCameras[index].deviceId;
        this.stop();
        await this.startCamera(deviceId);
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
            this.isReady = false;
        }
    }

    setZoom(value) {
        this.zoom = Math.max(1, Math.min(4, value));
        if (this.video) {
            this.video.style.transform = `scale(${this.zoom})`;
        }
        return this.zoom;
    }

    getCameras() {
        return this.availableCameras;
    }

    getCurrentCameraIndex() {
        return this.currentCameraIndex;
    }
}
