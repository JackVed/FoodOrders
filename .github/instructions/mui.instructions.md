---
name: MUI MCP Guidance
description: Consult the MUI MCP server for current Material UI docs and examples when working on MUI code.
applyTo: "frontend/**/*.{ts,tsx,js,jsx,css}"
---

# MUI MCP Guidance

- When working on MUI or Material UI components, theming, layout, `sx`, slots, or component APIs, consult the MUI MCP server first if it is configured.
- Use the MUI MCP results to confirm component names, props, patterns, and example usage before relying on memory.
- If the MCP server is unavailable, say so briefly and fall back to the official MUI docs already present in the workspace context or provided by the user.