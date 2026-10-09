/* LORGUS cinematic WebGL gate */
async function initializeLorgusWebGL() {
    const canvas = document.getElementById("lorgus-webgl");
    if (!canvas) return;

    // Returning players do not download Three.js unless the login gate is shown.
    let THREE = window.THREE;
    if (!THREE) {
        try {
            THREE = await import("https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js");
            window.THREE = THREE;
        } catch (error) {
            console.warn("LORGUS Three.js unavailable:", error);
            return;
        }
    }

    const smallScreen = window.matchMedia("(max-width: 700px)").matches;
    const lowPower = smallScreen || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lowPower, powerPreference: lowPower ? "low-power" : "high-performance" });
        renderer.shadowMap.enabled = !lowPower;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (error) {
        console.warn("LORGUS WebGL unavailable:", error);
        return;
    }
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x171511, 0.0075);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 220);
    camera.position.set(0, 8.2, 36);
    const world = new THREE.Group();
    scene.add(world);

    const makeStoneTexture = (base, mortar = false) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1800; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const v = 18 + Math.random() * 34;
            ctx.fillStyle = `rgba(${v},${v * .86},${v * .7},${Math.random() * .16})`;
            ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
        }
        ctx.strokeStyle = mortar ? "rgba(12,10,8,.42)" : "rgba(16,13,10,.25)";
        ctx.lineWidth = mortar ? 2 : 1;
        for (let y = 18; y < 256; y += 42 + Math.random() * 12) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y + (Math.random() - .5) * 8); ctx.stroke();
        }
        for (let i = 0; i < 28; i++) {
            const x = Math.random() * 256, y = Math.random() * 256;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - .5) * 28, y + 8 + Math.random() * 22);
            ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2.2, 2.2);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    };

    const stoneTexture = makeStoneTexture("#51483d", true);
    const darkStoneTexture = makeStoneTexture("#302b26", false);
    const groundTexture = makeStoneTexture("#39332c", true);

    const stone = new THREE.MeshStandardMaterial({
        map: stoneTexture, color: 0xb28a62, roughness: 0.88, metalness: 0,
        bumpMap: stoneTexture, bumpScale: 0.16
    });
    const stoneDark = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x626864, roughness: 0.93, metalness: 0,
        bumpMap: darkStoneTexture, bumpScale: 0.12
    });
    const stoneEdge = new THREE.MeshStandardMaterial({
        map: stoneTexture, color: 0xc39a68, roughness: 0.80, metalness: 0,
        bumpMap: stoneTexture, bumpScale: 0.18
    });
    const groundStone = new THREE.MeshStandardMaterial({
        map: groundTexture, color: 0x81745e, roughness: 0.94, metalness: 0,
        bumpMap: groundTexture, bumpScale: 0.08
    });
    const rune = new THREE.MeshStandardMaterial({ color: 0x8c6827, emissive: 0x8c6827, emissiveIntensity: 4.2, transparent: true, opacity: 0.82 });
    const ember = new THREE.MeshBasicMaterial({ color: 0xe2a33d, transparent: true, opacity: 0.8 });

    const bevelStone = (sx, sy, sz, material = stone, bevel = 0.16) => {
        const radius = Math.min(bevel, sx * 0.14, sy * 0.14, sz * 0.14);
        const geometry = new THREE.BoxGeometry(sx, sy, sz, 3, 3, 3);
        const pos = geometry.attributes.position;
        const inset = Math.min(bevel, sx * 0.08, sy * 0.08, sz * 0.08);
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            if (Math.abs(x) > sx * 0.48) pos.setX(i, x - Math.sign(x) * inset * 0.12);
            if (Math.abs(y) > sy * 0.48) pos.setY(i, y - Math.sign(y) * inset * 0.12);
            if (Math.abs(z) > sz * 0.48) pos.setZ(i, z - Math.sign(z) * inset * 0.12);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
        return new THREE.Mesh(geometry, material);
    };

    const addArchitecturalBlock = (x, y, z, sx, sy, sz, material = stone, rot = 0, detail = 0) => {
        const group = new THREE.Group();
        const body = bevelStone(sx, sy, sz, material, 0.16);
        body.position.set(0, 0, 0);
        body.rotation.z = rot;
        group.add(body);
        if (detail > 0) {
            const inset = new THREE.Mesh(
                new THREE.BoxGeometry(Math.max(0.3, sx * 0.72), Math.max(0.25, sy * 0.18), sz * 0.08),
                stoneDark
            );
            inset.position.set(0, sy * 0.08, sz * 0.52);
            inset.rotation.z = rot;
            group.add(inset);
        }
        group.position.set(x, y, z);
        world.add(group);
        return group;
    };

    // Monumental layered foundations: the gate should read as architecture, not stacked primitives.
    addArchitecturalBlock(-10.4, 1.35, 1.15, 5.8, 2.7, 5.4, stoneEdge, -0.015, 1);
    addArchitecturalBlock(10.4, 1.35, 1.15, 5.8, 2.7, 5.4, stoneEdge, 0.015, 1);
    addArchitecturalBlock(-10.4, 7.0, 1.05, 5.0, 10.5, 4.7, stone, -0.01, 1);
    addArchitecturalBlock(10.4, 7.3, 1.05, 5.2, 11.2, 4.7, stone, 0.01, 1);

    // Deep shadowed recesses make the masonry feel carved and massive.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
            const recess = new THREE.Mesh(
                new THREE.BoxGeometry(1.45, 4.8 + i * 0.35, 0.32),
                stoneDark
            );
            recess.position.set(side * (10.35 + (i - 1) * 1.45), 4.2 + i * 3.1, 3.42);
            world.add(recess);
        }
    }

    // Heavy capstones break the perfectly rectangular silhouette.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const cap = new THREE.Mesh(
                new THREE.BoxGeometry(2.4 + Math.random() * 0.7, 1.0 + Math.random() * 0.35, 5.5, 2, 2, 2),
                i === 3 ? stoneEdge : stone
            );
            cap.position.set(
                side * (9.1 + i * 0.75),
                12.9 + i * 0.9,
                0.75 + (Math.random() - 0.5) * 0.35
            );
            cap.rotation.z = (Math.random() - 0.5) * 0.055;
            cap.castShadow = true;
            cap.receiveShadow = true;
            world.add(cap);
        }
    }

    // Architectural masonry pass: layered stone courses with bevels and irregular faces.
    const makeMasonryBlock = (x, y, z, w, h, d, material, rotation = 0, scaleY = 1) => {
        const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
            if (Math.abs(px) > w * 0.35) pos.setX(i, px + (Math.random() - 0.5) * 0.12);
            if (Math.abs(py) > h * 0.35) pos.setY(i, py + (Math.random() - 0.5) * 0.10);
            if (Math.abs(pz) > d * 0.35) pos.setZ(i, pz + (Math.random() - 0.5) * 0.08);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.rotation.z = rotation;
        mesh.scale.y = scaleY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
        return mesh;
    };

    // Massive masonry courses replace the "two giant cubes" silhouette.
    for (const side of [-1, 1]) {
        const sx = side;
        for (let row = 0; row < 6; row++) {
            const y = 2.9 + row * 1.95;
            const count = row % 2 ? 3 : 2;
            const total = 5.1;
            const bw = total / count;
            for (let col = 0; col < count; col++) {
                const x = sx * (7.85 + col * bw);
                makeMasonryBlock(
                    x, y, 1.05,
                    bw * 0.92, 1.72 + Math.random() * 0.22, 4.65,
                    row % 3 === 0 ? stoneEdge : stone,
                    (Math.random() - 0.5) * 0.012
                );
            }
        }
    }

    // Individual stone color variation: old masonry should have age and mineral differences.
    const masonryTints = [0x9a795b, 0xa68764, 0x8c7057, 0xb0926e, 0x7e6a55];
    for (const side of [-1, 1]) {
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < (row % 2 ? 3 : 2); col++) {
                const x = side * (7.85 + col * (5.1 / (row % 2 ? 3 : 2)));
                const y = 2.9 + row * 1.95;
                const tint = new THREE.MeshStandardMaterial({
                    map: stoneTexture,
                    color: masonryTints[(row * 3 + col) % masonryTints.length],
                    roughness: 0.88,
                    bumpMap: stoneTexture,
                    bumpScale: 0.14
                });
                const wash = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.92, 0.045, 2, 2), tint);
                wash.position.set(x + (Math.random() - 0.5) * 0.35, y + (Math.random() - 0.5) * 0.25, 3.40);
                wash.rotation.z = (Math.random() - 0.5) * 0.025;
                world.add(wash);
            }
        }
    }

    // Deep carved seams on the front face.
    const seamMat = new THREE.MeshBasicMaterial({
        color: 0x15110e,
        transparent: true,
        opacity: 0.62
    });
    for (const side of [-1, 1]) {
        for (let row = 0; row < 7; row++) {
            const seam = new THREE.Mesh(
                new THREE.BoxGeometry(4.9, 0.075, 0.055),
                seamMat
            );
            seam.position.set(side * 10.0, 2.0 + row * 1.95, 3.43);
            world.add(seam);
        }
    }

    // Broken masonry and fallen stones at the bases.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
            const w = 0.8 + Math.random() * 1.5;
            const h = 0.35 + Math.random() * 0.9;
            const d = 0.8 + Math.random() * 1.5;
            const chunk = makeMasonryBlock(
                side * (5.8 + Math.random() * 5.4),
                h * 0.45 - 0.08,
                2.5 + (Math.random() - 0.5) * 4,
                w, h, d, stoneDark,
                (Math.random() - 0.5) * 0.7
            );
            chunk.rotation.x = (Math.random() - 0.5) * 0.35;
            chunk.rotation.y = (Math.random() - 0.5) * 0.35;
        }
    }

    // Long approach masonry connects the bottom of the frame to the portal.
    for (let row = 0; row < 14; row++) {
        const z = 8.5 - row * 5.2;
        const spread = 5.0 + row * 1.55;
        const pieces = 5 + (row % 2);
        for (let col = 0; col < pieces; col++) {
            const width = (spread * 2) / pieces - 0.14;
            const slab = new THREE.Mesh(
                new THREE.BoxGeometry(width, 0.28 + Math.random() * 0.16, 2.05 + Math.random() * 0.35),
                row < 3 ? stoneEdge : groundStone
            );
            slab.position.set(
                -spread + width * 0.5 + col * (width + 0.14) + (Math.random() - 0.5) * 0.12,
                -0.03 + Math.random() * 0.07,
                z
            );
            slab.rotation.y = (Math.random() - 0.5) * 0.035;
            slab.castShadow = true;
            slab.receiveShadow = true;
            world.add(slab);
        }
    }

    // World-life pass: distant ruins, dead trees and scattered structures give the landscape scale.
    const ruinMat = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x4d5148, roughness: 0.98, bumpMap: darkStoneTexture, bumpScale: 0.1
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 1 });

    // Distant ruined walls flank the horizon.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
            const w = 2.5 + Math.random() * 3.5;
            const h = 2.5 + Math.random() * 5.5;
            const ruin = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, 1.2 + Math.random() * 1.4),
                ruinMat
            );
            ruin.position.set(
                side * (15 + i * 4.5 + Math.random() * 2),
                h * 0.5 - 0.1,
                -10 - Math.random() * 8
            );
            ruin.rotation.y = (Math.random() - 0.5) * 0.12;
            ruin.rotation.z = (Math.random() - 0.5) * 0.08;
            ruin.castShadow = true;
            ruin.receiveShadow = true;
            world.add(ruin);
        }
    }

    // Broken towers create recognizable silhouettes in the distance.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
            const tower = new THREE.Mesh(
                new THREE.CylinderGeometry(1.4 + Math.random() * 0.6, 1.9 + Math.random() * 0.6, 8 + Math.random() * 5, 8),
                ruinMat
            );
            tower.position.set(side * (25 + i * 8), 3.5, -18 - i * 4);
            tower.rotation.y = Math.random();
            tower.castShadow = true;
            tower.receiveShadow = true;
            world.add(tower);
        }
    }

    // Dead trees break the silhouette without turning the gate into a forest.
    const addDeadTree = (x, z, scale) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 3.8, 6), woodMat);
        trunk.position.y = 1.9;
        trunk.rotation.z = (Math.random() - 0.5) * 0.12;
        tree.add(trunk);
        for (let b = 0; b < 4; b++) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.13, 1.8 + Math.random(), 5), woodMat);
            branch.position.set((Math.random() - 0.5) * 0.9, 2.5 + b * 0.38, 0);
            branch.rotation.z = (Math.random() - 0.5) * 1.5;
            branch.rotation.x = (Math.random() - 0.5) * 0.35;
            tree.add(branch);
        }
        tree.position.set(x, 0, z);
        tree.scale.setScalar(scale);
        tree.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        world.add(tree);
    };
    addDeadTree(-17, -1, 1.5);
    addDeadTree(17, -2, 1.35);
    addDeadTree(-24, -9, 2.0);
    addDeadTree(23, -11, 1.8);

    // Small warm points in the distance imply settlements or fires beyond the gate.
    const distantFire = new THREE.MeshBasicMaterial({
        color: 0xd98a32, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (let i = 0; i < 14; i++) {
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.09, 8, 8), distantFire);
        ember.position.set((Math.random() - 0.5) * 38, 0.8 + Math.random() * 3.5, -13 - Math.random() * 12);
        world.add(ember);
    }

    // Foreground slabs: irregular perspective lines lead the eye into the portal.
    for (let i = 0; i < 16; i++) {
        const width = 4.5 + i * 1.05;
        const slab = makeMasonryBlock(
            (Math.random() - 0.5) * (1.0 + i * 0.45),
            -0.12 + Math.random() * 0.08,
            4.5 + i * 3.8,
            width,
            0.22 + Math.random() * 0.18,
            2.5 + Math.random() * 0.8,
            i % 2 ? groundStone : stoneDark,
            (Math.random() - 0.5) * 0.045
        );
        slab.scale.x *= 0.8 + Math.random() * 0.35;
    }

    // Monumental portal frame: a single carved arch, deep jambs and individual voussoirs.
    const archShape = new THREE.Shape();
    archShape.moveTo(-7.2, 0);
    archShape.lineTo(-7.2, 8.2);
    archShape.quadraticCurveTo(0, 15.4, 7.2, 8.2);
    archShape.lineTo(7.2, 0);
    archShape.closePath();

    // Cut the actual passage out of the gate. The gate is a stone FRAME, not a filled wall.
    const openingHole = new THREE.Path();
    openingHole.moveTo(-5.15, 0.08);
    openingHole.lineTo(-5.15, 8.25);
    openingHole.quadraticCurveTo(0, 13.4, 5.15, 8.25);
    openingHole.lineTo(5.15, 0.08);
    openingHole.closePath();
    archShape.holes.push(openingHole);

    const archGeo = new THREE.ExtrudeGeometry(archShape, {
        depth: 5.2,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.16,
        bevelThickness: 0.18,
        curveSegments: 40
    });
    const arch = new THREE.Mesh(archGeo, stoneEdge);
    arch.position.set(0, 0, 0.25);
    arch.castShadow = true;
    arch.receiveShadow = true;
    world.add(arch);

    for (const side of [-1, 1]) {
        const jamb = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 10.4, 5.3, 3, 3, 3),
            stone
        );
        jamb.position.set(side * 6.65, 5.25, 0.25);
        jamb.castShadow = true;
        jamb.receiveShadow = true;
        world.add(jamb);

        const innerJamb = new THREE.Mesh(
            new THREE.BoxGeometry(0.62, 9.6, 5.55, 2, 2, 2),
            stoneDark
        );
        innerJamb.position.set(side * 5.45, 4.9, -0.05);
        innerJamb.castShadow = true;
        innerJamb.receiveShadow = true;
        world.add(innerJamb);
    }

    // Clean outer arch: no oversized floating voussoirs.
    // The extruded arch itself is the masonry silhouette.
    // Crown stone gives the gate a strong readable silhouette.
    // No horizontal crown: the arch itself forms the complete central silhouette.

    // Portal glow uses the exact same arched silhouette as the passage.
    // No rectangular plane, no border: just a soft luminous shape behind the stone frame.
    const glowShape = new THREE.Shape();
    glowShape.moveTo(-5.85, 0.04);
    glowShape.lineTo(-5.85, 8.15);
    glowShape.quadraticCurveTo(0, 14.45, 5.85, 8.15);
    glowShape.lineTo(5.85, 0.04);
    glowShape.closePath();

    const rift = new THREE.Mesh(
        new THREE.ShapeGeometry(glowShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0xd47b24,
            transparent: true,
            opacity: 0.34,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide
        })
    );
    rift.position.set(0, 0, -0.72);
    rift.renderOrder = 1;
    world.add(rift);

    // True arched portal void — no rectangular plate behind the entrance.
    
