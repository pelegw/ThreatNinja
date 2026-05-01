# Threat Modeling App — Architecture & Build Plan

A modern replacement for Microsoft's Threat Modeling Tool. Lets developers and architects build data flow diagrams visually or via natural language, then runs STRIDE-based threat analysis on them using an LLM.

## Goals

- Cross-platform desktop app (Mac + Windows)
- Visual canvas for designing data flow diagrams (DFDs)
- Two ways to build the diagram: drag-and-drop, or natural-language description via LLM
- Automated STRIDE threat analysis with editable results
- Bidirectional traceability between threats and data flows
- Modular architecture so pieces can be swapped/extended later

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Shell | **Electron** | More mature than Tauri, broader library ecosystem. Tauri is an option later if bundle size becomes a concern. |
| UI Framework | **React** (or Vue) | Single-page app inside the Electron shell. |
| Graph rendering | **Cytoscape.js** or **D3.js** | Both handle compound graphs; Cytoscape is higher-level and easier for interactive editing. |
| Storage | **SQLite** or **JSON files** on disk | Local-only persistence. Diagrams are user-owned files. |
| LLM integration | **Custom thin wrapper** | ~50 lines abstracting Anthropic / OpenAI / local endpoints. Avoid LangChain initially — overkill for current needs. |

---

## Canvas & Diagram Model

### Entities
- **Network components**: servers, user desktops, databases, etc.
- **Logical components**: services, databases, file stores, object storage, etc. (extensible list)
- **Zones**: containers that group components (e.g., DMZ, internal network, third-party)

### Flows (edges)
- Each flow has a **unique ID** (used for threat traceability)
- Each flow has an **originator** and a **target** (directional)
- Flows can be **unidirectional** or **bidirectional**
- Two components can have multiple flows between them, each with its own direction

### Layout
**Compound / hybrid layout:**
- **Hierarchical** at the zone level — zones arranged left-to-right (or as appropriate) to show overall flow direction
- **Force-directed (organic)** within each zone — components inside a zone laid out more freely
- Goal: readable structure overall, without rigid grids that look ugly

---

## Diagram Construction — Two Paths

### 1. Drag-and-drop
Standard canvas interactions: drag entities from a palette, draw arrows between them, configure direction (uni/bi), edit properties.

### 2. Natural-language input (LLM-assisted)
- Chat box alongside the canvas
- User describes the system in plain English, or pastes ASCII-style diagrams
- LLM parses the description and emits structured graph data (nodes + edges as JSON)
- App ingests the JSON, creates the corresponding entities and flows, then runs the layout pass to make it look clean

---

## LLM Configuration

Settings panel lets users pick a backend:
- **Anthropic API** (with API key)
- **OpenAI API** (with API key)
- **Local endpoint** — LM Studio, Ollama, llama.cpp, or any OpenAI-compatible server URL
- **Self-hosted gateway** — e.g., LiteLLM instance, company internal proxy

All LLM calls go through a single abstraction layer (`LLMClient` or similar) so the rest of the app is provider-agnostic. Future bundling of a built-in local model is possible but not in scope for v1.

**Inference settings** for analysis tasks: temperature ~0.0–0.1 for deterministic, repeatable output.

---

## STRIDE Analysis Engine

1. Serialize the current graph (zones, components, flows with IDs and directions) to JSON
2. Send to configured LLM with a structured prompt asking for STRIDE-category threats per flow
3. Receive structured JSON response — schema:
   - `threat_id`
   - `flow_id` (links back to the diagram edge)
   - `stride_category` (S/T/R/I/D/E)
   - `description`
   - `affected_components`
   - `mitigation_suggestion`
4. Populate an **editable threats table** in the UI
5. User can edit, add, delete threats; results saved with the diagram

### Bidirectional traceability
- Click a row in the threats table → canvas highlights the corresponding flow
- Click a flow on the canvas → threats table filters to threats affecting that flow

---

## Persistence

- Save/load diagrams as files on disk (JSON or SQLite)
- File contains: graph structure, threat analysis results, user edits, metadata
- Export options: PNG/SVG of the diagram, JSON for sharing/version control

---

## Modularity Principles

Build each concern as an independent module so pieces can be swapped or extended:

- `canvas/` — rendering, drag-and-drop, layout
- `model/` — graph data structures (zones, components, flows), serialization
- `llm/` — provider-agnostic client, prompt templates
- `analysis/` — STRIDE prompt construction, response parsing, threat table state
- `storage/` — save/load, export
- `ui/` — settings, panels, tables, chat box

---

## Suggested Build Order

1. **Graph data model + serialization** — get the core types right first
2. **Canvas with drag-and-drop** — render zones, components, directional flows
3. **Compound hybrid layout** — hierarchical for zones, force-directed within
4. **Persistence** — save/load to disk
5. **LLM abstraction layer** — Anthropic / OpenAI / local-endpoint support, settings UI
6. **Natural-language → graph** — chat box, prompt, JSON ingestion, re-layout
7. **STRIDE analysis** — prompt, structured response parsing, threats table
8. **Bidirectional highlighting** — click-through between table and canvas
9. **Export** — image and JSON export
10. **Polish** — keyboard shortcuts, undo/redo, validation

---

## Open Questions for Later

- Built-in local model bundling (size, hardware requirements)
- Multi-user / collaborative editing
- Version history for diagrams
- Custom STRIDE prompt templates per organization
- Library of reusable component templates
