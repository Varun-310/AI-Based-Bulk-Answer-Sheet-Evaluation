# AI-Based Bulk Answer Sheet Evaluation System

> Automated bulk extraction, question segmentation, and IB-standard scoring for student examination sheets using **PaddleOCR** and **OpenRouter AI**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![PaddleOCR](https://img.shields.io/badge/OCR-PaddleOCR--VL--1.6-red?style=flat-square)
![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-purple?style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)

---

## 📌 Project Overview

This platform automates the grading workflow for bulk student answer sheet PDFs:
1. **Bulk Ingestion**: Upload multiple answer sheet PDFs with live queue progress.
2. **Specialized OCR**: Extracts printed and handwritten content using Baidu's **PaddleOCR-VL-1.6** async job engine.
3. **Reasoning & Scoring**: Auto-segments individual questions ($Q_1, Q_2, \dots$), evaluates answers against **IB mark bands ($0\text{--}7$)**, and computes total scores.
4. **Teacher Moderation**: Review AI critique, check raw OCR text, and override marks live with auto-recalculating totals.
5. **Report Export**: Instant export to **Excel (.xlsx)** and **CSV**.

---

## 🛠️ Architecture

```mermaid
flowchart LR
    A[Upload PDFs] --> B[PaddleOCR API]
    B -->|Async Polling| C[Parsed Markdown / Text]
    C --> D[OpenRouter Reasoning Model]
    D -->|Rubric Scoring| E[Live Evaluation Matrix]
    E --> F[Inline Overrides & Excel/CSV Export]
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Varun-310/AI-Based-Bulk-Answer-Sheet-Evaluation.git
cd AI-Based-Bulk-Answer-Sheet-Evaluation
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file:
```env
# PaddleOCR API
PADDLEOCR_API_URL=https://paddleocr.aistudio-app.com/api/v2/ocr/jobs
PADDLEOCR_TOKEN=f90cfb9555fd5bb471159266e4e5ecec742c79b5
PADDLEOCR_MODEL=PaddleOCR-VL-1.6

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemini-2.0-flash-001
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📚 Full Documentation

Detailed technical design, API specifications, and grading rubric details are documented in [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).

---

## 📄 License
MIT License