// Decorative architectural detail: inset buttresses and carved stone bands.
// These break the primitive-box silhouette and give the gate a deliberate medieval design.
const addButtress = (side, x, z) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 7.8, 5.0, 2, 2),
        stoneDark
    );
    base.position.y = 3.9;
    base.scale.x = 0.78;
    g.add(base);

    const face = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, 6.4, 0.42, 2, 2),
        stoneEdge
    );
    face.position.set(side * 0.35, 4.15, 2.55);
    face.rotation.z = side * 0.055;
    g.add(face);

    const crown = new THREE.Mesh(
        new THREE.BoxGeometry(3.35, 0.55, 5.45, 2, 2),
        stoneEdge
    );
    crown.position.set(0, 7.85, 0);
    crown.rotation.z = side * 0.025;
    g.add(crown);

    g.position.set(x, 0, z);
    g.rotation.y = side * 0.035;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    world.add(g);
};

addButtress(-1, -7.55, 0.75);
addButtress(1, 7.55, 0.75);

// Carved horizontal courses give the façade a designed rhythm instead of a stack of cubes.
for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
        const y = 3.15 + row * 2.05;
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(6.2, 0.24, 4.95, 2, 2),
            row % 2 ? stoneEdge : stoneDark
        );
        band.position.set(side * 9.25, y, 3.34);
        band.rotation.z = side * 0.006;
        band.castShadow = true;
        band.receiveShadow = true;
        world.add(band);
    }
}

