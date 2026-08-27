# AI-Based Bulk Answer Sheet Evaluation System Document

---

## 1. Executive Summary & Problem Context

Evaluating academic examinations in bulk poses chronic logistical and quality challenges for educational organizations. Manual evaluation across hundreds or thousands of handwritten student scripts suffers from grader fatigue, inter-rater inconsistency, prolonged grading turnaround times, and significant administrative overhead. Furthermore, disparate handwriting styles, multi-part questions, and complex formatting render traditional template-bound OMR scanners ineffective for open-ended subjective assessments.

The **AI-Based Bulk Answer Sheet Evaluation System** provides an end-to-end cloud-native solution designed specifically to address these bottlenecks. By integrating multimodal document parsing (**PaddleOCR-VL**) with high-capacity reasoning models, the system autonomously isolates distinct question blocks, evaluates student responses against strict **International Baccalaureate (IB) criteria**, generates granular question-level feedback, and presents an interactive cockpit for teacher moderation and administrative grade export.

### Core Objectives
* **Bulk Processing**: Ingest multiple student PDFs simultaneously with per-file status tracking.
* **Specialized OCR**: Extract handwritten notes and printed questions via high-precision layout parsing.
* **Intelligent Reasoning**: Automatically detect question boundaries ($Q_1, Q_2, \dots, Q_n$), isolate answers, and evaluate responses against IB mark bands ($0\text{--}7$).
* **Teacher Moderation**: Allow educators to inspect extracted text, review AI-generated feedback, and manually override marks in real-time.
* **Instant Reporting**: Generate downloadable Excel (`.xlsx`) and CSV grade summaries with one click.

---

## 2. Architectural Pipeline & Data Engineering

To handle heterogeneous multi-page PDFs reliably without incurring cloud serverless gateway timeouts, the platform implements a decoupled, three-phase asynchronous processing pipeline:

```mermaid
flowchart TD
    A[Student PDFs Upload] --> B[Client Ingestion Manager]
    B -->|1. Submit File| C[/api/ocr/submit]
    C -->|REST Multipart| D[PaddleOCR-VL-1.6 Job Queue]
    D -->|Job ID| C
    C -->|Job ID| B
    
    B -->|2. Polling every 3s| E[/api/ocr/poll]
    E -->|Status Query| D
    D -->|State: Done + JSONL Result| E
    E -->|Markdown & Extracted Text| B
    
    B -->|3. Evaluate Text| F[/api/evaluate]
    F -->|Reasoning Prompt| G[LLM Reasoning Engine]
    G -->|Structured JSON Criteria Marks| F
    F -->|Scores, Feedback, Totals| B
    
    B --> H[Interactive Evaluation Dashboard]
    H --> I[Inline Score Overrides]
    H --> J[Excel & CSV Reports]
```

### Component Technology Stack

| Layer | Technology | Role / Justification |
|---|---|---|
| **Frontend & API** | **Next.js 14 (App Router)** | Full-stack React framework providing edge routing and responsive cockpit UI. |
| **Type Safety** | **TypeScript 5** | Rigorous typing for evaluation schemas, student models, and API payloads. |
| **OCR Parsing** | **PaddleOCR-VL Engine** | Specialized extraction of handwritten answers and printed questions. |
| **Reasoning LLM** | **High-Capacity Reasoning Engine** | Contextual answer grading, question isolation, and structured JSON output. |
| **Report Generation** | **SheetJS (xlsx)** | Client-side generation of administrative grade books (.xlsx) and raw CSV exports. |

---

## 3. OCR & Optical Layout Analysis Deep-Dive

Answer sheets vary widely in handwriting legibility, page orientation, margin density, and answer structure. The platform leverages PaddleOCR-VL to solve optical parsing challenges through dedicated algorithmic stages:

* **Document Layout Detection**: Distinguishes between printed exam prompts, student handwritten answers, mathematical notations, and margin noise.
* **Handwritten Text Recognition (HTR)**: High-accuracy character transcription resilient to varying cursive styles, pen thicknesses, and slight image skew.
* **Sequential Content Structuring**: Reconstructs natural reading order across multi-page scripts into a unified markdown transcript stream.

