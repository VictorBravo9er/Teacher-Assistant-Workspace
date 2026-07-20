import React, { useState } from 'react';
import { X, Building2, MapPin, Map, Globe, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { InstituteAutocompleteField, Institute } from './InstituteAutocompleteField';
import { FuzzyAutocompleteField } from './FuzzyAutocompleteField';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClass: (name: string, templateId?: string, instituteId?: string) => void;
  onTriggerToast: (text: string) => void;
}

export default function CreateClassModal({ isOpen, onClose, onCreateClass, onTriggerToast }: CreateClassModalProps) {
  const [className, setClassName] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  
  // Existing mode
  const [instituteSearch, setInstituteSearch] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);

  // New mode
  const [newInstName, setNewInstName] = useState('');
  const [newInstType, setNewInstType] = useState('Public School');
  const [newInstDistrict, setNewInstDistrict] = useState('');
  const [newInstCity, setNewInstCity] = useState('');
  const [newInstState, setNewInstState] = useState('');
  const [newInstCountry, setNewInstCountry] = useState('India');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

        // Insert new institute
        const { data, error: insertError } = await supabase
          .from('institutes')
          .insert({
            name: newInstName.trim(),
            type: newInstType,
            district: newInstDistrict.trim() || null,
            city: newInstCity.trim() || null,
            state: newInstState.trim() || null,
            country: newInstCountry.trim() || null
          })
          .select('id')
          .single();

        if (insertError) {
          console.error("Error inserting institute:", insertError);
          setError(insertError.message || 'Failed to create new institute.');
          setIsSubmitting(false);
          return;
        }

        finalInstituteId = data.id;
        onTriggerToast('New institute registered successfully.');
      }

      // Create class
      onCreateClass(className.trim(), undefined, finalInstituteId);
      
      // Reset form
      setClassName('');
      setInstituteSearch('');
      setSelectedInstitute(null);
      setNewInstName('');
      setNewInstDistrict('');
      setNewInstCity('');
      setNewInstState('');
      onClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-color shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border-color bg-elevated/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-display font-semibold text-primary-text">Create New Class</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-elevated rounded-lg text-muted-text hover:text-primary-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-error/10 border border-error/20 p-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-muted-text mb-1.5 uppercase tracking-wider">Class Name</label>
            <input 
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Grade 10 Mathematics"
              className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-primary-text"
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-muted-text uppercase tracking-wider">Institute Details</label>
              <div className="flex bg-elevated rounded-lg p-0.5 border border-border-color/45">
                <button
                  type="button"
                  onClick={() => { setMode('existing'); setError(null); }}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${mode === 'existing' ? 'bg-surface text-primary shadow-sm' : 'text-muted-text hover:text-primary-text'}`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('new'); setError(null); }}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${mode === 'new' ? 'bg-surface text-primary shadow-sm' : 'text-muted-text hover:text-primary-text'}`}
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
              <div className="space-y-4 bg-elevated/20 p-4 rounded-xl border border-border-color/50">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-text mb-1 uppercase tracking-wider">Institute Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                    <input 
                      type="text"
                      value={newInstName}
                      onChange={(e) => setNewInstName(e.target.value)}
                      placeholder="Enter new institute name..."
                      className="w-full bg-surface border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-primary transition-all text-primary-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FuzzyAutocompleteField
                    label="District"
                    icon={<MapPin className="w-full h-full" />}
                    placeholder="Search district"
                    value={newInstDistrict}
                    onChange={setNewInstDistrict}
                    rpcMethod="search_districts"
                  />
                  <FuzzyAutocompleteField
                    label="City"
                    icon={<Building2 className="w-full h-full" />}
                    placeholder="Search city"
                    value={newInstCity}
                    onChange={setNewInstCity}
                    rpcMethod="search_cities"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FuzzyAutocompleteField
                    label="State"
                    icon={<Map className="w-full h-full" />}
                    placeholder="Search state"
                    value={newInstState}
                    onChange={setNewInstState}
                    rpcMethod="search_states"
                  />
                  <FuzzyAutocompleteField
                    label="Country"
                    icon={<Globe className="w-full h-full" />}
                    placeholder="Search country"
                    value={newInstCountry}
                    onChange={setNewInstCountry}
                    rpcMethod="search_countries"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-text mb-1 uppercase tracking-wider">Type</label>
                  <div className="relative">
                    <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                    <select
                      value={newInstType}
                      onChange={(e) => setNewInstType(e.target.value)}
                      className="w-full bg-surface border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none text-primary-text"
                    >
                      <option>Public School</option>
                      <option>Private School</option>
                      <option>University</option>
                      <option>Vocational</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-color">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-text hover:text-primary-text hover:bg-elevated rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-success text-white rounded-lg hover:bg-success/90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-success/20"
            >
              {isSubmitting ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
