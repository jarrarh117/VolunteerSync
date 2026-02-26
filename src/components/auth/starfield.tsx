
"use client";

import { useRef, useEffect, FC } from 'react';
import * as THREE from 'three';

const Starfield: FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = new THREE.Scene();
    let camera: THREE.PerspectiveCamera | null = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;

    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        currentMount.appendChild(renderer.domElement);
    } catch (error) {
        console.error("Failed to initialize WebGLRenderer:", error);
        return; // Stop execution if renderer fails
    }

    const finalRenderer = renderer;

    const starGeo = new THREE.BufferGeometry();
    const starCount = 10000;
    const vertices = [];
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * 600 - 300;
      const y = Math.random() * 600 - 300;
      const z = Math.random() * 600 - 300;
      vertices.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
    });
    const stars = new THREE.Points(starGeo, starMaterial);
    scene.add(stars);

    const onMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      if (!scene || !camera || !finalRenderer) return;
      animationFrameId.current = requestAnimationFrame(animate);

      stars.rotation.y += 0.0001;
      
      camera.position.x += (mouse.current.x * 0.2 - camera.position.x) * 0.02;
      camera.position.y += (mouse.current.y * 0.2 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      finalRenderer.render(scene, camera);
    };
    animate();

    const onWindowResize = () => {
        if (!camera || !finalRenderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        finalRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('mousemove', onMouseMove);
      
      if (finalRenderer && currentMount) {
        currentMount.removeChild(finalRenderer.domElement);
      }
      
      starGeo.dispose();
      starMaterial.dispose();
      scene?.remove(stars);

      finalRenderer?.dispose();
      
      scene = null;
      camera = null;
      renderer = null;
    };
  }, []);

  return <div ref={mountRef} className="fixed top-0 left-0 w-full h-full -z-10" />;
};

export default Starfield;
