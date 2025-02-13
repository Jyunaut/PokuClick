class AudioManager {
    constructor() {
        this.audioContext = new AudioContext();
        this.audioBuffer = null;
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
    }

    async loadAudio(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    playSFX() {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.playbackRate.value = Math.random() * 0.5 + 1.25; // Random pitch between 1.25 and 1.75
        source.connect(this.gainNode);
        source.start(0);
    }

    setVolume(value) {
        this.gainNode.gain.value = value;
        console.log(this.gainNode.gain.value);
    }
}

export default AudioManager;