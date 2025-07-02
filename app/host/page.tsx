"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Host = dynamic(() => import("./Host"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Host />
    </Suspense>
  );
}
