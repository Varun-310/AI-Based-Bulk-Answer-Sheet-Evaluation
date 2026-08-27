# AI-Based Bulk Answer Sheet Evaluation System
## Technical & Functional Project Documentation

---

## 1. Executive Summary & Problem Statement

The **AI-Based Bulk Answer Sheet Evaluation System** is an end-to-end automated platform engineered to evaluate handwritten and printed student examination sheets at scale. Designed to align with **International Baccalaureate (IB) assessment standards**, the system solves traditional manual grading bottlenecks by streamlining document ingestion, optical character recognition (OCR), question segmentation, structured rubric-based scoring, and live marksheet analytics.

### Key Objectives
* **Bulk Processing**: Ingest multiple student PDFs simultaneously with per-file status tracking.
* **Specialized OCR**: Extract handwritten notes and printed questions via high-precision layout parsing.
* **Intelligent Reasoning**: Automatically detect question boundaries ($Q_1, Q_2, \dots, Q_n$), isolate answers, and evaluate responses against IB mark bands ($0\text{--}7$).
* **Teacher Moderation**: Allow educators to inspect extracted text, review AI-generated feedback, and manually override marks in real-time.
* **Instant Reporting**: Generate downloadable Excel (`.xlsx`) and CSV grade summaries with one click.

---

## 2. Architecture & Pipeline Workflow

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

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | **Next.js 14 (App Router)** | High-performance React framework with server-side API routes |
| **Language & Typing** | **TypeScript 5** | Strict type safety for data models and API payloads |
| **OCR Engine** | **PaddleOCR-VL Engine** | High-accuracy layout parsing and handwritten character extraction |
| **Reasoning Engine** | **Advanced LLM Reasoning** | Question segmentation, answer critique, and IB score calculation |
| **Icons & UI Design** | **Lucide Icons + Pure CSS System** | Minimalist, distraction-free full-viewport cockpit layout |
| **Spreadsheet Generation** | **SheetJS (xlsx)** | Client-side export of formatted grade summaries |

---

## 4. Core Features & Functional Specification

### 4.1 Ingestion & Queue Management
* **Filename as Student ID**: Automatically parses filenames (e.g., `22104567.pdf` $\rightarrow$ `Student ID: 22104567`).
* **Live Step-by-Step Progress**: Visual indicators transition through:
  $$\text{Queued} \longrightarrow \text{Uploading} \longrightarrow \text{PaddleOCR-VL} \longrightarrow \text{AI Scoring} \longrightarrow \text{Evaluated}$$
* **1-Click Test Pack**: Built-in test loader that supplies 3 sample student answer sheets of varying performance tiers (Excellent, Good, Needs Improvement) without manual file hunting.

### 4.2 OCR & Intelligent Parsing
* Handles mixed formats (typed headers + handwritten script).
* Strips extraneous formatting while preserving question hierarchy.
* Generates a raw text stream stored alongside student records for auditability.

### 4.3 IB Rubric Scoring Engine
For each identified question, the reasoning engine assigns a score on the standard IB $0\text{--}7$ mark band:

| Score | Performance Level | Descriptor |
|:---:|:---|:---|
| **$7$** | **Excellent** | Thorough, accurate, demonstrating mastery and deep conceptual clarity |
| **$5\text{--}6$** | **Good** | Solid understanding, coherent analysis, minor omissions |
| **$3\text{--}4$** | **Satisfactory** | Basic comprehension, partial explanation, noticeable gaps |
| **$1\text{--}2$** | **Needs Improvement** | Limited knowledge, significant inaccuracies, weak conceptual grasp |
| **$0$** | **No Credit** | Blank, irrelevant, or entirely incorrect response |

### 4.4 Real-time Teacher Moderation & Analytics
* **Summary KPI Strip**: Displays Total Evaluated, Class Mean Percentage, Pass Rate ($\ge 50\%$), and Distinction Rate ($\ge 85\%$).
* **Matrix Table**: Dynamic column grid auto-scaling to the number of detected questions ($Q_1, Q_2, Q_3, \dots$).
* **Inspector Drawer**: Click any student to view:
  1. Specific question feedback and extracted quote excerpts.
  2. **Editable Score Box**: Modifying any mark recalculates total score, percentage, and grade band live.
  3. **PaddleOCR Raw Text Viewer**: Side-by-side verification of OCR text against assigned marks.

---

## 5. API Reference

### `POST /api/ocr/submit`
Submits a single PDF file to the PaddleOCR-VL async processing queue.
* **Request**: `multipart/form-data` with `file: File`
* **Response**: `{ "jobId": "86518605801172992" }`

### `GET /api/ocr/poll?jobId={id}`
Checks processing status of an active OCR job and downloads parsed markdown when complete.

### `POST /api/evaluate`
Takes extracted OCR text and student metadata, prompts the reasoning model, and returns question-wise marks and critique.

### `GET /api/sample-pdfs`
Returns pre-generated test PDFs encoded in Base64 for instant demo evaluation.

---

## 6. Verification & Benchmark Dataset

The system includes a pre-packaged benchmark dataset representing three distinct student achievement tiers:

| Student ID | Simulated Profile | Expected Classification | Benchmark Score |
|---|---|---|---|
| **22104567.pdf** | Detailed, structured academic responses | Distinction / Excellent | 32 / 35 (91%) |
| **22104589.pdf** | Brief, high-level summary answers | Satisfactory / Passing | 18 / 35 (51%) |
| **22104601.pdf** | Exemplary mastery across all disciplines | Top Distinction (Grade 7) | 34 / 35 (97%) |

---

## 7. Future Roadmap & Enhancements

* **Multi-Examiner Moderation**: Add blind-marking workflows with variance thresholds triggering secondary human review.
* **Custom Rubric Uploads**: Allow teachers to supply custom marking schemes per exam paper.
* **Visual Annotation Overlay**: Render bounding boxes directly onto student PDF pages highlighting evaluated text.
* **LMS Integration**: Webhooks and LTI connectors for Canvas, Google Classroom, and Moodle.
