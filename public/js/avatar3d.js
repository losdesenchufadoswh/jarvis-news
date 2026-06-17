/* avatar3d.js — Avatar 3D Meshy con Three.js.
   Carga modelos .glb y sincroniza animaciones con estados de voz. */
window.Avatar3D = (() => {
  // Verifica que Three.js esté disponible
  if (typeof THREE === 'undefined') {
    console.warn('Three.js no está cargado');
    return { init: () => false, playAnimation: () => {}, destroy: () => {} };
  }

  let scene, camera, renderer, model, mixer, actions = {};
  let activeAction = null;
  let containerEl = null;

  const MODELS = {
    idle:     '/models/Meshy_AI_Neon_Gentleman_biped_Animation_Talk_with_Hands_Open_withSkin.glb',
    talking:  '/models/Meshy_AI_Neon_Gentleman_biped_Animation_Talk_Passionately_withSkin.glb',
    listening: '/models/Meshy_AI_Neon_Gentleman_biped_Animation_Walking_withSkin.glb',
  };

  let loader = null;

  function init(containerId) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) return false;

    const width  = containerEl.clientWidth;
    const height = containerEl.clientHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02060d);
    scene.fog = new THREE.Fog(0x02060d, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 2.5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerEl.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0x00cfff, 0.8);
    directional.position.set(5, 8, 5);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    scene.add(directional);

    const spotLight = new THREE.SpotLight(0x1e90ff, 0.5);
    spotLight.position.set(-5, 6, 3);
    scene.add(spotLight);

    // Loader
    loader = new THREE.GLTFLoader();

    // Load default model
    loadModel(MODELS.idle);

    // Resize handler
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    animate();

    return true;
  }

  function loadModel(url) {
    if (!loader) return;
    loader.load(
      url,
      (gltf) => {
        if (model) scene.remove(model);
        model = gltf.scene;
        model.scale.set(1.2, 1.2, 1.2);
        model.position.y = 0;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(model);

        // Setup mixer y acciones
        mixer = new THREE.AnimationMixer(model);
        actions = {};
        gltf.animations.forEach((clip) => {
          actions[clip.name] = mixer.clipAction(clip);
        });

        // Juega la primera acción
        if (Object.values(actions).length > 0) {
          activeAction = Object.values(actions)[0];
          activeAction.play();
        }
      },
      undefined,
      (err) => console.error('Error loading model:', err)
    );
  }

  function playAnimation(state) {
    if (!mixer || !actions) return;

    // Detén la animación actual
    if (activeAction) {
      activeAction.fadeOut(0.5);
    }

    // Elige la siguiente animación según el estado
    let nextAction = null;
    const actionNames = Object.keys(actions);

    if (state === 'talking' && actionNames.some(n => n.includes('Talk_Passionately'))) {
      nextAction = actions[actionNames.find(n => n.includes('Talk_Passionately'))];
    } else if (state === 'listening' && actionNames.some(n => n.includes('Walking'))) {
      nextAction = actions[actionNames.find(n => n.includes('Walking'))];
    } else if (actionNames.some(n => n.includes('Talk_with_Hands_Open'))) {
      nextAction = actions[actionNames.find(n => n.includes('Talk_with_Hands_Open'))];
    } else {
      nextAction = Object.values(actions)[0];
    }

    if (nextAction && nextAction !== activeAction) {
      nextAction.reset().fadeIn(0.5).play();
      activeAction = nextAction;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    if (mixer) mixer.update(0.016); // ~60fps
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!containerEl || !camera || !renderer) return;
    const width  = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function destroy() {
    if (renderer) {
      renderer.dispose();
      containerEl?.removeChild(renderer.domElement);
    }
    scene = null;
    camera = null;
    renderer = null;
    model = null;
    mixer = null;
    actions = {};
    window.removeEventListener('resize', onWindowResize);
  }

  return { init, playAnimation, destroy };
})();
