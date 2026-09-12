import { useState, useCallback } from 'react';
import { ClassModel, Message, RAGSession } from '@/types/main';
import { getMockChatResponse } from '@/lib/mockChat';

interface UseAIChatProps {
  classes: ClassModel[];
  setClasses: (classes: ClassModel[]) => void;
  triggerToast: (text: string) => void;
}

export function useAIChat({ classes, setClasses, triggerToast }: UseAIChatProps) {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const sendChatMessage = useCallback(
    async (activeClass: ClassModel, sessionId: string, text: string) => {
      if (!activeClass) return;

      const userMsg: Message = {
        id: `m-${Date.now()}-user`,
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
      };

      // Add user message to session
      const updatedSessions = (activeClass.ragSessions || []).map((sec) => {
        if (sec.id === sessionId) {
          return { ...sec, messages: [...sec.messages, userMsg] };
        }
        return sec;
      });

      const currentClassIndex = classes.findIndex((w) => w.id === activeClass.id);
      if (currentClassIndex === -1) return;

      const updatedClasses = [...classes];
      updatedClasses[currentClassIndex] = {
        ...activeClass,
        ragSessions: updatedSessions,
      };
      setClasses(updatedClasses);
      setIsGeneratingAI(true);

      try {
        const activeSession = updatedSessions.find((s) => s.id === sessionId);
        const payload = {
          messages: activeSession?.messages || [],
          classItemName: activeClass.name,
          subject: activeClass.subject,
          academicYear: activeClass.academicYear,
          semester: activeClass.semester,
          teacherName: activeClass.teacherName,
          teachingStyle: activeClass.teachingStyle,
          specialNotes: activeClass.specialNotes,
          assessmentPreferences: activeClass.assessmentPreferences,
          materials: activeClass.materials,
          instructions: activeClass.instructions,
          students: activeClass.students,
          newAnalysisConfig: {
            type: activeSession?.type || 'Student Performance Analysis',
            scopeType: activeSession?.scopeType || 'class',
            selectedIds: activeSession?.selectedIds || [],
            customInstructions: activeSession?.customInstructions || '',
          },
        };

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        let resJson: { text?: string; visualization?: any };
        if (response.ok) {
          resJson = await response.json();
        } else {
          throw new Error(`HTTP Error Status: ${response.status}`);
        }

        const serverMsg: Message = {
          id: `m-${Date.now()}-ai`,
          role: 'assistant',
          text: resJson.text || 'I was unable to structure an assessment insight.',
          visualization: resJson.visualization || undefined,
          timestamp: new Date().toISOString(),
        };

        const finalSessions = updatedClasses[currentClassIndex].ragSessions.map((s) => {
          if (s.id === sessionId) {
            return { ...s, messages: [...s.messages, serverMsg] };
          }
          return s;
        });

        const processedClasses = [...classes];
        processedClasses[currentClassIndex] = {
          ...activeClass,
          ragSessions: finalSessions,
        };
        setClasses(processedClasses);
      } catch (err: any) {
        console.warn('FastAPI backend call failed. Falling back to client mock simulation...', err);

        const mockCtx = {
          prompt: text,
          students: activeClass.students,
          materials: activeClass.materials,
          instructions: activeClass.instructions,
        };
        const mockResponse = await getMockChatResponse(mockCtx);

        const serverMsg: Message = {
          id: `m-${Date.now()}-ai`,
          role: 'assistant',
          text: mockResponse.text,
          visualization: mockResponse.visualization as any,
          timestamp: new Date().toISOString(),
        };

        const finalSessions = updatedClasses[currentClassIndex].ragSessions.map((s) => {
          if (s.id === sessionId) {
            return { ...s, messages: [...s.messages, serverMsg] };
          }
          return s;
        });

        const processedClasses = [...classes];
        processedClasses[currentClassIndex] = {
          ...activeClass,
          ragSessions: finalSessions,
        };
        setClasses(processedClasses);
        triggerToast('Running diagnostic model analysis...');
      } finally {
        setIsGeneratingAI(false);
      }
    },
    [classes, setClasses, triggerToast]
  );

  return {
    isGeneratingAI,
    sendChatMessage,
  };
}
