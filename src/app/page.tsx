"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

type HoverData = {
    active: boolean;
    text: string;
};

export default function Home() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hoverData, setHoverData] = useState<HoverData>({ active: false, text: "" });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const materials = [
        {
            title: "Metal",
            versions: [
                {
                    id: "Metal v1",
                    url: "/steel/1",
                    script: "float grain = random(vUv * vec2(1.0, 300.0));\nvec3 T = normalize(vec3(1.0, grain * 0.05, 0.0));\n// Implementation of simple high-frequency grain and single specular lobe.",
                },
                {
                    id: "Metal v2",
                    url: "/steel",
                    script: "float band = fbm(vUv * vec2(12.0, 0.5));\nfloat textureVariancy = band * 0.7 + scratch * 0.15;\n// Introduced vertical low-frequency waves (FBM) and dual specular lobes for a wavy, high-contrast brushed look.",
                },
            ],
        },
        {
            title: "Water",
            versions: [
                {
                    id: "Water v1",
                    url: "/water/1",
                    script: "float wave = sin(wavePhase);\nfloat envelope = exp(-age * decay) * intensity;\n// Basic damped concentric sine wave displacing flat normals.",
                },
                {
                    id: "Water v2",
                    url: "/water/2",
                    script: "vec2 normalOffset = vec2(dX, dY) * 2.5;\nfloat glint = smoothstep(0.55, 0.65, spec);\n// FBM bumpy surface mapped with a harsh thresholding for electric white glints matching stark lighting.",
                },
                {
                    id: "Water v3",
                    url: "/water",
                    script: "float freq = 20.0;\nfloat edgeFade = smoothstep(age * speed, age * speed - 0.05, dist);\n// Lowered frequency for organic spread, integrated subtle center and edge fade to remove jagged rings.",
                },
            ],
        },
    ];

    return (
        <main className="h-full w-full bg-white">
            <div className="h-full w-full overflow-y-auto no-scrollbar p-4 lg:p-6">
                <div className="max-w-[400px] text-[20px] lg:text-[28px] tracking-[-0.03em] leading-[1.25] font-medium text-black pb-20">

                    <div className="flex flex-col gap-6 lg:gap-8">
                        {materials.map((mat) => (
                            <div key={mat.title} className="flex flex-col">
                                <p className="mb-0">
                                    {mat.title}
                                </p>
                                <div className="flex flex-col space-y-0">
                                    {mat.versions.map((ver) => (
                                        <Link
                                            key={ver.id}
                                            href={ver.url}
                                            className="opacity-20 hover:opacity-100 transition-opacity duration-300 block w-fit"
                                            onMouseEnter={() => setHoverData({ active: true, text: ver.script })}
                                            onMouseLeave={() => setHoverData({ active: false, text: "" })}
                                        >
                                            {ver.id}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {hoverData.active && (
                <div
                    className="pointer-events-none fixed z-50 bg-black text-white p-4 max-w-[300px] text-[12px] lg:text-[14px] leading-relaxed whitespace-pre-wrap rounded-sm shadow-xl"
                    style={{
                        left: mousePos.x + 20,
                        top: mousePos.y + 20,
                    }}
                >
                    <div className="font-mono opacity-80">{hoverData.text}</div>
                </div>
            )}
        </main>
    );
}
