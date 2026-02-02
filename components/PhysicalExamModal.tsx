
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface PhysicalExamModalProps {
  patient: any;
  visitId: string;
  onClose: () => void;
  setParentNotification: (val: any) => void;
}

export const PhysicalExamModal: React.FC<PhysicalExamModalProps> = ({ 
  patient, 
  visitId, 
  onClose, 
  setParentNotification 
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [findings, setFindings] = useState('');
  const [recordId, setRecordId] = useState<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const fetchExistingExam = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clinical_physical_exams')
          .select('id, findings')
          .eq('visit_id', visitId)
          .maybeSingle();

        if (error) throw error;
        
        if (data && isMounted.current) {
          setFindings(data.findings || '');
          setRecordId(data.id);
        }
      } catch (err: any) {
        console.error("Fetch Error:", err.message);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchExistingExam();
    return () => { isMounted.current = false; };
  }, [visitId]);

  const handleSave = async () => {
    if (!findings.trim()) {
      alert("Please enter findings before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: patient.id,
        visit_id: visitId,
        findings: findings,
        updated_at: new Date().toISOString()
      };

      let error;
      if (recordId) {
        const { error: updateErr } = await supabase
          .from('clinical_physical_exams')
          .update(payload)
          .eq('id', recordId);
        error = updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('clinical_physical_exams')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        error = insertErr;
      }

      if (error) throw error;

      setParentNotification({
        visible: true,
        title: 'SUCCESS',
        message: recordId ? 'Update of Examination Saved' : 'Physical Examination Saved',
        type: 'success'
      });
      
      onClose();
    } catch (err: any) {
      alert("Database Error: " + err.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/10 z-[6000] flex items-start justify-center p-4 pt-20 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[650px] rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 relative z-10">
        
        <div className="bg-[#e9eaf2] px-6 py-4 flex items-center justify-between border-b shadow-sm">
          <h3 className="text-[20px] text-[#4a4a7d] font-normal tracking-tight uppercase">Physical Examination</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-[22px]"></i>
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6 bg-[#f8f9fa]">
           <div className="flex flex-col gap-2">
              <label className="text-[14px] font-black text-gray-700 uppercase underline decoration-cyan-500 underline-offset-4">
                 Examination Findings
              </label>
              
              <div className="relative mt-2">
                 <textarea 
                    autoFocus
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Enter relevant physical examination findings..."
                    className="w-full h-48 border-2 border-gray-200 rounded-xl p-4 text-[15px] outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50/50 bg-white shadow-inner font-medium transition-all resize-none"
                 />
                 {loading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
                       <i className="fa-solid fa-spinner fa-spin text-cyan-600 text-2xl"></i>
                    </div>
                 )}
              </div>
           </div>

           <div className="flex justify-end pt-2 border-t border-gray-100">
              <button 
                onClick={handleSave}
                disabled={saving || loading}
                className={`${recordId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#17a2b8] hover:bg-[#138496]'} text-white px-10 py-2.5 rounded shadow-lg font-black uppercase tracking-widest transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none flex items-center gap-3`}
              >
                {saving ? (
                   <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                   <i className={`fa-solid ${recordId ? 'fa-check-double' : 'fa-save'}`}></i>
                )}
                {recordId ? 'Update' : 'Save'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
