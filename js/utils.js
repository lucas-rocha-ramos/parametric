// js/utils.js

// Valores de abertura (f-stop)
export const APERTURE_VALUES = [
    { label: 'f/1.4', value: 1.4, blur: 10 },
    { label: 'f/2.0', value: 2.0, blur: 8 },
    { label: 'f/2.8', value: 2.8, blur: 6 },
    { label: 'f/4.0', value: 4.0, blur: 4 },
    { label: 'f/5.6', value: 5.6, blur: 3 },
    { label: 'f/8.0', value: 8.0, blur: 2 },
    { label: 'f/11', value: 11, blur: 1 },
    { label: 'f/16', value: 16, blur: 0.5 },
    { label: 'f/22', value: 22, blur: 0 }
];

// 15 Composições
export const COMPOSITIONS = [
    { id: 'rule-of-thirds', label: 'RULE OF THIRDS', positions: ['padrão', 'invertido', 'vertical', 'horizontal'] },
    { id: 'symmetry', label: 'SYMMETRY', positions: ['vertical', 'horizontal', 'central'] },
    { id: 'phi-grid', label: 'PHI GRID', positions: ['padrão', 'invertido'] },
    { id: 'fibonacci-spiral', label: 'FIBONACCI SPIRAL', positions: ['superior-esquerdo', 'superior-direito', 'inferior-esquerdo', 'inferior-direito'] },
    { id: 'golden-triangles', label: 'GOLDEN TRIANGLES', positions: ['superior', 'inferior', 'esquerda', 'direita'] },
    { id: 'vanishing-point', label: 'VANISHING POINT', positions: ['centro', 'superior', 'inferior', 'esquerda', 'direita'] },
    { id: 'framing-depth', label: 'FRAMING DEPTH', positions: ['padrão', 'invertido'] },
    { id: 'landscape-depth', label: 'LANDSCAPE DEPTH', positions: ['superior', 'inferior'] },
    { id: 'leading-lines', label: 'LEADING LINES', positions: ['direita', 'esquerda', 'centro'] },
    { id: 'lines-patterns', label: 'LINES AND PATTERNS', positions: ['horizontal', 'vertical', 'diagonal', 'curvo'] },
    { id: 'fill-the-frame', label: 'FILL THE FRAME', positions: ['centro', 'superior', 'inferior'] },
    { id: 'negative-space', label: 'NEGATIVE SPACE', positions: ['superior', 'inferior', 'esquerda', 'direita'] },
    { id: 'left-to-right', label: 'LEFT TO RIGHT', positions: ['esquerda→direita', 'direita→esquerda'] },
    { id: 'dynamic-symmetry', label: 'DYNAMIC SYMMETRY', positions: ['padrão', 'invertido'] },
    { id: 'harmonic-armature', label: 'HARMONIC ARMATURE', positions: ['padrão', 'refletido'] }
];

// Desfoque profissional
export function applyProfessionalBlur(imageData, width, height, radius, mask, feather) {
    if (radius < 0.5) return imageData;
    
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    const r = Math.round(radius);
    const featherPx = feather || 3;
    
    const kernelSize = r * 2 + 1;
    const kernel = [];
    let sum = 0;
    const sigma = r * 0.6;
    
    for (let i = -r; i <= r; i++) {
        const val = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel.push(val);
        sum += val;
    }
    
    const half = r;
    const hasMask = mask && mask.length > 0;
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let isPerson = false;
            let blendFactor = 0;
            
            if (hasMask) {
                isPerson = mask[y * width + x] > 0.5;
                if (featherPx > 0) {
                    let edgeCount = 0;
                    for (let dy = -featherPx; dy <= featherPx; dy++) {
                        for (let dx = -featherPx; dx <= featherPx; dx++) {
                            const px = Math.min(width - 1, Math.max(0, x + dx));
                            const py = Math.min(height - 1, Math.max(0, y + dy));
                            if (mask[py * width + px] > 0.5) edgeCount++;
                        }
                    }
                    const total = (featherPx * 2 + 1) ** 2;
                    blendFactor = edgeCount / total;
                }
            }
            
            if (!hasMask || !isPerson || blendFactor < 0.3) {
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
                    if (hasMask && blendFactor > 0.3 && blendFactor < 0.7) {
                        const mix = (blendFactor - 0.3) / 0.4;
                        const blurR = rSum / weightSum;
                        const blurG = gSum / weightSum;
                        const blurB = bSum / weightSum;
                        data[idx] = data[idx] * mix + blurR * (1 - mix);
                        data[idx + 1] = data[idx + 1] * mix + blurG * (1 - mix);
                        data[idx + 2] = data[idx + 2] * mix + blurB * (1 - mix);
                    } else {
                        data[idx] = rSum / weightSum;
                        data[idx + 1] = gSum / weightSum;
                        data[idx + 2] = bSum / weightSum;
                    }
                }
            }
        }
    }
    
    // Vertical pass
    const tempV = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let isPerson = false;
            let blendFactor = 0;
            
            if (hasMask) {
                isPerson = mask[y * width + x] > 0.5;
                if (featherPx > 0) {
                    let edgeCount = 0;
                    for (let dy = -featherPx; dy <= featherPx; dy++) {
                        for (let dx = -featherPx; dx <= featherPx; dx++) {
                            const px = Math.min(width - 1, Math.max(0, x + dx));
                            const py = Math.min(height - 1, Math.max(0, y + dy));
                            if (mask[py * width + px] > 0.5) edgeCount++;
                        }
                    }
                    const total = (featherPx * 2 + 1) ** 2;
                    blendFactor = edgeCount / total;
                }
            }
            
            if (!hasMask || !isPerson || blendFactor < 0.3) {
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
                    if (hasMask && blendFactor > 0.3 && blendFactor < 0.7) {
                        const mix = (blendFactor - 0.3) / 0.4;
                        const blurR = rSum / weightSum;
                        const blurG = gSum / weightSum;
                        const blurB = bSum / weightSum;
                        data[idx] = data[idx] * mix + blurR * (1 - mix);
                        data[idx + 1] = data[idx + 1] * mix + blurG * (1 - mix);
                        data[idx + 2] = data[idx + 2] * mix + blurB * (1 - mix);
                    } else {
                        data[idx] = rSum / weightSum;
                        data[idx + 1] = gSum / weightSum;
                        data[idx + 2] = bSum / weightSum;
                    }
                }
            }
        }
    }
    
    return imageData;
}

// Gerar overlay de grade
export function renderGuideOverlay(comp, position) {
    const grid = document.getElementById('overlayGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let container = document.createElement('div');
    container.style.cssText = 'width:100%;height:100%;position:relative;';

    const id = comp.id;
    const isInverted = position === 'invertido' || position === 'refletido' || position === 'inferior';

    switch(id) {
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

// Download de mídia
export function downloadMedia(url, ext) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
