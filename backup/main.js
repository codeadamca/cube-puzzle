import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Floor (large enough for big blocks)
const floorGeometry = new THREE.BoxGeometry(1000, 10, 1000);
const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -5;
scene.add(floor);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(500, 1000, 750);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Shapes array
const shapes = [];
function addShape(geometry, x, y, z, color = 0x44aa88) {
  const material = new THREE.MeshPhongMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  shapes.push(mesh);
}

// Add 3 cubes (100x100x100)
addShape(new THREE.BoxGeometry(100, 100, 100), -250, 50, 0, 0x44aa88);
addShape(new THREE.BoxGeometry(100, 100, 100), 0, 50, 0, 0xaa8844);
addShape(new THREE.BoxGeometry(100, 100, 100), 250, 50, 0, 0x8844aa);

// Add 2 blocks (200x200x100)
addShape(new THREE.BoxGeometry(200, 200, 100), 0, 100, 250, 0x2288cc);
addShape(new THREE.BoxGeometry(200, 200, 100), 200, 100, 250, 0x2299ee);

// Add 2 blocks (100x200x200)
addShape(new THREE.BoxGeometry(100, 200, 200), 350, 100, -250, 0xcc2288);
addShape(new THREE.BoxGeometry(100, 200, 200), 550, 100, -250, 0xdd44bb);

// Add 2 blocks (200x100x200) -- 2 x 1 x 2
addShape(new THREE.BoxGeometry(200, 100, 200), -350, 50, -250, 0x22cc88);
addShape(new THREE.BoxGeometry(200, 100, 200), -550, 50, -250, 0x33eeaa);

// Camera
camera.position.set(0, 600, 800);
camera.lookAt(0, 0, 0);

// Drag and drop logic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedShape = null;
let dragOffset = new THREE.Vector3();
let dragPlane = new THREE.Plane();
let isDragging = false;
let lastSelectedShape = null;

function getIntersectedShape(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(shapes);
  return intersects.length > 0 ? intersects[0] : null;
}

window.addEventListener('pointerdown', (event) => {
  const intersect = getIntersectedShape(event);
  if (intersect) {
    selectedShape = intersect.object;
    lastSelectedShape = selectedShape;
    isDragging = true;
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, selectedShape.position.y, 0)
    );
    raycaster.ray.intersectPlane(dragPlane, dragOffset);
    dragOffset.sub(selectedShape.position);
  }
});

const gridSize = 10;

window.addEventListener('pointermove', (event) => {
  if (!isDragging || !selectedShape) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersection = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
    // Snap to 10-unit grid
    const box = new THREE.Box3().setFromObject(selectedShape);
    const size = new THREE.Vector3();
    box.getSize(size);
    const x = Math.round((intersection.x - dragOffset.x) / gridSize) * gridSize;
    const z = Math.round((intersection.z - dragOffset.z) / gridSize) * gridSize;

    // Find the highest shape at this x/z (excluding the selected shape)
    let maxY = size.y / 2;
    shapes.forEach(shape => {
      if (shape !== selectedShape) {
        const otherBox = new THREE.Box3().setFromObject(shape);
        const otherSize = new THREE.Vector3();
        otherBox.getSize(otherSize);
        const dx = Math.abs(shape.position.x - x);
        const dz = Math.abs(shape.position.z - z);
        if (
          dx < (size.x + otherSize.x) / 2 &&
          dz < (size.z + otherSize.z) / 2
        ) {
          maxY = Math.max(maxY, shape.position.y + otherSize.y / 2 + size.y / 2);
        }
      }
    });

    selectedShape.position.x = x;
    selectedShape.position.z = z;
    selectedShape.position.y = maxY;
  }
});

window.addEventListener('pointerup', () => {
  isDragging = false;
  selectedShape = null;
});

// Arrow key movement for last selected shape
window.addEventListener('keydown', (event) => {
  if (!lastSelectedShape) return;
  let moved = false;
  let dx = 0, dz = 0;
  switch (event.key) {
    case 'ArrowLeft':  dx = -gridSize; moved = true; break;
    case 'ArrowRight': dx = gridSize;  moved = true; break;
    case 'ArrowUp':    dz = -gridSize; moved = true; break;
    case 'ArrowDown':  dz = gridSize;  moved = true; break;
  }
  if (moved) {
    // Snap to 10-unit grid and stack
    const box = new THREE.Box3().setFromObject(lastSelectedShape);
    const size = new THREE.Vector3();
    box.getSize(size);
    const x = Math.round((lastSelectedShape.position.x + dx) / gridSize) * gridSize;
    const z = Math.round((lastSelectedShape.position.z + dz) / gridSize) * gridSize;

    let maxY = size.y / 2;
    shapes.forEach(shape => {
      if (shape !== lastSelectedShape) {
        const otherBox = new THREE.Box3().setFromObject(shape);
        const otherSize = new THREE.Vector3();
        otherBox.getSize(otherSize);
        const dx2 = Math.abs(shape.position.x - x);
        const dz2 = Math.abs(shape.position.z - z);
        if (
          dx2 < (size.x + otherSize.x) / 2 &&
          dz2 < (size.z + otherSize.z) / 2
        ) {
          maxY = Math.max(maxY, shape.position.y + otherSize.y / 2 + size.y / 2);
        }
      }
    });

    lastSelectedShape.position.x = x;
    lastSelectedShape.position.z = z;
    lastSelectedShape.position.y = maxY;
  }
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();