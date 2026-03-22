import * as THREE from "three";

// --------------------------------------------------
// Scene / Renderer
// --------------------------------------------------
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --------------------------------------------------
// Skybox (Codinhood-style textured cube)
// --------------------------------------------------
function createPathStrings(filename) {
  const basePath = import.meta.env.BASE_URL + "skybox/";
  const baseFilename = basePath + filename;
  const fileType = ".jpg";
  const sides = ["ft", "bk", "up", "dn", "rt", "lf"];

  return sides.map((side) => {
    return baseFilename + "_" + side + fileType;
  });
}

function createMaterialArray(filename) {
  const textureLoader = new THREE.TextureLoader();
  const imagePaths = createPathStrings(filename);

  return imagePaths.map((image) => {
    const texture = textureLoader.load(image);
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
    });
  });
}

const skyboxImage = "sky";
const materialArray = createMaterialArray(skyboxImage);
const skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
const skybox = new THREE.Mesh(skyboxGeo, materialArray);
scene.add(skybox);

// --------------------------------------------------
// Camera (3D front-view)
// --------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 25, 60);
camera.lookAt(0, 0, 0);

// --------------------------------------------------
// Lighting
// --------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);

// --------------------------------------------------
// World
// --------------------------------------------------
const worldSize = 320;
const houses = [];
const placedPoints = [];

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(worldSize, worldSize),
  new THREE.MeshLambertMaterial({ color: 0x709d5b })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Grid for map feel
const grid = new THREE.GridHelper(worldSize, 20, 0x5e8350, 0x5e8350);
grid.position.y = 0.03;
scene.add(grid);

// --------------------------------------------------
// House factory
// square bottom, triangle top, rectangle door
// --------------------------------------------------
function createHouse() {
  const teepee = new THREE.Group();

  // Material
  const bodyMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setHSL(0.05 + Math.random() * 0.08, 0.6, 0.75),
  });

  const doorMat = new THREE.MeshLambertMaterial({
    color: 0x5a3a1f,
  });

  // Pyramid (teepee body)
  const pyramid = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 4, 4), // 4 sides = pyramid
    bodyMat
  );
  pyramid.position.y = 2;
  pyramid.rotation.y = Math.PI / 4; // aligns the square base nicely
  teepee.add(pyramid);

  // Door (rectangle)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.5, 0.15),
    doorMat
  );
  door.position.set(0, 0.50, 1.7); // slightly in front
  door.rotation.x = -0.4;
  teepee.add(door);

  return teepee;
}

// --------------------------------------------------
// Decorations
// --------------------------------------------------
function addDecor(x, z) {
  const choice = Math.random();

  if (choice < 0.75) {
    // TREE (more common)
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x6e4c2f })
    );
    trunk.position.y = 0.6;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 2, 8),
      new THREE.MeshLambertMaterial({ color: 0x3f9a45 })
    );
    leaves.position.y = 1.8;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    tree.scale.set(2.1, 2.1, 2.1);
    scene.add(tree);

  } else {
    // ROCK (less common)
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7),
      new THREE.MeshLambertMaterial({ color: 0x8a8f94 })
    );
    rock.scale.y = 0.6;
    rock.position.set(x, 0.4, z);
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    scene.add(rock);
  }
}

// --------------------------------------------------
// Overlap prevention
// --------------------------------------------------
const minDistance = 8;

function isTooClose(x, z) {
  for (const point of placedPoints) {
    const dx = point.x - x;
    const dz = point.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < minDistance) {
      return true;
    }
  }
  return false;
}

// --------------------------------------------------
// Procedural map generation
// --------------------------------------------------
function generateMap() {
  const cells = 32;
  const spacing = worldSize / cells;
  const half = worldSize / 2;

  for (let gx = 1; gx < cells - 1; gx++) {
    for (let gz = 1; gz < cells - 1; gz++) {
      const px = -half + gx * spacing;
      const pz = -half + gz * spacing;

      // leave some roads/open strips
      const onRoad = gx % 8 === 0 || gz % 8 === 0;
      if (onRoad) continue;

      if (Math.random() < 0.45) {
  // FEWER teepees
  const ox = (Math.random() - 0.5) * spacing * 0.25;
  const oz = (Math.random() - 0.5) * spacing * 0.25;

  const finalX = px + ox;
  const finalZ = pz + oz;

  if (!isTooClose(finalX, finalZ)) {
    const house = createHouse();

    house.position.set(finalX, 0, finalZ);

    const rotations = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    house.rotation.y =
      rotations[Math.floor(Math.random() * rotations.length)];

    const sx = 0.85 + Math.random() * 0.3;
    const sy = 0.85 + Math.random() * 0.4;
    const sz = 0.85 + Math.random() * 0.3;
    house.scale.set(sx, sy, sz);

    scene.add(house);
    houses.push(house);
    placedPoints.push({ x: finalX, z: finalZ });
  }

    } else if (Math.random() < 0.5) {
      // MORE trees/rocks
      addDecor(
        px + (Math.random() - 0.5) * spacing * 0.3,
        pz + (Math.random() - 0.5) * spacing * 0.3
      );
    }
    }
  }
}

generateMap();

// --------------------------------------------------
// Camera animation - front-view orbit
// --------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime() * 0.15;
  const radius = 85;

  const x = Math.cos(t) * radius;
  const z = Math.sin(t) * radius;

  camera.position.set(x, 30, z);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

animate();

// --------------------------------------------------
// Resize
// --------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
