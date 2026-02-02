
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface RequestLabModalProps {
  patient: any;
  visitId: string;
  scheme: any;
  onClose: () => void;
  setParentNotification: (val: any) => void;
}

export const RequestLabModal: React.FC<RequestLabModalProps> = ({ 
  patient, 
  visitId, 
  scheme, 
  onClose, 
  setParentNotification 
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configTests, setConfigTests] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [history, setHistory] = useState('');
  const [searchTable, setSearchTable] = useState('');
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  // FETCH: Master test catalog and Today's filtered list for the active patient
  const fetchData = async () => {
    setLoading(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [configRes, requestsRes] = await Promise.all([
        supabase.from('config_lab_tests').select('*').order('name'),
        supabase.from('lab_requests')
          .select('*')
          .eq('patient_id', patient?.id)
          .gte('requested_at', startOfToday.toISOString()) 
          .order('requested_at', { ascending: false })
      ]);

      if (isMounted.current) {
        setConfigTests(configRes.data || []);
        setRequests(requestsRes.data || []);
      }
    } catch (err: any) {
      console.error("Data Load Error:", err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [patient?.id]);

  const handleRowClick = (req: any) => {
    const configTest = configTests.find(t => t.name === req.test_name);
    if (configTest) {
      setSelectedTestId(configTest.id.toString());
      setHistory(req.request_note || '');
      setEditingRequestId(req.id);
    }
  };

  const handleSave = async () => {
    if (!patient?.id || !visitId || !selectedTestId) {
        alert("Selection Missing: Please choose a lab test.");
        return;
    }

    const test = configTests.find(t => t.id.toString() === selectedTestId);
    if (!test) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        patient_id: patient.id,
        visit_id: visitId,
        test_id: parseInt(selectedTestId),
        test_name: test.name,
        price: test.test_price || 0,
        status: 'Pending',
        request_note: history,
        requested_by: 'Doctor',
        scheme_name: scheme?.scheme_name || 'Cash Payers',
        requested_at: now
      };

      let error;
      if (editingRequestId) {
        const { error: updateErr } = await supabase
          .from('lab_requests')
          .update(payload)
          .eq('id', editingRequestId);
        error = updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('lab_requests')
          .insert([payload]);
        error = insertErr;
      }

      if (error) throw error;

      const successMsg = editingRequestId ? "Update Successful" : "Test Requested";
      setModalSuccess(successMsg);
      setTimeout(() => { if (isMounted.current) setModalSuccess(null); }, 3000);

      setParentNotification({
        visible: true,
        title: 'SUCCESS',
        message: `${test.name} laboratory request synchronized.`,
        type: 'success'
      });

      setSelectedTestId('');
      setHistory('');
      setEditingRequestId(null);
      await fetchData();

    } catch (err: any) {
      alert("Database Save Error: " + err.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const selectedPrice = configTests.find(t => t.id.toString() === selectedTestId)?.test_price || 0;

  return (
    <div className="fixed inset-0 bg-black/10 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[850px] rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 relative z-10">
        
        {modalSuccess && (
          <div className="absolute top-0 left-0 right-0 z-[7000] animate-in slide-in-from-top duration-300">
            <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-center gap-3 shadow-lg">
              <i className="fa-solid fa-circle-check text-xl"></i>
              <span className="font-bold text-[14px] uppercase tracking-wider">{modalSuccess}</span>
            </div>
          </div>
        )}

        <div className="bg-[#e9eaf2] px-6 py-4 flex items-center justify-between border-b shadow-sm">
          <h3 className="text-[20px] text-[#4a4a7d] font-normal tracking-tight uppercase">Request Lab Test</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-[22px]"></i>
          </button>
        </div>

        <div className="p-8 flex flex-col gap-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-600 uppercase tracking-widest">Patient Scheme</label>
                 <select 
                    disabled 
                    value={scheme?.scheme_name || 'Cash Payers'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-gray-50 outline-none font-bold text-green-700 shadow-inner"
                 >
                    <option>{scheme?.scheme_name || 'Cash Payers'}</option>
                 </select>
              </div>

              <div className="flex flex-col gap-1.5 row-span-2">
                 <label className="text-[12px] font-black text-gray-600 uppercase tracking-widest">History</label>
                 <textarea 
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    placeholder="Notes..."
                    className="w-full h-full border border-gray-300 rounded-lg p-3 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white shadow-inner font-medium resize-none min-h-[100px]" 
                 />
              </div>

              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-600 uppercase tracking-widest">Lab Test</label>
                 <div className="flex gap-4 items-end">
                    <div className="flex-1 relative">
                       <select 
                          value={selectedTestId}
                          onChange={(e) => setSelectedTestId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] outline-none bg-white font-bold appearance-none focus:ring-1 focus:ring-cyan-500 shadow-sm"
                       >
                          <option value="">--Select Lab Test--</option>
                          {configTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                       </div>
                    </div>
                    
                    <button 
                       onClick={handleSave}
                       disabled={saving}
                       className={`${editingRequestId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#17a2b8] hover:bg-[#138496]'} text-white h-10 px-6 rounded-lg flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:bg-gray-200 min-w-[50px]`}
                    >
                       {saving ? (
                         <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                       ) : editingRequestId ? (
                         <span className="text-[11px] font-black uppercase tracking-widest">Update</span>
                       ) : (
                         <i className="fa-solid fa-plus text-lg font-black"></i>
                       )}
                    </button>
                 </div>
                 <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tighter">Price:</span>
                    <span className="text-[15px] font-black text-blue-900">{selectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    {editingRequestId && (
                      <button 
                        onClick={() => { setEditingRequestId(null); setSelectedTestId(''); setHistory(''); }}
                        className="ml-auto text-[10px] font-black text-gray-400 uppercase tracking-tighter hover:text-red-500 underline decoration-red-500 underline-offset-2"
                      >
                        Cancel Update
                      </button>
                    )}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                 <div className="flex items-center gap-3">
                    <h4 className="text-[14px] font-black text-gray-600 uppercase tracking-widest">View: Requested Test</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black uppercase">Today Only</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-400 font-bold uppercase tracking-tight">Search:</span>
                    <input 
                       type="text" 
                       value={searchTable}
                       onChange={(e) => setSearchTable(e.target.value)}
                       className="border border-gray-200 rounded-md px-3 py-1 text-[13px] outline-none w-48 shadow-inner bg-[#fcfdfe]" 
                    />
                 </div>
              </div>
              <div className="border border-gray-200 rounded overflow-hidden shadow-inner bg-white min-h-[250px]">
                 <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-[#fcfdfe] border-b text-gray-500 font-bold sticky top-0">
                       <tr className="text-[11px] font-black uppercase tracking-wider">
                          <th className="px-6 py-2.5 border-r border-gray-100">Test</th>
                          <th className="px-6 py-2.5">Requested On</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 overflow-y-auto max-h-[300px] custom-scrollbar">
                       {loading && requests.length === 0 ? (
                          <tr><td colSpan={2} className="py-20 text-center text-gray-400 italic font-bold uppercase tracking-widest animate-pulse">Syncing...</td></tr>
                       ) : requests.length > 0 ? (
                          requests.filter(r => r.test_name.toLowerCase().includes(searchTable.toLowerCase())).map((r, i) => (
                             <tr 
                              key={i} 
                              onClick={() => handleRowClick(r)}
                              className={`hover:bg-cyan-50 transition-colors cursor-pointer group ${editingRequestId === r.id ? 'bg-blue-50' : ''}`}
                             >
                                <td className={`px-6 py-3 border-r border-gray-100 font-bold uppercase tracking-tight relative ${editingRequestId === r.id ? 'text-blue-700' : 'text-emerald-700'}`}>
                                   {r.test_name}
                                </td>
                                <td className={`px-6 py-3 font-medium ${editingRequestId === r.id ? 'text-blue-700' : 'text-emerald-700'}`}>
                                   {new Date(r.requested_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                </td>
                             </tr>
                          ))
                       ) : (
                          <tr><td colSpan={2} className="py-20 text-center text-gray-300 font-medium italic uppercase tracking-widest opacity-40">No laboratory requests for today</td></tr>
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
