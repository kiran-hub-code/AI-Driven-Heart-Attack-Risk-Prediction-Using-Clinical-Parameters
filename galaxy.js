// ====================================================================
// GALAXY BACKGROUND ANIMATION - Vanilla JS (Converted from React/OGL)
// ====================================================================

class GalaxyBackground {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            focal: options.focal || [0.5, 0.5],
            rotation: options.rotation || [1.0, 0.0],
            starSpeed: options.starSpeed || 0.5,
            density: options.density || 1,
            hueShift: options.hueShift || 140,
            speed: options.speed || 1.0,
            mouseInteraction: options.mouseInteraction !== undefined ? options.mouseInteraction : true,
            glowIntensity: options.glowIntensity || 0.3,
            saturation: options.saturation || 0.0,
            mouseRepulsion: options.mouseRepulsion !== undefined ? options.mouseRepulsion : true,
            repulsionStrength: options.repulsionStrength || 2,
            twinkleIntensity: options.twinkleIntensity || 0.3,
            rotationSpeed: options.rotationSpeed || 0.1,
            autoCenterRepulsion: options.autoCenterRepulsion || 0,
            transparent: options.transparent !== undefined ? options.transparent : true
        };

        this.targetMousePos = { x: 0.5, y: 0.5 };
        this.smoothMousePos = { x: 0.5, y: 0.5 };
        this.targetMouseActive = 0.0;
        this.smoothMouseActive = 0.0;
        this.animationId = null;
        
        this.init();
    }

    init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        
        this.gl = this.canvas.getContext('webgl', {
            alpha: this.options.transparent,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        // Setup WebGL
        if (this.options.transparent) {
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            this.gl.clearColor(0, 0, 0, 0);
        } else {
            this.gl.clearColor(0, 0, 0, 1);
        }

        this.setupProgram();
        this.setupGeometry();
        this.resize();

        window.addEventListener('resize', () => this.resize());
        
        if (this.options.mouseInteraction) {
            this.container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.container.addEventListener('mouseleave', () => this.handleMouseLeave());
        }

        this.container.appendChild(this.canvas);
        this.start();
    }

    setupProgram() {
        const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
}
        `;

        const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float tri(float x) {
    return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
    float t = fract(x);
    return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
    float t = fract(x);
    return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
    float d = length(uv);
    float m = (0.05 * uGlowIntensity) / d;
    float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
    m += rays * flare * uGlowIntensity;
    uv *= MAT45;
    rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1.0));
    m += rays * 0.3 * flare * uGlowIntensity;
    m *= smoothstep(1.0, 0.2, d);
    return m;
}

vec3 StarLayer(vec2 uv) {
    vec3 col = vec3(0.0);
    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 si = id + vec2(float(x), float(y));
            float seed = Hash21(si);
            float size = fract(seed * 345.32);
            float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
            float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

            float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
            float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
            float grn = min(red, blu) * seed;
            vec3 base = vec3(red, grn, blu);

            float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
            hue = fract(hue + uHueShift / 360.0);
            float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
            float val = max(max(base.r, base.g), base.b);
            base = hsv2rgb(vec3(hue, sat, val));

            vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

            float star = Star(gv - offset - pad, flareSize);
            vec3 color = base;

            float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
            twinkle = mix(1.0, twinkle, uTwinkleIntensity);
            star *= twinkle;

            col += star * size * color;
        }
    }

    return col;
}

void main() {
    vec2 focalPx = uFocal * uResolution.xy;
    vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

    vec2 mouseNorm = uMouse - vec2(0.5);

    if (uAutoCenterRepulsion > 0.0) {
        vec2 centerUV = vec2(0.0, 0.0);
        float centerDist = length(uv - centerUV);
        vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
        uv += repulsion * 0.05;
    } else if (uMouseRepulsion) {
        vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
        float mouseDist = length(uv - mousePosUV);
        vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
        uv += repulsion * 0.05 * uMouseActiveFactor;
    } else {
        vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
        uv += mouseOffset;
    }

    float autoRotAngle = uTime * uRotationSpeed;
    mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
    uv = autoRot * uv;

    uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

    vec3 col = vec3(0.0);

    for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
        float depth = fract(i + uStarSpeed * uSpeed);
        float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
        float fade = depth * smoothstep(1.0, 0.9, depth);
        col += StarLayer(uv * scale + i * 453.32) * fade;
    }

    if (uTransparent) {
        float alpha = length(col);
        alpha = smoothstep(0.0, 0.3, alpha);
        alpha = min(alpha, 1.0);
        gl_FragColor = vec4(col, alpha);
    } else {
        gl_FragColor = vec4(col, 1.0);
    }
}
        `;

        // Compile shaders
        const vs = this.compileShader(vertexShader, this.gl.VERTEX_SHADER);
        const fs = this.compileShader(fragmentShader, this.gl.FRAGMENT_SHADER);

        // Create program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program failed to link:', this.gl.getProgramInfoLog(this.program));
            return;
        }

        this.gl.useProgram(this.program);

        // Get uniform locations
        this.uniforms = {
            uTime: this.gl.getUniformLocation(this.program, 'uTime'),
            uResolution: this.gl.getUniformLocation(this.program, 'uResolution'),
            uFocal: this.gl.getUniformLocation(this.program, 'uFocal'),
            uRotation: this.gl.getUniformLocation(this.program, 'uRotation'),
            uStarSpeed: this.gl.getUniformLocation(this.program, 'uStarSpeed'),
            uDensity: this.gl.getUniformLocation(this.program, 'uDensity'),
            uHueShift: this.gl.getUniformLocation(this.program, 'uHueShift'),
            uSpeed: this.gl.getUniformLocation(this.program, 'uSpeed'),
            uMouse: this.gl.getUniformLocation(this.program, 'uMouse'),
            uGlowIntensity: this.gl.getUniformLocation(this.program, 'uGlowIntensity'),
            uSaturation: this.gl.getUniformLocation(this.program, 'uSaturation'),
            uMouseRepulsion: this.gl.getUniformLocation(this.program, 'uMouseRepulsion'),
            uTwinkleIntensity: this.gl.getUniformLocation(this.program, 'uTwinkleIntensity'),
            uRotationSpeed: this.gl.getUniformLocation(this.program, 'uRotationSpeed'),
            uRepulsionStrength: this.gl.getUniformLocation(this.program, 'uRepulsionStrength'),
            uMouseActiveFactor: this.gl.getUniformLocation(this.program, 'uMouseActiveFactor'),
            uAutoCenterRepulsion: this.gl.getUniformLocation(this.program, 'uAutoCenterRepulsion'),
            uTransparent: this.gl.getUniformLocation(this.program, 'uTransparent')
        };

        // Set initial uniform values
        this.gl.uniform2fv(this.uniforms.uFocal, this.options.focal);
        this.gl.uniform2fv(this.uniforms.uRotation, this.options.rotation);
        this.gl.uniform1f(this.uniforms.uDensity, this.options.density);
        this.gl.uniform1f(this.uniforms.uHueShift, this.options.hueShift);
        this.gl.uniform1f(this.uniforms.uSpeed, this.options.speed);
        this.gl.uniform1f(this.uniforms.uGlowIntensity, this.options.glowIntensity);
        this.gl.uniform1f(this.uniforms.uSaturation, this.options.saturation);
        this.gl.uniform1i(this.uniforms.uMouseRepulsion, this.options.mouseRepulsion);
        this.gl.uniform1f(this.uniforms.uTwinkleIntensity, this.options.twinkleIntensity);
        this.gl.uniform1f(this.uniforms.uRotationSpeed, this.options.rotationSpeed);
        this.gl.uniform1f(this.uniforms.uRepulsionStrength, this.options.repulsionStrength);
        this.gl.uniform1f(this.uniforms.uAutoCenterRepulsion, this.options.autoCenterRepulsion);
        this.gl.uniform1i(this.uniforms.uTransparent, this.options.transparent);
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    setupGeometry() {
        // Create full-screen triangle
        const positions = new Float32Array([
            -1, -1,
             3, -1,
            -1,  3
        ]);

        const uvs = new Float32Array([
            0, 0,
            2, 0,
            0, 2
        ]);

        // Position buffer
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // UV buffer
        const uvBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, uvs, this.gl.STATIC_DRAW);

        const uvLocation = this.gl.getAttribLocation(this.program, 'uv');
        this.gl.enableVertexAttribArray(uvLocation);
        this.gl.vertexAttribPointer(uvLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    resize() {
        const scale = window.devicePixelRatio || 1;
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        
        this.canvas.width = width * scale;
        this.canvas.height = height * scale;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.uniforms.uResolution) {
            this.gl.uniform3f(
                this.uniforms.uResolution,
                this.canvas.width,
                this.canvas.height,
                this.canvas.width / this.canvas.height
            );
        }
    }

    handleMouseMove(e) {
        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        this.targetMousePos = { x, y };
        this.targetMouseActive = 1.0;
    }

    handleMouseLeave() {
        this.targetMouseActive = 0.0;
    }

    render(time) {
        this.animationId = requestAnimationFrame((t) => this.render(t));

        // Update time
        this.gl.uniform1f(this.uniforms.uTime, time * 0.001);
        this.gl.uniform1f(this.uniforms.uStarSpeed, (time * 0.001 * this.options.starSpeed) / 10.0);

        // Smooth mouse interpolation
        const lerpFactor = 0.05;
        this.smoothMousePos.x += (this.targetMousePos.x - this.smoothMousePos.x) * lerpFactor;
        this.smoothMousePos.y += (this.targetMousePos.y - this.smoothMousePos.y) * lerpFactor;
        this.smoothMouseActive += (this.targetMouseActive - this.smoothMouseActive) * lerpFactor;

        this.gl.uniform2f(this.uniforms.uMouse, this.smoothMousePos.x, this.smoothMousePos.y);
        this.gl.uniform1f(this.uniforms.uMouseActiveFactor, this.smoothMouseActive);

        // Render
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    start() {
        if (!this.animationId) {
            this.render(0);
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    destroy() {
        this.stop();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.gl) {
            const ext = this.gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        }
    }
}

// Initialize Galaxy when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const galaxyContainer = document.getElementById('galaxyBg');
    if (galaxyContainer) {
        window.galaxy = new GalaxyBackground(galaxyContainer, {
            density: 1.0,
            glowIntensity: 0.3,
            saturation: 0.0,
            hueShift: 140,
            mouseRepulsion: true,
            mouseInteraction: true,
            repulsionStrength: 2,
            twinkleIntensity: 0.3,
            rotationSpeed: 0.05,
            speed: 1.0,
            transparent: true
        });
    }
});
