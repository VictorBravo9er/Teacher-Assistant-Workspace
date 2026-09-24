import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  ShieldCheck,
  UserCircle2,
  Sliders,
  Key,
  Lock,
} from 'lucide-react';
import { Button, Badge, Modal, ModalHeader, ModalBody } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AccountModalsProps {
  activeModal: 'profile' | 'preferences' | 'settings' | 'subscription' | null;
  onClose: () => void;
  onTriggerToast: (text: string) => void;
}

function ProfileModalContent({
  onClose,
  onTriggerToast,
}: {
  onClose: () => void;
  onTriggerToast: (text: string) => void;
}) {
  const { user, updateUserMetadata } = useAuth();
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  );
  const [title, setTitle] = useState(user?.user_metadata?.title || 'Educator');
  const [affiliation, setAffiliation] = useState(
    user?.user_metadata?.affiliation || 'General Faculty'
  );
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      setTitle(user.user_metadata?.title || 'Educator');
      setAffiliation(user.user_metadata?.affiliation || 'General Faculty');
      setPhone(user.user_metadata?.phone || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (showPasswordChange && newPassword) {
        if (newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters long.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: newPassword,
          data: { has_password: true },
        });
        if (pwdErr) throw pwdErr;
      }

      await updateUserMetadata({
        full_name: fullName.trim(),
        title: title.trim(),
        affiliation: affiliation.trim(),
        phone: phone.trim(),
      });
      onTriggerToast(
        showPasswordChange && newPassword
          ? 'Profile and password updated successfully.'
          : 'Profile updated successfully.'
      );
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      onTriggerToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <ModalHeader
        title={fullName || 'Teacher Profile'}
        subtitle={title || 'Educator'}
        icon={<UserCircle2 className="w-6 h-6" />}
        onClose={onClose}
      />
      <ModalBody className="space-y-4 text-xs">
        <div className="space-y-3 bg-elevated/50 p-4 rounded-2xl border border-border-color shadow-sm">
          <div>
            <label className="text-[10px] text-muted-text font-mono block mb-1">
              FULL NAME
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Elena Rostova"
              className="w-full bg-background border border-border-color rounded-xl px-3 py-2 text-primary-text outline-none focus:border-primary text-xs"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-text font-mono block mb-1">
              ROLE / TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Educator"
              className="w-full bg-background border border-border-color rounded-xl px-3 py-2 text-primary-text outline-none focus:border-primary text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-text font-mono block mb-1">
                AFFILIATION
              </label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="e.g. STEM Faculty"
                className="w-full bg-background border border-border-color rounded-xl px-3 py-2 text-primary-text outline-none focus:border-primary text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-text font-mono block mb-1">
                PHONE NUMBER
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1-555-0199"
                className="w-full bg-background border border-border-color rounded-xl px-3 py-2 text-primary-text outline-none focus:border-primary text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-text font-mono block mb-1">
              REGISTERED EMAIL
            </label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full bg-elevated/80 border border-border-color/60 rounded-xl px-3 py-2 text-muted-text cursor-not-allowed text-xs font-mono"
            />
          </div>
          <div className="pt-2 border-t border-border-color">
            <button
              type="button"
              onClick={() => {
                setShowPasswordChange(!showPasswordChange);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{showPasswordChange ? 'Cancel Password Change' : 'Change Login Password'}</span>
            </button>
            {showPasswordChange && (
              <div className="mt-2.5 space-y-2.5 bg-background/60 p-3 rounded-xl border border-border-color">
                {isSaving && (
                  <div className="p-2.5 bg-primary/5 border border-primary/25 rounded-xl space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-primary">
                      <span>Encrypting &amp; updating credentials...</span>
                      <span className="font-mono">Please wait</span>
                    </div>
                    <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse w-4/5 rounded-full" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-muted-text font-mono block mb-1">
                    NEW PASSWORD
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    disabled={isSaving}
                    className="w-full bg-background border border-border-color rounded-xl px-3 py-2 text-primary-text outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-text font-mono block mb-1">
                    CONFIRM NEW PASSWORD
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    minLength={8}
                    disabled={isSaving}
                    className="w-full bg-background border border-border-color rounded-xl px-3 py-2 text-primary-text outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2.5">
          <h4 className="font-mono text-[10px] uppercase font-bold text-muted-text">
            Academic Licenses
          </h4>
          <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 flex justify-between items-center">
            <div>
              <span className="font-semibold text-primary block">
                Teach&Learn Pro Educator License
              </span>
              <span className="text-[10px] text-primary/80 font-mono block mt-0.5">
                Full access key granted
              </span>
            </div>
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
        </div>
        <Button type="submit" className="w-full mt-2" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </ModalBody>
    </form>
  );
}

function PreferencesModalContent({
  onClose,
  onTriggerToast,
}: {
  onClose: () => void;
  onTriggerToast: (text: string) => void;
}) {
  const { user, updateUserMetadata } = useAuth();
  const userPrefs = user?.user_metadata?.preferences;

  const [remedialThreshold, setRemedialThreshold] = useState<number>(
    userPrefs?.remedialThreshold ?? 70
  );
  const [socraticVerbosity, setSocraticVerbosity] = useState<string>(
    userPrefs?.socraticVerbosity ?? 'Detailed'
  );
  const [feedbackTone, setFeedbackTone] = useState<string>(
    userPrefs?.feedbackTone ?? 'Encouraging'
  );
  const [lateAttendanceWeight, setLateAttendanceWeight] = useState<number>(
    userPrefs?.lateAttendanceWeight ?? 0.5
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userPrefs) {
      if (userPrefs.remedialThreshold !== undefined)
        setRemedialThreshold(Number(userPrefs.remedialThreshold));
      if (userPrefs.socraticVerbosity !== undefined)
        setSocraticVerbosity(userPrefs.socraticVerbosity);
      if (userPrefs.feedbackTone !== undefined)
        setFeedbackTone(userPrefs.feedbackTone);
      if (userPrefs.lateAttendanceWeight !== undefined)
        setLateAttendanceWeight(Number(userPrefs.lateAttendanceWeight));
    }
  }, [userPrefs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserMetadata({
        preferences: {
          remedialThreshold: Number(remedialThreshold),
          socraticVerbosity,
          feedbackTone,
          lateAttendanceWeight: Number(lateAttendanceWeight),
        },
      });
      onTriggerToast('Teaching preferences successfully saved.');
      onClose();
    } catch (err: any) {
      onTriggerToast(`Failed to save preferences: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
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
          <select
            value={remedialThreshold}
            onChange={(e) => setRemedialThreshold(Number(e.target.value))}
            className="w-full bg-elevated/50 border border-border-color rounded-xl p-2.5 text-primary-text outline-none focus:border-primary text-xs"
          >
            <option value={60}>Scores falling under 60% (F/D Grade)</option>
            <option value={70}>Scores falling under 70% (Standard remedial scope)</option>
            <option value={75}>Scores falling under 75% (C/B Grade threshold)</option>
            <option value={80}>Scores falling under 80% (Moderate reinforcement scope)</option>
            <option value={90}>High mastery tutoring scope under 90%</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-text block mb-1">
            SOCRATIC DIALOGUE VERBOSITY LENGTH
          </label>
          <select
            value={socraticVerbosity}
            onChange={(e) => setSocraticVerbosity(e.target.value)}
            className="w-full bg-elevated/50 border border-border-color rounded-xl p-2.5 text-primary-text outline-none focus:border-primary text-xs"
          >
            <option value="Concise">Concise — Direct questions (1-2 sentences feedback)</option>
            <option value="Standard">Standard — Guided reflection & structural inquiry</option>
            <option value="Detailed">Detailed — Complete step worksheets mapping theories (Recommended)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-text block mb-1">
            DEFAULT FEEDBACK TONE
          </label>
          <select
            value={feedbackTone}
            onChange={(e) => setFeedbackTone(e.target.value)}
            className="w-full bg-elevated/50 border border-border-color rounded-xl p-2.5 text-primary-text outline-none focus:border-primary text-xs"
          >
            <option value="Encouraging">Encouraging — Supportive & growth-mindset oriented</option>
            <option value="Academic">Academic — Formal, objective & rubric-aligned</option>
            <option value="Rigorous">Rigorous — High-standard & direct analytical critique</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-text block mb-1">
            LATE ATTENDANCE WEIGHT
          </label>
          <select
            value={lateAttendanceWeight}
            onChange={(e) => setLateAttendanceWeight(Number(e.target.value))}
            className="w-full bg-elevated/50 border border-border-color rounded-xl p-2.5 text-primary-text outline-none focus:border-primary text-xs"
          >
            <option value={0}>0% (Counted as Absent)</option>
            <option value={0.25}>25% (Minor credit)</option>
            <option value={0.5}>50% (Half credit — Standard Default)</option>
            <option value={0.75}>75% (Generous credit)</option>
            <option value={1}>100% (Counted as Present)</option>
          </select>
        </div>
        <Button type="submit" className="w-full mt-2" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </ModalBody>
    </form>
  );
}

export default function AccountModals({
  activeModal,
  onClose,
  onTriggerToast,
}: AccountModalsProps) {
  if (!activeModal) return null;

  return (
    <Modal isOpen={!!activeModal} onClose={onClose} size="md">
      {activeModal === 'profile' && (
        <ProfileModalContent onClose={onClose} onTriggerToast={onTriggerToast} />
      )}

      {activeModal === 'preferences' && (
        <PreferencesModalContent
          onClose={onClose}
          onTriggerToast={onTriggerToast}
        />
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
                <span className="font-semibold text-primary-text block">
                  Local Save Status
                </span>
                <span className="text-[9px] text-muted-text font-mono block mt-1">
                  Saves state to browser storage
                </span>
              </div>
              <Badge variant="success" dot>
                Autosaved
              </Badge>
            </div>
            <div className="bg-elevated/50 p-4 border border-border-color rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="font-semibold text-primary-text block">
                  API Configuration
                </span>
                <span className="text-[9px] text-muted-text font-mono block mt-1">
                  Backend connection settings
                </span>
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
                <span className="text-xs font-bold text-primary block">
                  PRO LICENSE PASS
                </span>
                <p className="text-[11px] text-secondary-text leading-relaxed block mt-1">
                  Unlocks unlimited classItem classes, advanced radar visualizers,
                  and direct batch Grading pipelines.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onTriggerToast(
                    'Subscription management coming soon in enterprise edition'
                  );
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
