const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createDocumentationPDF() {
  const doc = await PDFDocument.create();
  
  // Standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Corporate Palette
  const primaryColor = rgb(0.1, 0.2, 0.45);   // Deep Navy #1a3372
  const secondaryColor = rgb(0.35, 0.4, 0.5);  // Slate Gray
  const textColor = rgb(0.18, 0.2, 0.24);      // Charcoal Text
  const lightBg = rgb(0.96, 0.97, 0.99);       // Soft Tint
  const accentColor = rgb(0.2, 0.45, 0.85);    // Royal Blue
  const borderColor = rgb(0.84, 0.87, 0.92);

  const PAGE_WIDTH = 595.28;  // A4
  const PAGE_HEIGHT = 841.89; // A4
  const MARGIN = 48;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let currentPage = null;
  let cursorY = 0;
  let pageNumber = 0;
  const pagesList = [];

  function addPage() {
    currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber++;
    pagesList.push(currentPage);
    cursorY = PAGE_HEIGHT - MARGIN - 20;

    // Running Header (Pages 2+)
    if (pageNumber > 1) {
      currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System', {
        x: MARGIN,
        y: PAGE_HEIGHT - 32,
        size: 8.5,
        font: fontBold,
        color: primaryColor,
      });
      currentPage.drawText('Technical & Functional Specification', {
        x: PAGE_WIDTH - MARGIN - 145,
        y: PAGE_HEIGHT - 32,
        size: 8.5,
        font: fontRegular,
        color: secondaryColor,
      });
      currentPage.drawLine({
        start: { x: MARGIN, y: PAGE_HEIGHT - 38 },
        end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 38 },
        thickness: 0.6,
        color: borderColor,
      });
    }
    return currentPage;
  }

  function checkSpace(neededHeight) {
    if (cursorY - neededHeight < MARGIN + 25) {
      addPage();
    }
  }

  function drawHeading1(text) {
    checkSpace(40);
    cursorY -= 12;
    currentPage.drawRectangle({
      x: MARGIN,
      y: cursorY - 3,
      width: 3.5,
      height: 16,
      color: primaryColor,
    });
    currentPage.drawText(text, {
      x: MARGIN + 10,
      y: cursorY,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 18;
  }

  function drawHeading2(text) {
    checkSpace(28);
    cursorY -= 6;
    currentPage.drawText(text, {
      x: MARGIN,
      y: cursorY,
      size: 10.5,
      font: fontBold,
      color: primaryColor,
    });
    cursorY -= 14;
  }

  function drawParagraph(text, options = {}) {
    const size = options.size || 9.5;
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
        checkSpace(lineHeight);
        currentPage.drawText(currentLine, {
          x: MARGIN + indent,
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
      checkSpace(lineHeight);
      currentPage.drawText(currentLine, {
        x: MARGIN + indent,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= lineHeight;
    }
    cursorY -= 3;
  }

  function drawBullet(title, text) {
    checkSpace(20);
    currentPage.drawCircle({
      x: MARGIN + 6,
      y: cursorY + 3.5,
      size: 2,
      color: accentColor,
    });
    
    const prefix = title ? `${title}: ` : '';
    const fullText = prefix + text;
    
    const words = fullText.split(' ');
    let currentLine = '';
    const size = 9.5;
    const lineHeight = 13.5;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, size);
      if (width > (CONTENT_WIDTH - 18) && currentLine) {
        checkSpace(lineHeight);
        currentPage.drawText(currentLine, {
          x: MARGIN + 16,
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
      checkSpace(lineHeight);
      currentPage.drawText(currentLine, {
        x: MARGIN + 16,
        y: cursorY,
        size,
        font: fontRegular,
        color: textColor,
      });
      cursorY -= lineHeight;
    }
    cursorY -= 2;
  }

  function drawCallout(title, text) {
    const rawLines = text.split('\n');
    const size = 9;
    const lines = [];

    rawLines.forEach(rLine => {
      const words = rLine.split(' ');
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (fontRegular.widthOfTextAtSize(test, size) > CONTENT_WIDTH - 24 && cur) {
          lines.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
    });

    const boxHeight = 18 + (lines.length * 12);
    checkSpace(boxHeight + 8);

    currentPage.drawRectangle({
      x: MARGIN,
      y: cursorY - boxHeight + 8,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: lightBg,
      borderColor: borderColor,
      borderWidth: 0.8,
    });

    currentPage.drawLine({
      start: { x: MARGIN, y: cursorY + 8 },
      end: { x: MARGIN, y: cursorY - boxHeight + 8 },
      thickness: 3.5,
      color: primaryColor,
    });

    let boxY = cursorY - 2;
    if (title) {
      currentPage.drawText(title, {
        x: MARGIN + 12,
        y: boxY,
        size: 9.5,
        font: fontBold,
        color: primaryColor,
      });
      boxY -= 12;
    }

    for (const line of lines) {
      currentPage.drawText(line, {
        x: MARGIN + 12,
        y: boxY,
        size: 9,
        font: fontRegular,
        color: textColor,
      });
      boxY -= 12;
    }

    cursorY = cursorY - boxHeight - 4;
  }

  function drawTable(headers, rows, colWidths) {
    const rowHeight = 18;
    const headerHeight = 20;
    const totalHeight = headerHeight + (rows.length * rowHeight);
    checkSpace(totalHeight + 8);

    // Table Header
    currentPage.drawRectangle({
      x: MARGIN,
      y: cursorY - headerHeight + 10,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: primaryColor,
    });

    let currentX = MARGIN;
    headers.forEach((header, idx) => {
      currentPage.drawText(header, {
        x: currentX + 6,
        y: cursorY - 2,
        size: 8.5,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      currentX += colWidths[idx];
    });

    cursorY -= headerHeight;

    // Table Rows
    rows.forEach((row, rowIdx) => {
      const isEven = rowIdx % 2 === 0;
      currentPage.drawRectangle({
        x: MARGIN,
        y: cursorY - rowHeight + 10,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: isEven ? rgb(1, 1, 1) : lightBg,
        borderColor,
        borderWidth: 0.5,
      });

      let colX = MARGIN;
      row.forEach((cell, cellIdx) => {
        currentPage.drawText(String(cell), {
          x: colX + 6,
          y: cursorY - 1,
          size: 8.5,
          font: fontRegular,
          color: textColor,
        });
        colX += colWidths[cellIdx];
      });

      cursorY -= rowHeight;
    });

    cursorY -= 8;
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
    x: MARGIN,
    y: PAGE_HEIGHT - 45,
    size: 9.5,
    font: fontBold,
    color: rgb(0.75, 0.85, 1),
  });

  currentPage.drawText('AI-Based Bulk Answer Sheet Evaluation System', {
    x: MARGIN,
    y: PAGE_HEIGHT - 70,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  currentPage.drawText('Automated Ingestion, OCR Layout Parsing & IB Criterion-Based Grading', {
    x: MARGIN,
    y: PAGE_HEIGHT - 90,
    size: 10,
    font: fontRegular,
    color: rgb(0.9, 0.93, 1),
  });

  cursorY = PAGE_HEIGHT - 135;

  drawCallout('Executive Overview',
    'Application Domain: Educational Assessment & Academic Examination Grading\n' +
    'Standards Model: International Baccalaureate (IB) 0-7 Mark Band Rubric\n' +
    'Key Technologies: Next.js 14 App Router, PaddleOCR-VL Engine, Advanced LLM Reasoning\n' +
    'Capabilities: Bulk Ingestion, Auto Question Segmentation, Live Mark Overrides, Excel/CSV Export'
  );

  drawHeading1('1. Problem Statement & Solution Overview');
  drawParagraph(
    'High-volume examination evaluation is inherently resource-intensive, prone to grader fatigue, and subject to inter-evaluator variance. ' +
    'Manual review of handwritten scripts often introduces grading inconsistencies across large student cohorts.'
  );
  drawParagraph(
    'This system introduces an automated, end-to-end evaluation pipeline that ingests multiple student answer sheet PDFs, transcribes mixed handwritten ' +
    'and printed text, isolates individual question responses, and generates criterion-based scores and formative feedback adhering strictly to IB rubric standards.'
  );

  drawHeading2('Core Functional Capabilities');
  drawBullet('Bulk Document Ingestion', 'Accepts batch uploads of answer sheets with automatic extraction of Student IDs from file metadata.');
  drawBullet('Specialized Handwriting & Layout OCR', 'Employs layout-aware OCR to parse multi-column, handwritten, and diagram-adjacent exam scripts.');
  drawBullet('Autonomous Question Segmentation', 'Identifies and separates responses across distinct questions without requiring pre-formatted OMR templates.');
  drawBullet('IB Assessment Alignment', 'Evaluates responses across standard IB criteria, assigning integer marks from 0 to 7 per question.');
  drawBullet('Evaluator Moderation & Export', 'Empowers academic staff with full review controls, inline mark adjustments, and exportable grade sheets.');

  // ==========================================
  // PAGE 2: ARCHITECTURAL PIPELINE & SCORING
  // ==========================================
  addPage();

  drawHeading1('2. System Architecture & Processing Pipeline');
  drawParagraph(
    'The platform operates on a decoupled 3-tier processing pipeline engineered for high availability and low latency:'
  );

  drawCallout('Pipeline Architecture Flow',
    '1. Ingestion Layer: Client queues files -> Submits PDF to OCR job queue -> Receives Job Token.\n' +
    '2. Transcription Layer: Polling service queries job state -> Retrieves structured JSONL markdown text upon completion.\n' +
    '3. Reasoning & Scoring Layer: OCR text is processed by LLM reasoning models -> Produces criteria marks, feedback, and summary statistics.'
  );

  drawHeading2('System Component Breakdown');
  drawTable(
    ['Component', 'Technology', 'Role / Functional Rationale'],
    [
      ['Application Framework', 'Next.js 14 (App Router)', 'Full-stack responsive UI and serverless API route handlers'],
      ['Type System', 'TypeScript 5', 'Rigorous data models for exam results, marks, and rubric items'],
      ['OCR Parsing Core', 'PaddleOCR-VL Engine', 'Specialized extraction of handwritten answers and printed questions'],
      ['Reasoning Engine', 'LLM Reasoning Core', 'Contextual evaluation, question isolation, and rubric alignment'],
      ['Report Generator', 'SheetJS (xlsx)', 'Formatted Excel spreadsheet and CSV grade report exports'],
    ],
    [115, 140, 240]
  );

  drawHeading1('3. International Baccalaureate (IB) Assessment Rubric');
  drawParagraph(
    'Each extracted question is evaluated against the standardized IB 0–7 mark band rubric:'
  );

  drawTable(
    ['Mark Band', 'Descriptor Level', 'Academic Criteria Definition'],
    [
      ['7', 'Excellent', 'Comprehensive conceptual mastery; thorough, nuanced, and precise reasoning.'],
      ['5 - 6', 'Good', 'Sound conceptual understanding; clear arguments with minor omissions.'],
      ['3 - 4', 'Satisfactory', 'Basic understanding; partial explanations with notable analytical gaps.'],
      ['1 - 2', 'Needs Improvement', 'Very limited grasp; superficial coverage and substantial factual inaccuracies.'],
      ['0', 'No Credit', 'Blank answer, irrelevant material, or completely incorrect response.'],
    ],
    [55, 115, 325]
  );

  // ==========================================
  // PAGE 3: EVALUATOR WORKFLOW & VERIFICATION
  // ==========================================
  addPage();

  drawHeading1('4. Evaluator Moderation & Interface Design');
  drawParagraph(
    'The application provides an enterprise evaluation cockpit designed for rapid review and verification:'
  );

  drawBullet('Live Score Adjustment', 'Teachers can click any question score input to override marks. Totals, percentages, and performance bands recalculate instantly.');
  drawBullet('Transcript Audit Drawer', 'Each student record expands into a split view comparing AI feedback against the raw OCR transcript stream.');
  drawBullet('Classroom Analytics Strip', 'Displays high-level KPIs including Class Mean Percentage, Pass Rate, and Distinction Rate.');
  drawBullet('Multi-format Grade Export', 'Generates clean, administrative-ready Excel and CSV reports with complete student performance breakdowns.');

  drawHeading1('5. Benchmark Verification Dataset');
  drawParagraph(
    'The system incorporates a pre-packaged benchmark dataset representing three distinct student achievement tiers:'
  );

  drawTable(
    ['Student Record', 'Performance Profile', 'Expected Classification', 'Standard Benchmark'],
    [
      ['22104567.pdf', 'Detailed, structured academic responses', 'Distinction / Excellent', '32 / 35 (91%)'],
      ['22104589.pdf', 'Brief, high-level summary answers', 'Satisfactory / Passing', '18 / 35 (51%)'],
      ['22104601.pdf', 'Exemplary mastery across all disciplines', 'Top Distinction (Grade 7)', '34 / 35 (97%)'],
    ],
    [90, 165, 135, 105]
  );

  drawHeading1('6. Conclusion & Operational Roadmap');
  drawParagraph(
    'The AI-Based Bulk Answer Sheet Evaluation System provides a robust foundation for modern automated educational assessment. ' +
    'Future milestones include visual annotation overlays directly on original PDF pages, multi-examiner blind-marking reconciliation, ' +
    'and direct LMS integration with Google Classroom and Canvas.'
  );

  // ==========================================
  // ADD PAGE NUMBERS & FOOTERS
  // ==========================================
  const totalPages = pagesList.length;
  pagesList.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${totalPages}`, {
      x: PAGE_WIDTH - MARGIN - 55,
      y: 24,
      size: 8,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawText('AI-BASED BULK ANSWER SHEET EVALUATION SYSTEM — TECHNICAL SPECIFICATION', {
      x: MARGIN,
      y: 24,
      size: 7,
      font: fontRegular,
      color: secondaryColor,
    });
    page.drawLine({
      start: { x: MARGIN, y: 32 },
      end: { x: PAGE_WIDTH - MARGIN, y: 32 },
      thickness: 0.5,
      color: borderColor,
    });
  });

  const pdfBytes = await doc.save();
  const outputPath = path.join(process.cwd(), 'AI_Answer_Sheet_Evaluation_Project_Documentation.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Document generated successfully at: ${outputPath}`);
}

createDocumentationPDF().catch(console.error);
