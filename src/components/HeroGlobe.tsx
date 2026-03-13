import { useEffect, useRef } from "react";
import * as THREE from "three";

export const HeroGlobe = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            60,
            mountRef.current.clientWidth / mountRef.current.clientHeight,
            0.1,
            1000
        );

        camera.position.z = 4;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

        renderer.setSize(
            mountRef.current.clientWidth,
            mountRef.current.clientHeight
        );
        // Handle retina displays
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        mountRef.current.appendChild(renderer.domElement);

        // Create globe nodes
        const nodes: THREE.Mesh[] = [];
        const lines: THREE.Line[] = [];
        const radius = 1.5;

        const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });

        const sphereGroup = new THREE.Group();

        // Use a bit more nodes for a more complex network
        const NUM_NODES = 60;
        for (let i = 0; i < NUM_NODES; i++) {
            const phi = Math.acos(-1 + (2 * i) / NUM_NODES);
            const theta = Math.sqrt(NUM_NODES * Math.PI) * phi;

            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(phi);

            const geometry = new THREE.SphereGeometry(0.025, 8, 8);
            const node = new THREE.Mesh(geometry, nodeMaterial);

            node.position.set(x, y, z);

            nodes.push(node);
            sphereGroup.add(node);
        }

        // Connect nearest nodes
        nodes.forEach((node, i) => {
            nodes.forEach((other, j) => {
                if (i < j && node.position.distanceTo(other.position) < 1.0) {
                    const points = [];
                    points.push(node.position);
                    points.push(other.position);

                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(geometry, lineMaterial);

                    sphereGroup.add(line);
                    lines.push(line);
                }
            });
        });

        scene.add(sphereGroup);

        let rotationSpeed = 0.002;
        let animationFrameId: number;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            sphereGroup.rotation.y += rotationSpeed;
            // Optional: add slight rotation on X back and forth
            sphereGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1;

            renderer.render(scene, camera);
        };

        animate();

        // Hover interaction
        const handleMouseEnter = () => {
            rotationSpeed = 0.008;
            lines.forEach((l) => {
                const mat = l.material as THREE.LineBasicMaterial;
                mat.color.set("#666666");
            });
            nodes.forEach((n) => (n.scale.set(1.5, 1.5, 1.5)));
        };

        const handleMouseLeave = () => {
            rotationSpeed = 0.002;
            lines.forEach((l) => {
                const mat = l.material as THREE.LineBasicMaterial;
                mat.color.set("#444444");
            });
            nodes.forEach((n) => (n.scale.set(1, 1, 1)));
        };

        const container = mountRef.current;
        container.addEventListener("mouseenter", handleMouseEnter);
        container.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            cancelAnimationFrame(animationFrameId);
            container.removeEventListener("mouseenter", handleMouseEnter);
            container.removeEventListener("mouseleave", handleMouseLeave);
            try {
                container.removeChild(renderer.domElement);
            } catch (e) { }

            // Clean up memory
            renderer.dispose();
            nodes.forEach(n => n.geometry.dispose());
            lines.forEach(l => l.geometry.dispose());
            nodeMaterial.dispose();
            lineMaterial.dispose();
        };
    }, []);

    return (
        <div className="relative flex justify-center items-center w-full h-full">
            <div
                ref={mountRef}
                className="w-full h-full cursor-pointer"
            />
            {/* Subtle ambient glow behind the globe */}
            <div className="absolute inset-0 bg-gradient-radial from-gray-300/40 to-transparent rounded-full blur-[80px] -z-10 pointer-events-none"></div>
        </div>
    );
};
