/**
 * Pedagogical descriptions for educational terms in forms, badges, and dropdowns.
 * Uses key-value matching with graceful fallback so new database enums
 * never break the build or UI.
 */
export const ENUM_TOOLTIPS: Record<string, string> = {
  // Teaching Styles (teaching_style)
  'Lecture': 'Traditional educator-led presentation delivering structured foundational knowledge.',
  'Socratic Method': 'Inquiry-driven questioning encouraging students to formulate answers through reasoned dialogue.',
  'Interactive': 'Active learning through real-time group discussions, polls, and collaborative exercises.',
  'Project-Based': 'Hands-on investigation where students acquire knowledge by executing sustained, real-world tasks.',
  'Flipped Classroom': 'Direct instruction delivered at home, reserving class time for guided application.',
  'Discussion-Based': 'Facilitated open forums exploring diverse perspectives and collaborative problem-solving.',
  'Hands-On': 'Experiential learning focused on tactile exercises, experiments, and physical prototypes.',

  // Instruction Types (instruction_type)
  'System Persona': 'Defines the overarching demeanor, tone, and pedagogical role of the AI assistant for this class.',
  'Grading Rubric': 'Specifies scoring criteria, point weightings, and qualitative assessment benchmarks.',
  'Lesson Plan Guideline': 'Directs how curriculum units, sequencing, and pacing guides should be structured.',
  'Material Generation Rule': 'Enforces guidelines for generating worksheets, reading passages, and laboratory handouts.',
  'Student Interaction Rule': 'Regulates how the AI or instructor interacts with students during remedial dialogue.',
  'Assessment Creation Rule': 'Sets rules for crafting quizzes, midterm papers, and multiple-choice questions.',
  'Content Filtering Rule': 'Enforces classroom safety policies, content guardrails, and age-appropriate topic boundaries.',
  'General Policy': 'General classroom operating procedure or instructional standard not covered elsewhere.',

  // Assessment Preferences (assessment_preference)
  'Multiple Choice': 'Objective evaluations using closed response selections for rapid factual recall.',
  'Short Answer': 'Brief open-ended responses evaluating conceptual comprehension in 1-3 sentences.',
  'Essays': 'Extended written analyses evaluating critical thinking, thesis defense, and synthesis.',
  'Presentations': 'Live or recorded oral demonstrations showcasing verbal articulation and mastery.',
  'Single Project': 'Comprehensive individual capstone projects assessing multi-week cumulative mastery.',
  'Group Projects': 'Collaborative team assignments evaluating teamwork, division of labor, and shared output.',
  'Oral Exams': 'Direct spoken question-and-answer examinations assessing immediate recall and reasoning.',
  'Peer Review': 'Structured collaborative critiques where students evaluate peer work against a rubric.',

  // Content Categories (content_category)
  'Study Material': 'Core instructional materials including textbooks, lecture slides, and reference readings.',
  'Note': 'Summarized notes, meeting takeaways, and quick-reference classroom guides.',
  'Assigned Book': 'Required and recommended reading literature or textbook chapters.',
  'Link': 'Curated external websites, research portals, videos, and interactive simulations.',
  'Practical': 'Hands-on laboratory manuals, technical workshops, and experiential exercises.',
  'Assignment': 'Graded coursework, problem sets, and individual homework deliverables.',
  'Test': 'Periodic unit tests, midterms, and chapter quizzes assessing progress.',
  'Exam': 'Comprehensive final examinations measuring cumulative course mastery.',

  // Submission Statuses (submission_status)
  'Assigned': 'Task has been published to the student roster and awaits submission.',
  'Pending': 'Work has been initiated or drafted by the student but is pending final submission.',
  'Submitted': 'Work has been turned in by the student and is queued for instructor review.',
  'Evaluated': 'Preliminary rubric scoring or AI feedback has been generated and awaits final grade sign-off.',
  'Graded': 'Final grade and feedback have been finalized and recorded in the gradebook.',

  // Experience Levels (experience_level)
  'Beginner': 'Introductory curriculum designed for students with no prior subject experience.',
  'Intermediate': 'Standard curriculum for learners with foundational prerequisites and core competency.',
  'Advanced': 'Accelerated curriculum diving into complex theory, research, and advanced applications.',
  'Mixed': 'Differentiated curriculum accommodating a diverse cohort with varying prior proficiencies.',
};

export function getEnumTooltip(enumValue?: string): string {
  if (!enumValue) return '';
  return ENUM_TOOLTIPS[enumValue] || '';
}
