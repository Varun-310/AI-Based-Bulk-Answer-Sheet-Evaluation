const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createDocumentationPDF() {
  const doc = await PDFDocument.create();
  
  // Standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Official Report Color Scheme
  const primaryColor = rgb(0.12, 0.22, 0.44);   // Navy #1f3870
  const secondaryColor = rgb(0.42, 0.46, 0.52); // Slate Gray #6b7584
  const textColor = rgb(0.18, 0.2, 0.24);       // Charcoal #2e333d
  const lightBg = rgb(0.97, 0.98, 0.995);       // Soft Tint
  const tableHeaderBg = rgb(0.14, 0.25, 0.5);   // Table Header Navy
  const accentColor = rgb(0.24, 0.46, 0.86);    // Accent Blue
  const borderColor = rgb(0.85, 0.88, 0.92);

  const PAGE_WIDTH = 595.28;  // A4 Width
  const PAGE_HEIGHT = 841.89; // A4 Height
  const MARGIN_LEFT = 48;
  const MARGIN_RIGHT = 48;
  const MARGIN_TOP = 48;
  const MARGIN_BOTTOM = 48;
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
      currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System Document', {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 28,
        size: 8.5,
        font: fontBold,
        color: primaryColor,
      });
      currentPage.drawText('Official Technical Report', {
        x: PAGE_WIDTH - MARGIN_RIGHT - 105,
        y: PAGE_HEIGHT - 28,
        size: 8.5,
        font: fontRegular,
        color: secondaryColor,
      });
      currentPage.drawLine({
        start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 34 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 34 },
        thickness: 0.5,
        color: borderColor,
      });
      cursorY = PAGE_HEIGHT - MARGIN_TOP - 12;
    }
    return currentPage;
  }

  function ensureSpace(neededHeight) {
    if (!currentPage || cursorY - neededHeight < MARGIN_BOTTOM + 15) {
      addPage();
    }
  }

  function drawHeading1(text) {
    ensureSpace(38);
    cursorY -= 12;
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - 2.5,
      width: 3.5,
      height: 15,
      color: primaryColor,
    });
    currentPage.drawText(text, {
      x: MARGIN_LEFT + 10,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 18;
  }

  function drawHeading2(text) {
    ensureSpace(26);
    cursorY -= 6;
    currentPage.drawText(text, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 14;
  }

  function drawParagraph(text, options = {}) {
    const size = options.size || 9.2;
    const font = options.font || fontRegular;
    const color = options.color || textColor;
    const indent = options.indent || 0;
    const maxWidth = options.maxWidth || (CONTENT_WIDTH - indent);
    const lineHeight = options.lineHeight || 13.5;

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
    cursorY -= 4;
  }

  function drawBullet(title, text) {
    ensureSpace(18);
    currentPage.drawCircle({
      x: MARGIN_LEFT + 5,
      y: cursorY + 3.2,
      size: 1.8,
      color: accentColor,
    });
    
    const prefix = title ? `${title}: ` : '';
    const fullText = prefix + text;
    
    const words = fullText.split(' ');
    let currentLine = '';
    const size = 9;
    const lineHeight = 13;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, size);
      if (width > (CONTENT_WIDTH - 16) && currentLine) {
        ensureSpace(lineHeight);
        currentPage.drawText(currentLine, {
          x: MARGIN_LEFT + 15,
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
        x: MARGIN_LEFT + 15,
        y: cursorY,
        size,
        font: fontRegular,
        color: textColor,
      });
      cursorY -= lineHeight;
    }
    cursorY -= 2.5;
  }

  function drawCallout(title, linesArray) {
    const size = 8.8;
    const lineHeight = 12.5;
    const formattedLines = [];

    linesArray.forEach(rawText => {
      const words = rawText.split(' ');
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (fontRegular.widthOfTextAtSize(test, size) > CONTENT_WIDTH - 24 && cur) {
          formattedLines.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) formattedLines.push(cur);
    });

    const boxHeight = 18 + (formattedLines.length * lineHeight);
    ensureSpace(boxHeight + 8);

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - boxHeight + 8,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: lightBg,
      borderColor: borderColor,
      borderWidth: 0.7,
    });

    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: cursorY + 8 },
      end: { x: MARGIN_LEFT, y: cursorY - boxHeight + 8 },
      thickness: 3.5,
      color: primaryColor,
    });

    let boxY = cursorY - 2;
    if (title) {
      currentPage.drawText(title, {
        x: MARGIN_LEFT + 12,
        y: boxY,
        size: 9.2,
        font: fontBold,
        color: primaryColor,
      });
      boxY -= 12.5;
    }

    for (const line of formattedLines) {
      currentPage.drawText(line, {
        x: MARGIN_LEFT + 12,
        y: boxY,
        size,
        font: fontRegular,
        color: textColor,
      });
      boxY -= lineHeight;
    }

    cursorY = cursorY - boxHeight - 6;
  }

  // Text-wrapping table cell helper
  function wrapCellText(text, maxWidth, size = 8.2) {
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
  }

  function drawTable(headers, rows, colWidths) {
    const fontSize = 8.2;
    const cellLineHeight = 11.2;
    const cellPaddingX = 7;
    const cellPaddingY = 5;
    const headerHeight = 20;

    // Calculate dynamic row heights based on wrapped cell contents
    const rowCalculations = rows.map(row => {
      let maxLinesInRow = 1;
      const wrappedCells = row.map((cell, colIdx) => {
        const availableWidth = colWidths[colIdx] - (cellPaddingX * 2);
        const lines = wrapCellText(cell, availableWidth, fontSize);
        if (lines.length > maxLinesInRow) maxLinesInRow = lines.length;
        return lines;
      });
      const dynamicRowHeight = Math.max(20, (maxLinesInRow * cellLineHeight) + (cellPaddingY * 2));
      return { dynamicRowHeight, wrappedCells };
    });

    const totalTableHeight = headerHeight + rowCalculations.reduce((sum, r) => sum + r.dynamicRowHeight, 0);
    ensureSpace(Math.min(totalTableHeight, 160));

    // Draw Header
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
        x: currentX + cellPaddingX,
        y: cursorY - 2,
        size: 8.2,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      currentX += colWidths[idx];
    });

    cursorY -= headerHeight;

    // Draw Rows with exact wrapped heights
    rowCalculations.forEach((calc, rowIdx) => {
      ensureSpace(calc.dynamicRowHeight + 4);

      const isEven = rowIdx % 2 === 0;
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: cursorY - calc.dynamicRowHeight + 8,
        width: CONTENT_WIDTH,
        height: calc.dynamicRowHeight,
        color: isEven ? rgb(1, 1, 1) : lightBg,
        borderColor,
        borderWidth: 0.4,
      });

      let colX = MARGIN_LEFT;
      calc.wrappedCells.forEach((lines, colIdx) => {
        let textY = cursorY - 1;
        lines.forEach(line => {
          currentPage.drawText(line, {
            x: colX + cellPaddingX,
            y: textY,
            size: fontSize,
            font: fontRegular,
            color: textColor,
          });
          textY -= cellLineHeight;
        });
        colX += colWidths[colIdx];
      });

      cursorY -= calc.dynamicRowHeight;
    });

    cursorY -= 8;
  }

  // ==========================================
  // PAGE 1
  // ==========================================
  addPage();

  // Formal Header Banner
  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 85,
    width: PAGE_WIDTH,
    height: 85,
    color: primaryColor,
  });

  currentPage.drawText('OFFICIAL TECHNICAL REPORT', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 34,
    size: 8.5,
    font: fontBold,
    color: rgb(0.75, 0.85, 1),
  });

  currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System Document', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 58,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY = PAGE_HEIGHT - 105;

  drawCallout('Executive Document Summary', [
    'System: End-to-End Automated Answer Sheet Processing & Evaluation Platform',
    'Assessment Standard: International Baccalaureate (IB) 0-7 Mark Band Rubric Compliance',
    'Architecture: Decoupled 3-Stage Asynchronous Pipeline (Ingestion -> OCR -> Reasoning)',
    'Core Deliverables: Live Evaluator Cockpit, Auto-Segmentation, Mark Overrides, Excel/CSV Export'
  ]);

  drawHeading1('1. Executive Summary & Problem Context');
  drawParagraph(
    'Evaluating academic examinations in bulk presents chronic logistical bottlenecks, evaluator fatigue, and grading inconsistencies. ' +
    'Manual evaluation across hundreds or thousands of handwritten student scripts suffers from prolonged turnaround times and subjectivity. ' +
    'Traditional template-based OMR scanners cannot parse open-ended subjective responses, multi-part questions, or unconstrained student handwriting.'
  );
  drawParagraph(
    'The AI-Based Bulk Answer Sheet Evaluation System delivers a cloud-native platform that ingests student PDF answer sheets in bulk, ' +
    'extracts handwritten and printed text using advanced multimodal OCR (PaddleOCR-VL), identifies question boundaries automatically, ' +
    'and evaluates student answers against formal International Baccalaureate (IB) assessment standards with full teacher moderation.'
  );

  drawHeading2('Core Functional Capabilities');
  drawBullet('Bulk Document Ingestion', 'Batch upload of PDF answer sheets with automatic extraction of Student IDs from file metadata.');
  drawBullet('Mixed-Script OCR Parsing', 'High-accuracy transcription of printed question headers and student handwriting in a unified pass.');
  drawBullet('Autonomous Question Segmentation', 'Identifies individual question boundaries (Q1, Q2, ..., Qn) without requiring rigid template markers.');
  drawBullet('IB Assessment Alignment', 'Generates question-by-question marks and constructive feedback using the standardized 0-7 scale.');
  drawBullet('Evaluator Moderation Cockpit', 'Interactive evaluation matrix permitting live mark adjustments, OCR verification, and grade exports.');

  // ==========================================
  // PAGE 2
  // ==========================================
  addPage();

  drawHeading1('2. System Architecture & Processing Pipeline');
  drawParagraph(
    'To guarantee high availability and eliminate cloud serverless execution timeouts, the system utilizes a decoupled asynchronous processing architecture:'
  );

  drawCallout('Decoupled 3-Stage Processing Pipeline', [
    'Stage 1 (Ingestion): Client uploads PDF -> API queues task in PaddleOCR-VL -> Returns Job Token within 1-2s.',
    'Stage 2 (Transcription): Client background worker polls /api/ocr/poll every 3s -> Downloads and merges JSONL markdown.',
    'Stage 3 (Scoring): OCR text is sent to the reasoning engine -> Returns structured question marks, critique, and totals.'
  ]);

  drawHeading2('Component Technology Stack Matrix');
  drawTable(
    ['Layer', 'Technology', 'Role / Functional Rationale'],
    [
      ['Frontend & API', 'Next.js 14 (App Router)', 'Full-stack responsive UI, edge routing, and serverless API route handlers.'],
      ['Type System', 'TypeScript 5', 'Rigorous data models for exam results, marks, and rubric items.'],
      ['OCR Parsing Core', 'PaddleOCR-VL Engine', 'Specialized layout parsing and extraction of handwritten scripts.'],
      ['Reasoning Engine', 'Advanced LLM Reasoning Core', 'Contextual answer grading, question isolation, and structured JSON scoring.'],
      ['Report Generation', 'SheetJS (xlsx)', 'Client-side generation of administrative grade workbooks (.xlsx) and CSVs.'],
    ],
    [115, 140, 244]
  );

  drawHeading1('3. International Baccalaureate (IB) Assessment Rubric');
  drawParagraph(
    'Each identified response is evaluated against formal International Baccalaureate (IB) assessment principles on an integer scale from 0 to 7:'
  );

  drawTable(
    ['Mark Band', 'Descriptor Level', 'Academic Competency & Criteria Descriptor'],
    [
      ['7', 'Excellent', 'Comprehensive conceptual mastery. Nuanced analysis, logical structure, and thorough accuracy.'],
      ['5 - 6', 'Good', 'Sound conceptual understanding. Clear reasoning with minor inaccuracies or slight omissions.'],
      ['3 - 4', 'Satisfactory', 'Basic understanding. Responses are partially developed with noticeable factual or analytical gaps.'],
      ['1 - 2', 'Needs Improvement', 'Very limited comprehension. Superficial treatment, substantial inaccuracies, and weak reasoning.'],
      ['0', 'No Credit', 'Blank submission, completely irrelevant content, or response failing to address the question.'],
    ],
    [65, 110, 324]
  );

  // ==========================================
  // PAGE 3
  // ==========================================
  addPage();

  drawHeading1('4. Evaluator Moderation & Interface Design');
  drawParagraph(
    'The evaluation interface is engineered as an enterprise moderation cockpit combining automated grading speed with complete human oversight:'
  );

  drawBullet('Live Dynamic Matrix Grid', 'Multi-column table displaying Student IDs, individual question score chips, total marks, percentage, and performance status.');
  drawBullet('Interactive Score Adjustment', 'Teachers can click any question mark input to override scores. Overall totals, percentages, and grade bands recalculate in real time.');
  drawBullet('Split-Pane Audit Drawer', 'Expanding any student row reveals question-by-question qualitative feedback alongside the original PaddleOCR raw text stream.');
  drawBullet('Cohort Analytics Strip', 'Top-level KPIs calculate real-time Class Mean (%), Pass Rate (>=50%), and Distinction Rate (>=85%) across the batch.');
  drawBullet('One-Click Grade Export', 'Generates institutional-grade Excel (.xlsx) workbooks and CSV files formatted for school information systems.');

  drawHeading1('5. Benchmark Verification Dataset');
  drawParagraph(
    'The system incorporates a pre-packaged benchmark dataset representing three distinct student achievement tiers across Biology, Physics, History, and Literature:'
  );

  drawTable(
    ['Student ID', 'Simulated Academic Profile', 'Expected Classification', 'Benchmark Output'],
    [
      ['22104567.pdf', 'Detailed, structured academic responses', 'Distinction / Excellent', '32 / 35 Marks (91%)'],
      ['22104589.pdf', 'Brief, high-level summary answers', 'Satisfactory / Passing', '18 / 35 Marks (51%)'],
      ['22104601.pdf', 'Exemplary mastery across all disciplines', 'Top Distinction (Grade 7)', '34 / 35 Marks (97%)'],
    ],
    [95, 160, 134, 110]
  );

  drawHeading1('6. Conclusion & Operational Roadmap');
  drawParagraph(
    'The AI-Based Bulk Answer Sheet Evaluation System provides a robust foundation for modern automated educational assessment. ' +
    'Future milestones on the technical roadmap include coordinate-accurate visual annotation overlays on original PDFs, ' +
    'multi-evaluator blind grading reconciliation workflows, and direct LMS synchronization with Canvas, Blackboard, and Google Classroom.'
  );

  // ==========================================
  // FOOTER & PAGE NUMBERING PASS
  // ==========================================
  const totalPages = pagesList.length;
  pagesList.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${totalPages}`, {
      x: PAGE_WIDTH - MARGIN_RIGHT - 55,
      y: 24,
      size: 8,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawText('AI-BASED BULK ANSWER SHEET EVALUATION SYSTEM DOCUMENT', {
      x: MARGIN_LEFT,
      y: 24,
      size: 7.2,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 32 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 32 },
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
