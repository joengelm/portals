var stats;

var camera, controls, scene, renderer, raycaster;
const videos = {};

const desc = {
	welcome: 'Sweep is a collection of parallel realities. Every channel on Sweep is a different version of the world, created by you and other users.',
	place_item: 'Place Content into a channel by copying it from the Web or by rendering a model yourself.',
	virality: 'Objects with more views and appreciation will spread their appearance and behavior to nearby Content.',
	avalanche: 'Content that begins to spread rapidly can quickly spiral out of control and burn out in a storm or avalanche of Content.',
	behavior: 'Content can be assigned behavior. Choose from a selection of "causes" and connect them to various "effects" to make Content that interacts with its world.',
	garden: 'Not all Content ends in an avalanche. This Lamp/Bear garden has found a quiet equilibrium of attention.',
	memehell: 'Channels are customizable and easy to create. Anyone can create a new channel in under a minute.'
}

function useAccel() {
	var nav = navigator.userAgent;
	var mobile = false;
	['Android', 'Mobile'].forEach(function(word) {
		if (nav.indexOf(word) != -1) {
			mobile = true;
		}
	})
	return mobile;
}

function init() {

	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.002 );

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( scene.fog.color );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	
	var pointLight = new THREE.PointLight( 0xffffff, 1 );
					pointLight.position.set( 0, 10, 0 );
	scene.add( pointLight );

	document.getElementById('container').appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 2000 );
	camera.position.z = 0.5;
	// 						controls = new THREE.DeviceOrientationControls( camera );
	
	if (useAccel()) {
		controls = new THREE.DeviceOrientationControls(camera);
		setupTapRec();
	} else {
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		setupClickRec();
	}
	// controls.enableZoom = false;
	controls.enablePan = false;

	raycaster = new THREE.Raycaster();

	// world
	
	createSkybox();
	//createContent();
	addGalleryImage('images/1.png', 1, 1);
	addGalleryImage('images/2.png', 2, 3);
	addGalleryImage('images/3.png', 0, 1);
	addGalleryImage('images/4.png', 1, 0);
	setupVideos();
	//createText();
	createObjects();
		
	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

var frame = 0;
var rotatingObjects = [];

var mouse = new THREE.Vector2();
function onClick(event) {

	if (!inFullscreen) {
		// calculate mouse position in normalized device coordinates
		// (-1 to +1) for both components

		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
		raycaster.setFromCamera( mouse, camera );
		var intersects = raycaster.intersectObjects( scene.children ).map(function(p){return p.object});
		var obj = intersects.length ? intersects[0] : null;
		setSelectedObject(obj);
	}
}
window.addEventListener('mousedown', onClick, false);

function animate() {
	frame++;
	requestAnimationFrame(animate);

	controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
	
	rotatingObjects.forEach(function(obj) {
		obj.rotateY(20 / 60 * Math.PI / 180)
	});
	
	camera.updateMatrixWorld();

	for (const name in videos) {
		v = videos[name];
		vid = v.video;
		if (v.video.readyState === v.video.HAVE_ENOUGH_DATA) {
			v.imageContext.drawImage(v.video, 0, 0);
			if (v.texture) {
				v.texture.needsUpdate = true;
			}
		}
	}
	
	render();
}

var inFullscreen = false;
var _selectedObject = null;
function setSelectedObject(obj){
	if (obj.name in videos) {
		v = videos[obj.name];
		vid = v.video;
		vid.src = '';

		const f = document.getElementById('fullscreen');
		f.src = 'videos/' + obj.name + '.mp4';
		f.loop = true;
		f.style.zIndex = 1000;
		f.muted = true;
		f.play();

		document.getElementById('overlay').style.zIndex = 999;
		document.getElementById('descriptionText').innerHTML = desc[obj.name];
		document.getElementById('description').style.bottom = 0;
		document.getElementById('container').style.filter = 'blur(25px)';

		inFullscreen = true;

		f.addEventListener('click', e => {
			f.src = '';
			f.style.zIndex = -100;
			document.getElementById('overlay').style.zIndex = -100;
			document.getElementById('container').style.filter = 'none';
			document.getElementById('description').style.bottom = '-200px';

			inFullscreen = false;
			
			vid = videos[obj.name].video;
			vid.src = 'videos/' + obj.name + '.mp4';
			vid.play();
		});
	}
	if (obj !== _selectedObject) {
		_selectedObject = obj;
	}
}

