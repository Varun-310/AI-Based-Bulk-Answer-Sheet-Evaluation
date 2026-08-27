const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createDocumentationPDF() {
  const doc = await PDFDocument.create();
  
  // Embed standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Corporate Color Palette
  const primaryColor = rgb(0.11, 0.22, 0.48);   // #1c3879 Deep Navy
  const secondaryColor = rgb(0.35, 0.4, 0.48);  // Slate Gray
  const textColor = rgb(0.15, 0.17, 0.2);       // Charcoal #262b33
  const lightBg = rgb(0.96, 0.97, 0.99);        // Light Ice Tint
  const tableHeaderBg = rgb(0.14, 0.26, 0.54);  // Header Navy
  const accentColor = rgb(0.22, 0.45, 0.85);    // Royal Blue Accent
  const borderColor = rgb(0.82, 0.86, 0.92);

  const PAGE_WIDTH = 595.28;  // A4 Width
  const PAGE_HEIGHT = 841.89; // A4 Height
  const MARGIN_LEFT = 45;
  const MARGIN_RIGHT = 45;
  const MARGIN_TOP = 42;
  const MARGIN_BOTTOM = 42;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let currentPage = null;
  let cursorY = 0;
  let pageNumber = 0;
  const pagesList = [];

  function addPage() {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber++;
    pagesList.push(currentPage);
    cursorY = PAGE_HEIGHT - MARGIN_TOP;

    // Running Header (Pages 2+)
    if (pageNumber > 1) {
      currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System', {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 26,
        size: 8,
        font: fontBold,
        color: primaryColor,
      });
      currentPage.drawText('Technical & Functional Specification Report', {
        x: PAGE_WIDTH - MARGIN_RIGHT - 165,
        y: PAGE_HEIGHT - 26,
        size: 8,
        font: fontRegular,
        color: secondaryColor,
      });
      currentPage.drawLine({
        start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 31 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 31 },
        thickness: 0.5,
        color: borderColor,
      });
      cursorY = PAGE_HEIGHT - MARGIN_TOP - 6;
    }
    return currentPage;
  }

  function ensureSpace(neededHeight) {
    if (!currentPage || cursorY - neededHeight < MARGIN_BOTTOM + 15) {
      addPage();
    }
  }

  function drawHeading1(text) {
    ensureSpace(34);
    cursorY -= 8;
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - 2,
      width: 3.5,
      height: 14,
      color: primaryColor,
    });
    currentPage.drawText(text, {
      x: MARGIN_LEFT + 8,
      y: cursorY,
      size: 11.5,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 15;
  }

  function drawHeading2(text) {
    ensureSpace(24);
    cursorY -= 4;
    currentPage.drawText(text, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 13;
  }

  function drawParagraph(text, options = {}) {
    const size = options.size || 8.8;
    const font = options.font || fontRegular;
    const color = options.color || textColor;
    const indent = options.indent || 0;
    const maxWidth = options.maxWidth || (CONTENT_WIDTH - indent);
    const lineHeight = options.lineHeight || 12.2;

    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && currentLine) {
        ensureSpace(lineHeight);
        currentPage.drawText(currentLine, {
          x: MARGIN_LEFT + indent,
          y: cursorY,
          size,
          font,
          color,
        });
        cursorY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      ensureSpace(lineHeight);
      currentPage.drawText(currentLine, {
        x: MARGIN_LEFT + indent,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= lineHeight;
    }
    cursorY -= 2;
  }

  function drawBullet(title, text) {
    ensureSpace(16);
    currentPage.drawCircle({
      x: MARGIN_LEFT + 5,
      y: cursorY + 3,
      size: 1.8,
      color: accentColor,
    });
    
    const prefix = title ? `${title}: ` : '';
    const fullText = prefix + text;
    
    const words = fullText.split(' ');
    let currentLine = '';
    const size = 8.8;
    const lineHeight = 12.2;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, size);
      if (width > (CONTENT_WIDTH - 15) && currentLine) {
        ensureSpace(lineHeight);
        currentPage.drawText(currentLine, {
          x: MARGIN_LEFT + 14,
          y: cursorY,
          size,
          font: fontRegular,
          color: textColor,
        });
        cursorY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      ensureSpace(lineHeight);
      currentPage.drawText(currentLine, {
        x: MARGIN_LEFT + 14,
        y: cursorY,
        size,
        font: fontRegular,
        color: textColor,
      });
      cursorY -= lineHeight;
    }
    cursorY -= 1.5;
  }

  function drawCallout(title, linesArray) {
    const size = 8.5;
    const formattedLines = [];

    linesArray.forEach(rawText => {
      const words = rawText.split(' ');
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (fontRegular.widthOfTextAtSize(test, size) > CONTENT_WIDTH - 20 && cur) {
          formattedLines.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) formattedLines.push(cur);
    });

    const boxHeight = 14 + (formattedLines.length * 11.2);
    ensureSpace(boxHeight + 6);

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - boxHeight + 6,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: lightBg,
      borderColor: borderColor,
      borderWidth: 0.6,
    });

    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: cursorY + 6 },
      end: { x: MARGIN_LEFT, y: cursorY - boxHeight + 6 },
      thickness: 3,
      color: primaryColor,
    });

    let boxY = cursorY - 2;
    if (title) {
      currentPage.drawText(title, {
        x: MARGIN_LEFT + 10,
        y: boxY,
        size: 9,
        font: fontBold,
        color: primaryColor,
      });
      boxY -= 11.5;
    }

    for (const line of formattedLines) {
      currentPage.drawText(line, {
        x: MARGIN_LEFT + 10,
        y: boxY,
        size: 8.5,
        font: fontRegular,
        color: textColor,
      });
      boxY -= 11;
    }

    cursorY = cursorY - boxHeight - 3;
  }

  function drawTable(headers, rows, colWidths) {
    const rowHeight = 16;
    const headerHeight = 18;
    const totalHeight = headerHeight + (rows.length * rowHeight);
    ensureSpace(totalHeight + 6);

    // Header
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - headerHeight + 8,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: tableHeaderBg,
    });

    let currentX = MARGIN_LEFT;
    headers.forEach((header, idx) => {
      currentPage.drawText(header, {
        x: currentX + 5,
        y: cursorY - 2,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      currentX += colWidths[idx];
    });

    cursorY -= headerHeight;

    // Rows
    rows.forEach((row, rowIdx) => {
      const isEven = rowIdx % 2 === 0;
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: cursorY - rowHeight + 8,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: isEven ? rgb(1, 1, 1) : lightBg,
        borderColor,
        borderWidth: 0.4,
      });

      let colX = MARGIN_LEFT;
      row.forEach((cell, cellIdx) => {
        currentPage.drawText(String(cell), {
          x: colX + 5,
          y: cursorY - 1.5,
          size: 7.8,
          font: fontRegular,
          color: textColor,
        });
        colX += colWidths[cellIdx];
      });

      cursorY -= rowHeight;
    });

    cursorY -= 6;
  }

  // ==========================================
  // INITIALIZE FLUID GENERATION
  // ==========================================
  addPage();

  // Top Title Banner
  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 90,
    width: PAGE_WIDTH,
    height: 90,
    color: primaryColor,
  });

  currentPage.drawText('ENGINEERING & FUNCTIONAL SPECIFICATION REPORT', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 35,
    size: 8.5,
    font: fontBold,
    color: rgb(0.75, 0.85, 1),
  });

  currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 55,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  currentPage.drawText('Autonomous Ingestion, Optical Layout Parsing & IB Assessment Standardization', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 72,
    size: 9,
    font: fontRegular,
    color: rgb(0.9, 0.93, 1),
  });

  cursorY = PAGE_HEIGHT - 110;

  drawCallout('System Overview', [
    'Scope: High-throughput automated grading for academic institutions and examination bodies.',
    'Pedagogical Basis: International Baccalaureate (IB) 0-7 Mark Band Rubrics & Criterion-Based Assessment.',
    'Core Pipeline: Client Ingestion -> PaddleOCR-VL Layout Parsing -> LLM Reasoning & Scoring -> Real-Time Matrix.',
    'Outputs: Interactive Moderation Cockpit, Audit Logs, Inline Score Overrides, and Formatted Excel/CSV Reports.'
  ]);

  drawHeading1('1. Executive Summary & Problem Context');
  drawParagraph(
    'Evaluating academic examinations in bulk poses chronic logistical and quality challenges for educational organizations. ' +
    'Manual evaluation across hundreds or thousands of handwritten student scripts suffers from grader fatigue, inter-rater inconsistency, ' +
    'prolonged grading turnaround times, and significant administrative overhead. Furthermore, disparate handwriting styles, multi-part questions, ' +
    'and complex formatting render traditional template-bound OMR scanners ineffective for open-ended subjective assessments.'
  );
  drawParagraph(
    'The AI-Based Bulk Answer Sheet Evaluation System provides an end-to-end cloud-native solution designed specifically to address these bottlenecks. ' +
    'By integrating multimodal document parsing (PaddleOCR-VL) with high-capacity reasoning models, the system autonomously isolates distinct question ' +
    'blocks, evaluates student responses against strict International Baccalaureate (IB) criteria, generates granular question-level feedback, and presents ' +
    'an interactive cockpit for teacher moderation and administrative grade export.'
  );

  drawHeading1('2. Architectural Pipeline & Data Engineering');
  drawParagraph(
    'To handle heterogeneous multi-page PDFs reliably without incurring cloud serverless gateway timeouts, the platform implements a decoupled, ' +
    'three-phase asynchronous processing pipeline:'
  );

  drawBullet('Phase 1 - Ingestion & Job Creation', 'PDF files are received via multipart stream. The server forwards the raw binary to the PaddleOCR-VL processing queue, registering an asynchronous job and returning an immediate Job ID to the client within 1-2 seconds.');
  drawBullet('Phase 2 - Asynchronous OCR & Layout Reconstruction', 'A client-coordinated background worker polls the OCR status endpoint at 3-second intervals. Upon completion, the service downloads the resulting JSONL layout parsing stream, extracting markdown transcripts, layout tables, and handwriting segments.');
  drawBullet('Phase 3 - Rubric Evaluation & Question Segmentation', 'Extracted OCR text is dispatched to an advanced reasoning engine with strict JSON schema constraints. The model identifies question boundaries (Q1..Qn), calculates criteria-based scores on a 0-7 scale, and returns structured critique.');

  drawHeading2('Component Technology Stack');
  drawTable(
    ['Layer', 'Technology', 'Role / Justification'],
    [
      ['Frontend & API', 'Next.js 14 (App Router)', 'Full-stack React framework providing edge routing and responsive cockpit UI.'],
      ['Type Safety', 'TypeScript 5', 'Rigorous typing for evaluation schemas, student models, and API payloads.'],
      ['OCR Parsing', 'PaddleOCR-VL-1.6', 'Baidu AI Studio multimodal engine specialized in mixed print/handwriting extraction.'],
      ['Reasoning LLM', 'High-Capacity Reasoning Engine', 'Contextual answer grading, question isolation, and structured JSON output.'],
      ['Report Generation', 'SheetJS (xlsx)', 'Client-side generation of administrative grade books (.xlsx) and raw CSV exports.'],
    ],
    [105, 135, 265]
  );

  drawHeading1('3. OCR & Optical Layout Analysis Deep-Dive');
  drawParagraph(
    'Answer sheets vary widely in handwriting legibility, page orientation, margin density, and answer structure. The platform leverages ' +
    'PaddleOCR-VL-1.6 to solve optical parsing challenges through dedicated algorithmic stages:'
  );
  drawBullet('Document Layout Detection', 'Distinguishes between printed exam prompts, student handwritten answers, mathematical notations, and margin noise.');
  drawBullet('Handwritten Text Recognition (HTR)', 'High-accuracy character transcription resilient to varying cursive styles, pen thicknesses, and slight image skew.');
  drawBullet('Sequential Content Structuring', 'Reconstructs natural reading order across multi-page scripts into a unified markdown transcript stream.');

  drawHeading1('4. International Baccalaureate (IB) Scoring Rubric');
  drawParagraph(
    'Grading fidelity is maintained by enforcing standardized International Baccalaureate (IB) criterion bands. Each detected question receives ' +
    'an objective mark between 0 and 7 according to the following formal assessment criteria:'
  );

  drawTable(
    ['Band', 'Classification', 'Assessment Criteria & Competency Descriptor'],
    [
      ['7', 'Excellent', 'Comprehensive conceptual mastery. Arguments are nuanced, logically structured, and thoroughly accurate.'],
      ['5 - 6', 'Good', 'Sound understanding of key principles. Clear reasoning with minor inaccuracies or slight omissions.'],
      ['3 - 4', 'Satisfactory', 'Basic conceptual grasp. Responses are partially developed but exhibit noticeable factual or analytical gaps.'],
      ['1 - 2', 'Needs Improvement', 'Very limited comprehension. Superficial treatment, substantial inaccuracies, and weak reasoning.'],
      ['0', 'No Credit', 'Blank submission, completely irrelevant content, or response failing to address the question.'],
    ],
    [45, 105, 355]
  );

  drawHeading1('5. Evaluator Moderation Cockpit & Workflow');
  drawParagraph(
    'A central design pillar is "Human-in-the-Loop" verification. The evaluation interface is constructed as a high-density, full-viewport dashboard ' +
    'that equips teachers and examination moderators with comprehensive review tools:'
  );

  drawBullet('Live Dynamic Matrix Grid', 'Multi-column table displaying Student IDs, individual question score chips, total marks, percentage, and performance status.');
  drawBullet('Interactive Score Adjustment', 'Teachers can click any question mark input to override scores. Overall totals, percentages, and grade bands recalculate in real time.');
  drawBullet('Split-Pane Audit Drawer', 'Expanding any student row reveals question-by-question qualitative feedback alongside the original PaddleOCR raw text stream.');
  drawBullet('Cohort Analytics Strip', 'Top-level KPIs calculate real-time Class Mean (%), Pass Rate (>=50%), and Distinction Rate (>=85%) across the current batch.');
  drawBullet('One-Click Grade Export', 'Generates institutional-grade Excel (.xlsx) workbooks and CSV files formatted for school information systems (SIS).');

  drawHeading1('6. API Architecture & Endpoint Contracts');
  drawParagraph(
    'The system exposes modular REST route handlers designed for scalability and minimal overhead:'
  );

  drawBullet('POST /api/ocr/submit', 'Accepts multipart/form-data PDF file; queues asynchronous PaddleOCR-VL task; returns { jobId: string }.');
  drawBullet('GET /api/ocr/poll?jobId={id}', 'Queries job progress; returns { state: "running" | "done", ocrText: string, totalPages, extractedPages }.');
  drawBullet('POST /api/evaluate', 'Receives { studentId, ocrText }; invokes reasoning model with IB prompt schema; returns structured question array, totals, and band.');
  drawBullet('GET /api/sample-pdfs', 'Provides pre-compiled benchmark answer sheets in Base64 for instant end-to-end demonstration.');

  drawHeading1('7. Verification Dataset & Benchmark Results');
  drawParagraph(
    'The system includes a pre-packaged verification dataset consisting of three distinct student performance cohorts covering Biology, Physics, History, and Literature:'
  );

  drawTable(
    ['Student ID', 'Simulated Academic Profile', 'Expected Classification', 'Benchmark Output'],
    [
      ['22104567.pdf', 'Structured, coherent explanations across all prompts.', 'Distinction / Excellent', '32 / 35 Marks (91%)'],
      ['22104589.pdf', 'Brief, superficial answers with key factual gaps.', 'Satisfactory / Passing', '18 / 35 Marks (51%)'],
      ['22104601.pdf', 'Exemplary conceptual rigor and nuanced analytical depth.', 'Top Distinction (Grade 7)', '34 / 35 Marks (97%)'],
    ],
    [85, 175, 130, 115]
  );

  drawHeading1('8. Security, Integrity & Future Evolution');
  drawParagraph(
    'The architecture incorporates data privacy by design: student documents are processed in memory and never permanently stored on external database clusters. ' +
    'Future milestones on the product roadmap include:'
  );
  drawBullet('Visual Annotation Overlays', 'Rendering coordinate-accurate bounding boxes directly onto student PDF pages highlighting evaluated passages.');
  drawBullet('Multi-Moderator Blind Grading', 'Dual-evaluator scoring workflows with automatic variance flags triggering secondary senior examiner review.');
  drawBullet('LMS Connectors', 'Native LTI integrations allowing direct grade synchronization with Canvas, Blackboard, Google Classroom, and Moodle.');

  // ==========================================
  // FOOTER & PAGE NUMBERING PASS
  // ==========================================
  const totalPages = pagesList.length;
  pagesList.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${totalPages}`, {
      x: PAGE_WIDTH - MARGIN_RIGHT - 55,
      y: 22,
      size: 7.8,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawText('CONFIDENTIAL & PROPRIETARY — AI ANSWER SHEET EVALUATION SYSTEM', {
      x: MARGIN_LEFT,
      y: 22,
      size: 7,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 30 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 30 },
      thickness: 0.5,
      color: borderColor,
    });
  });

  const pdfBytes = await doc.save();
  const outputPath = path.join(process.cwd(), 'AI_Answer_Sheet_Evaluation_Project_Documentation.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Document generated successfully at: ${outputPath} (${totalPages} pages)`);
}

createDocumentationPDF().catch(console.error);
