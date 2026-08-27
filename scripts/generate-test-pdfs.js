// Generate sample answer sheet PDFs for testing
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const students = [
  {
    filename: '22104567.pdf',
    answers: [
      { q: 'Q1. Explain the process of cellular respiration.', a: 'Cellular respiration is the process by which cells break down glucose to produce ATP energy. It occurs in three main stages: glycolysis in the cytoplasm, the Krebs cycle in the mitochondrial matrix, and the electron transport chain on the inner mitochondrial membrane. Glycolysis converts glucose into two molecules of pyruvate, producing 2 ATP and 2 NADH. The Krebs cycle further breaks down pyruvate, producing CO2, NADH, FADH2, and 2 ATP. The electron transport chain uses NADH and FADH2 to generate approximately 34 ATP through oxidative phosphorylation.' },
      { q: 'Q2. What is Newton\'s Second Law of Motion?', a: 'Newton\'s Second Law states that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass. Mathematically, F = ma, where F is force in Newtons, m is mass in kilograms, and a is acceleration in m/s². This means that a larger force produces greater acceleration, while a larger mass requires more force for the same acceleration.' },
      { q: 'Q3. Describe the causes of the French Revolution.', a: 'The French Revolution of 1789 was caused by several interconnected factors. Economic crisis due to France\'s debt from wars, including support for the American Revolution, led to heavy taxation on the Third Estate. Social inequality between the Three Estates created resentment. Enlightenment ideas promoted concepts of liberty and equality. Poor harvests in 1788 caused bread shortages and rising prices. The weak leadership of King Louis XVI failed to address growing tensions.' },
      { q: 'Q4. Explain photosynthesis.', a: 'Photosynthesis is the process by which plants convert light energy into chemical energy. The overall equation is 6CO2 + 6H2O -> C6H12O6 + 6O2. It occurs in chloroplasts through two stages: light-dependent reactions in the thylakoid membranes produce ATP and NADPH using water and sunlight, releasing oxygen. The Calvin cycle in the stroma uses ATP and NADPH to fix CO2 into glucose.' },
      { q: 'Q5. Analyze the themes in Shakespeare\'s Hamlet.', a: 'Hamlet explores several major themes including revenge, mortality, and moral corruption. The central conflict revolves around Hamlet\'s duty to avenge his father\'s murder versus his moral hesitation. The theme of appearance vs reality is shown through the play-within-a-play. Mortality is explored through the famous "To be or not to be" soliloquy and the graveyard scene with Yorick\'s skull.' },
    ],
  },
  {
    filename: '22104589.pdf',
    answers: [
      { q: 'Q1. Explain the process of cellular respiration.', a: 'Cellular respiration makes energy from food. It happens in the mitochondria. Glucose is broken down into ATP. There are some steps involved like glycolysis.' },
      { q: 'Q2. What is Newton\'s Second Law of Motion?', a: 'F = ma. Force equals mass times acceleration. If you push something harder it goes faster. Heavier things are harder to move.' },
      { q: 'Q3. Describe the causes of the French Revolution.', a: 'The French Revolution happened because people were unhappy with the king. There was not enough food. The rich people did not pay taxes. It started in 1789.' },
      { q: 'Q4. Explain photosynthesis.', a: 'Plants use sunlight to make food. They take in carbon dioxide and water and produce glucose and oxygen. This happens in the leaves. Chlorophyll is the green pigment that captures light.' },
      { q: 'Q5. Analyze the themes in Shakespeare\'s Hamlet.', a: 'Hamlet is about a prince who wants revenge for his father. The main theme is revenge. Hamlet talks about death in the famous soliloquy.' },
    ],
  },
  {
    filename: '22104601.pdf',
    answers: [
      { q: 'Q1. Explain the process of cellular respiration.', a: 'Cellular respiration is a metabolic pathway that breaks down glucose and produces ATP. The process includes glycolysis (2 ATP, cytoplasm), pyruvate oxidation, the Krebs cycle (2 ATP, mitochondrial matrix), and oxidative phosphorylation via the electron transport chain (approximately 34 ATP). Overall: C6H12O6 + 6O2 -> 6CO2 + 6H2O + ~38 ATP. Both aerobic and anaerobic pathways exist, with fermentation occurring without oxygen.' },
      { q: 'Q2. What is Newton\'s Second Law of Motion?', a: 'The second law establishes that F_net = ma, meaning the net force on an object equals its mass multiplied by acceleration. This is a vector equation - force and acceleration share the same direction. Applications include calculating tension, normal force, and friction in free-body diagrams. The law implies that in the absence of net force, an object maintains constant velocity (connecting to the First Law).' },
      { q: 'Q3. Describe the causes of the French Revolution.', a: 'Multiple interconnected causes: (1) Financial crisis from wars and royal extravagance leading to national bankruptcy. (2) Social inequality - the rigid Estates system where the Third Estate bore taxation. (3) Enlightenment philosophy challenging divine right of kings - Voltaire, Rousseau, Montesquieu. (4) Agricultural failure and bread crisis of 1788-89. (5) American Revolution as an inspirational precedent. (6) Political deadlock in the Estates-General leading to the Tennis Court Oath.' },
      { q: 'Q4. Explain photosynthesis.', a: 'Photosynthesis converts light energy to chemical energy in chloroplasts. Light-dependent reactions: water is split (photolysis) at Photosystem II, electrons pass through the electron transport chain to Photosystem I, producing ATP via chemiosmosis and NADPH. Oxygen is released as a byproduct. Light-independent reactions (Calvin Cycle): CO2 is fixed by RuBisCO, reduced using ATP and NADPH to produce G3P, which forms glucose. Overall: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.' },
      { q: 'Q5. Analyze the themes in Shakespeare\'s Hamlet.', a: 'Major themes: (1) Revenge and justice - Hamlet\'s moral struggle between duty and ethics, contrasted with Laertes\' impulsive vengeance. (2) Appearance vs. reality - Claudius\'s false kingship, Hamlet\'s feigned madness, the Mousetrap play. (3) Mortality and existentialism - "To be or not to be" soliloquy, graveyard meditation on Yorick. (4) Corruption and decay - the "something rotten in the state of Denmark" metaphor extending through political and moral decay. (5) Inaction and procrastination - Hamlet\'s tragic flaw of overthinking prevents decisive action.' },
    ],
  },
];