function render() {
	renderer.render(scene, camera);
}

function createSkybox() {
	const boxes = ['Park3Med/', 'MilkyWay/dark-s_', 'SwedishRoyalCastle/'];
	const r = 'cube/' + boxes[Math.floor(Math.random() * boxes.length)];
	var ext = '.jpg';
	var urls = [ r + "px" + ext, r + "nx" + ext,
				 r + "py" + ext, r + "ny" + ext,
				 r + "pz" + ext, r + "nz" + ext ];
	textureCube = new THREE.CubeTextureLoader().load( urls );
	textureCube.format = THREE.RGBFormat;
	textureCube.mapping = THREE.CubeReflectionMapping;
	var textureLoader = new THREE.TextureLoader();
	
	var cubeShader = THREE.ShaderLib[ "cube" ];
	var cubeMaterial = new THREE.ShaderMaterial( {
		fragmentShader: cubeShader.fragmentShader,
		vertexShader: cubeShader.vertexShader,
		uniforms: cubeShader.uniforms,
		depthWrite: false,
		side: THREE.BackSide
	} );
	cubeMaterial.uniforms[ "tCube" ].value = textureCube;
	
	var geo = new THREE.BoxGeometry( 100, 100, 100 )
	cubeMesh = new THREE.Mesh( geo, cubeMaterial );
	cubeMesh.name = 'Skybox';
	scene.add( cubeMesh );
	
}

function addGalleryImage(url, angle, vertAngle, link) {
	var loader = new THREE.TextureLoader();

	// load a resource
	loader.load(
		// resource URL
		url,
		// Function when resource is loaded
		function ( texture ) {
			// do something with the texture
			var material = new THREE.MeshBasicMaterial( {
				map: texture,
				side: THREE.DoubleSide
			 } );
		 	var geometry = new THREE.PlaneGeometry( 2, 2);
		 	// var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
		 	var plane = new THREE.Mesh( geometry, material );
		 	plane.rotateY(angle * Math.PI / 180 + Math.PI/2);
			plane.rotateX(vertAngle * Math.PI / 180);
			plane.rotateZ((Math.random() - 0.5) * 2 * Math.PI * 2 * 0.1)
		 	plane.translateZ(Math.random() * 20 - 10);
		 	plane.translateX(Math.random() * 20 - 10);
		 	rotatingObjects.push(plane);
		 	scene.add( plane );
			plane.selectable = true;
			plane.link = link
		},
		// Function called when download progresses
		function ( xhr ) {
			
		},
		// Function called when download errors
		function ( xhr ) {
			console.log('error' ,xhr)
		}
	);
}

function createObjects() {
	loadObj('hand', function(object) {
		object.rotateX(Math.PI/2);
		object.scale.set(100,100,100);
		object.position.y = -2;
		rotatingObjects.push(object);
		scene.add( object );
	});
	loadObj('justin', function(object) {
		object.position.y = -10;
		object.position.x = 5;
		object.position.z = 10;
		object.rotateZ(Math.PI/2);
		object.scale.set(5,5,5);
		rotatingObjects.push(object);
		scene.add(object);
	});
}

function loadObj(name, callback) {
	var mtlLoader = new THREE.MTLLoader();
	mtlLoader.setBaseUrl( 'models/' + name + '/' );
	mtlLoader.setPath( 'models/' + name + '/' );
	mtlLoader.load( 'obj.obj.mtl', function( materials ) {
		materials.preload();
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials( materials );
		objLoader.setPath( 'models/' + name + '/' );
		objLoader.load( 'obj.obj', function ( object ) {
			object.traverse( function( node ) {
			    if( node.material ) {
			        node.material.side = THREE.DoubleSide;
			    }
			});
			callback(object)
		}, function(progress) {}, function(e) {console.error(e)} );
	});
}

