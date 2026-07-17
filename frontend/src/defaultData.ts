import { Workspace, Template } from './types';

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    name: 'Grade 10 Mathematics Standard',
    description: 'A comprehensive preset optimized for high-school math, with focus on problem-solving, formula retention, and active tracking.',
    subject: 'Mathematics',
    teachingStyle: 'Inquiry-led & Visual-Socratic',
    instructions: [
      {
        title: 'Step-by-Step Algebra Feedback',
        type: 'criteria',
        content: 'Identify operational errors versus structural concept errors. Provide positive reinforcement of the formula setup before drilling down into arithmetic calculations.'
      },
      {
        title: 'Socratic Prompting Guide',
        type: 'preference',
        content: 'Never give the final answer directly in the feedback. Ask leading questions about the next logical step (e.g., \"What should we do to both sides to isolate the variable?\").'
      }
    ],
    materialsPreset: [
      {
        name: 'Curriculum_Standard_Math_10.pdf',
        type: 'syllabus',
        size: '1.4 MB',
        tags: ['Syllabus', 'Core Curriculum']
      }
    ],
    defaultCustomFields: [
      { label: 'Tutoring Status', type: 'tag', value: 'None', visibility: true },
      { label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true }
    ]
  },
  {
    id: 'tpl-2',
    name: 'Physics Practical & Labs Rubric',
    description: 'Designed for STEM laboratory environments, offering specific marking criteria for experimental setups, observations, and error analyses.',
    subject: 'Physics',
    teachingStyle: 'Hands-on & Empirical',
    instructions: [
      {
        title: 'Experimental Bias Assessment',
        type: 'criteria',
        content: 'Look closely at student explanations of human vs. systematic error. Ensure they distinguish between precision issues and calibration offsets.'
      }
    ],
    materialsPreset: [
      {
        name: 'Lab_Report_Guidelines.docx',
        type: 'syllabus',
        size: '800 KB',
        tags: ['Lab', 'Template']
      }
    ]
  },
  {
    id: 'tpl-3',
    name: 'Exam Evaluation Rubric',
    description: 'Generic rubric for assessments, testing conceptual depth, logic sequencing, and presentation accuracy.',
    subject: 'General Assessment',
    teachingStyle: 'Evaluative & Analytical',
    instructions: [
      {
        title: 'Standard Partial Credits',
        type: 'marking',
        content: 'Award up to 40% credit for writing the correct formula, 30% for showing systematic algebraic resolution, and 30% for final answer precision.'
      }
    ],
    materialsPreset: []
  },
  {
    id: 'tpl-4',
    name: 'Custom Teaching Style Template',
    description: 'A blank canvas with standard field presets tailored for creative storytelling-style instruction across humanistic-scientific topics.',
    subject: 'Integrated Sciences',
    teachingStyle: 'Interactive Storytelling',
    instructions: [
      {
        title: 'Real-world Analogies',
        type: 'preference',
        content: 'Map scientific concepts to everyday items (e.g., using water pipes to explain cell wall permeability or electrical flow).'
      }
    ],
    materialsPreset: []
  }
];

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Grade 10 Mathematics',
    academicYear: '2025-2026',
    semester: 'Semester 2',
    subject: 'Mathematics (Algebra & Geometry)',
    teacherName: 'Elena Rostova',
    teachingStyle: 'Inquiry-led & Visual-Socratic',
    experienceLevel: 'Senior Instructor (12 Years)',
    specialNotes: 'Focusing heavily on bridging basic algebraic reasoning before diving into complex coordinate geometry this semester.',
    assessmentPreferences: 'Bi-weekly diagnostic quizzes, extensive written homework folders, final project portfolios.',
    materials: [
      {
        id: 'mat-1',
        name: 'Algebra_Syllabus_2026.pdf',
        type: 'syllabus',
        uploadDate: '2026-02-15',
        size: '1.2 MB',
        tags: ['Syllabus', 'Algebra'],
        versionHistory: [
          { version: 'v1.0', date: '2026-02-15', note: 'Initial semester release' }
        ]
      },
      {
        id: 'mat-2',
        name: 'Geometry_Textbook_Chapter_4.pdf',
        type: 'book',
        uploadDate: '2026-03-10',
        size: '5.8 MB',
        tags: ['Reference', 'Geometry'],
        versionHistory: [
          { version: 'v1.1', date: '2026-03-10', note: 'Added high-res diagram appendix' }
        ]
      },
      {
        id: 'mat-3',
        name: 'Midterm_Exam_Rubric.docx',
        type: 'syllabus',
        uploadDate: '2026-05-18',
        size: '340 KB',
        tags: ['Grading', 'Midterm'],
        versionHistory: [
          { version: 'v1.0', date: '2026-05-18', note: 'Finalized coefficients guidelines' }
        ]
      }
    ],
    instructions: [
      {
        id: 'inst-1',
        title: 'Step-by-Step Algebra Feedback',
        type: 'criteria',
        content: 'Identify operational errors versus structural concept errors. Provide positive reinforcement of the formula setup before drilling down into arithmetic calculations.'
      },
      {
        id: 'inst-2',
        title: 'Socratic Prompting Guide',
        type: 'preference',
        content: 'Never give the final answer directly in the feedback. Ask leading questions about the next logical step (e.g., \"What should we do to both sides to isolate the variable?\").'
      }
    ],
    students: [
      {
        id: 'stud-1',
        name: 'Aarav Sharma',
        rollNumber: 'M10-01',
        email: 'aarav.sharma@school.edu',
        phone: '+1 (555) 765-4321',
        address: '742 Maplewood Blvd, Apt 4B',
        parentName: 'Ramesh & Priya Sharma',
        parentContact: '+1 (555) 765-1100 (Priya)',
        parentNotes: 'Extremely supportive. Prefers weekly email alerts. Aarav wants to study robotics in college.',
        grades: [
          { id: 'g-1', assessmentName: 'Algebra Quiz 1', score: 98, maxScore: 100, date: '2026-03-01', feedback: 'Stellar work! Brilliant operational precision.' },
          { id: 'g-2', assessmentName: 'Polynomials Test', score: 95, maxScore: 100, date: '2026-04-10', feedback: 'Minor sign error in question 4, but excellent work.' },
          { id: 'g-3', assessmentName: 'Geometry Midterm', score: 92, maxScore: 100, date: '2026-05-20', feedback: 'Solid theorem proofs.' }
        ],
        attendance: 98,
        performanceIndicator: 'excellent',
        statusIndicator: 'active',
        avatarSeed: 'Aarav',
        uploads: [
          { id: 'up-1', name: 'Aarav_AlgebraQuiz1_Answers.pdf', type: 'Quiz Submission', date: '2026-03-01', status: 'graded' },
          { id: 'up-2', name: 'Aarav_Midterm_Written.pdf', type: 'Exam Submission', date: '2026-05-20', status: 'graded' }
        ],
        customFields: [
          { id: 'cf-1', label: 'Tutoring Status', type: 'tag', value: 'None Needed', visibility: true },
          { id: 'cf-2', label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true },
          { id: 'cf-3', label: 'Counselor Notes', type: 'text', value: 'Nominated for regional math olympiad.', visibility: true }
        ]
      },
      {
        id: 'stud-2',
        name: 'Sofia Patel',
        rollNumber: 'M10-02',
        email: 'sofia.patel@school.edu',
        phone: '+1 (555) 234-9876',
        address: '128 Birchwood Avenue',
        parentName: 'Vikram Patel',
        parentContact: '+1 (555) 234-1188 (Vikram)',
        parentNotes: 'Sofia is highly artistic. Struggles with math anxiety which occasionally impacts test scores.',
        grades: [
          { id: 'g-4', assessmentName: 'Algebra Quiz 1', score: 81, maxScore: 100, date: '2026-03-01', feedback: 'Concept is there, but minor equation balance issues.' },
          { id: 'g-5', assessmentName: 'Polynomials Test', score: 62, maxScore: 100, date: '2026-04-10', feedback: 'Severe learning gap identified in factoring polynomials. Let\'s schedule clinic.' },
          { id: 'g-6', assessmentName: 'Geometry Midterm', score: 55, maxScore: 100, date: '2026-05-20', feedback: 'Struggled with multi-stage coordinate geometry proofs.' }
        ],
        attendance: 78,
        performanceIndicator: 'critical',
        statusIndicator: 'needs-attention',
        avatarSeed: 'Sofia',
        uploads: [
          { id: 'up-3', name: 'Sofia_AlgebraQuiz1_Final.pdf', type: 'Quiz Submission', date: '2026-03-01', status: 'graded' },
          { id: 'up-4', name: 'Sofia_Polynomials_Revised.docx', type: 'Homework Remedial', date: '2026-04-20', status: 'graded' },
          { id: 'up-5', name: 'Sofia_GeometryMidterm_Answers.pdf', type: 'Exam Submission', date: '2026-05-20', status: 'pending' }
        ],
        customFields: [
          { id: 'cf-4', label: 'Tutoring Status', type: 'tag', value: 'Biweekly Peer Help', visibility: true },
          { id: 'cf-5', label: 'IEP Accommodation', type: 'boolean', value: 'true', visibility: true },
          { id: 'cf-6', label: 'Counselor Notes', type: 'text', value: 'Arranged extra examination time (1.5x) due to anxiety accommodations.', visibility: true }
        ]
      },
      {
        id: 'stud-3',
        name: 'Ethan Hunt',
        rollNumber: 'M10-03',
        email: 'ethan.hunt@school.edu',
        phone: '+1 (555) 890-1234',
        address: '422 Horizon Heights',
        parentName: 'Sarah & Jack Hunt',
        parentContact: '+1 (555) 890-5522',
        parentNotes: 'Very communicative. Ethan is quite active in athletic programs.',
        grades: [
          { id: 'g-7', assessmentName: 'Algebra Quiz 1', score: 88, maxScore: 100, date: '2026-03-01' },
          { id: 'g-8', assessmentName: 'Polynomials Test', score: 84, maxScore: 100, date: '2026-04-10' },
          { id: 'g-9', assessmentName: 'Geometry Midterm', score: 87, maxScore: 100, date: '2026-05-20', feedback: 'Good conceptual clarity in geometric proof structures.' }
        ],
        attendance: 92,
        performanceIndicator: 'good',
        statusIndicator: 'active',
        avatarSeed: 'Ethan',
        uploads: [
          { id: 'up-6', name: 'EthanQuiz1_Response.pdf', type: 'Quiz Submission', date: '2026-03-01', status: 'graded' }
        ],
        customFields: [
          { id: 'cf-7', label: 'Tutoring Status', type: 'tag', value: 'None', visibility: true },
          { id: 'cf-8', label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true }
        ]
      },
      {
        id: 'stud-4',
        name: 'Maya Lin',
        rollNumber: 'M10-04',
        email: 'maya.lin@school.edu',
        phone: '+1 (555) 543-2109',
        address: '908 Cherry Blossom Lane',
        parentName: 'David Han',
        parentContact: '+1 (555) 543-0099',
        parentNotes: 'Speaks Mandarin at home. Highly disciplined. Strives for excellence.',
        grades: [
          { id: 'g-10', assessmentName: 'Algebra Quiz 1', score: 85, maxScore: 100, date: '2026-03-01' },
          { id: 'g-11', assessmentName: 'Polynomials Test', score: 78, maxScore: 100, date: '2026-04-10' },
          { id: 'g-12', assessmentName: 'Geometry Midterm', score: 80, maxScore: 100, date: '2026-05-20' }
        ],
        attendance: 95,
        performanceIndicator: 'average',
        statusIndicator: 'active',
        avatarSeed: 'Maya',
        uploads: [
          { id: 'up-7', name: 'Maya_Midterm_Answers.pdf', type: 'Exam Submission', date: '2026-05-20', status: 'graded' }
        ],
        customFields: [
          { id: 'cf-9', label: 'Tutoring Status', type: 'tag', value: 'Weekly Clinic', visibility: true },
          { id: 'cf-10', label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true }
        ]
      },
      {
        id: 'stud-5',
        name: 'Chloe Dupont',
        rollNumber: 'M10-05',
        email: 'chloe.dupont@school.edu',
        phone: '+1 (555) 321-7654',
        address: '15 Sequoia Crest, South',
        parentName: 'Marie Dupont',
        parentContact: '+1 (555) 321-4433',
        parentNotes: 'Bilingual. Outstanding reader. Quick to catch visual geometry concepts.',
        grades: [
          { id: 'g-13', assessmentName: 'Algebra Quiz 1', score: 92, maxScore: 100, date: '2026-03-01' },
          { id: 'g-14', assessmentName: 'Polynomials Test', score: 88, maxScore: 100, date: '2026-04-10' },
          { id: 'g-15', assessmentName: 'Geometry Midterm', score: 94, maxScore: 100, date: '2026-05-20', feedback: 'Superb proofs! Perfect drawing integration.' }
        ],
        attendance: 91,
        performanceIndicator: 'good',
        statusIndicator: 'active',
        avatarSeed: 'Chloe',
        uploads: [
          { id: 'up-8', name: 'Chloe_WrittenMidterm.pdf', type: 'Exam Submission', date: '2026-05-20', status: 'graded' }
        ],
        customFields: [
          { id: 'cf-11', label: 'Tutoring Status', type: 'tag', value: 'None', visibility: true },
          { id: 'cf-12', label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true }
        ]
      }
    ],
    ragSessions: [
      {
        id: 'sess-1',
        title: 'Midterm Assessment Gap Review',
        type: 'learning-gap',
        scopeType: 'class',
        selectedIds: [],
        createdAt: '2026-06-15T14:30:00Z',
        messages: [
          {
            id: 'm-1',
            role: 'user',
            text: 'Analyze our geometry midterm outcomes. What are the key topics where student performance diverged significantly, and how should I tailor the remediation syllabus?',
            timestamp: '2026-06-15T14:30:00Z'
          },
          {
            id: 'm-2',
            role: 'assistant',
            text: `Based on the Midterm results, I have conducted a relative learning gap analysis. 

We see a clear divergence in geometric proofs versus algebraic polynomials. Students fell into three distinct groups:

1. **Proof Sequence Pioneers (Aarav, Chloe):** Scored >90%. Exhibited strong mathematical logic chain modeling.
2. **Execution Centrists (Ethan, Maya):** Scored between 78-87%. Solved formulaic proof steps but lost points on coordinate system calculation bounds.
3. **Severe Gap Risks (Sofia):** Scored <60%. Facing significant learning obstacles. For Sofia, math anxiety and structural issues with algebraic variables compound to make geometric theorems difficult.

### Suggested Action Items:
- **Remediation Focus**: Hold a 30-minute mini-camp modeling "Variable Balances in Geometry Proofs" specifically targeted at coordinate scaling.
- **Differentiated Work**: Team up Chloe (Pioneer) and Sofia (Needs Attention) for the coordinate review workshops.
- **Mock Rubric Integration**: Let Sofia use the visual Socratic prompts.`,
            timestamp: '2026-06-15T14:31:30Z',
            visualization: {
              type: 'ranking',
              title: 'Midterm Score Distribution Comparison',
              description: 'Clear score divide showing students needing attention under 70%',
              data: [
                { name: 'Aarav Sharma', score: 92, classAvg: 80.8, status: 'excellent' },
                { name: 'Chloe Dupont', score: 94, classAvg: 80.8, status: 'good' },
                { name: 'Ethan Hunt', score: 87, classAvg: 80.8, status: 'good' },
                { name: 'Maya Lin', score: 80, classAvg: 80.8, status: 'average' },
                { name: 'Sofia Patel', score: 55, classAvg: 80.8, status: 'critical' }
              ]
            }
          }
        ]
      },
      {
        id: 'sess-2',
        title: 'Weak Students Review',
        type: 'weak-topic',
        scopeType: 'students',
        selectedIds: ['stud-2'],
        createdAt: '2026-06-17T09:15:00Z',
        messages: [
          {
            id: 'm-3',
            role: 'user',
            text: 'Provide a targeted student brief for Sofia Patel. Mention parent notes and suggest direct feedback statements using the Socratic instructions.',
            timestamp: '2026-06-17T09:15:00Z'
          },
          {
            id: 'm-4',
            role: 'assistant',
            text: `### Personalized Portfolio Review: Sofia Patel (M10-02)

Sofia needs structured behavioral and cognitive intervention before the final exam. Her mathematical anxiety is amplifying minor gaps into full performance blocks, as seen in her 55% score on the Geometry Midterm.

#### Parent-Teacher Strategy Alignment:
- **Parent Vikram Patel\'s context**: Vikram reported high anxiety. We should email a checklist of 3 simple math tasks she can master at home to build localized confidence before a real test.
- **Special Extra-Time Accommodation**: Ensure she is seated in a quiet corner of the clinic as allowed under her 1.5x time rule.

#### Applied Socratic Prompting Feedback Draft:
Instead of correcting Polynomial equations directly, write on her sheets:
1. *\"Great work balancing item 1. Look closely at item 2: what occurs when we multiply negative coefficients?\"*
2. *\"You have isolated x correctly on step 2, Sofia. What properties of an equation let us move terms across the equal sign safely?\"*

This shifts the focus from \"correct answers\" to \"secure processes\".`,
            timestamp: '2026-06-17T09:17:15Z',
            visualization: {
              type: 'timeline',
              title: 'Sofia Patel Grade & Attendance Trajectory',
              description: 'Comparative score trend highlighting critical support points',
              data: [
                { period: 'Quiz 1', SofiaScore: 81, ClassMajorAvg: 89 },
                { period: 'Polynomials', SofiaScore: 62, ClassMajorAvg: 82 },
                { period: 'Geometry Midterm', SofiaScore: 55, ClassMajorAvg: 81 }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    id: 'ws-2',
    name: 'Grade 9 General Physics',
    academicYear: '2025-2026',
    semester: 'Semester 2',
    subject: 'Physics (Kinematics & Dynamics)',
    teacherName: 'Elena Rostova',
    teachingStyle: 'Hands-on Experiments & Numerical Inquiry',
    experienceLevel: 'Senior Instructor (12 Years)',
    specialNotes: 'Focusing heavily on empirical setups, lab data collection precision, and experimental bias descriptions.',
    materials: [
      {
        id: 'mat-4',
        name: 'Physics_9_LabReport_Guide.docx',
        type: 'syllabus',
        uploadDate: '2026-02-20',
        size: '1.1 MB',
        tags: ['Lab Guide', 'Physics'],
        versionHistory: []
      },
      {
        id: 'mat-5',
        name: 'Kinematics_Practice_Problems.pdf',
        type: 'book',
        uploadDate: '2026-03-05',
        size: '2.4 MB',
        tags: ['Kinematics', 'Problems'],
        versionHistory: []
      }
    ],
    instructions: [
      {
        id: 'inst-3',
        title: 'Lab Metric Validation Rules',
        type: 'criteria',
        content: 'Check for empirical numbers, unit declarations (e.g. m/s^2), and correct identification of independent/dependent variables.'
      }
    ],
    students: [
      {
        id: 'stud-6',
        name: 'Lucas Graham',
        rollNumber: 'P09-01',
        email: 'lucas.graham@school.edu',
        phone: '+1 (555) 111-2222',
        address: '10 Cascade Crossing',
        parentName: 'Jack Graham',
        parentContact: '+1 (555) 111-3333',
        parentNotes: 'Lucas prefers practical labs over formula exams. Highly visual.',
        grades: [
          { id: 'g-16', assessmentName: 'Lab 1 - Free Fall', score: 95, maxScore: 100, date: '2026-02-28' },
          { id: 'g-17', assessmentName: 'Kinematics exam', score: 78, maxScore: 100, date: '2026-04-05' }
        ],
        attendance: 94,
        performanceIndicator: 'good',
        statusIndicator: 'active',
        avatarSeed: 'Lucas',
        uploads: [
          { id: 'up-9', name: 'Lucas_Lab1Report_Final.docx', type: 'Lab Report', date: '2026-02-27', status: 'graded' }
        ],
        customFields: []
      }
    ],
    ragSessions: []
  },
  {
    id: 'ws-3',
    name: 'Chemistry Semester 1',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    subject: 'Chemistry (Chemical Bonds & Stoichiometry)',
    teacherName: 'Elena Rostova',
    teachingStyle: 'Visual Labs',
    experienceLevel: 'Senior Instructor (12 Years)',
    materials: [],
    instructions: [],
    students: [],
    ragSessions: [],
    archived: true
  }
];
