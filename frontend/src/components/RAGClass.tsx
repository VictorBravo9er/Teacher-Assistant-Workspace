import React, { useState, useRef, useEffect } from 'react';
import { ClassModel, RAGSession, Message } from '../types';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Maximize2, 
  ArrowLeft,
  X,
  Brain,
  History
} from 'lucide-react';
import Visualizer from './Visualizer';

interface RAGClassProps {
  classItem: ClassModel;
  onUpdateClass: (id: string, updatedFields: Partial<ClassModel>) => void;
  layoutMode: 'split' | 'chat-only' | 'details-only';
  onToggleLayoutMode: (mode: 'split' | 'chat-only' | 'details-only') => void;
  onSendChatMessage: (sessionId: string, text: string) => Promise<void>;
  isGeneratingAI: boolean;
}

export default function RAGClass({
  classItem,
  onUpdateClass,
  layoutMode,
  onToggleLayoutMode,
  onSendChatMessage,
  isGeneratingAI
}: RAGClassProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  
  // New session modal states
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [analysisType, setAnalysisType] = useState('Student Performance Analysis');
  const [analysisScope, setAnalysisScope] = useState<'class' | 'students' | 'materials' | 'assessments'>('class');
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [customBriefInstructions, setCustomBriefInstructions] = useState('');

  // Chat bar input state
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Dynamic lists of RAG sessions
  const sessions = classItem.ragSessions || [];
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Auto-scroll chat history
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, isGeneratingAI]);

  // Handle setting active session (and auto-triggers focus mode!)
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    onToggleLayoutMode('chat-only'); // Automatically enter Focus Mode for conversational immersion
  };

  // Chat Actions
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeSession || isGeneratingAI) return;

    const messageText = chatInput;
    setChatInput('');

    await onSendChatMessage(activeSession.id, messageText);
  };

  const handleSuggestedPrompt = async (prompt: string) => {
    if (!activeSession || isGeneratingAI) return;
    await onSendChatMessage(activeSession.id, prompt);
  };

  // Session Mutations
  const handleCreateNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newSession: RAGSession = {
      id: `sess-${Date.now()}`,
      title: `${analysisType} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      type: analysisType,
      scopeType: analysisScope,
      selectedIds: selectedScopeIds,
      customInstructions: customBriefInstructions,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `m-${Date.now()}-init`,
          role: 'assistant',
          text: `### 🤖 RAG Analysis Session Established\nI have synced focus criteria onto: **${analysisType}** (${analysisScope.toUpperCase()} Scope).\n          \n* **Class contexts & Instructions loaded**: Checked (${classItem.instructions.length} custom guidelines parsed)\n* **Parent logs & grades directory**: Synced (${classItem.students.length} portfolios indexed)\n          \nHow can I assist you with clinical evaluation reviews today? You can select a quick action suggestion below or draft custom requests directly.`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    onUpdateClass(classItem.id, {
      ragSessions: [newSession, ...sessions]
    });

    setActiveSessionId(newSession.id);
    setShowNewSessionModal(false);
    onToggleLayoutMode('chat-only'); // enter focus mode right away

    // Clear form states
    setCustomBriefInstructions('');
    setSelectedScopeIds([]);
  };

  const handleDuplicateSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = sessions.find(s => s.id === id);
    if (!target) return;

    const duplicated: RAGSession = {
      ...target,
      id: `sess-${Date.now()}`,
      title: `${target.title} (Copy)`,
      createdAt: new Date().toISOString(),
      messages: [...target.messages]
    };

    onUpdateClass(classItem.id, {
      ragSessions: [duplicated, ...sessions]
    });
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    onUpdateClass(classItem.id, { ragSessions: filtered });
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0]?.id || null);
    }
  };

  // Preset prompts list
  const suggestedChips = [
    { label: "Sofia Learning Gaps", prompt: "Summarize Sofia Patel's performance regression. What are the key Socratic feedback comments I should write on her written submissions?" },
    { label: "Class Evaluation Matrix", prompt: "Create a topical grade mastery matrix comparing Aarav and Sofia across Polynomials and Geometry assessments." },
    { label: "Parent briefing agenda", prompt: "Generate a bullet-pointed parent BRIEF for Sofia Patel's father, Vikram. Suggest direct support tips for home revision." },
    { label: "Exam Syllabus audit", prompt: "Audit our curriculum materials syllabus for algebra and recommend 3 structural remedial quiz prompts." }
  ];

  return (
    <div className="flex-1 flex overflow-hidden border border-border-color rounded-3xl bg-background/50 relative h-full">
      
      {/* RAG Left Sessions list panel */}
      <div className="w-64 border-r border-border-color flex flex-col bg-elevated/40 shrink-0">
        
        {/* Panel header controls */}
        <div className="p-4 border-b border-border-color space-y-3 shrink-0">
          <button 
            onClick={() => setShowNewSessionModal(true)}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New AI Analysis
          </button>
          
          <input 
            type="text" 
            placeholder="Search diagnostics..."
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            className="w-full bg-surface border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-primary-text placeholder-muted-text focus:outline-none focus:border-primary"
          />
        </div>

        {/* Existing Analyses sessions */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <span className="text-[10px] font-bold font-mono text-muted-text block uppercase px-3 py-1 bg-transparent">Conversations History</span>
          
          {filteredSessions.length === 0 ? (
            <div className="text-[11px] font-mono p-4 text-muted-text text-center border border-dashed border-border-color rounded-xl m-2 bg-surface">
              No analyses logged. Initiate high-speed RAG analysis above.
            </div>
          ) : (
            filteredSessions.map(sec => {
              const isActive = sec.id === (activeSession?.id);
              return (
                <div 
                  key={sec.id}
                  onClick={() => handleSelectSession(sec.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'border-transparent hover:bg-surface text-secondary-text hover:text-primary-text'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <History className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-text'}`} />
                    <span className="truncate pr-4 font-medium">{sec.title}</span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 bg-transparent" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={(e) => handleDuplicateSession(sec.id, e)}
                      className="p-0.8 hover:bg-surface text-muted-text hover:text-primary rounded transition-all cursor-pointer"
                      title="Duplicate Chat Session"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteSession(sec.id, e)}
                      className="p-0.8 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded transition-all cursor-pointer"
                      title="Delete Chat (Does NOT impact roster records)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Main chat chatbot classItem pane */}
      <div className="flex-1 flex flex-col justify-between bg-background/10 relative overflow-hidden h-full">
        
        {/* Chat message streams list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {(!activeSession || !activeSession.messages || activeSession.messages.length === 0) ? (
            <div className="max-w-xl mx-auto text-center py-20 space-y-4">
              <Bot className="w-12 h-12 text-primary mx-auto animate-bounce" />
              <h3 className="text-lg font-bold font-display text-primary-text">Initiate AI Diagnostic Sessions</h3>
              <p className="text-xs text-muted-text leading-relaxed">
                Choose an existing chat logs scope on the sidebar, click "New AI Analysis" to launch a specific lesson evaluation, or try suggesting prompt buttons.
              </p>
            </div>
          ) : (
            activeSession.messages.map(msg => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div 
                  key={msg.id}
                  className={`flex gap-4 ${isAssistant ? '' : 'justify-end animate-fade-in'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-3.5 max-w-[85%] ${isAssistant ? '' : 'flex flex-col items-end'}`}>
                    
                    {/* Chat Text Bubble */}
                    <div className={`p-4 rounded-2xl border text-xs leading-relaxed transition-colors ${
                      isAssistant 
                        ? 'bg-surface border-border-color text-primary-text shadow-sm' 
                        : 'bg-primary border-primary text-white font-medium'
                    }`}>
                      <div className="space-y-3 prose prose-invert text-xs select-text">
                        {msg.text.split('\n\n').map((para, pIdx) => {
                          if (para.startsWith('###')) {
                            return <h3 key={pIdx} className="text-sm font-bold font-display text-primary mt-2 pb-1.5 border-b border-border-color">{para.replace('###', '').trim()}</h3>;
                          }
                          if (para.startsWith('####')) {
                            return <h4 key={pIdx} className="text-xs font-bold text-primary-text mt-1">{para.replace('####', '').trim()}</h4>;
                          }
                          if (para.startsWith('**') || para.trim().startsWith('-') || para.trim().startsWith('*')) {
                            const listItems = para.split('\n').filter(l => l.trim().length > 0);
                            return (
                              <ul key={pIdx} className="list-disc pl-4 space-y-1">
                                {listItems.map((li, liIdx) => (
                                  <li key={liIdx}>
                                    {li.replace(/^(\s*-\s*|\s*\*\s*)/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                                  </li>
                                ))}
                              </ul>
                            );
                          }
                          return <p key={pIdx}>{para}</p>;
                        })}
                      </div>
                    </div>

                    {/* Dynamic SVG Visualizer widget */}
                    {isAssistant && msg.visualization && (
                      <div className="bg-elevated border border-border-color rounded-2xl p-4 w-full md:min-w-[480px] hover:border-primary/50 transition-colors shadow-xl">
                        <div className="pb-3 border-b border-border-color mb-4">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-primary">Class Visualizer</span>
                          <h4 className="text-xs font-bold text-primary-text mt-1">{msg.visualization.title}</h4>
                          {msg.visualization.description && (
                            <p className="text-[10px] text-muted-text font-mono mt-0.5">{msg.visualization.description}</p>
                          )}
                        </div>
                        <Visualizer visualization={msg.visualization} />
                      </div>
                    )}

                    <span className="text-[9px] font-mono text-muted-text font-medium px-1">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Thinking Loading animation skeleton */}
          {isGeneratingAI && (
            <div className="flex gap-4 p-1 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Brain className="w-4.5 h-4.5 text-primary animate-spin" />
              </div>
              <div className="space-y-2.5 max-w-[70%]">
                <div className="bg-surface border border-border-color rounded-2xl p-4 flex flex-col gap-2 w-72">
                  <span className="text-[10px] font-mono text-primary">AI Thinking & Grading Submissions...</span>
                  <div className="h-2 bg-elevated rounded w-full border border-border-color"></div>
                  <div className="h-2 bg-elevated rounded w-5/6 border border-border-color"></div>
                  <div className="h-2 bg-elevated rounded w-2/3 border border-border-color"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Prompt Chips Bottom bar */}
        {sessions.length > 0 && activeSession?.messages?.length <= 2 && !isGeneratingAI && (
          <div className="px-6 py-2 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none z-20">
            <span className="text-[9px] font-mono text-muted-text font-bold shrink-0">Quick Gaps:</span>
            {suggestedChips.map((chip, idx) => (
              <button 
                key={idx}
                onClick={() => handleSuggestedPrompt(chip.prompt)}
                className="px-3 py-1 bg-primary/5 hover:bg-primary/15 border border-primary/10 text-primary rounded-lg text-[10px] font-medium transition-colors cursor-pointer shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Primary chat control form bar */}
        <div className="p-4 border-t border-border-color bg-surface">
          <form onSubmit={handleSendMessage} className="relative flex items-center bg-elevated border border-border-color rounded-2xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            
            <input 
              type="text" 
              placeholder="Ask AI Copilot to grade assessments, calculate topic mastery regression, or write parent tips..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isGeneratingAI || !activeSession}
              className="flex-1 bg-transparent text-xs text-primary-text pl-3 pr-16 py-2 outline-none placeholder-muted-text"
            />

            <button 
              type="submit"
              disabled={!chatInput.trim() || isGeneratingAI || !activeSession}
              className="absolute right-3 top-3 p-1.5 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-surface disabled:text-muted-text disabled:border disabled:border-border-color text-white transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-[10px] text-muted-text font-mono text-center mt-2.5">
            Press Enter to submit. EduCopilot evaluates syllabus documents and custom student rosters in real-time.
          </p>
        </div>

      </div>

      {/* NEW SESSION MODAL ON DEMAND */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border-color rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setShowNewSessionModal(false)}
              className="absolute right-4 top-4 hover:bg-elevated p-1.5 rounded-lg text-muted-text hover:text-primary-text transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-2.5 border-b border-border-color">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <h3 className="text-sm font-semibold text-primary-text">Start Diagnostic Analysis</h3>
                <span className="text-[10px] font-mono text-muted-text">Retrieval Augmented Generation ClassModel</span>
              </div>
            </div>

            <form onSubmit={handleCreateNewSession} className="space-y-4">
              
              {/* Type Grid */}
              <div>
                <label className="text-[10px] font-mono text-muted-text uppercase tracking-wider block mb-1.5">Analysis Target Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Student Performance Analysis',
                    'Class Strength Analysis',
                    'Weak Topic Detection',
                    'Question Paper Analysis',
                    'Learning Gap Analysis',
                    'Parent Report Generation',
                    'Custom'
                  ].map(type => (
                    <div 
                      key={type}
                      onClick={() => setAnalysisType(type)}
                      className={`px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        analysisType === type 
                          ? 'border-primary/80 bg-primary/5 text-primary shadow-md' 
                          : 'border-border-color hover:bg-elevated text-secondary-text'
                      }`}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-muted-text uppercase block mb-1.5">Focus Scope Bounds</label>
                  <select 
                    value={analysisScope}
                    onChange={(e) => setAnalysisScope(e.target.value as any)}
                    className="w-full bg-surface border border-border-color rounded-lg p-2 text-xs text-primary-text cursor-pointer outline-none focus:border-primary"
                  >
                    <option value="class">Entire Class Cohort</option>
                    <option value="students">Selected Students only</option>
                    <option value="materials">Uploaded Materials Repository</option>
                    <option value="assessments">Scored Grades Database</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-muted-text uppercase block mb-1.5">Select specific bounds</label>
                  {analysisScope === 'class' ? (
                    <div className="text-[11px] font-mono py-2 text-primary leading-normal">
                      Full class of {classItem.students.length} students indexed.
                    </div>
                  ) : (
                    <div className="max-h-20 overflow-y-auto border border-border-color rounded-lg p-1.5 bg-surface space-y-1">
                      {analysisScope === 'students' && classItem.students.map(s => (
                        <label key={s.id} className="flex items-center gap-1.5 text-xs text-primary-text">
                          <input 
                            type="checkbox" 
                            checked={selectedScopeIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedScopeIds([...selectedScopeIds, s.id]);
                              else setSelectedScopeIds(selectedScopeIds.filter(id => id !== s.id));
                            }}
                          />
                          {s.name}
                        </label>
                      ))}
                      {analysisScope === 'materials' && classItem.materials.map(m => (
                        <label key={m.id} className="flex items-center gap-1.5 text-xs text-primary-text">
                          <input 
                            type="checkbox" 
                            checked={selectedScopeIds.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedScopeIds([...selectedScopeIds, m.id]);
                              else setSelectedScopeIds(selectedScopeIds.filter(id => id !== m.id));
                            }}
                          />
                          {m.name}
                        </label>
                      ))}
                      {analysisScope === 'assessments' && (
                        <div className="text-[11px] font-mono text-primary">All quiz scoring records synced.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom micro guidelines */}
              <div>
                <label className="text-[10px] font-mono text-muted-text block mb-1">OPTIONAL BRIEFING INSTRUCTIONS</label>
                <textarea 
                  placeholder="Provide precise analysis directions, e.g. Cross-compare Aarav and Sofia's polynomials homework sheets specifically and look for IEP accommodations requirements..."
                  value={customBriefInstructions}
                  onChange={(e) => setCustomBriefInstructions(e.target.value)}
                  className="w-full bg-surface border border-border-color rounded-lg p-2.5 text-xs text-primary-text h-20 resize-none outline-none focus:border-primary"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2 rounded-xl text-xs transition-colors shadow-lg cursor-pointer"
              >
                Establish Chat Analysis Context
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
