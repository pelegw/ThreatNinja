# ThreatNinja

A local-first threat modeling tool that actually does the boring parts for you.

Draw your system. Plug in an LLM. Get STRIDE + MITRE ATT&CK — mapped, enriched, and clickable.

---

## Why this exists

Threat modeling always gets stuck in two places:

1. Drawing the system
2. Grinding through “what could go wrong?”

ThreatNinja cuts both.

- Describe your system → it draws the diagram
- Draw it yourself → also works
- Run analysis → STRIDE first, ATT&CK on top



---

## What it does

**Diagramming**

- Drag-and-drop data flow diagrams
- Or generate from a sentence (“React → API → Postgres”)
- Flexible trust boundaries: boxes or lines

**Threat analysis**

- STRIDE across every element and flow
- ATT&CK techniques layered on top, with T-IDs, mitigations, and detections
- Everything linked together:
  - Click a threat → highlight it on the diagram
  - Click a node → see related threats
  - Click a technique → open it in ATT&CK

**LLM, but not magic**

- Fully editable output
- Seed your own threats
- Interview mode to fill gaps around auth, data sensitivity, and boundaries
- Configurable prompts, so you can tune it to your org

---

## Local-first

- Runs entirely on your machine
- Works with OpenAI, Anthropic, or local models like Ollama, LM Studio, llama.cpp, and LiteLLM
- API keys are encrypted with Electron `safeStorage`
- Nothing leaves your machine unless you choose it to

---

## Run it

~~~bash
npm install
npm run dev
~~~

Node 20+ required.

---

## Files

`.tninja` files are plain JSON containing:

- the diagram
- STRIDE threats
- ATT&CK mapping
- interview transcript, if used

Export to PNG, SVG, JSON, or CSV.

---

