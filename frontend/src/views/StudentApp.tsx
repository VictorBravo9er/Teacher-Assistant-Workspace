import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import {
  studentPortalService,
  EnrolledClass,
} from '@/services/studentPortalService';
import { announcementService } from '@/services/announcementService';
import { Material, Instruction, StudentSubmission, Announcement } from '@/types/main';
import { StudentTurnInModal } from '@/features/student-portal/StudentTurnInModal';
import MaterialPreviewModal from '@/features/classroom/MaterialPreviewModal';
import { CalendarView } from '@/features/calendar/CalendarView';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  LogOut,
  Moon,
  School,
  Sparkles,
  Sun,
  User,
  AlertTriangle,
  ChevronDown,
  Pin,
  Megaphone,
} from 'lucide-react';

type StudentTab = 'assignments' | 'coursework' | 'announcements' | 'calendar' | 'grades';

export default function StudentApp() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<StudentTab>('assignments');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active class data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingClassData, setIsLoadingClassData] = useState<boolean>(false);

  // Modals state
  const [selectedMaterialForTurnIn, setSelectedMaterialForTurnIn] = useState<Material | null>(null);
  const [selectedMaterialForPreview, setSelectedMaterialForPreview] = useState<Material | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const activeClass = classes.find((c) => c.id === activeClassId);

  // 1. Fetch enrolled classes
  const loadClasses = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const enrolled = await studentPortalService.fetchEnrolledClasses(user.id);
      setClasses(enrolled);
      if (enrolled.length > 0 && !activeClassId) {
        setActiveClassId(enrolled[0].id);
      }
    } catch (err) {
      showToast('Failed to load your enrolled courses.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeClassId, showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // 2. Fetch class materials, instructions, submissions, and announcements whenever activeClassId changes
  const loadClassData = useCallback(async () => {
    if (!activeClassId || !user?.id) return;
    try {
      setIsLoadingClassData(true);
      const [mats, insts, subs, anns] = await Promise.all([
        studentPortalService.fetchClassMaterials(activeClassId),
        studentPortalService.fetchClassInstructions(activeClassId),
        studentPortalService.fetchMySubmissions(activeClassId, user.id),
        announcementService.fetchAnnouncements(activeClassId),
      ]);
      setMaterials(mats);
      setInstructions(insts);
      setSubmissions(subs);
      setAnnouncements(anns);
    } catch (err) {
      showToast('Failed to load course details.');
    } finally {
      setIsLoadingClassData(false);
    }
  }, [activeClassId, user?.id, showToast]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Submissions map by material_id for fast lookup
  const submissionMap = React.useMemo(() => {
    const map = new Map<string, StudentSubmission>();
    submissions.forEach((sub) => {
      if (sub.materialId) map.set(sub.materialId, sub);
    });
    return map;
  }, [submissions]);

  const assignments = React.useMemo(() => {
    return materials.filter(
      (m) =>
        m.toBeScored ||
        ['Assignment', 'Practical', 'Test', 'Exam'].includes(m.category)
    );
  }, [materials]);

  const courseworkMaterials = React.useMemo(() => {
    return materials.filter(
      (m) =>
        !m.toBeScored &&
        !['Assignment', 'Practical', 'Test', 'Exam'].includes(m.category)
    );
  }, [materials]);

  const pinnedAnnouncements = React.useMemo(() => {
    return announcements.filter((a) => a.isPinned);
  }, [announcements]);

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col font-sans transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface border border-border-color shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border-color sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-primary-text font-display block leading-none">
                Teach&Learn
              </span>
              <span className="text-[10px] text-muted-text font-mono tracking-wider uppercase">
                Student Portal
              </span>
            </div>
          </div>

          {/* Enrolled Course Selector */}
          {classes.length > 0 && (
            <div className="relative ml-4">
              <select
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="appearance-none bg-elevated/80 border border-border-color hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/40 rounded-xl py-1.5 pl-3 pr-8 text-xs font-semibold text-primary-text outline-none cursor-pointer transition-all"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-text absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Right Actions: Theme toggle, user profile, logout */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="rounded-xl w-8 h-8 p-0 text-muted-text hover:text-primary-text"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l border-border-color">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs font-mono">
              {(user?.user_metadata?.full_name || user?.email || 'S')[0].toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-semibold block leading-none text-primary-text truncate max-w-[120px]">
                {user?.user_metadata?.full_name || 'Enrolled Student'}
              </span>
              <span className="text-[10px] text-muted-text truncate max-w-[120px] block">
                {user?.email}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="rounded-xl w-8 h-8 p-0 text-muted-text hover:text-danger ml-1"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-text font-mono">Loading enrolled courses...</p>
          </div>
        ) : classes.length === 0 ? (
          /* Empty state when student is not enrolled in any classes */
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <School className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-display text-primary-text">
              No Enrolled Courses Found
            </h3>
            <p className="text-xs text-muted-text leading-relaxed">
              You are not currently enrolled in any active classes. Ask your course instructor to add
              your student email (<strong>{user?.email}</strong>) to their class roster.
            </p>
          </div>
        ) : (
          <>
            {/* Course Header Banner */}
            {activeClass && (
              <div className="bg-surface border border-border-color rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg font-semibold">
                      {activeClass.subject}
                    </span>
                    <span className="text-[10px] text-muted-text">
                      {activeClass.instituteName}
                    </span>
                    {activeClass.semester && (
                      <span className="text-[10px] text-muted-text">
                        • {activeClass.semester} {activeClass.academicYear}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold font-display text-primary-text">
                    {activeClass.name}
                  </h1>
                  <p className="text-xs text-muted-text flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Instructor: <strong className="text-primary-text">{activeClass.teacherName}</strong>
                  </p>
                </div>

                {/* Score & Tier Pill */}
                <div className="flex items-center gap-3 bg-elevated/60 border border-border-color rounded-2xl p-3 px-4">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-muted-text uppercase block">
                      Current Grade
                    </span>
                    <span className="text-lg font-bold font-display text-primary">
                      {activeClass.currentGrade || '—'}
                      {activeClass.currentScore !== undefined && activeClass.currentScore !== null && (
                        <span className="text-xs font-normal text-muted-text ml-1">
                          ({activeClass.currentScore}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-border-color" />
                  <div>
                    <span className="text-[10px] font-mono text-muted-text uppercase block">
                      Performance
                    </span>
                    <Badge
                      variant={
                        activeClass.performanceTier === 'High'
                          ? 'success'
                          : activeClass.performanceTier === 'At Risk'
                          ? 'error'
                          : 'neutral'
                      }
                    >
                      {activeClass.performanceTier || 'Average'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Pinned Announcements Notice Banner */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-2">
                {pinnedAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <Pin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="primary" className="text-[10px]">
                          Pinned Notice
                        </Badge>
                        <span className="text-[10px] text-muted-text font-mono">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-primary-text font-display mt-1">
                        {ann.title}
                      </h4>
                      <p className="text-xs text-secondary-text mt-1 whitespace-pre-wrap leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border-color pb-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'assignments'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-text hover:text-primary-text hover:bg-elevated'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Assignments & Turn-In
                {assignments.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                    {assignments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('coursework')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'coursework'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-text hover:text-primary-text hover:bg-elevated'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Course Materials
                {courseworkMaterials.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-md bg-elevated text-[10px] text-muted-text">
                    {courseworkMaterials.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('announcements')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'announcements'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-text hover:text-primary-text hover:bg-elevated'
                }`}
              >
                <Megaphone className="w-4 h-4" />
                Announcements
                {announcements.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-md bg-elevated text-[10px] text-muted-text">
                    {announcements.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-text hover:text-primary-text hover:bg-elevated'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('grades')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'grades'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-text hover:text-primary-text hover:bg-elevated'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                My Grades & Feedback
              </button>
            </div>

            {/* Tab 1: Assignments & Turn-In */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                {isLoadingClassData ? (
                  <div className="py-12 text-center text-xs text-muted-text">Loading assignments...</div>
                ) : assignments.length === 0 ? (
                  <div className="bg-surface border border-border-color rounded-2xl p-8 text-center text-xs text-muted-text">
                    No active assignments for this course.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {assignments.map((assignment) => {
                      const sub = submissionMap.get(assignment.id);
                      const isSubmitted = Boolean(sub);
                      const isGraded = sub?.status === 'Graded' || (sub?.score !== undefined && sub?.score !== null);
                      const isOverdue =
                        assignment.dueAt &&
                        new Date(assignment.dueAt).getTime() < Date.now() &&
                        !isSubmitted;

                      return (
                        <div
                          key={assignment.id}
                          className="bg-surface border border-border-color hover:border-primary/30 rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{assignment.category}</Badge>
                              {assignment.dueAt && (
                                <span
                                  className={`text-[11px] font-mono flex items-center gap-1 ${
                                    isOverdue ? 'text-danger font-semibold' : 'text-muted-text'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  Due: {new Date(assignment.dueAt).toLocaleDateString()}
                                  {isOverdue && ' (Overdue)'}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-text">
                                Max Score: {assignment.maxScore || 100}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-primary-text font-display">
                              {assignment.name}
                            </h3>

                            {/* Subtitle / Description if present */}
                            {assignment.content && assignment.content[0]?.description && (
                              <p className="text-xs text-muted-text line-clamp-2">
                                {assignment.content[0].description}
                              </p>
                            )}

                            {/* Feedback Snippet if graded */}
                            {isGraded && sub?.feedback && (
                              <div className="bg-elevated/70 border border-border-color rounded-xl p-2.5 text-xs mt-2">
                                <span className="font-semibold text-primary block text-[11px]">
                                  Teacher Feedback:
                                </span>
                                <p className="text-secondary-text mt-0.5 italic">"{sub.feedback}"</p>
                              </div>
                            )}
                          </div>

                          {/* Submission Status & Action Buttons */}
                          <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                            {isGraded ? (
                              <div className="text-right mr-2">
                                <span className="text-[10px] text-muted-text font-mono block">Score</span>
                                <span className="text-sm font-bold text-success font-display">
                                  {sub?.score} / {assignment.maxScore || 100}
                                  {sub?.grade && <span className="ml-1 text-xs">({sub.grade})</span>}
                                </span>
                              </div>
                            ) : isSubmitted ? (
                              <Badge variant="success">Submitted</Badge>
                            ) : isOverdue ? (
                              <Badge variant="error">Missing</Badge>
                            ) : (
                              <Badge variant="neutral">Pending</Badge>
                            )}

                            {/* Preview assignment handout if content items exist */}
                            {assignment.content && assignment.content.length > 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedMaterialForPreview(assignment)}
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                              >
                                View Task
                              </Button>
                            )}

                            {/* Turn In Button */}
                            <Button
                              variant={isSubmitted ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => setSelectedMaterialForTurnIn(assignment)}
                              leftIcon={<FileText className="w-3.5 h-3.5" />}
                            >
                              {isSubmitted ? 'Resubmit' : 'Turn In'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Course Materials */}
            {activeTab === 'coursework' && (
              <div className="space-y-4">
                {isLoadingClassData ? (
                  <div className="py-12 text-center text-xs text-muted-text">Loading materials...</div>
                ) : courseworkMaterials.length === 0 ? (
                  <div className="bg-surface border border-border-color rounded-2xl p-8 text-center text-xs text-muted-text">
                    No course materials uploaded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseworkMaterials.map((material) => (
                      <div
                        key={material.id}
                        className="bg-surface border border-border-color rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="neutral">{material.category}</Badge>
                            <span className="text-[10px] text-muted-text font-mono">
                              {material.uploadDate}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-primary-text font-display">
                            {material.name}
                          </h4>
                          {material.content && material.content[0]?.description && (
                            <p className="text-xs text-muted-text line-clamp-2">
                              {material.content[0].description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border-color flex items-center justify-between">
                          <span className="text-[10px] text-muted-text font-mono">
                            {material.content?.length || 0} item(s) attached
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedMaterialForPreview(material)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Preview
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Announcements Feed */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                {isLoadingClassData ? (
                  <div className="py-12 text-center text-xs text-muted-text">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                  <div className="bg-surface border border-border-color rounded-2xl p-8 text-center text-xs text-muted-text">
                    No class announcements posted yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`bg-surface border rounded-2xl p-5 shadow-sm space-y-2 transition-all ${
                          ann.isPinned
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border-color hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {ann.isPinned && (
                              <Badge variant="primary" className="text-[10px] flex items-center gap-1">
                                <Pin className="w-3 h-3" /> Pinned
                              </Badge>
                            )}
                            <h3 className="text-sm font-bold text-primary-text font-display">
                              {ann.title}
                            </h3>
                          </div>
                          <span className="text-[10px] text-muted-text font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ann.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-text whitespace-pre-wrap leading-relaxed">
                          {ann.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Academic Calendar */}
            {activeTab === 'calendar' && (
              <CalendarView
                materials={materials}
                announcements={announcements}
                onSelectMaterial={(material) => setSelectedMaterialForPreview(material)}
              />
            )}

            {/* Tab 5: My Grades & Feedback */}
            {activeTab === 'grades' && activeClass && (
              <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-surface border border-border-color rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-mono uppercase text-muted-text block">
                      Cumulative Score
                    </span>
                    <span className="text-2xl font-bold font-display text-primary mt-1 block">
                      {activeClass.currentScore !== undefined && activeClass.currentScore !== null
                        ? `${activeClass.currentScore}%`
                        : 'Not Graded Yet'}
                    </span>
                  </div>

                  <div className="bg-surface border border-border-color rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-mono uppercase text-muted-text block">
                      Letter Grade
                    </span>
                    <span className="text-2xl font-bold font-display text-primary mt-1 block">
                      {activeClass.currentGrade || '—'}
                    </span>
                  </div>

                  <div className="bg-surface border border-border-color rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-mono uppercase text-muted-text block">
                      Performance Standing
                    </span>
                    <div className="mt-2">
                      <Badge
                        variant={
                          activeClass.performanceTier === 'High'
                            ? 'success'
                            : activeClass.performanceTier === 'At Risk'
                            ? 'error'
                            : 'neutral'
                        }
                      >
                        {activeClass.performanceTier || 'Average'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* General Teacher Feedback */}
                {activeClass.generalFeedback && (
                  <div className="bg-surface border border-border-color rounded-2xl p-5 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-primary">
                      Instructor Remarks & Portfolio Feedback
                    </h4>
                    <p className="text-xs text-secondary-text leading-relaxed">
                      {activeClass.generalFeedback}
                    </p>
                  </div>
                )}

                {/* Submissions Scoreboard */}
                <div className="bg-surface border border-border-color rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold font-display text-primary-text">
                    Graded Work & Rubric Outcomes
                  </h4>

                  {submissions.length === 0 ? (
                    <p className="text-xs text-muted-text">No graded submissions recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-border-color">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-primary-text block">
                              {sub.materialName}
                            </span>
                            <span className="text-[10px] text-muted-text">
                              Status: <strong>{sub.status}</strong>
                              {sub.feedback && ` • "${sub.feedback}"`}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-sm font-bold text-primary">
                              {sub.score !== undefined && sub.score !== null
                                ? `${sub.score} / ${sub.maxScore || 100}`
                                : 'Pending Evaluation'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Turn-In Modal */}
      {selectedMaterialForTurnIn && activeClass && user?.id && (
        <StudentTurnInModal
          isOpen={Boolean(selectedMaterialForTurnIn)}
          onClose={() => setSelectedMaterialForTurnIn(null)}
          material={selectedMaterialForTurnIn}
          classId={activeClass.id}
          studentId={user.id}
          existingSubmission={submissionMap.get(selectedMaterialForTurnIn.id)}
          onSubmitted={() => {
            showToast('Assignment turned in successfully!');
            loadClassData();
          }}
        />
      )}

      {/* Material Preview Modal */}
      {selectedMaterialForPreview && (
        <MaterialPreviewModal
          isOpen={Boolean(selectedMaterialForPreview)}
          onClose={() => setSelectedMaterialForPreview(null)}
          material={selectedMaterialForPreview}
          classId={activeClassId}
          onTriggerToast={showToast}
        />
      )}
    </div>
  );
}
