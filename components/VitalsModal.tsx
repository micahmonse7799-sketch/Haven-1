
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface VitalsModalProps {
  patient: any;
  visitId: string;
  onClose: () => void;
  setParentNotification: (val: any) => void;
}

export const VitalsModal: React.FC<VitalsModalProps> = ({ patient, visitId, onClose, setParentNotification }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generalExams, setGeneralExams] = useState<any[]>([]);
  const [systemicExams, setSystemicExams] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<string[]>([]);
  const [nursingNotes, setNursingNotes] = useState('');
  
  const [suggestedRemarks, setSuggestedRemarks] = useState<string[]>([]);
  const [vitalInput, setVitalInput] = useState({ name: '', remark: '' });
  const [systemicInput, setSystemicInput] = useState({ system: '', remark: '', anomalous: false });
  const [procedureInput, setProcedureInput] = useState('');

  const isMounted = useRef(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examRes, procRes, visitRes] = await Promise.all([
        supabase.from('clinical_examinations').select('*').eq('visit_id', visitId),
        supabase.from('patient_procedures').select('procedure_name').eq('visit_id', visitId),
        supabase.from('patient_visits').select('nursing_notes').eq('id', visitId).single()
      ]);

      if (isMounted.current) {
        setGeneralExams((examRes.data || []).filter(e => e.exam_type === 'General').map(e => ({ name: e.parameter_name, remark: e.finding, isCritical: e.is_critical })));
        setSystemicExams((examRes.data || []).filter(e => e.exam_type === 'Systemic').map(e => ({ system: e.parameter_name, remark: e.finding, anomalous: e.is_anomalous })));
        setProcedures((procRes.data || []).map(p => p.procedure_name));
        setNursingNotes(visitRes.data?.nursing_notes || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [visitId]);

  useEffect(() => {
    if (vitalInput.name) fetchVitalScales(vitalInput.name);
    else setSuggestedRemarks([]);
  }, [vitalInput.name]);

  const fetchVitalScales = async (vitalName: string) => {
    try {
      const { data } = await supabase.from('vitals_scales').select('suggested_value').eq('vital_name', vitalName);
      if (isMounted.current && data) setSuggestedRemarks(data.map(d => d.suggested_value).filter(Boolean));
    } catch (err) { console.error(err); }
  };

  const isCriticalValue = (name: string, remark: string) => {
    const val = parseFloat(remark);
    if (isNaN(val)) return false;
    if (name === 'Temperature') return val > 38 || val < 35;
    if (name === 'Body mass index (BMI)') return val > 30 || val < 18.5;
    if (name === 'Blood Pressure') {
        const parts = remark.split('/');
        if (parts.length === 2) {
            const sys = parseFloat(parts[0]);
            const dia = parseFloat(parts[1]);
            return sys > 140 || dia > 90;
        }
    }
    return false;
  };

  const handleAddGeneralExam = () => {
    if (!vitalInput.name || !vitalInput.remark) return;
    const newEntry = { name: vitalInput.name, remark: vitalInput.remark, isCritical: isCriticalValue(vitalInput.name, vitalInput.remark) };
    const updated = [...generalExams, newEntry];
    
    // Auto BMI logic
    const weight = updated.find(e => e.name === 'Weight')?.remark;
    const height = updated.find(e => e.name === 'Height')?.remark;
    if (weight && height) {
        const w = parseFloat(weight);
        const h = parseFloat(height) / 100;
        if (w > 0 && h > 0) {
            const bmiValue = (w / (h * h)).toFixed(2);
            const bmiEntry = { name: 'Body mass index (BMI)', remark: bmiValue, isCritical: parseFloat(bmiValue) > 30 || parseFloat(bmiValue) < 18.5 };
            const existingIdx = updated.findIndex(e => e.name === 'Body mass index (BMI)');
            if (existingIdx > -1) updated[existingIdx] = bmiEntry;
            else updated.push(bmiEntry);
        }
    }
    setGeneralExams(updated);
    setVitalInput({ name: '', remark: '' });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await supabase.from('clinical_examinations').delete().eq('visit_id', visitId);
      await supabase.from('patient_procedures').delete().eq('visit_id', visitId);

      const examData = [
          ...generalExams.map(e => ({ visit_id: visitId, exam_type: 'General', parameter_name: e.name, finding: e.remark, is_critical: e.isCritical })),
          ...systemicExams.map(e => ({ visit_id: visitId, exam_type: 'Systemic', parameter_name: e.system, finding: e.remark, is_anomalous: e.anomalous }))
      ];
      const procedureData = procedures.map(p => ({ visit_id: visitId, procedure_name: p }));

      const ops = [
          supabase.from('patient_visits').update({ nursing_notes: nursingNotes }).eq('id', visitId)
      ];
      if (examData.length > 0) ops.push(supabase.from('clinical_examinations').insert(examData));
      if (procedureData.length > 0) ops.push(supabase.from('patient_procedures').insert(procedureData));

      const results = await Promise.all(ops);
      const err = results.find(r => r.error);
      if (err) throw err.error;

      setParentNotification({ visible: true, title: 'VITALS SAVED', message: `Examination records for ${patient.surname} updated.`, type: 'success' });
      onClose();
    } catch (err: any) {
      alert("Save Failed: " + err.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/10 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[950px] rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 flex flex-col max-h-[90vh] relative z-10">
        <div className="bg-[#e9eaf2] px-6 py-4 flex items-center justify-between border-b shadow-sm shrink-0">
          <h3 className="text-[20px] text-[#4a4a7d] font-normal tracking-tight uppercase">Patient's Vitals</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-[22px]"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar bg-[#f8f9fa] flex flex-col gap-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="flex flex-col gap-6">
                 <div>
                    <h4 className="text-[14px] font-black text-gray-700 uppercase underline decoration-cyan-500 mb-4">General Examination</h4>
                    <div className="grid grid-cols-2 gap-4 items-end mb-4">
                       <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase">Parameter</label>
                          <select value={vitalInput.name} onChange={(e) => setVitalInput({...vitalInput, name: e.target.value})} className="border border-gray-300 rounded px-2 py-1.5 text-[13px] bg-white outline-none focus:ring-1 focus:ring-cyan-500">
                             <option value=""></option>
                             <option value="Temperature">Temperature</option>
                             <option value="Blood Pressure">Blood Pressure</option>
                             <option value="Weight">Weight</option>
                             <option value="Height">Height</option>
                             <option value="Body mass index (BMI)">Body mass index (BMI)</option>
                             <option value="Heart Rate BpM">Heart Rate BpM</option>
                          </select>
                       </div>
                       <div className="flex gap-2 items-center">
                          <div className="flex-1 flex flex-col gap-1">
                             <label className="text-[11px] font-bold text-gray-500 uppercase">Remark</label>
                             <input list="suggested-remarks" type="text" value={vitalInput.remark} onChange={(e) => setVitalInput({...vitalInput, remark: e.target.value})} className="border border-gray-300 rounded px-2 py-1.5 text-[13px] outline-none" placeholder="finding..." />
                             <datalist id="suggested-remarks">{suggestedRemarks.map((r, i) => <option key={i} value={r} />)}</datalist>
                       </div>
                          <button onClick={handleAddGeneralExam} className="bg-cyan-600 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-cyan-700 shadow-sm transition-all active:scale-90"><i className="fa-solid fa-plus text-xs"></i></button>
                       </div>
                    </div>
                    <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-inner">
                       <table className="w-full text-left text-[12px]">
                          <thead className="bg-[#fcfdfe] text-gray-400 font-black border-b">
                             <tr><th className="px-4 py-2 border-r">General Exam</th><th className="px-4 py-2">Remark</th><th className="w-10"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {generalExams.map((e, i) => (
                                <tr key={i} className={`group ${e.isCritical ? 'text-red-600 font-bold bg-rose-50/30' : 'text-gray-700'}`}>
                                   <td className="px-4 py-2 border-r border-gray-100">{e.name}</td>
                                   <td className="px-4 py-2">{e.remark}</td>
                                   <td className="text-center">
                                      <button onClick={() => setGeneralExams(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <i className="fa-solid fa-trash-can text-[10px]"></i>
                                      </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[14px] font-black text-gray-700 uppercase underline decoration-cyan-500 mb-4">Procedures</h4>
                    <div className="flex gap-2 items-end mb-4">
                       <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase">Procedure</label>
                          <select value={procedureInput} onChange={(e) => setProcedureInput(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-[13px] bg-white">
                             <option value=""></option>
                             <option value="PAP SMEAR">PAP SMEAR</option>
                             <option value="Wound Dressing">Wound Dressing</option>
                             <option value="Nebulization">Nebulization</option>
                          </select>
                       </div>
                       <button onClick={() => { if(procedureInput) setProcedures([...procedures, procedureInput]); setProcedureInput(''); }} className="bg-cyan-600 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-cyan-700"><i className="fa-solid fa-plus text-xs"></i></button>
                    </div>
                    <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-inner">
                       <table className="w-full text-left text-[12px]">
                          <thead className="bg-[#fcfdfe] text-gray-400 font-black border-b">
                             <tr><th className="px-4 py-2 border-r">Procedure</th><th className="w-10"></th></tr>
                          </thead>
                          <tbody>
                             {procedures.map((p, i) => (
                                <tr key={i} className="group text-gray-700 border-b last:border-b-0">
                                   <td className="px-4 py-2 border-r border-gray-100 uppercase">{p}</td>
                                   <td className="text-center">
                                      <button onClick={() => setProcedures(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                         <i className="fa-solid fa-trash-can text-[10px]"></i>
                                      </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-6">
                 <div>
                    <h4 className="text-[14px] font-black text-gray-700 uppercase underline decoration-cyan-500 mb-4">Body System</h4>
                    <div className="grid grid-cols-2 gap-4 items-end mb-2">
                       <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase">Body System</label>
                          <input type="text" value={systemicInput.system} onChange={(e) => setSystemicInput({...systemicInput, system: e.target.value})} className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" placeholder="e.g. Skin" />
                       </div>
                       <div className="flex gap-2 items-center">
                          <div className="flex-1 flex flex-col gap-1">
                             <label className="text-[11px] font-bold text-gray-500 uppercase">Remark</label>
                             <input type="text" value={systemicInput.remark} onChange={(e) => setSystemicInput({...systemicInput, remark: e.target.value})} className="border border-gray-300 rounded px-2 py-1.5 text-[13px]" placeholder="finding..." />
                          </div>
                          <button onClick={() => { if(systemicInput.system) setSystemicExams([...systemicExams, systemicInput]); setSystemicInput({system:'', remark:'', anomalous:false}); }} className="bg-cyan-600 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-cyan-700"><i className="fa-solid fa-plus text-xs"></i></button>
                       </div>
                    </div>
                    <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                       <input type="checkbox" checked={systemicInput.anomalous} onChange={(e) => setSystemicInput({...systemicInput, anomalous: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                       <span className="text-[12px] text-gray-600 font-bold uppercase tracking-tight">Is Anomalous</span>
                    </label>
                    <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-inner">
                       <table className="w-full text-left text-[12px]">
                          <thead className="bg-[#fcfdfe] text-gray-400 font-black border-b">
                             <tr><th className="px-4 py-2 border-r">Body System</th><th className="px-4 py-2">Remark</th><th className="w-10"></th></tr>
                          </thead>
                          <tbody>
                             {systemicExams.map((s, i) => (
                                <tr key={i} className={`group border-b last:border-b-0 ${s.anomalous ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                                   <td className="px-4 py-2 border-r border-gray-100">{s.system}</td>
                                   <td className="px-4 py-2">{s.remark}</td>
                                   <td className="text-center">
                                      <button onClick={() => setSystemicExams(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                         <i className="fa-solid fa-trash-can text-[10px]"></i>
                                      </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="flex-1 flex flex-col">
                    <h4 className="text-[14px] font-black text-gray-700 uppercase underline decoration-cyan-500 mb-4">Nursing Notes</h4>
                    <div className="flex-1 flex flex-col gap-1.5">
                       <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Notes</label>
                       <textarea value={nursingNotes} onChange={(e) => setNursingNotes(e.target.value)} className="w-full flex-1 border border-gray-300 rounded-lg p-4 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white shadow-inner font-medium resize-none min-h-[150px]" placeholder="Notes..."></textarea>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex justify-end shrink-0">
           <button 
              onClick={handleSaveAll}
              disabled={saving || loading}
              className={`bg-[#17a2b8] text-white px-12 py-3 rounded-sm font-black shadow-xl hover:bg-[#138496] uppercase tracking-[0.2em] transition-all active:scale-95 disabled:bg-gray-300 flex items-center gap-3`}
           >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-double"></i>}
              Save Vitals
           </button>
        </div>
      </div>
    </div>
  );
};
