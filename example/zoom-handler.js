export class ZoomPanHandler {
    constructor(containerId, wrapperId, config = {}) {
        this.container = document.getElementById(containerId);
        this.wrapper = document.getElementById(wrapperId);
        if (!this.container || !this.wrapper) return;
        this.scale = config.scale || 0.8;
        this.posX = config.posX || 0;
        this.posY = config.posY || 0;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.lastTouchDist = 0;
        this.initEvents();
        this.updateTransform();
    }
    initEvents() {
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scale *= (e.deltaY > 0 ? 0.9 : 1.1);
            this.scale = Math.min(Math.max(0.1, this.scale), 10);
            this.updateTransform();
        });
        this.container.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.isPanning = true;
            this.startX = e.clientX - this.posX;
            this.startY = e.clientY - this.posY;
            this.container.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            e.preventDefault();
            this.posX = e.clientX - this.startX;
            this.posY = e.clientY - this.startY;
            this.updateTransform();
        });
        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.container.style.cursor = 'grab';
        });
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.container.addEventListener('touchend', () => this.handleTouchEnd());
    }
    getDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.isPanning = true;
            this.startX = e.touches[0].clientX - this.posX;
            this.startY = e.touches[0].clientY - this.posY;
        } else if (e.touches.length === 2) {
            this.isPanning = false; 
            this.lastTouchDist = this.getDistance(e.touches);
        }
    }
    handleTouchMove(e) {
        e.preventDefault(); 
        if (e.touches.length === 1 && this.isPanning) {
            this.posX = e.touches[0].clientX - this.startX;
            this.posY = e.touches[0].clientY - this.startY;
            this.updateTransform();
        } else if (e.touches.length === 2) {
            const currentDist = this.getDistance(e.touches);
            if (this.lastTouchDist > 0) {
                const scaleFactor = currentDist / this.lastTouchDist;
                this.scale *= scaleFactor;
                this.scale = Math.min(Math.max(0.1, this.scale), 10);
                this.lastTouchDist = currentDist; 
                this.updateTransform();
            }
        }
    }
    handleTouchEnd() {
        this.isPanning = false;
        this.lastTouchDist = 0;
    }
    updateTransform() {
        this.wrapper.style.transform = `translate(${this.posX}px, ${this.posY}px) scale(${this.scale})`;
    }

    reset() {
        this.scale = 0.8;
        this.posX = 0;
        this.posY = 0;
        this.updateTransform();
    }
}
