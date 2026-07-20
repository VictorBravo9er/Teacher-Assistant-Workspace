import { Student, Material, Instruction } from './types';

interface MockChatContext {
  prompt: string;
  students: Student[];
  materials: Material[];
  instructions: Instruction[];
}

interface ChatResponse {
  text: string;
  visualization?: {
    type: 'charts' | 'heatmap' | 'ranking' | 'timeline' | 'stats';
    title: string;
    description: string;
    data: any[];
  };
}

export async function getMockChatResponse(ctx: MockChatContext): Promise<ChatResponse> {
  // Small delay to simulate network latency
  await new Promise(r => setTimeout(r, 600));

  const p = ctx.prompt.toLowerCase();

  if (p.includes('sofia') || p.includes('weak') || p.includes('gap') || p.includes('attention')) {
    return {
      text: `### Local Learning Gap Diagnostics: Focus Student Sofia Patel\n\nSofia Patel (**M10-02**) is currently experiencing high mathematical anxiety, which correlates with a downward performance slope:\n\n1. **Algebra Quiz 1**: Scored **81%** (Concept stable, arithmetic omissions present)\n2. **Polynomials Test**: Scored **62%** (Severe factor analysis struggles)\n3. **Geometry Midterm**: Scored **55%** (Multi-stage proofs block)\n\n#### Remediation Plan:\n- Provide parent **Vikram Patel** with the Socratic leading questions handout.\n- Schedule 1-on-1 tutoring sessions focusing on visualization vectors.\n- Use the 1.5x extra time accommodation during tests.`,
      visualization: {
        type: 'timeline',
        title: 'Sofia Patel Performance Regression',
        description: 'Score progression compared with class averages',
        data: [
          { period: 'Algebra Q1', score: 81, classAvg: 88 },
          { period: 'Polynomials', score: 62, classAvg: 83 },
          { period: 'Geometry Midterm', score: 55, classAvg: 81 },
        ],
      },
    };
  }

  if (p.includes('distribution') || p.includes('rank') || p.includes('score') || p.includes('compare')) {
    return {
      text: `### Classroom Score Distribution & Grade Curve\n\n- **Top Performers (Chloe & Aarav)**: 91%+ formula recall. Need secondary research projects to stay engaged.\n- **Stable Core (Ethan & Maya)**: Solid competency, can elevate with Socratic guidance.\n- **Intervention Needed (Sofia)**: High drop risk due to emotional testing anxiety.`,
      visualization: {
        type: 'ranking',
        title: 'Class Grade Rankings',
        description: 'Relative standing in Mathematics Semester 2',
        data: [
          { name: 'Chloe Dupont', score: 94, classAvg: 82 },
          { name: 'Aarav Sharma', score: 92, classAvg: 82 },
          { name: 'Ethan Hunt', score: 87, classAvg: 82 },
          { name: 'Maya Lin', score: 80, classAvg: 82 },
          { name: 'Sofia Patel', score: 55, classAvg: 82 },
        ],
      },
    };
  }

  if (p.includes('subject') || p.includes('mastery') || p.includes('topic') || p.includes('strength')) {
    return {
      text: `### Topical Mastery Heatmap\n\n- **Strong (85%+)**: Systems of equations & basic linear plots.\n- **Developing (70-80%)**: Graph scaling & visual geometry theorems.\n- **Struggling (<60%)**: Complex polynomial factorizations and logical proof construction.`,
      visualization: {
        type: 'heatmap',
        title: 'Topical Competence Grid',
        description: 'Average classroom mastery percentage by subject unit',
        data: [
          { topic: 'Linear Equations', mastery: 92 },
          { topic: 'Systems of Equations', mastery: 88 },
          { topic: 'Graph Scaling', mastery: 78 },
          { topic: 'Geometric Proofs', mastery: 64 },
          { topic: 'Polynomial Factorization', mastery: 58 },
        ],
      },
    };
  }

  // Default response
  return {
    text: `### ClassModel Assistant Ready\n\nI have loaded your classroom context, student profiles, and instructional guidelines.\n\nHere is what you can ask:\n1. **"Analyze Sofia Patel's grades and outline parent briefing points."**\n2. **"Review our learning materials and suggest quiz prompts."**\n3. **"Show a topic mastery grid comparing class performance."**\n4. **"Produce a curriculum template for high-anxiety students."**`,
    visualization: {
      type: 'stats',
      title: 'ClassModel Summary',
      description: 'Preloaded context for this session',
      data: [
        { label: 'Registered Students', value: `${ctx.students.length} Portfolios` },
        { label: 'Materials', value: `${ctx.materials.length} Documents` },
        { label: 'Instructions', value: `${ctx.instructions.length} Guidelines` },
      ],
    },
  };
}