function setupTapRec() {
	var pos = {x: 0, y: 0};
	var cancelTap = false;
	document.getElementById('container').addEventListener('touchstart', function(e) {
		pos = {x: e.touches[0].pageX, y: e.touches[0].pageY};
		cancelTap = false;
	})
	document.getElementById('container').addEventListener('touchmove', function(e) {
		if (Math.abs(pos.x - e.touches[0].pageX) > 3 || Math.abs(pos.y - e.touches[0].pageY) > 3) {
			cancelTap = true;
		}
		pos = {x: e.touches[0].pageX, y: e.touches[0].pageY};
	})
	document.getElementById('container').addEventListener('touchend', function(e) {
		if (!cancelTap) {
			tapped();
		}
	})
}

function setupClickRec() {
	var cancelled = false;
	document.getElementById('container').addEventListener('mousedown', function(e) {
		cancelled = false;
	});
	document.getElementById('container').addEventListener('mousemove', function(e) {
		cancelled = true;
	});
	document.getElementById('container').addEventListener('mouseup', function(e) {
		if (!cancelled) tapped()
	})
}

function tapped() {
	if (_selectedObject && _selectedObject.link) {
		location.href = _selectedObject.link;
	}
}

function setupVideos() {
	///////////
	// VIDEO //
	///////////

	videoNames = ['welcome', 'place_item', 'virality', 'avalanche', 'behavior', 'memehell', 'garden'];

	for (const name of videoNames) {
		// create the video element
		video = document.createElement('video');
		video.id = name;
		video.src = 'videos/' + name + '.mp4';
		video.muted = true;
		video.play();

		video.addEventListener('ended', e => {
			e.target.currentTime = 0;
			e.target.play();
		});
		
		videoImage = document.createElement('canvas');
		videoImage.width = 720;
		videoImage.height = 720;

		videoImageContext = videoImage.getContext('2d');
		// background color if no video present
		videoImageContext.fillStyle = '#000000';
		videoImageContext.fillRect(0, 0, videoImage.width, videoImage.height);

		videoTexture = new THREE.Texture(videoImage);
		videoTexture.minFilter = THREE.LinearFilter;
		videoTexture.magFilter = THREE.LinearFilter;

		videos[name] = { 'video': video, 'imageContext': videoImageContext, 'texture': videoTexture };
		
		const movieMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, overdraw: true, side: THREE.DoubleSide });
		
		// the geometry on which the movie will be displayed;
		// 		movie image will be scaled to fit these dimensions.
		const geo = new THREE.CircleGeometry( 12, 32 );

		const plane = new THREE.Mesh(geo, movieMaterial);
		plane.name = name;

		if (name === 'welcome') {
			plane.position.set(0,0,-30);
			scene.add(plane);
			camera.lookAt(plane.position);
		} else if (name === 'place_item') {
			const x = 30;
			const y = 25;
			const z = -30;

			plane.position.set(x,y,z);
			scene.add(plane);
			plane.lookAt(camera.position);
		} else if (name === 'virality') {
			const x = -30;
			const y = 20;
			const z = 30;

			plane.position.set(x,y,z);
			scene.add(plane);
			plane.lookAt(camera.position);
		} else if (name === 'avalanche') {
			const x = 30;
			const y = 0;
			const z = 30;

			plane.position.set(x,y,z);
			scene.add(plane);
			plane.lookAt(camera.position);
		} else if (name === 'garden') {
			const x = 20;
			const y = 50;
			const z = 30;

			plane.position.set(x,y,z);
			scene.add(plane);
			plane.lookAt(camera.position);
		} else if (name === 'behavior') {
			const x = -30;
			const y = 40;
			const z = -30;

			plane.position.set(x,y,z);
			scene.add(plane);
			plane.lookAt(camera.position);
		} else if (name === 'memehell') {
			const x = -40;
			const y = -30;
			const z = -35;

			plane.position.set(x,y,z);
			scene.add(plane);
			plane.lookAt(camera.position);
		}
	}
}

init();
animate();