async function generatePDF(student) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 11;
  const lineHeight = 16;
  const margin = 50;
  
  let page = doc.addPage([595, 842]); // A4
  let y = 792;
  
  // Header
  page.drawText(`Student ID: ${student.filename.replace('.pdf', '')}`, {
    x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0),
  });
  y -= 20;
  page.drawText('IB Examination - General Paper', {
    x: margin, y, size: 12, font, color: rgb(0.3, 0.3, 0.3),
  });
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 25;
  
  for (const item of student.answers) {
    // Question
    const qLines = wrapText(item.q, font, fontSize, 495);
    for (const line of qLines) {
      if (y < 60) { page = doc.addPage([595, 842]); y = 792; }
      page.drawText(line, { x: margin, y, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
    y -= 4;
    
    // Answer
    const aLines = wrapText(item.a, font, fontSize, 485);
    for (const line of aLines) {
      if (y < 60) { page = doc.addPage([595, 842]); y = 792; }
      page.drawText(line, { x: margin + 10, y, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
      y -= lineHeight;
    }
    y -= 20;
  }
  
  const bytes = await doc.save();
  const outDir = path.join(__dirname, '..', 'test-pdfs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, student.filename);
  fs.writeFileSync(outPath, bytes);
  console.log(`Created: ${outPath}`);
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

(async () => {
  for (const s of students) {
    await generatePDF(s);
  }
  console.log('\\nDone! Test PDFs created in test-pdfs/ directory.');
})();
