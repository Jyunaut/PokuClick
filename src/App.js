import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	WebGLRenderer
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

const baseUrl = "../PokuClick/assets/sprout/";
const skeletonFile = "Sprout.json";
let atlasFile = skeletonFile
	.replace("-pro", "")
	.replace("-ess", "")
	.replace(".json", ".atlas");
let animation = "idle";

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

		requestAnimationFrame(load);
	}
}

function load() {
	if (assetManager.isLoadingComplete()) {
		// Add a box to the scene to which we attach the skeleton mesh
		geometry = new BoxGeometry(200, 200, 200);
		material = new MeshBasicMaterial({
			color: 0x00ff00,
			wireframe: true,
		});
		mesh = new Mesh(geometry, material);
		scene.add(mesh);

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
		skeletonMesh.state.setAnimation(0, animation, true);
		mesh.add(skeletonMesh);

		requestAnimationFrame(render);
	} else {
		requestAnimationFrame(load);
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
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

export default App;