const openingShape = new THREE.Shape();
    openingShape.moveTo(-5.15, 0);
    openingShape.lineTo(-5.15, 8.25);
    openingShape.absarc(0, 8.25, 5.15, Math.PI, 0, false);
    openingShape.lineTo(5.15, 0);
    openingShape.closePath();
    const innerGate = new THREE.Mesh(
        new THREE.ShapeGeometry(openingShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0x070605,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        })
    );
    innerGate.position.set(0, 0, -0.9);
    innerGate.renderOrder = 0;
    world.add(innerGate);

    const threshold = new THREE.Mesh(
        new THREE.CircleGeometry(4.8, 64),
        new THREE.MeshBasicMaterial({
            color: 0xb56f27,
            transparent: true,
            opacity: 0.10,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    threshold.rotation.x = -Math.PI / 2;
    threshold.position.set(0, 0.025, 0.45);
    world.add(threshold);

    // Layered portal energy: depth, sparks and drifting motes instead of a flat glowing plane.
    const portalDepthShape = new THREE.Shape();
    portalDepthShape.moveTo(-5.05, 0.08);
    portalDepthShape.lineTo(-5.05, 8.15);
    portalDepthShape.quadraticCurveTo(0, 13.15, 5.05, 8.15);
    portalDepthShape.lineTo(5.05, 0.08);
    portalDepthShape.closePath();

    const portalCoreShape = new THREE.Shape();
    portalCoreShape.moveTo(-4.35, 0.08);
    portalCoreShape.lineTo(-4.35, 7.95);
    portalCoreShape.quadraticCurveTo(0, 12.55, 4.35, 7.95);
    portalCoreShape.lineTo(4.35, 0.08);
    portalCoreShape.closePath();

    const portalCore = new THREE.Mesh(
        new THREE.ShapeGeometry(portalCoreShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0xffc46a,
            transparent: true,
            opacity: 0.075,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    portalCore.position.set(0, 0, -0.78);
    world.add(portalCore);

    const portalMist = new THREE.Mesh(
        new THREE.ShapeGeometry(portalDepthShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0xc56f25,
            transparent: true,
            opacity: 0.045,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    portalMist.position.set(0, 0, -0.94);
    world.add(portalMist);

    const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffc66a,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const portalSparks = [];
    for (let i = 0; i < (lowPower ? 28 : 70); i++) {
        const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.025 + Math.random() * 0.055, 6, 6),
            sparkMat
        );
        spark.position.set(
            (Math.random() - 0.5) * 11.0,
            1.0 + Math.random() * 14.5,
            -0.5 + (Math.random() - 0.5) * 1.8
        );
        spark.userData.phase = Math.random() * Math.PI * 2;
        spark.userData.speed = 0.25 + Math.random() * 0.7;
        portalSparks.push(spark);
        world.add(spark);
    }

    const riftLight = new THREE.PointLight(0xff8b2c, 52, 28, 2);
    riftLight.position.set(0, 7.8, -0.4);
    world.add(riftLight);    world.add(new THREE.HemisphereLight(0xc8a879, 0x17120d, 1.3));
    world.add(new THREE.AmbientLight(0xb08f68, 0.48));
    const coolFill = new THREE.DirectionalLight(0x7898ad, 1.8);
    coolFill.position.set(18, 12, 10);
    world.add(coolFill);

    const directional = new THREE.DirectionalLight(0xe6c995, 6.4);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.left = -28;
    directional.shadow.camera.right = 28;
    directional.shadow.camera.top = 24;
    directional.shadow.camera.bottom = -8;
    directional.position.set(-12, 18, 22);
    world.add(directional);
    directional.target.position.set(0, 6, 0);
    world.add(directional.target);

    const floorGeometry = new THREE.PlaneGeometry(80, 70, 32, 28);
    const floorPositions = floorGeometry.attributes.position;
    for (let i = 0; i < floorPositions.count; i++) {
        const x = floorPositions.getX(i);
        const y = floorPositions.getY(i);
        const ripple = Math.sin(x * 0.17) * 0.035 + Math.sin(y * 0.21 + x * 0.08) * 0.028;
        floorPositions.setZ(i, ripple);
    }
    floorPositions.needsUpdate = true;
    floorGeometry.computeVertexNormals();
    // Full cinematic environment: eliminate the empty black frame around the monument.
    // Distant mountain silhouettes give the scene a horizon and scale.
    const mountainMat = new THREE.MeshStandardMaterial({
        color: 0x252d2b, roughness: 1, metalness: 0
    });
    const mountainGroup = new THREE.Group();
    for (let i = 0; i < 11; i++) {
        const width = 9 + Math.random() * 9;
        const height = 7 + Math.random() * 13;
        const mountain = new THREE.Mesh(
            new THREE.ConeGeometry(width, height, 5 + Math.floor(Math.random() * 3)),
            mountainMat
        );
        mountain.position.set(-48 + i * 9.5 + Math.random() * 3, height * 0.5 - 1, -15 - Math.random() * 5);
        mountain.rotation.y = Math.random() * Math.PI;
        mountainGroup.add(mountain);
    }
    world.add(mountainGroup);

    // Giant side monoliths frame the gate instead of leaving empty black corners.
    const monolithMat = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x4b514f, roughness: 0.98
    });
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const h = 8 + Math.random() * 8;
            const monolith = new THREE.Mesh(
                new THREE.DodecahedronGeometry(2.0 + Math.random() * 1.5, 1),
                monolithMat
            );
            monolith.scale.y = h / 4.0;
            monolith.position.set(
                side * (19 + i * 5 + Math.random() * 2),
                h * 0.5 - 1,
                -4 - i * 3.5
            );
            monolith.rotation.set(
                (Math.random() - 0.5) * 0.12,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.08
            );
            monolith.castShadow = true;
            monolith.receiveShadow = true;
            world.add(monolith);
        }
    }

    // Elevated cliffs behind the gate connect the architecture to the horizon.
    const cliffMat = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x343a38, roughness: 1
    });
    for (const side of [-1, 1]) {
        const cliff = new THREE.Mesh(
            new THREE.ConeGeometry(15, 20, 7, 3),
            cliffMat
        );
        cliff.scale.z = 0.42;
        cliff.position.set(side * 23, 7, -9);
        cliff.rotation.y = side * 0.35;
        cliff.castShadow = true;
        cliff.receiveShadow = true;
        world.add(cliff);
    }

    // Foreground ruins create depth near the camera.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.8, 1),
                stoneDark
            );
            rock.scale.y = 0.45 + Math.random() * 1.1;
            rock.position.set(
                side * (9 + Math.random() * 13),
                rock.scale.y * 0.7 - 0.05,
                8 - i * 2.7 + Math.random() * 2
            );
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            rock.receiveShadow = true;
            world.add(rock);
        }
    }

    const floor = new THREE.Mesh(
        floorGeometry,
        groundStone
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.15, -8);
    floor.receiveShadow = true;
    world.add(floor);

    const pathStone = new THREE.Group();
    world.add(pathStone);
    for (let row = 0; row < 9; row++) {
        const z = 2.5 - row * 4.2;
        const halfWidth = 5.5 + row * 0.75;
        const pieces = row % 2 === 0 ? 5 : 6;
        for (let col = 0; col < pieces; col++) {
            const gap = 0.18;
            const width = (halfWidth * 2) / pieces - gap;
            const slab = new THREE.Mesh(
                new THREE.BoxGeometry(width, 0.22 + Math.random() * 0.12, 3.25 + Math.random() * 0.5),
                row < 2 ? stoneEdge : groundStone
            );
            slab.position.set(
                -halfWidth + width * 0.5 + col * (width + gap) + (Math.random() - 0.5) * 0.18,
                -0.02 + Math.random() * 0.05,
                z + (Math.random() - 0.5) * 0.3
            );
            slab.rotation.y = (Math.random() - 0.5) * 0.035;
            pathStone.add(slab);
        }
    }

    const floorGlow = new THREE.Mesh(
        new THREE.CircleGeometry(5.8, 64),
        new THREE.MeshBasicMaterial({ color: 0x8d5a1f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending })
    );
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.set(0, 0.02, 1.5);
    world.add(floorGlow);

    const sideStones = [];
    for (let side of [-1, 1]) {
        for (let n = 0; n < 9; n++) {
            const w = 1.2 + Math.random() * 1.8;
            const h = 0.7 + Math.random() * 1.7;
            const stoneBlock = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, 1.8 + Math.random() * 1.4),
                stone
            );
            stoneBlock.position.set(
                side * (12.5 + Math.random() * 4.5),
                h * 0.5 - 0.1,
                -2 - n * 1.8 + Math.random() * 1.2
            );
            stoneBlock.rotation.y = (Math.random() - 0.5) * 0.18;
            stoneBlock.rotation.z = (Math.random() - 0.5) * 0.12;
            stoneBlock.castShadow = true;
        stoneBlock.receiveShadow = true;
        world.add(stoneBlock);
            sideStones.push(stoneBlock);
        }
    }

    const gateInnerGlow = new THREE.PointLight(0xff9b3d, 44, 32, 2);
    gateInnerGlow.position.set(0, 5, -0.7);
    world.add(gateInnerGlow);

    const debris = [];
    for (let n = 0; n < (lowPower ? 40 : 95); n++) {
        const size = 0.05 + Math.random() * 0.28;
        const mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(size, 0),
            Math.random() > 0.72 ? ember : stoneDark
        );
        mesh.position.set((Math.random() - 0.5) * 30, Math.random() * 17 - 1, -5 - Math.random() * 24);
        mesh.userData.spin = (Math.random() - 0.5) * 0.9;
        world.add(mesh);
        debris.push(mesh);
    }

    // Living night sky: many bright moving stars, not a static handful of dots.
    const starGeometry = new THREE.BufferGeometry();
    const starCount = lowPower ? 100 : 260;
    const starPositions = new Float32Array(starCount * 3);
    const starSpeeds = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 105;
        starPositions[i * 3 + 1] = 8 + Math.random() * 42;
        starPositions[i * 3 + 2] = -32 - Math.random() * 38;
        starSpeeds[i] = 0.008 + Math.random() * 0.028;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffe3a8,
        size: 0.11,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    world.add(starField);

    // Gate-side architecture: stepped buttresses sit beside the arch without swallowing it.
    for (const side of [-1, 1]) {
        const pier = new THREE.Group();

        const main = new THREE.Mesh(
            new THREE.BoxGeometry(3.55, 11.3, 5.15, 3, 3, 3),
            stone
        );
        main.position.set(0, 5.65, 0.15);
        main.castShadow = true;
        main.receiveShadow = true;
        pier.add(main);

        // Three projecting courses give the masonry a real load-bearing rhythm.
        const courses = [
            [4.15, 1.05, 5.7, 0.52],
            [3.85, 0.72, 5.5, 4.15],
            [4.05, 0.86, 5.65, 7.85],
            [4.3, 1.05, 5.8, 11.15]
        ];
        for (const [w, h, d, y] of courses) {
            const block = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d, 3, 2, 3),
                y === 0.52 || y === 11.15 ? stoneEdge : stone
            );
            block.position.set(0, y, 0.12);
            block.rotation.z = (Math.random() - 0.5) * 0.018;
            block.castShadow = true;
            block.receiveShadow = true;
            pier.add(block);
        }

        // Recessed vertical face: darker stone makes the pier read as carved masonry.
        const inset = new THREE.Mesh(
            new THREE.BoxGeometry(2.15, 7.5, 0.28, 2, 2, 2),
            stoneDark
        );
        inset.position.set(0, 5.9, 2.73);
        inset.castShadow = true;
        inset.receiveShadow = true;
        pier.add(inset);

        // Narrow projecting shoulder toward the gate, visually tying the pier to the arch jamb.
        const shoulder = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 9.2, 5.45, 2, 3, 2),
            stoneEdge
        );
        shoulder.position.set(-side * 1.38, 5.0, 0.18);
        shoulder.castShadow = true;
        shoulder.receiveShadow = true;
        pier.add(shoulder);

        pier.position.set(side * 10.05, 0, 0.78);
        world.add(pier);

        // Separate foundation stones ground the structure instead of letting it read as a cube.
        for (let i = 0; i < 3; i++) {
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(2.7 + i * 0.55, 0.55 + i * 0.12, 5.95 + i * 0.22, 2, 2, 2),
                i === 0 ? stoneEdge : stone
            );
            base.position.set(side * (10.05 - i * 0.04), 0.3 + i * 0.56, 0.78);
            base.rotation.z = (Math.random() - 0.5) * 0.012;
            base.castShadow = true;
            base.receiveShadow = true;
            world.add(base);
        }
    }

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let disposed = false;
    let portalFlight = null;

    const onPointer = event => {
        pointer.tx = event.clientX / window.innerWidth - 0.5;
        pointer.ty = event.clientY / window.innerHeight - 0.5;
    };

    const resize = () => {
        const maxDpr = lowPower ? 1 : 1.5;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };

    const clock = new THREE.Clock();

    const frame = () => {
        if (disposed || document.hidden) { raf = 0; return; }
        raf = requestAnimationFrame(frame);
        const time = clock.getElapsedTime();

        pointer.x += (pointer.tx - pointer.x) * 0.035;
        pointer.y += (pointer.ty - pointer.y) * 0.035;

        if (lorgusPortalDepartureAligning) {
            camera.fov += (46 - camera.fov) * 0.08;
            camera.updateProjectionMatrix();
            camera.lookAt(pointer.x * 0.7, 7.5 + pointer.y * 0.55, -0.5);
        } else if (lorgusPortalEntering) {
            const elapsed = performance.now() - lorgusPortalEnterStartedAt;
            const progress = Math.min(1, elapsed / 1080);
            // Более мягкий старт: камера сначала словно "цепляется" за взгляд,
            // затем быстро набирает скорость к воротам.
            const ease = progress < 0.22
                ? 0.18 * Math.pow(progress / 0.22, 2)
                : 0.18 + 0.82 * (1 - Math.pow(1 - ((progress - 0.22) / 0.78), 2));

            // Capture the camera exactly where the player was looking when the
            // transition began. The flight then stays on one straight line through
            // the portal instead of spawning a second "video camera".
            if (!portalFlight) {
                const portalCenter = new THREE.Vector3(0, 6.9, -0.85);
                world.localToWorld(portalCenter);

                const start = camera.position.clone();
                const travelDirection = portalCenter.clone().sub(start).normalize();
                // Камера останавливается перед плоскостью ворот — она не летит сквозь портал.
                const end = portalCenter.clone().addScaledVector(travelDirection, -6.5);

                const startQuat = camera.quaternion.clone();
                const aimCamera = camera.clone();
                aimCamera.lookAt(portalCenter);

                portalFlight = {
                    start,
                    end,
                    travelDirection,
                    startQuat,
                    targetQuat: aimCamera.quaternion.clone(),
                    portalCenter,
                    worldRotationY: world.rotation.y
                };
            }

            const flight = portalFlight;
            camera.position.lerpVectors(flight.start, flight.end, ease);

            // During the first part of the shot the camera smoothly turns toward
            // the portal centre; after crossing, it keeps looking forward.
            const aimBlend = Math.min(1, progress / 0.24);
            camera.lookAt(flight.portalCenter);

            // Preserve continuity from the exact original orientation instead of
            // snapping the camera to a new canned starting angle.
            if (aimBlend < 1) {
                const blended = flight.startQuat.clone().slerp(flight.targetQuat, aimBlend);
                camera.quaternion.copy(blended);
            }

            camera.fov = 46 + (34 - 46) * ease;
            camera.updateProjectionMatrix();
        } else {
            portalFlight = null;
            camera.fov += (46 - camera.fov) * 0.06;
            camera.updateProjectionMatrix();
            camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.018;
            camera.position.y += (7.2 - pointer.y * 1.5 - camera.position.y) * 0.018;
            camera.lookAt(pointer.x * 0.7, 7.5 + pointer.y * 0.55, -0.5);
        }

        portalCore.scale.setScalar(0.92 + Math.sin(time * 1.35) * 0.06);
        portalMist.scale.setScalar(0.96 + Math.sin(time * 0.8 + 1.2) * 0.08);
        portalSparks.forEach((spark, i) => {
            spark.position.y += Math.sin(time * spark.userData.speed + spark.userData.phase) * 0.0025 + 0.004;
            if (spark.position.y > 16.2) spark.position.y = 0.8 + (i % 9) * 0.7;
            spark.position.x += Math.sin(time * 0.7 + spark.userData.phase) * 0.0018;
        });
        riftLight.intensity = 26 + Math.sin(time * 2.1) * 6;
        gateInnerGlow.intensity = 12 + Math.sin(time * 1.7) * 3;
        floorGlow.material.opacity = 0.11 + Math.sin(time * 1.9) * 0.025;
        const starPos = starGeometry.attributes.position;
        for (let i = 0; i < starCount; i++) {
            const idx = i * 3;
            starPos.array[idx + 1] -= starSpeeds[i];
            starPos.array[idx] += Math.sin(time * 0.22 + i) * 0.0009;
            if (starPos.array[idx + 1] < 5) {
                starPos.array[idx + 1] = 48 + Math.random() * 5;
                starPos.array[idx] = (Math.random() - 0.5) * 105;
            }
        }
        starPos.needsUpdate = true;

        if (lorgusPortalEntering && portalFlight) {
            world.rotation.y = portalFlight.worldRotationY;

            // Пока камера летит, пространство между ней и воротами не остаётся
            // чёрным: дальние частицы и обломки слегка ускоряются навстречу кадру,
            // создавая ощущение реального пролёта, а не движения камеры в пустоте.
            const flightProgress = Math.min(
                1,
                (performance.now() - lorgusPortalEnterStartedAt) / 1080
            );
            const flightBoost = Math.max(0, flightProgress - 0.12);
            for (const mesh of debris) {
                if (mesh.userData.portalDrift === undefined) {
                    mesh.userData.portalDrift = 0.12 + Math.random() * 0.22;
                }
                mesh.position.z += mesh.userData.portalDrift * flightBoost;
                if (mesh.position.z > 18) mesh.position.z -= 42;
            }
        } else {
            world.rotation.y = pointer.x * -0.025;
        }

        for (const mesh of debris) {
            mesh.rotation.x += mesh.userData.spin * 0.004;
            mesh.rotation.y += mesh.userData.spin * 0.006;
            if (mesh.userData.portalDrift === undefined) {
                mesh.userData.portalDrift = 0.12 + Math.random() * 0.22;
            }
        }

        renderer.render(scene, camera);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    const onVisibilityChange = () => {
        if (document.hidden) {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            clock.stop();
        } else if (!disposed && !raf) {
            clock.start();
            frame();
        }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame();

    const previousCleanup = window.lorgusSceneCleanup;
    window.lorgusSceneCleanup = () => {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        renderer.dispose();
        if (previousCleanup) previousCleanup();
    };
}


window.initializeLorgusWebGL = initializeLorgusWebGL;
