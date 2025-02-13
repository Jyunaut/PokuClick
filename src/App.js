import {
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
	Raycaster,
	Euler,
	Color
} from 'three';
import * as spine from '@esotericsoftware/spine-threejs';
import { gsap } from 'gsap';
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AudioManager from './AudioManager';
import SpeedLinesEffect from './SpeedLinesEffect';

const STATUS = 'production';

// Update the global counter from the firebase database
const globalCounterInterval = 30;
let globalTimer = 30;
let globalCounterToAdd = 0;
let globalCounterElement;
let globalCounterLabelElement;

// Update the local counter from the local storage
let totalCounter = parseInt(localStorage.getItem('totalCounter')) || 0;
let totalCounterElement;

// Update the clicks per flush counter every 10 seconds
let cpfCounter = 0;
let cpfLastCount = 0;
let cpfCounterElement;
let clickTimestamps = [];

// Flush Counters
const flushInterval = 2;
let flushTimer = 2;
let amountToFlush = 0;
let flushCounter = parseInt(localStorage.getItem('flushCounter')) || 0;
let flushCounterElement;

// Three.js variables
let scene, camera, renderer;
let canvas;
let lastFrameTime = Date.now() / 1000;

// Spine variables
let skeletonMesh;
let atlas;
let atlasLoader;
let assetManager;
const baseUrl = STATUS === 'production'
	? '/PokuClick/assets/'
	: '../assets/';
const skeletonFile = 'Sprout.json';
let atlasFile = skeletonFile
	.replace('-pro', '')
	.replace('-ess', '')
	.replace('.json', '.atlas');
let anim_idle = 'sitting';
let anim_run = 'run';
let anim_run_stop = 'run_stop';
let anim_pressed = 'sitting_press';
let anim_sitting_mouth_open = 'sitting_mouthOpen';
let anim_pressed_rainbow = 'sitting_press_rainbow';

// Audio variables
let audioManager;

// Speed lines effect
let speedLinesEffect = new SpeedLinesEffect(20, 600, 1100, 1);

class App {
	init() {
		// create the camera, scene and renderer (WebGL)
		let width = window.innerWidth,
			height = window.innerHeight;
		camera = new PerspectiveCamera(75, width / height, 1, 3000);
		camera.position.y = 300;
		camera.position.z = 500;
		camera.setRotationFromEuler(new Euler(0, 0, 0));
		scene = new Scene();
		scene.background = new Color(0xF0BB57);
		renderer = new WebGLRenderer();
		renderer.setSize(width, height);
		renderer.domElement.id = 'canvas';
		document.body.appendChild(renderer.domElement);
		canvas = renderer.domElement;

		window.addEventListener('resize', onWindowResize, false);

		// Load the assets required to display the sprout
		assetManager = new spine.AssetManager(baseUrl + "sprout/");
		assetManager.loadText(skeletonFile);
		assetManager.loadTextureAtlas(atlasFile);

		requestAnimationFrame(load);

		// Prevent right-click context menu
		document.addEventListener('contextmenu', function (event) {
			event.preventDefault();
		});

		// Update the global counter from the firebase database
		globalCounterElement = document.getElementById('global-counter');
		globalCounterLabelElement = document.getElementById('global-counter-label');
		updateGlobalCounter(0, 0);

		// Update the local counter from the local storage	
		totalCounterElement = document.getElementById('total-counter');
		totalCounterElement.textContent = totalCounter;

		// Update the clicks per flush counter every 10 seconds
		cpfCounter = 0;
		cpfLastCount = totalCounter;
		// cpfCounterElement = document.getElementById('cpf-counter');
		flushCounterElement = document.getElementById('flushed-counter');
		flushCounterElement.textContent = flushCounter;
		clickTimestamps = [];

		// Setup the audio manager
		audioManager = new AudioManager();
		audioManager.loadSFX(baseUrl + "Oof_04.wav");
		audioManager.loadMusic(baseUrl + "MIRAGE Instrumental.mp3");
		audioManager.setSFXVolume(localStorage.getItem('volume') / 100 || 0.5);
		audioManager.setMusicVolume(localStorage.getItem('volume') / 100 || 0.5);
		const volumeSliderElement = document.getElementById('volume-slider');
		volumeSliderElement.value = localStorage.getItem('volume') || 50;
		const volumeSlider = document.getElementById('volume-slider');
		volumeSlider.addEventListener('input', function () {
			audioManager.setSFXVolume(volumeSlider.value / 100);
			audioManager.setMusicVolume(volumeSlider.value / 100);
			localStorage.setItem('volume', volumeSlider.value);
		});

		setInterval(updateCPFCounter, 1000);
	}
}

