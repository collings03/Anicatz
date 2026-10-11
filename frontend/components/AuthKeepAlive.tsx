"use client";

import { useEffect } from "react";
import { startKeepAlive } from "@/lib/auth";

/** Mount once in app/layout.tsx. Renders nothing; keeps the login token fresh in the background. */
export default function AuthKeepAlive() {
  useEffect(() => startKeepAlive(), []);
  return null;
}