import React from 'react';
import {
  Settings,
  Sparkles,
  ShieldCheck,
  UserCircle2,
  Sliders,
  Key,
} from 'lucide-react';
import { Button, Badge, Modal, ModalHeader, ModalBody } from '@/components/ui';

interface AccountModalsProps {
  activeModal: 'profile' | 'preferences' | 'settings' | 'subscription' | null;
  onClose: () => void;
  onTriggerToast: (text: string) => void;
}

export default function AccountModals({ activeModal, onClose, onTriggerToast }: AccountModalsProps) {
  if (!activeModal) return null;

  return (
    <Modal isOpen={!!activeModal} onClose={onClose} size="md">
      {activeModal === 'profile' && (
        <>
          <ModalHeader
            title="Elena Rostova"
            subtitle="AI Studio District Senior Educator"
            icon={<UserCircle2 className="w-6 h-6" />}
            onClose={onClose}
          />
          <ModalBody className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-elevated/50 p-4 rounded-2xl border border-border-color shadow-sm">
              <div>
                <span className="text-[10px] text-muted-text font-mono block">AFFILIATION</span>
                <span className="font-semibold text-primary-text block mt-0.5">High School STEM faculty</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-text font-mono block">REGISTERED EMAIL</span>
                <span className="font-semibold text-primary-text block mt-0.5 truncate">Vikramjitborah@gmail.com</span>
              </div>
            </div>
            <div className="space-y-2.5">
              <h4 className="font-mono text-[10px] uppercase font-bold text-muted-text">Academic Licenses</h4>
              <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-primary block">Teach&Learn Pro Educator License</span>
                  <span className="text-[10px] text-primary/80 font-mono block mt-0.5">Full access key granted</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
          </ModalBody>
        </>
      )}

      {activeModal === 'preferences' && (
        <>
          <ModalHeader
            title="Teaching Preferences"
            subtitle="Configure default AI assessment styles"
            icon={<Sliders className="w-6 h-6" />}
            onClose={onClose}
          />
          <ModalBody className="space-y-4 text-xs font-mono">
            <div>
              <label className="text-[10px] text-muted-text block mb-1">
                DEFAULT REMEDIAL CLINIC TRIGGER THRESHOLD
              </label>
              <select className="w-full bg-elevated/50 border border-border-color rounded-xl p-2.5 text-primary-text outline-none focus:border-primary">
                <option value="60">Scores falling under 60% (F/D Grade)</option>
                <option value="75">Scores falling under 75% (C/B Grade)</option>
                <option value="90">High mastery tutoring scope under 90%</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-text block mb-1">
                SOCRATIC DIALOGUE VERBOSITY LENGTH
              </label>
              <select className="w-full bg-elevated/50 border border-border-color rounded-xl p-2.5 text-primary-text outline-none focus:border-primary">
                <option value="brief">Direct questions (1-2 sentences feedback)</option>
                <option value="medium">Detailed structural outlines (Recommended)</option>
                <option value="long">Complete step worksheets mapping theories</option>
              </select>
            </div>
            <Button
              className="w-full mt-2"
              onClick={() => {
                onClose();
                onTriggerToast('Teaching guidelines successfully cached.');
              }}
            >
              Save Preferences
            </Button>
          </ModalBody>
        </>
      )}

      {activeModal === 'settings' && (
        <>
          <ModalHeader
            title="System Configurations"
            subtitle="Admin settings & diagnostic utilities"
            icon={<Settings className="w-6 h-6" />}
            onClose={onClose}
          />
          <ModalBody className="space-y-3.5 text-xs">
            <div className="bg-elevated/50 p-4 border border-border-color rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="font-semibold text-primary-text block">Local Save Status</span>
                <span className="text-[9px] text-muted-text font-mono block mt-1">Saves state to browser storage</span>
              </div>
              <Badge variant="success" dot>Autosaved</Badge>
            </div>
            <div className="bg-elevated/50 p-4 border border-border-color rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="font-semibold text-primary-text block">API Configuration</span>
                <span className="text-[9px] text-muted-text font-mono block mt-1">Backend connection settings</span>
              </div>
              <Key className="w-4 h-4 text-primary/80" />
            </div>
          </ModalBody>
        </>
      )}

      {activeModal === 'subscription' && (
        <>
          <ModalHeader
            title="ClassModel Licensing"
            subtitle="Free Tier partner vs. Pro scaling models"
            icon={<Sparkles className="w-6 h-6 animate-pulse" />}
            onClose={onClose}
          />
          <ModalBody className="space-y-4">
            <div className="p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between transition-colors">
              <div>
                <span className="text-xs font-bold text-primary block">PRO LICENSE PASS</span>
                <p className="text-[11px] text-secondary-text leading-relaxed block mt-1">
                  Unlocks unlimited classItem classes, advanced radar visualizers, and direct batch Grading pipelines.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onTriggerToast('Mock Upgrade Successful: Welcome to Pro!');
                }}
              >
                $12/mo
              </Button>
            </div>
          </ModalBody>
        </>
      )}
    </Modal>
  );
}