function load() {
	if (assetManager.isLoadingComplete()) {
		// Load the texture atlas using name.atlas and name.png from the AssetManager.
		// The function passed to TextureAtlas is used to resolve relative paths.
		atlas = assetManager.require(atlasFile);

		// Create an AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
		atlasLoader = new spine.AtlasAttachmentLoader(atlas);

		// Create a SkeletonJson instance for parsing the .json file
		let skeletonJson = new spine.SkeletonJson(atlasLoader);
		skeletonJson.scale = 0.4;
		let skeletonData = skeletonJson.readSkeletonData(assetManager.require(skeletonFile));

		// Create a SkeletonMesh from the data and attach it to the scene
		skeletonMesh = new spine.SkeletonMesh(skeletonData);
		skeletonMesh.position.set(3000, 0, 0);
		skeletonMesh.state.setAnimation(0, anim_idle, true);
		scene.add(skeletonMesh);
		playIntro();

		requestAnimationFrame(render);
	} else {
		requestAnimationFrame(load);
	}
}

function render() {
	// Calculate delta time for animation purposes
	let now = Date.now() / 1000;
	let delta = now - lastFrameTime;
	lastFrameTime = now;

	// Update the animation
	skeletonMesh.update(delta);

	// Update the timers
	updateFlushTimer(delta);
	updateGlobalTimer(delta);

	// Update the water level
	updateWaterLevel(delta);

	// Update the speed lines effect
	updateInitialDState(delta);

	// Render the scene
	renderer.render(scene, camera);

	requestAnimationFrame(render);
}

const raycaster = new Raycaster();
function onCanvasClick(event) {
	// Calculate mouse position in normalized device coordinates (-1 to +1) for both components
	const mouse = {
		x: (event.clientX / window.innerWidth) * 2 - 1,
		y: -(event.clientY / window.innerHeight) * 2 + 1
	};

	// Create a raycaster and set its position from the camera and mouse coordinates
	raycaster.setFromCamera(mouse, camera);

	// Calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObject(skeletonMesh, true);
	if (intersects.length > 0) {
		playPressedAnimation();
		updateCounter();
		audioManager.playSFX();
	}
}

async function playIntro() {
	// Make the sprout run to the screen
	skeletonMesh.state.setAnimation(0, anim_run, true);

	// Tween the sprout's position to the center of the screen
	const targetPosition = { x: 0, y: 0 };
	gsap.to(skeletonMesh.position, {
		duration: 2,
		x: targetPosition.x,
		y: targetPosition.y,
		ease: 'none'
	});

	await waitForSeconds(2);

	skeletonMesh.state.setAnimation(0, anim_run_stop, false).listener = {
		complete: function (trackEntry) {
			// When the run_stop animation is complete, switch to the idle animation
			let entry = skeletonMesh.state.setAnimation(0, anim_idle, true);
			entry.mixDuration = 0.2;
			canvas.addEventListener('pointerdown', onCanvasClick, false);
		}
	}
}

let globalCounterIncrement;
async function updateGlobalCounter(amount, duration = 100) {
	globalCounterToAdd = 0;
	const globalCounterRef = doc(db, 'global', 'score');
	const docSnap = await getDoc(globalCounterRef);
	if (docSnap.exists()) {
		console.log('Firestore read performed');
		const targetValue = docSnap.data().litersFlushed + amount;
		incrementGlobalCounter(globalCounterElement, docSnap.data().litersFlushed, amount, duration);
		if (targetValue !== docSnap.data().litersFlushed) {
			await updateDoc(globalCounterRef, { litersFlushed: targetValue });
			console.log('Firestore write performed');
		}
	}
}

function incrementGlobalCounter(counterElement, count, increment, duration = 100) {
	if (globalCounterIncrement) {
		clearInterval(globalCounterIncrement);
	}
	globalCounterIncrement = incrementCounter(counterElement, count, increment, false, duration);
}

function updateCounter() {
	totalCounter++;
	amountToFlush++;
	localStorage.setItem('totalCounter', totalCounter);
	totalCounterElement.textContent = totalCounter;

	// Animate the local counter using GSAP
	gsap.fromTo(totalCounterElement, {
		y: 0
	}, {
		y: -5,
		duration: 0.1,
		repeat: 1,
		yoyoEase: 'power2.out',
	});
}

function playPressedAnimation() {
	let pressedAnimation = isFlushingProxy.value ? anim_pressed_rainbow : anim_pressed;
	let trackEntry = skeletonMesh.state.setAnimation(1, pressedAnimation, false);
	trackEntry.alpha = 1;
	trackEntry.listener = {
		complete: function (trackEntry) {
			skeletonMesh.state.setEmptyAnimation(1, 0.2);
		}
	};
}