---

## 4. International Baccalaureate (IB) Scoring Rubric

Grading fidelity is maintained by enforcing standardized International Baccalaureate (IB) criterion bands. Each detected question receives an objective mark between $0$ and $7$:

| Band | Classification | Assessment Criteria & Competency Descriptor |
|:---:|:---:|:---|
| **$7$** | **Excellent** | Comprehensive conceptual mastery. Arguments are nuanced, logically structured, and thoroughly accurate. |
| **$5\text{--}6$** | **Good** | Sound understanding of key principles. Clear reasoning with minor inaccuracies or slight omissions. |
| **$3\text{--}4$** | **Satisfactory** | Basic conceptual grasp. Responses are partially developed but exhibit noticeable factual or analytical gaps. |
| **$1\text{--}2$** | **Needs Improvement** | Very limited comprehension. Superficial treatment, substantial inaccuracies, and weak reasoning. |
| **$0$** | **No Credit** | Blank submission, completely irrelevant content, or response failing to address the question. |

---

## 5. Evaluator Moderation Cockpit & Workflow

A central design pillar is **Human-in-the-Loop** verification. The evaluation interface is constructed as a high-density, full-viewport dashboard:

* **Live Dynamic Matrix Grid**: Multi-column table displaying Student IDs, individual question score chips, total marks, percentage, and performance status.
* **Interactive Score Adjustment**: Teachers can click any question mark input to override scores. Overall totals, percentages, and grade bands recalculate in real time.
* **Split-Pane Audit Drawer**: Expanding any student row reveals question-by-question qualitative feedback alongside the original PaddleOCR raw text stream.
* **Cohort Analytics Strip**: Top-level KPIs calculate real-time Class Mean (%), Pass Rate ($\ge 50\%$), and Distinction Rate ($\ge 85\%$) across the current batch.
* **One-Click Grade Export**: Generates institutional-grade Excel (`.xlsx`) workbooks and CSV files formatted for school information systems (SIS).

---

## 6. API Architecture & Endpoint Contracts

* `POST /api/ocr/submit`: Accepts `multipart/form-data` PDF file; queues asynchronous PaddleOCR-VL task; returns `{ jobId: string }`.
* `GET /api/ocr/poll?jobId={id}`: Queries job progress; returns `{ state: "running" | "done", ocrText: string, totalPages, extractedPages }`.
* `POST /api/evaluate`: Receives `{ studentId, ocrText }`; invokes reasoning model with IB prompt schema; returns structured question array, totals, and performance band.
* `GET /api/sample-pdfs`: Provides pre-compiled benchmark answer sheets in Base64 for instant end-to-end demonstration.

---

## 7. Verification Dataset & Benchmark Results

The system includes a pre-packaged verification dataset consisting of three distinct student performance cohorts covering Biology, Physics, History, and Literature:

| Student ID | Simulated Academic Profile | Expected Classification | Benchmark Output |
|---|---|---|---|
| **22104567.pdf** | Structured, coherent explanations across all prompts. | Distinction / Excellent | 32 / 35 Marks (91%) |
| **22104589.pdf** | Brief, superficial answers with key factual gaps. | Satisfactory / Passing | 18 / 35 Marks (51%) |
| **22104601.pdf** | Exemplary conceptual rigor and nuanced analytical depth. | Top Distinction (Grade 7) | 34 / 35 Marks (97%) |

---

## 8. Security, Integrity & Future Evolution

The architecture incorporates data privacy by design: student documents are processed in memory and never permanently stored on external database clusters.

### Future Roadmap
* **Visual Annotation Overlays**: Rendering coordinate-accurate bounding boxes directly onto student PDF pages highlighting evaluated passages.
* **Multi-Moderator Blind Grading**: Dual-evaluator scoring workflows with automatic variance flags triggering secondary senior examiner review.
* **LMS Connectors**: Native LTI integrations allowing direct grade synchronization with Canvas, Blackboard, Google Classroom, and Moodle.
