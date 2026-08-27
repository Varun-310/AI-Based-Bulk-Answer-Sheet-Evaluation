const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createDocumentationPDF() {
  const doc = await PDFDocument.create();
  
  // Standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Elegant Executive Color Palette
  const primaryColor = rgb(0.12, 0.22, 0.45);   // Deep Navy #1e3873
  const secondaryColor = rgb(0.4, 0.45, 0.52);   // Slate Gray
  const textColor = rgb(0.2, 0.22, 0.26);       // Soft Charcoal
  const lightBg = rgb(0.97, 0.98, 0.995);       // Very subtle tint
  const headerBg = rgb(0.15, 0.26, 0.52);       // Table header
  const accentColor = rgb(0.25, 0.45, 0.85);    // Royal Blue
  const borderColor = rgb(0.85, 0.88, 0.92);

  const PAGE_WIDTH = 595.28;  // A4
  const PAGE_HEIGHT = 841.89; // A4
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
      currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System', {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 30,
        size: 8.5,
        font: fontBold,
        color: primaryColor,
      });
      currentPage.drawText('Technical & Functional Specification', {
        x: PAGE_WIDTH - MARGIN_RIGHT - 145,
        y: PAGE_HEIGHT - 30,
        size: 8.5,
        font: fontRegular,
        color: secondaryColor,
      });
      currentPage.drawLine({
        start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 36 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 36 },
        thickness: 0.5,
        color: borderColor,
      });
      cursorY = PAGE_HEIGHT - MARGIN_TOP - 10;
    }
    return currentPage;
  }

  function ensureSpace(neededHeight) {
    if (!currentPage || cursorY - neededHeight < MARGIN_BOTTOM + 20) {
      addPage();
    }
  }

  function drawHeading1(text) {
    ensureSpace(42);
    cursorY -= 14;
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - 3,
      width: 3.5,
      height: 16,
      color: primaryColor,
    });
    currentPage.drawText(text, {
      x: MARGIN_LEFT + 10,
      y: cursorY,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 20;
  }

  function drawHeading2(text) {
    ensureSpace(30);
    cursorY -= 8;
    currentPage.drawText(text, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: 10.5,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 16;
  }

  function drawParagraph(text, options = {}) {
    const size = options.size || 9.5;
    const font = options.font || fontRegular;
    const color = options.color || textColor;
    const indent = options.indent || 0;
    const maxWidth = options.maxWidth || (CONTENT_WIDTH - indent);
    const lineHeight = options.lineHeight || 14;

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
    ensureSpace(22);
    currentPage.drawCircle({
      x: MARGIN_LEFT + 6,
      y: cursorY + 3.5,
      size: 2,
      color: accentColor,
    });
    
    const prefix = title ? `${title}: ` : '';
    const fullText = prefix + text;
    
    const words = fullText.split(' ');
    let currentLine = '';
    const size = 9.2;
    const lineHeight = 13.5;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, size);
      if (width > (CONTENT_WIDTH - 18) && currentLine) {
        ensureSpace(lineHeight);
        currentPage.drawText(currentLine, {
          x: MARGIN_LEFT + 16,
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
        x: MARGIN_LEFT + 16,
        y: cursorY,
        size,
        font: fontRegular,
        color: textColor,
      });
      cursorY -= lineHeight;
    }
    cursorY -= 3;
  }

  function drawCallout(title, linesArray) {
    const size = 9;
    const lineHeight = 13;
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

    const boxHeight = 20 + (formattedLines.length * lineHeight);
    ensureSpace(boxHeight + 10);

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - boxHeight + 8,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: lightBg,
      borderColor: borderColor,
      borderWidth: 0.8,
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
        size: 9.5,
        font: fontBold,
        color: primaryColor,
      });
      boxY -= 13;
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
  function wrapCellText(text, maxWidth, size = 8.5) {
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(test, size);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
  }

  function drawTable(headers, rows, colWidths) {
    const fontSize = 8.5;
    const cellLineHeight = 11.5;
    const cellPaddingX = 8;
    const cellPaddingY = 6;
    const headerHeight = 22;

    // Calculate dynamic row heights based on wrapped text content
    const rowCalculations = rows.map(row => {
      let maxLinesInRow = 1;
      const wrappedCells = row.map((cell, colIdx) => {
        const availableWidth = colWidths[colIdx] - (cellPaddingX * 2);
        const lines = wrapCellText(cell, availableWidth, fontSize);
        if (lines.length > maxLinesInRow) maxLinesInRow = lines.length;
        return lines;
      });
      const dynamicRowHeight = Math.max(22, (maxLinesInRow * cellLineHeight) + (cellPaddingY * 2));
      return { dynamicRowHeight, wrappedCells };
    });

    const totalTableHeight = headerHeight + rowCalculations.reduce((sum, r) => sum + r.dynamicRowHeight, 0);
    ensureSpace(Math.min(totalTableHeight, 180));

    // Draw Header
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - headerHeight + 10,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: headerBg,
    });

    let currentX = MARGIN_LEFT;
    headers.forEach((header, idx) => {
      currentPage.drawText(header, {
        x: currentX + cellPaddingX,
        y: cursorY - 2,
        size: 8.5,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      currentX += colWidths[idx];
    });

    cursorY -= headerHeight;

    // Draw Rows with proper wrapped heights
    rowCalculations.forEach((calc, rowIdx) => {
      ensureSpace(calc.dynamicRowHeight + 5);

      const isEven = rowIdx % 2 === 0;
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: cursorY - calc.dynamicRowHeight + 10,
        width: CONTENT_WIDTH,
        height: calc.dynamicRowHeight,
        color: isEven ? rgb(1, 1, 1) : lightBg,
        borderColor,
        borderWidth: 0.5,
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

    cursorY -= 10;
  }

  // ==========================================
  // PAGE 1: TITLE & EXECUTIVE SUMMARY
  // ==========================================
  addPage();

  // Top Header Banner
  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 110,
    width: PAGE_WIDTH,
    height: 110,
    color: primaryColor,
  });

  currentPage.drawText('TECHNICAL & FUNCTIONAL DOCUMENTATION', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 45,
    size: 9.5,
    font: fontBold,
    color: rgb(0.75, 0.85, 1),
  });

  currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 70,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  currentPage.drawText('Automated Ingestion, OCR Layout Parsing & IB Criterion-Based Grading', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 90,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.9, 0.93, 1),
  });

  cursorY = PAGE_HEIGHT - 135;

  drawCallout('Executive Overview', [
    'System: End-to-End Automated Answer Sheet Evaluation Platform',
    'Standard: International Baccalaureate (IB) 0-7 Mark Band Rubric Compliance',
    'Engine Pipeline: Next.js 14 App Router -> PaddleOCR-VL Core -> LLM Reasoning',
    'Capabilities: Bulk Ingestion, Auto-Segmentation, Live Moderation, Excel/CSV Export'
  ]);

  drawHeading1('1. Problem Statement & Solution Overview');
  drawParagraph(
    'Evaluating academic examination scripts in bulk presents severe logistical bottlenecks, grader fatigue, and scoring variances. ' +
    'Manual evaluation of handwritten answers across large student cohorts leads to subjective grading and prolonged grading turnaround. ' +
    'Traditional template-based OMR scanners cannot process subjective, open-ended handwritten responses.'
  );
  drawParagraph(
    'This platform implements a cloud-native automated evaluation workflow that accepts student PDF answer sheets in bulk, ' +
    'extracts handwritten and printed text using advanced multimodal OCR (PaddleOCR-VL), identifies question boundaries automatically, ' +
    'and scores student responses using standardized International Baccalaureate (IB) criterion mark bands with full evaluator moderation.'
  );

  drawHeading2('Core Functional Capabilities');
  drawBullet('Bulk Document Ingestion', 'Batch upload of PDF answer sheets with automatic Student ID extraction from filenames.');
  drawBullet('Mixed-Script Layout OCR', 'High-accuracy parsing of printed question headers and student handwriting.');
  drawBullet('Autonomous Question Segmentation', 'Segments individual question answers (Q1..Qn) without requiring rigid pre-printed templates.');
  drawBullet('IB Assessment Alignment', 'Scores each question on the standardized 0-7 mark band with constructive feedback.');
  drawBullet('Teacher Moderation Cockpit', 'Interactive full-width matrix permitting live score adjustments and Excel/CSV grade exports.');

  // ==========================================
  // PAGE 2: ARCHITECTURAL PIPELINE & SCORING
  // ==========================================
  addPage();

  drawHeading1('2. System Architecture & Processing Pipeline');
  drawParagraph(
    'To guarantee high availability and eliminate cloud serverless execution timeouts, the system utilizes a decoupled asynchronous processing architecture:'
  );

  drawCallout('Decoupled 3-Stage Pipeline', [
    'Stage 1 (Ingestion): Client uploads PDF -> API queues task in PaddleOCR-VL -> Returns Job Token.',
    'Stage 2 (Transcription): Client polls /api/ocr/poll every 3s -> Downloads and merges parsed JSONL markdown.',
    'Stage 3 (Scoring): OCR text is sent to the reasoning engine -> Returns structured question marks and rationale.'
  ]);

  drawHeading2('Technology Stack Matrix');
  drawTable(
    ['Layer', 'Technology', 'Role / Functional Rationale'],
    [
      ['Frontend Framework', 'Next.js 14 (App Router)', 'Full-stack responsive UI, edge routing, serverless API routes.'],
      ['Type System', 'TypeScript 5', 'Rigorous typing for exam data, question models, and API schemas.'],
      ['OCR Parsing Core', 'PaddleOCR-VL-1.6', 'Specialized extraction of handwritten scripts and printed exam prompts.'],
      ['Reasoning LLM', 'High-Capacity Reasoning Core', 'Contextual evaluation, question isolation, and structured scoring.'],
      ['Report Generation', 'SheetJS (xlsx)', 'Client-side generation of administrative grade workbooks (.xlsx) and CSVs.'],
    ],
    [120, 140, 239]
  );

  drawHeading1('3. International Baccalaureate (IB) Assessment Rubric');
  drawParagraph(
    'Each identified response is evaluated against formal International Baccalaureate (IB) assessment principles on a 0-7 integer scale:'
  );

  drawTable(
    ['Mark Band', 'Descriptor Level', 'Academic Competency & Criteria Descriptor'],
    [
      ['7', 'Excellent', 'Comprehensive conceptual mastery. Nuanced analysis, logical structure, and thorough accuracy.'],
      ['5 - 6', 'Good', 'Sound conceptual understanding. Clear reasoning with minor inaccuracies or slight omissions.'],
      ['3 - 4', 'Satisfactory', 'Basic understanding. Responses are partially developed with noticeable factual or analytical gaps.'],
      ['1 - 2', 'Needs Improvement', 'Very limited grasp. Superficial treatment, substantial inaccuracies, and weak reasoning.'],
      ['0', 'No Credit', 'Blank submission, completely irrelevant content, or response failing to address the question.'],
    ],
    [65, 110, 324]
  );

  // ==========================================
  // PAGE 3: EVALUATOR WORKFLOW & VERIFICATION
  // ==========================================
  addPage();

  drawHeading1('4. Evaluator Moderation & Interface Design');
  drawParagraph(
    'The evaluation interface is engineered as an enterprise moderation cockpit that combines automated grading speed with complete human oversight:'
  );

  drawBullet('Live Dynamic Matrix Grid', 'Multi-column table displaying Student IDs, individual question score chips, total marks, percentage, and performance status.');
  drawBullet('Interactive Score Adjustment', 'Teachers can click any question mark input to override scores. Overall totals, percentages, and grade bands recalculate in real time.');
  drawBullet('Split-Pane Audit Drawer', 'Expanding any student row reveals question-by-question qualitative feedback alongside the original PaddleOCR raw text stream.');
  drawBullet('Cohort Analytics Strip', 'Top-level KPIs calculate real-time Class Mean (%), Pass Rate (>=50%), and Distinction Rate (>=85%) across the current batch.');
  drawBullet('One-Click Grade Export', 'Generates institutional-grade Excel (.xlsx) workbooks and CSV files formatted for school information systems (SIS).');

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
    page.drawText('AI-BASED BULK ANSWER SHEET EVALUATION SYSTEM — TECHNICAL SPECIFICATION', {
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