const isFlushingHandler = {
	set: function (target, property, value) {
		if (property === 'value') {
			if (target[property] === false && value === true) {
				skeletonMesh.state.setAnimation(0, anim_sitting_mouth_open, true).mixDuration = 0.25;
			} else if (target[property] === true && value === false) {
				skeletonMesh.state.setAnimation(0, anim_idle, true).mixDuration = 0.25;
			}
		}
		target[property] = value;
		return true;
	}
};

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function waitForSeconds(seconds) {
	return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

const clickTimestampsCapacity = 10;
function updateCPFCounter() {
	// Update the clicks per flush counter
	let diff = totalCounter - cpfLastCount;
	clickTimestamps.push(diff);
	if (clickTimestamps.length > clickTimestampsCapacity) {
		clickTimestamps.shift();
	}

	// Calculate the rolling average of the clicks per flush counter
	let sum = 0;
	for (let i = 0; i < clickTimestamps.length; i++) {
		sum += clickTimestamps[i];
	}
	cpfCounter = flushInterval * sum / clickTimestamps.length;
	// cpfCounterElement.textContent = cpfCounter.toFixed(0);
	cpfLastCount = totalCounter;
}

function updateGlobalTimer(deltaTime) {
	globalTimer -= deltaTime;
	if (globalTimer <= 0) {
		globalTimer = globalCounterInterval;
		updateGlobalCounter(globalCounterToAdd);
	}
	
	// Update global counter label
	const time = globalTimer.toFixed(0);
	const label = `Liters Flushed (Global) <span style="color: #45811a;">Update in ${time}</span>`;
	globalCounterLabelElement.innerHTML = label;
}

function updateFlushTimer(deltaTime) {
	flushTimer -= deltaTime;
	if (flushTimer <= 0) {
		flushTimer = flushInterval;
		flush();
	}
}

const isFlushingProxy = new Proxy({ value: false }, isFlushingHandler);
let flushCounterIncrement;
function flush() {
	// Update the global counter from the firebase database
	globalCounterToAdd += amountToFlush;

	// Update the local counter from the local storage
	if (flushCounterIncrement) {
		clearInterval(flushCounterIncrement);
	}
	flushCounterIncrement = incrementCounter(flushCounterElement, flushCounter, amountToFlush, true);
	flushCounter += amountToFlush;
	localStorage.setItem('flushCounter', flushCounter);

	amountToFlush = 0;
}

function incrementCounter(counterElement, count, increment, updateFlushing = false, duration = 100) {
	if (duration <= 0) {
		counterElement.textContent = count + increment;
		return;
	}

	let interval;
	if (increment <= 0) {
		if (count > parseInt(counterElement.textContent)) {
			let startValue = parseInt(counterElement.textContent);
			let endValue = count;
			interval = setInterval(function () {
				startValue++;
				counterElement.textContent = startValue;
				if (startValue >= endValue) {
					clearInterval(interval);
					if (updateFlushing) {
						isFlushingProxy.value = false;
					}
				}
				gsap.fromTo(counterElement, {
					y: 0
				}, {
					y: -5,
					duration: 0.1,
					repeat: 1,
					yoyoEase: 'power2.out',
				});
			}, duration);
		}
		return interval;
	}

	if (updateFlushing && increment >= 5) {
		isFlushingProxy.value = true;
	}
	let endValue = count + increment;
	interval = setInterval(function () {
		count++;
		counterElement.textContent = count;
		if (count >= endValue) {
			clearInterval(interval);
			if (updateFlushing) {
				isFlushingProxy.value = false;
			}
		}
		gsap.fromTo(counterElement, {
			y: 0
		}, {
			y: -5,
			duration: 0.1,
			repeat: 1,
			yoyoEase: 'power2.out',
		});
	}, duration);
	return interval;
}

function updateWaterLevel(deltaTime) {
	const waterElement = document.querySelector('.water');
	const value = lerp(waterElement.style.height.replace('%', ''), amountToFlush * 2, deltaTime * 0.8);
	waterElement.style.height = `${value}%`;
}

const initialDStateInterval = 0.03;
let initialDStateTimer = initialDStateInterval;
let initialDStateFlagDoOnce = false;
let initialDStateFlag = false;
function updateInitialDState(deltaTime) {
	if (initialDStateTimer > 0) {
		initialDStateTimer -= deltaTime;
	} else {
		initialDStateTimer = initialDStateInterval;
		if (cpfCounter > 10) {
			if (!initialDStateFlagDoOnce) {
				initialDStateFlagDoOnce = true;
				audioManager.playMusic(true);
				audioManager.fadeInMusic(1, localStorage.getItem('volume') / 100 || 0.5, true);
			} else if (!initialDStateFlag) {
				initialDStateFlag = true;
				audioManager.fadeInMusic(1, localStorage.getItem('volume') / 100 || 0.5, true);
			}
			speedLinesEffect.enableSpeedLines();
			speedLinesEffect.shiftPositions(30);
		} else {
			if (initialDStateFlag) {
				initialDStateFlag = false;
				audioManager.fadeOutMusic(1);
			}
			speedLinesEffect.disableSpeedLines();
		}
	}
}

function lerp(start, end, t) {
	return start * (1 - t) + end * t;
}

export default App;
