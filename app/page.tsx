"use client";
import { Badge } from "@/components/glaze/ui/badge";
import { Button } from "@/components/glaze/ui/button";
import React from "react";

function Landing() {
  return (
    <div className="min-h-screen w-full">
      <div className="h-screen w-full flex items-center justify-center flex-col gap-10">
        <div className="flex items-center justify-center flex-col">
          <span className="text-sm">Meet Flume</span>
          <h1 className="text-5xl text-center">Your lending pool is mid.</h1>
          <h1 className="text-5xl text-center mt-2">Fix it in 1 click.</h1>
        </div>
        <Button>Get Started</Button>
      </div>
    </div>
  );
}

export default Landing;
