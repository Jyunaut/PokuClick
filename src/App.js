import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
	Raycaster
} from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import * as spine from '@esotericsoftware/spine-threejs';

let scene, camera, renderer;
let geometry, material, mesh, skeletonMesh;
let atlas;
let atlasLoader;
let assetManager;
let canvas;
let lastFrameTime = Date.now() / 1000;

const baseUrl = process.env.STATUS === 'production'
	? process.env.APP_BASE_URL_PRODUCTION
	: process.env.APP_BASE_URL_DEVELOPMENT;
const skeletonFile = "Sprout.json";
let atlasFile = skeletonFile
	.replace("-pro", "")
	.replace("-ess", "")
	.replace(".json", ".atlas");
let anim_idle = "sitting";
let anim_pressed = "sitting_press";

class App {
	init() {
		// create the THREE.JS camera, scene and renderer (WebGL)
		let width = window.innerWidth,
		height = window.innerHeight;
		camera = new PerspectiveCamera(75, width / height, 1, 3000);
		camera.position.y = 100;
		camera.position.z = 400;
		scene = new Scene();
		renderer = new WebGLRenderer();
		renderer.setSize(width, height);
		document.body.appendChild(renderer.domElement);
		canvas = renderer.domElement;

		window.addEventListener('resize', onWindowResize, false);

		const controls = new OrbitControls(camera, renderer.domElement);

		// Load the assets required to display the sprout
		assetManager = new spine.AssetManager(baseUrl);
		assetManager.loadText(skeletonFile);
		assetManager.loadTextureAtlas(atlasFile);

		canvas.addEventListener('click', onCanvasClick, false);

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
		skeletonMesh.state.setAnimation(0, anim_idle, true);
		scene.add(skeletonMesh);
		
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
	
	// Render the scene
	renderer.render(scene, camera);
	
	requestAnimationFrame(render);
}

// Function to handle canvas click event
function onCanvasClick(event) {
	// Calculate mouse position in normalized device coordinates (-1 to +1) for both components
	const mouse = {
		x: (event.clientX / window.innerWidth) * 2 - 1,
		y: -(event.clientY / window.innerHeight) * 2 + 1
	};

	// Create a raycaster and set its position from the camera and mouse coordinates
	const raycaster = new Raycaster();
	raycaster.setFromCamera(mouse, camera);

	// Calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObject(skeletonMesh, true);

	if (intersects.length > 0) {
		// If the skeleton mesh is clicked, change the animation with mixing
		skeletonMesh.state.setAnimation(0, anim_pressed, false).listener = {
			complete: function (trackEntry) {
				// When the pressed animation is complete, switch back to the idle animation with mixing
				let entry = skeletonMesh.state.setAnimation(0, anim_idle, true);
				entry.mixDuration = 0.2;
			}
		};
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize(window.innerWidth, window.innerHeight);
}

export default App;
