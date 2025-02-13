class AudioManager {
    constructor() {
        this.audioContext = new AudioContext();
        this.sfxBuffer = null;
        this.musicBuffer = null;
        this.musicSource = null;
        this.sfxGainNode = this.audioContext.createGain();
        this.musicGainNode = this.audioContext.createGain();
        this.sfxGainNode.connect(this.audioContext.destination);
        this.musicGainNode.connect(this.audioContext.destination);
        this.stopMusicTime = 0;
    }

    async loadSFX(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.sfxBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    async loadMusic(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.musicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    playSFX() {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.sfxBuffer;
        source.playbackRate.value = Math.random() * 0.5 + 1.25; // Random pitch between 1.25 and 1.75
        source.connect(this.sfxGainNode);
        source.start(0);
    }

    setSFXVolume(value) {
        this.sfxGainNode.gain.value = value;
        console.log('SFX Volume:', this.sfxGainNode.gain.value);
    }

    setMusicVolume(value) {
        this.musicGainNode.gain.value = value;
        console.log('Music Volume:', this.musicGainNode.gain.value);
    }

    playMusic(loop = true, resume = false) {
        if (this.musicSource) {
            this.musicSource.stop();
        }
        this.musicSource = this.audioContext.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.loop = loop;
        this.musicSource.connect(this.musicGainNode);
        const startTime = resume ? this.stopMusicTime : 0;
        this.musicSource.start(0, startTime);
    }

    fadeInMusic(duration = 1, volume = 0.5, resume = false) {
        this.musicGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.musicGainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + duration);
        this.playMusic(true, resume);
    }

    fadeOutMusic(duration = 1) {
        this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, this.audioContext.currentTime);
        this.musicGainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        setTimeout(() => {
            this.stopMusic();
        }, duration * 1000);
    }

    stopMusic() {
        if (this.musicSource) {
            this.stopMusicTime = this.musicSource.context.currentTime;
            this.musicSource.stop();
            this.musicSource = null;
        }
    }

    resumeMusic() {
        this.playMusic();
    }
}

export default AudioManager;