class SpeedLinesEffect {
    constructor(amount, minLength = 300, maxLength = 900, opacity = 1) {
        this.speedLines = [];
        this.minLength = minLength;
        this.maxLength = maxLength;
        this.opacity = opacity;
        this.enabled = false;
        for (let i = 0; i < amount; i++) {
            this.speedLines.push(this.#createSpeedLine());
        }
        this.speedLines.forEach(speedLine => {
            speedLine.style.display = 'none';
        });
    }

    enableSpeedLines() {
        if (this.enabled) {
            return;
        }

        this.speedLines.forEach(speedLine => {
            speedLine.style.display = 'block';
        });
        this.enabled = true;
    }

    disableSpeedLines() {
        if (!this.enabled) {
            return;
        }

        this.speedLines.forEach(speedLine => {
            speedLine.style.display = 'none';
        });
        this.enabled = false;
    }

    setSpeedLineOpacity(opacity) {
        this.speedLines.forEach(speedLine => {
            speedLine.style.opacity = opacity;
        });
    }

    randomizePositions() {
        this.speedLines.forEach(speedLine => {
            this.#setPosition(speedLine, Math.random() * 360);
        });
    }

    shiftPositions(angleDelta) {
        this.speedLines.forEach(speedLine => {
            const currentAngle = parseFloat(speedLine.dataset.angle);
            this.#setPosition(speedLine, currentAngle + angleDelta);
        });
    }

    #createSpeedLine() {
        const triangle = document.createElement('div');
        triangle.style.position = 'absolute';
        triangle.style.borderLeft = '10px solid transparent';
        triangle.style.borderRight = '10px solid transparent';
        triangle.style.borderBottom = '10px solid white';
        triangle.style.maskImage = 'linear-gradient(to top, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0))';
        triangle.style.borderBottomWidth = `${Math.random() * (this.maxLength - this.minLength) + this.minLength}px`;
        triangle.style.opacity = this.opacity;
        triangle.style.zIndex = 1000;

        this.#setPosition(triangle, Math.random() * 360);
        document.body.appendChild(triangle);

        return triangle;
    }

    #setPosition(triangle, angle) {
        const radius = Math.max(window.innerWidth, window.innerHeight) / 2 + 100;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const x = centerX + radius * Math.cos(angle * Math.PI / 180);
        const y = centerY + radius * Math.sin(angle * Math.PI / 180);

        triangle.style.left = `${x}px`;
        triangle.style.top = `${y}px`;
        triangle.style.transform = `rotate(${angle - 90}deg)`;
        triangle.dataset.angle = angle;
    }
}

export default SpeedLinesEffect;