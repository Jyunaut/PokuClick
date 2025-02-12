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

const STATUS = 'production';

// Update the global counter from the firebase database
let globalCounter = 0;
let globalCounterElement;

// Update the local counter from the local storage
let totalCounter = parseInt(localStorage.getItem('totalCounter')) || 0;
let totalCounterElement;

// Update the clicks per flush counter every 10 seconds
let cpfCounter = 0;
let cpfLastCount = 0;
let cpfCounterElement;
let clickTimestamps = [];

// Flush Counters
const flushInterval = 5;
let flushTimer = flushInterval;
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
	? '/PokuClick/assets/sprout/'
	: '/assets/sprout/';
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
		assetManager = new spine.AssetManager(baseUrl);
		assetManager.loadText(skeletonFile);
		assetManager.loadTextureAtlas(atlasFile);

		requestAnimationFrame(load);

		// Prevent right-click context menu
		document.addEventListener('contextmenu', function (event) {
			event.preventDefault();
		});

		// Update the global counter from the firebase database
		globalCounterElement = document.getElementById('global-counter');
		globalCounterElement.textContent = globalCounter;

		// Update the local counter from the local storage	
		totalCounterElement = document.getElementById('total-counter');
		totalCounterElement.textContent = totalCounter;

		// Update the clicks per flush counter every 10 seconds
		cpfCounter = 0;
		cpfLastCount = totalCounter;
		cpfCounterElement = document.getElementById('cpf-counter');
		flushCounterElement = document.getElementById('flushed-counter');
		flushCounterElement.textContent = flushCounter;
		clickTimestamps = [];

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

	// Update the flush timer
	updateFlushTimer(delta);

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

function updateCounter() {
	totalCounter++;
	amountToFlush++;
	localStorage.setItem('totalCounter', totalCounter);
	totalCounterElement.textContent = totalCounter;

	// Animate the local counter using GSAP
	gsap.fromTo(totalCounterElement, {
		scale: 1
	}, {
		scale: 1.5,
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
	set: function(target, property, value) {
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
	cpfCounter = sum / clickTimestamps.length;
	cpfCounterElement.textContent = (flushInterval * cpfCounter).toFixed(0);
	cpfLastCount = totalCounter;
}

function updateFlushTimer(deltaTime) {
	flushTimer -= deltaTime;
	if (flushTimer <= 0) {
		flushTimer = flushInterval;
		flush();
	}
}

let globalCounterIncrement;
const isFlushingProxy = new Proxy({ value: false }, isFlushingHandler);
let flushCounterIncrement;
function flush() {
	if (amountToFlush <= 0) {
		return;
	}

	// Update the global counter from the firebase database
	if (globalCounterIncrement) {
		clearInterval(globalCounterIncrement);
	}
	globalCounterIncrement = incrementCounter(globalCounterElement, globalCounter, amountToFlush);
	globalCounter += amountToFlush;
	localStorage.setItem('globalCounter', globalCounter);
	// TODO: Update the firebase database with the global counter

	// Update the local counter from the local storage
	if (flushCounterIncrement) {
		clearInterval(flushCounterIncrement);
	}
	flushCounterIncrement = incrementCounter(flushCounterElement, flushCounter, amountToFlush);
	flushCounter += amountToFlush;
	localStorage.setItem('flushCounter', flushCounter);

	amountToFlush = 0;
}

function incrementCounter(counterElement, count, increment) {
	const duration = 100;
	isFlushingProxy.value = true;
	let endValue = count + increment;
	let interval = setInterval(function () {
		count++;
		counterElement.textContent = count;
		gsap.fromTo(counterElement, {
			scale: 1
		}, {
			scale: 1.5,
			duration: 0.1,
			repeat: 1,
			yoyoEase: 'power2.out',
		});
		if (count >= endValue) {
			clearInterval(interval);
			isFlushingProxy.value = false;
		}
	}, duration);
	return interval;
}

export default App;
