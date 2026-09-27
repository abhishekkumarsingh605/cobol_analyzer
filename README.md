# COBOL Analyzer - Enterprise Mainframe Code Analysis & Intelligence Platform

A high-performance, web-based IDE and static code analysis platform designed to inspect, catalog, and deeply analyze enterprise COBOL and mainframe applications. COBOL Analyzer delivers comprehensive architectural intelligence, maps execution call chains, extracts database schemas and CRUD interactions, and detects missing dependencies across legacy repositories.

---

## Key Features

### 1. Missing Components & Dependency Analysis
- Automatically detects unresolved dependencies across the entire codebase.
- Identifies missing **COBOL Copybooks** (`COPY` statements).
- Identifies missing **Subprograms** (`CALL` and `EXEC CICS LINK` targets).
- Identifies missing **DCLGEN table declarations** and **JCL cataloged procedures (`EXEC PROC=...`)**.
- Severity classification (**Critical**, **High**, **Medium**) with line references and suggested resolution paths.

### 2. Database Schema & CRUD Extraction
- Extracts all embedded SQL operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `OPEN`, `FETCH`, `CLOSE`, `DECLARE`).
- Identifies referenced database tables, views, and columns.
- Maps host variables and cursor definitions across programs.
- Visualizes CRUD interaction matrix per database table.

### 3. Application Flow & Call Chains
- Generates interactive, directional call chain graphs powered by `vis-network`.
- Tracks static calls, dynamic calls, CICS transactions, and JCL batch job invocations.
- Interactive node exploration: click any program to view inward callers and outward callees.
- Graph controls: Physics toggle, hierarchical layout, search/highlight, and PNG export.

### 4. Codebase File Inventory Tree & Mainframe SME Metrics
- Hierarchical tree inventory with file sizes, line counts, and last modified timestamps.
- **Mainframe SME Metrics**: Number of COBOL paragraphs, procedural sections, and JCL EXEC steps.
- **Extension-wise Breakdown**: Line counts, code vs. comment ratios, and codebase percentage for `.cbl`, `.cpy`, `.jcl`, `.sql`, etc.
- **Tree Navigation Controls**: Instant **Expand All** and **Collapse All** actions with fast search filtering.

### 5. IDE Editor & Program Outline
- Fixed-column COBOL syntax canvas with line numbers and inline missing component annotations.
- Multi-tab file switching with instant copy-to-clipboard.
- **Right-Hand Program Outline**: Live hierarchy of Divisions, Sections, Paragraphs, Calls, Copybooks, SQL ops, and JCL steps.
- Click any symbol in the outline to instantly jump to and highlight that line in the source code.

### 6. Multiple Codebase Ingestion Options
- **Upload Button**: Ingest COBOL files (`.cbl`, `.cob`, `.cpy`), full directory trees, or `.zip` archives.
- **Git Repository**: Clone directly from remote Git URLs (e.g. GitHub/GitLab) or local Git paths.
- **Built-in Sample**: Instant one-click load of a sample enterprise core banking application.

### 7. Dual Themes (Dark & Light)
- Sleek dark IDE theme tailored for low-light development.
- Crisp, high-contrast light theme with optimized syntax highlighting.
- Instant theme toggle in the top-right header with persistence in `localStorage`.

### 8. Code Analysis & Audit Reports Export
- Download comprehensive code analysis and audit reports in **JSON**, **CSV**, or formatted printable **HTML/PDF**.
- Includes System Code Health Score, missing component risk assessments, database CRUD matrices, program flow summaries, and inventory metrics.

---

## Tech Stack

- **Framework**: React 19, Vite 8
- **Icons**: Lucide React
- **Network Graph**: vis-network
- **Archive Extraction**: JSZip
- **Styling**: Modern Vanilla CSS Design System with responsive flexbox/grid and CSS custom properties

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- `npm` (version 9 or higher)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cobol_analyzer

# Install dependencies
npm install
```

### Development Server

```bash
# Start Vite development server
npm run dev
```

The application will be accessible at `http://127.0.0.1:5173/`.

### Production Build

```bash
# Build the production bundle
npm run build

# Preview the production build locally
npm run preview
```

The compiled assets will be output to the `dist/` directory.

---

## Deployment on Netlify

This project is pre-configured for deployment on [Netlify](https://www.netlify.com/).

### Option A: Deploy via Netlify Git Integration (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Log in to [Netlify](https://app.netlify.com/) and click **"Add new site"** > **"Import an existing project"**.
3. Select your Git provider and repository.
4. Netlify will automatically detect the settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **"Deploy site"**.

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Build the project
npm run build

# Deploy directly to Netlify
netlify deploy --prod --dir=dist
```

---

## License

This project is proprietary and confidential. All rights reserved.
