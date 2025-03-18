"use client";
import createGlobe from "cobe";
import { useEffect } from "react";

export default function Globe() {
  let phi = 0;

  useEffect(() => {
    const canvas = document.getElementById("cobe") as HTMLCanvasElement;
    if (canvas) {
      const globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: 1000,
        height: 1000,
        phi: 0,
        theta: 0,
        dark: 0,
        diffuse: 1.2,
        scale: 1,
        mapSamples: 16000,
        mapBrightness: 12,
        baseColor: [58 / 255, 6 / 255, 206 / 255],
        markerColor: [1, 0.5, 1],
        glowColor: [1, 1, 1],
        offset: [0, 0],
        markers: [
          { location: [37.7595, -122.4367], size: 0.03 },
          { location: [40.7128, -74.006], size: 0.1 },
        ],
        onRender: (state) => {
          // Called on every animation frame.
          // `state` will be an empty object, return updated params.
          state.phi = phi;
          phi += 0.01;
        },
      });
    }
  }, []); // Empty dependency array means this effect runs once after initial render

  return (
    <canvas
      id="cobe"
      style={{ width: "500px", height: "500px" }}
      width="1000"
      height="1000"
    ></canvas>
  );
}
