"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/components/App").then((mod) => mod.App), {
  ssr: false,
  loading: () => (
    <div className="app-stage">
      <div className="app-device grid place-items-center">
        <p className="font-serif text-5xl tracking-tight">Cal</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <App />;
}
