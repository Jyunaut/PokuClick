import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
	Raycaster,
	Euler,
	Color
} from 'three';
import * as spine from '@esotericsoftware/spine-threejs';
import { gsap } from 'gsap';

let scene, camera, renderer;
let geometry, material, mesh, skeletonMesh;
let atlas;
let atlasLoader;
let assetManager;
let canvas;
let lastFrameTime = Date.now() / 1000;

const STATUS = 'production';

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
		document.body.appendChild(renderer.domElement);
		canvas = renderer.domElement;

		window.addEventListener('resize', onWindowResize, false);

		// Load the assets required to display the sprout
		assetManager = new spine.AssetManager(baseUrl);
		assetManager.loadText(skeletonFile);
		assetManager.loadTextureAtlas(atlasFile);

		requestAnimationFrame(load);
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
	console.log(camera.rotation);
	
	// Render the scene
	renderer.render(scene, camera);
	
	requestAnimationFrame(render);
}

const raycaster = new Raycaster();
function onCanvasClick(event) {
	// Calculate mouse position in normalized device coordinates (-1 to +1) for both components
	const mouse = {
		x:  (event.clientX / window.innerWidth)  * 2 - 1,
		y: -(event.clientY / window.innerHeight) * 2 + 1
	};

	// Create a raycaster and set its position from the camera and mouse coordinates
	raycaster.setFromCamera(mouse, camera);

	// Calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObject(skeletonMesh, true);
	if (intersects.length > 0) {
		playPressedAnimation();
	}
}

async function playIntro() {
	// Wait for the fade-in effect to complete
	await waitForSeconds(0.5);

	// Make the sprout run to the screen
	skeletonMesh.state.setAnimation(0, 'run', true);

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
			canvas.addEventListener('click', onCanvasClick, false);
		}
	}
}

function playPressedAnimation() {
	skeletonMesh.state.setAnimation(0, anim_pressed, false).listener = {
		complete: function (trackEntry) {
			// When the pressed animation is complete, switch back to the idle animation with mixing
			let entry = skeletonMesh.state.setAnimation(0, anim_idle, true);
			entry.mixDuration = 0.2;
		}
	};
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function waitForSeconds(seconds) {
	return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export default App;
