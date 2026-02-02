
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface RequestRadiologyModalProps {
  patient: any;
  visitId: string;
  scheme: any;
  onClose: () => void;
  setParentNotification: (val: any) => void;
}

export const RequestRadiologyModal: React.FC<RequestRadiologyModalProps> = ({ 
  patient, 
  visitId, 
  scheme, 
  onClose, 
  setParentNotification 
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [history, setHistory] = useState('');
  const [searchTable, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const isMounted = useRef(true);

  // FETCH: Master radiology services and existing requests for current visit
  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, requestsRes] = await Promise.all([
        supabase
          .from('config_services')
          .select('*')
          .eq('is_examination', true)
          .order('name'),
        supabase
          .from('radiology_requests')
          .select('*')
          .eq('visit_id', visitId)
          .order('requested_at', { ascending: false })
      ]);

      if (isMounted.current) {
        setAvailableExams(servicesRes.data || []);
        setRequests(requestsRes.data || []);
      }
    } catch (err: any) {
      console.error("Radiology Modal Fetch Error:", err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [visitId]);

  // FORM ACTION: Add or Update logic
  const handleSave = async () => {
    if (!selectedExamId) {
      alert("Please select an examination.");
      return;
    }

    const exam = availableExams.find(e => e.id.toString() === selectedExamId);
    if (!exam) return;

    setSaving(true);
    try {
      const payload = {
        patient_id: patient.id,
        visit_id: visitId,
        test_name: exam.name, // Mapping to test_name
        examination_name: exam.name, // Mapping to examination_name to prevent schema errors
        request_note: history,
        price: exam.rate || 0,
        status: 'Pending',
        requested_at: new Date().toISOString(),
        requested_by: 'Doctor',
        scheme_name: scheme?.scheme_name || 'Cash Payers'
      };

      let error;
      if (editingId) {
        // UPDATE Mode
        const { error: updateErr } = await supabase
          .from('radiology_requests')
          .update(payload)
          .eq('id', editingId);
        error = updateErr;
      } else {
        // ADD Mode
        const { error: insertErr } = await supabase
          .from('radiology_requests')
          .insert([payload]);
        error = insertErr;
      }

      if (error) throw error;

      // SPECIFIC NOTIFICATIONS
      setParentNotification({
        visible: true,
        title: 'SUCCESS',
        message: editingId ? 'Examination Update Successful' : 'Radiology Requested Successfully',
        type: 'success'
      });

      // Reset form and switch back to Add (+) mode
      setSelectedExamId('');
      setHistory('');
      setEditingId(null);
      await fetchData();

    } catch (err: any) {
      alert("Database Save Error: " + err.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  // UI ACTION: Selection logic for update mode
  const handleRowClick = (req: any) => {
    const matchedExam = availableExams.find(e => e.name === req.test_name || e.name === req.examination_name);
    if (matchedExam) {
      setSelectedExamId(matchedExam.id.toString());
      setHistory(req.request_note || '');
      setEditingId(req.id);
    }
  };

  // AUTO-PRICE: Lookup rate from master service list
  const selectedPrice = availableExams.find(e => e.id.toString() === selectedExamId)?.rate || 0;

  return (
    <div className="fixed inset-0 bg-black/10 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Background catch-layer - 0% blur (crystal clear) */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-[680px] rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 relative z-10">
        
        {/* Modal Header */}
        <div className="bg-[#ececf6] px-5 py-3 flex items-center justify-between border-b shadow-sm">
          <h3 className="text-[19px] text-[#4a4a7d] font-normal tracking-tight uppercase">Request Examination</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-[20px]"></i>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {/* Left Column Fields */}
              <div className="flex flex-col gap-4">
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-black text-gray-600 uppercase tracking-widest">Patient Scheme</label>
                    <div className="relative">
                      <select 
                         disabled 
                         className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-gray-50 outline-none text-green-700 font-bold appearance-none cursor-not-allowed shadow-inner"
                      >
                         <option>{scheme?.scheme_name || 'Cash Payers'}</option>
                      </select>
                    </div>
                 </div>

                 <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-black text-gray-600 uppercase tracking-widest">Examination</label>
                    <div className="relative">
                       <select 
                          value={selectedExamId}
                          onChange={(e) => setSelectedExamId(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none shadow-sm font-bold text-blue-900"
                       >
                          <option value="">--Select Examination--</option>
                          {availableExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                       </select>
                       <i className="fa-solid fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                 </div>
              </div>

              {/* Right Column Fields */}
              <div className="flex flex-col gap-4">
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-black text-gray-600 uppercase tracking-widest">History</label>
                    <textarea 
                       value={history}
                       onChange={(e) => setHistory(e.target.value)}
                       placeholder="Clinical indications..."
                       className="w-full h-24 border border-gray-300 rounded p-3 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white shadow-inner resize-none font-medium" 
                    />
                 </div>
                 
                 <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Price:</span>
                       <span className="text-[16px] font-black text-blue-800">
                         {selectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </span>
                    </div>
                    
                    {/* Smart Button Logic */}
                    <div className="flex gap-2">
                      {editingId && (
                        <button 
                          onClick={() => { setEditingId(null); setSelectedExamId(''); setHistory(''); }}
                          className="bg-gray-100 text-gray-500 w-10 h-10 rounded flex items-center justify-center hover:bg-gray-200 shadow-sm"
                          title="Cancel Update"
                        >
                          <i className="fa-solid fa-rotate-left"></i>
                        </button>
                      )}
                      <button 
                        onClick={handleSave}
                        disabled={saving}
                        className={`${editingId ? 'bg-orange-500 hover:bg-orange-600 px-6' : 'bg-[#17a2b8] hover:bg-[#138496] w-10'} text-white h-10 rounded flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:bg-gray-200 min-w-[40px]`}
                      >
                         {saving ? (
                           <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                         ) : editingId ? (
                           <span className="text-[11px] font-black uppercase tracking-widest">Update</span>
                         ) : (
                           <i className="fa-solid fa-plus text-lg"></i>
                         )}
                      </button>
                    </div>
                 </div>
              </div>
           </div>

           {/* Table Section */}
           <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                 <h4 className="text-[13px] font-black text-gray-500 uppercase tracking-widest">View: Requested Examinations</h4>
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">Search:</span>
                    <input 
                       type="text" 
                       value={searchTable}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="border border-gray-200 rounded px-2.5 py-1 text-[12px] outline-none w-44 shadow-inner bg-[#fcfdfe]" 
                    />
                 </div>
              </div>
              
              <div className="border border-gray-200 rounded-sm overflow-hidden shadow-inner bg-white min-h-[180px]">
                 <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-[#f8f9fa] border-b text-gray-500 font-bold sticky top-0 uppercase text-[10px] tracking-widest">
                       <tr>
                          <th className="px-6 py-2.5 border-r border-gray-100">Examination</th>
                          <th className="px-6 py-2.5">Requested On</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {loading && requests.length === 0 ? (
                          <tr><td colSpan={2} className="py-20 text-center text-gray-400 italic font-bold uppercase tracking-widest animate-pulse">Syncing visit data...</td></tr>
                       ) : requests.length > 0 ? (
                          requests.filter(r => (r.test_name || r.examination_name || '').toLowerCase().includes(searchTable.toLowerCase())).map((r, i) => (
                             <tr 
                              key={i} 
                              onClick={() => handleRowClick(r)}
                              className={`hover:bg-cyan-50 transition-colors cursor-pointer group ${editingId === r.id ? 'bg-orange-50' : ''}`}
                             >
                                <td className={`px-6 py-3 border-r border-gray-100 font-bold uppercase tracking-tight ${editingId === r.id ? 'text-orange-700' : 'text-blue-700'}`}>
                                   {r.test_name || r.examination_name}
                                </td>
                                <td className={`px-6 py-3 font-medium text-gray-500`}>
                                   {new Date(r.requested_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                </td>
                             </tr>
                          ))
                       ) : (
                          <tr><td colSpan={2} className="py-20 text-center text-gray-300 font-medium italic uppercase tracking-widest opacity-40 select-none">No examinations requested for this visit</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
