import React, { useState, useMemo } from 'react';
import { Building2, MapPin, Map, Globe, Shield, Sparkles, AlertCircle, Layers, Copy, Link2 } from 'lucide-react';
import { InstituteAutocompleteField, Institute } from '@/components/shared/InstituteAutocompleteField';
import { GEOGRAPHY_DATA, DEFAULT_COUNTRY, sanitizeLocationInput } from '@/data/geography';
import { instituteService, InstituteSummary } from '@/services/instituteService';
import { secureStorage } from '@/lib/storage';
import { Constants } from '@/types/db';
import { Template } from '@/types/main';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, FormField, Input } from '@/components/ui';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates?: Template[];
  onCreateClass: (name: string, templateId?: string, instituteId?: string, forkMaterials?: boolean) => void;
  onTriggerToast: (text: string) => void;
}

export default function CreateClassModal({
  isOpen,
  onClose,
  templates = [],
  onCreateClass,
  onTriggerToast,
}: CreateClassModalProps) {
  const [className, setClassName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [forkMaterials, setForkMaterials] = useState<boolean>(true);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  // Existing mode
  const [instituteSearch, setInstituteSearch] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);

  // New mode
  const [newInstName, setNewInstName] = useState('');
  const [newInstType, setNewInstType] = useState<string>(
    Constants.public.Enums.institute_type[0],
  );
  const [newInstDistrict, setNewInstDistrict] = useState('');
  const [newInstCity, setNewInstCity] = useState('');
  const [newInstState, setNewInstState] = useState('');
  const [newInstCountry, setNewInstCountry] = useState(DEFAULT_COUNTRY);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cascading administrative locations
  const availableStates = useMemo(() => {
    return Object.keys(GEOGRAPHY_DATA[newInstCountry]?.states || {}).sort();
  }, [newInstCountry]);

  const availableDistricts = useMemo(() => {
    if (!newInstState) return [];
    return (GEOGRAPHY_DATA[newInstCountry]?.states[newInstState] || []).slice().sort();
  }, [newInstCountry, newInstState]);

  const availableCities = useMemo(() => {
    if (!newInstState) return [];
    const cached = secureStorage.getCachedItemWithTTL<InstituteSummary[]>('edu_institutes_directory') || [];
    const set = new Set<string>();
    cached.forEach((inst) => {
      const matchState = inst.state?.toLowerCase() === newInstState.toLowerCase();
      const matchDistrict = !newInstDistrict || inst.district?.toLowerCase() === newInstDistrict.toLowerCase();
      if (matchState && matchDistrict && inst.city) {
        set.add(inst.city);
      }
    });
    return Array.from(set).sort();
  }, [newInstState, newInstDistrict]);

  if (!isOpen) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const templateHasMaterials = selectedTemplate && selectedTemplate.materialsPreset && selectedTemplate.materialsPreset.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setError('Class name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let finalInstituteId: string | undefined = undefined;

    try {
      if (mode === 'existing') {
        if (!selectedInstitute) {
          setError('Please select an institute from the dropdown.');
          setIsSubmitting(false);
          return;
        }
        finalInstituteId = selectedInstitute.id;
      } else {
        if (!newInstName.trim()) {
          setError('Institute name is required.');
          setIsSubmitting(false);
          return;
        }

        const newInstitute = await instituteService.createInstitute({
          name: newInstName,
          type: newInstType,
          district: newInstDistrict || null,
          city: newInstCity || null,
          state: newInstState || null,
          country: newInstCountry || null,
        });

        finalInstituteId = newInstitute.id;
        onTriggerToast('New institute registered successfully.');
      }

      onCreateClass(
        className.trim(),
        selectedTemplateId || undefined,
        finalInstituteId,
        forkMaterials
      );

      setClassName('');
      setSelectedTemplateId('');
      setForkMaterials(true);
      setInstituteSearch('');
      setSelectedInstitute(null);
      setNewInstName('');
      setNewInstDistrict('');
      setNewInstCity('');
      setNewInstState('');
      setNewInstCountry(DEFAULT_COUNTRY);
      onClose();
    } catch (err: unknown) {
      console.error('Create class/institute failed:', err);
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        title="Create New Class"
        icon={<Sparkles className="w-5 h-5 text-primary" />}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <ModalBody className="p-5 space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/20 p-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
          )}

          <FormField label="Class Name">
            <Input
              id="create-class-name-input"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Grade 10 Mathematics"
              autoFocus
            />
          </FormField>

          {/* Optional Base Template Selector */}
          {templates.length > 0 && (
            <div className="space-y-2 bg-elevated/40 p-3.5 rounded-2xl border border-border-color/60">
              <FormField label="Base Curriculum Template (Optional)">
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                  <select
                    id="create-class-template-select"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-surface border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none text-primary-text"
                  >
                    <option value="">None (Start from scratch)</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.materialsPreset?.length || 0} materials, {tpl.instructions?.length || 0} rubrics)
                      </option>
                    ))}
                  </select>
                </div>
              </FormField>

              {/* Material Linking / Forking Choice */}
              {templateHasMaterials && (
                <div className="mt-3 pt-3 border-t border-border-color/40 space-y-2">
                  <span className="text-[10px] font-semibold text-muted-text uppercase tracking-wider block">
                    Material Duplication Strategy
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      onClick={() => setForkMaterials(true)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        forkMaterials
                          ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                          : 'bg-surface/60 border-border-color/60 hover:bg-elevated/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="material-strategy"
                        checked={forkMaterials}
                        onChange={() => setForkMaterials(true)}
                        className="mt-0.5 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="text-xs font-semibold text-primary-text flex items-center gap-1.5 font-display">
                          <Copy className="w-3 h-3 text-primary" />
                          Independent Copies (Recommended)
                        </span>
                        <p className="text-[11px] text-muted-text mt-0.5 leading-snug">
                          Creates dedicated material records for this class. Modifying rubrics or contents here will not alter the template or other classes.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setForkMaterials(false)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        !forkMaterials
                          ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                          : 'bg-surface/60 border-border-color/60 hover:bg-elevated/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="material-strategy"
                        checked={!forkMaterials}
                        onChange={() => setForkMaterials(false)}
                        className="mt-0.5 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="text-xs font-semibold text-primary-text flex items-center gap-1.5 font-display">
                          <Link2 className="w-3 h-3 text-secondary-text" />
                          Shared Reference
                        </span>
                        <p className="text-[11px] text-muted-text mt-0.5 leading-snug">
                          Links directly to the template materials. Edits to rubrics or content will sync across all linked classes and templates.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-muted-text uppercase tracking-wider">
                Institute Details
              </label>
              <div className="flex bg-elevated rounded-lg p-0.5 border border-border-color/45">
                <button
                  id="create-class-mode-existing-button"
                  type="button"
                  onClick={() => {
                    setMode('existing');
                    setError(null);
                  }}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                    mode === 'existing'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-muted-text hover:text-primary-text'
                  }`}
                >
                  Select Existing
                </button>
                <button
                  id="create-class-mode-new-button"
                  type="button"
                  onClick={() => {
                    setMode('new');
                    setError(null);
                  }}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                    mode === 'new'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-muted-text hover:text-primary-text'
                  }`}
                >
                  Add New
                </button>
              </div>
            </div>

            {mode === 'existing' ? (
              <InstituteAutocompleteField
                label="Search Institute"
                icon={<Building2 className="w-full h-full" />}
                placeholder="Type to search institutes..."
                value={instituteSearch}
                onChangeDisplay={setInstituteSearch}
                onSelect={setSelectedInstitute}
              />
            ) : (
              <div className="space-y-3 bg-elevated/30 p-4 rounded-2xl border border-border-color/60">
                <FormField label="Institute Name">
                  <Input
                    icon={<Building2 className="w-3.5 h-3.5" />}
                    value={newInstName}
                    onChange={(e) => setNewInstName(e.target.value)}
                    placeholder="Enter new institute name..."
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Country">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                      <select
                        id="create-class-country-select"
                        value={newInstCountry}
                        onChange={(e) => {
                          setNewInstCountry(e.target.value);
                          setNewInstState('');
                          setNewInstDistrict('');
                          setNewInstCity('');
                        }}
                        className="w-full bg-surface border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none text-primary-text cursor-pointer"
                      >
                        {Object.keys(GEOGRAPHY_DATA).map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                  </FormField>

                  <FormField label="State / Province">
                    <div className="relative">
                      <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                      <select
                        id="create-class-state-select"
                        value={newInstState}
                        onChange={(e) => {
                          setNewInstState(e.target.value);
                          setNewInstDistrict('');
                          setNewInstCity('');
                        }}
                        className="w-full bg-surface border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none text-primary-text cursor-pointer"
                      >
                        <option value="">Select State / UT</option>
                        {availableStates.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="District">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                      <select
                        id="create-class-district-select"
                        value={newInstDistrict}
                        disabled={!newInstState}
                        onChange={(e) => {
                          setNewInstDistrict(e.target.value);
                        }}
                        className="w-full bg-surface border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none text-primary-text cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {newInstState ? 'Select District' : 'Select State First'}
                        </option>
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                  </FormField>

                  <FormField label="City / Campus">
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text pointer-events-none" />
                      <input
                        id="create-class-city-input"
                        type="text"
                        list="available-cities-list"
                        value={newInstCity}
                        onChange={(e) => setNewInstCity(e.target.value)}
                        onBlur={() => setNewInstCity(sanitizeLocationInput(newInstCity))}
                        placeholder={newInstDistrict ? `e.g. ${newInstDistrict} Central` : 'Enter city or campus'}
                        className="w-full bg-surface border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary transition-all text-primary-text"
                      />
                      <datalist id="available-cities-list">
                        {availableCities.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                  </FormField>
                </div>

                <FormField label="Type">
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                    <select
                      value={newInstType}
                      onChange={(e) => setNewInstType(e.target.value)}
                      className="w-full bg-elevated/60 border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none text-primary-text"
                    >
                      {Constants.public.Enums.institute_type.map((i_type) => (
                        <option key={i_type} value={i_type}>
                          {i_type}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            id="create-class-submit-button"
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
          >
            Create Class
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
