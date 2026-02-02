
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { QueueModal } from './QueueModal';

interface LaboratoryProps {
  onBack: () => void;
  currentRoom: string;
  onOpenRoomModal: () => void;
}

interface TestResultComponent {
  id: string | number;
  test_name: string;
  component_name: string;
  lower_limit: string;
  upper_limit: string;
  units: string;
  value: string;
  result_option: string;
  is_anomalous: boolean;
}

const DetailRow: React.FC<{ label: string; value: any; color?: string }> = ({ label, value, color = "text-gray-900" }) => (
  <div className="flex items-baseline justify-between border-b border-white/60 pb-0.5 group">
    <span className="font-bold text-gray-700 whitespace-nowrap mr-4 uppercase text-[11px] tracking-tight opacity-70">{label}</span>
    <span className={`font-semibold text-right truncate ${color}`}>{value || ''}</span>
  </div>
);

export const Laboratory: React.FC<LaboratoryProps> = ({ onBack, currentRoom, onOpenRoomModal }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPatientDetailsVisible, setIsPatientDetailsVisible] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  
  // Data States
  const [queueList, setQueueList] = useState<any[]>([]);
  const [configTests, setConfigTests] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  
  // Form States
  const [manualTestId, setManualTestId] = useState('');
  const [orderedTests, setOrderedTests] = useState<any[]>([]);
  const [activeTest, setActiveTest] = useState<any>(null);
  const [activeComponents, setActiveComponents] = useState<TestResultComponent[]>([]);
  const [componentSearch, setComponentSearch] = useState('');

  const isMounted = useRef(true);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_requests')
        .select(`
          *,
          patients_registry (
            id, id_number, surname, other_names, dob, sex, residence, occupation, notes
          )
        `)
        .eq('status', 'Pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      
      if (isMounted.current) {
        const uniqueQueue = Array.from(new Map(data?.map(item => [item.visit_id, item])).values());
        setQueueList(uniqueQueue);
      }
    } catch (err: any) {
      console.error('Queue Fetch Error:', err.message);
    }
  };

  const fetchConfig = async () => {
    try {
      const { data } = await supabase.from('config_lab_tests').select('*').order('name');
      if (isMounted.current) setConfigTests(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchQueue();
    fetchConfig();
    const poll = setInterval(fetchQueue, 15000);
    const time = setInterval(() => setCurrentTime(new Date()), 10000);
    
    const clickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setIsActionsOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);

    return () => {
      isMounted.current = false;
      clearInterval(poll);
      clearInterval(time);
      document.removeEventListener('mousedown', clickOutside);
    };
  }, []);

  const handlePatientSelect = async (patientInQueue: any) => {
    setLoading(true);
    try {
      const p = patientInQueue.patients_registry;
      const visitId = patientInQueue.visit_id;
      
      const { data: visitRequests } = await supabase
        .from('lab_requests')
        .select('*')
        .eq('visit_id', visitId)
        .eq('status', 'Pending');

      if (isMounted.current) {
        setSelectedPatient({ ...p, visit_id: visitId });
        setActiveVisitId(visitId);
        setOrderedTests(visitRequests || []);
        
        if (visitRequests && visitRequests.length > 0) {
          setActiveTest(visitRequests[0]);
          loadComponents(visitRequests[0].test_id, visitRequests[0].test_name);
        } else {
          setActiveTest(null);
          setActiveComponents([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const loadComponents = async (testId: number, testName: string) => {
    try {
      const { data, error } = await supabase
        .from('config_lab_test_components')
        .select('*')
        .eq('parent_test_id', testId);
      
      if (error) throw error;

      if (isMounted.current) {
        const entryReady = (data || []).map(c => ({
          id: `comp-${c.id}-${Date.now()}`,
          test_name: testName,
          component_name: c.name,
          lower_limit: c.lower_limit || '',
          upper_limit: c.upper_limit || '',
          units: c.units || '',
          value: '',
          result_option: 'Normal',
          is_anomalous: false
        }));
        setActiveComponents(entryReady);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddManualTest = async () => {
    if (!selectedPatient || !manualTestId) return;
    
    const test = configTests.find(t => t.id.toString() === manualTestId);
    if (!test) return;

    setSaving(true);
    try {
      const payload = {
        patient_id: selectedPatient.id,
        visit_id: activeVisitId,
        test_id: test.id,
        test_name: test.name,
        price: test.test_price || 0,
        status: 'Pending',
        requested_by: 'Lab Technician',
        requested_at: new Date().toISOString(),
        requested_from: 'Laboratory'
      };

      const { data, error } = await supabase
        .from('lab_requests')
        .insert([payload])
        .select();

      if (error) throw error;

      if (isMounted.current) {
        setOrderedTests(prev => [...prev, data[0]]);
        setManualTestId('');
        setActiveTest(data[0]);
        loadComponents(test.id, test.name);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateValue = (compId: string | number, value: string) => {
    setActiveComponents(prev => prev.map(c => {
      if (c.id === compId) {
        const updated = { ...c, value };
        const valNum = parseFloat(value);
        const low = parseFloat(c.lower_limit);
        const high = parseFloat(c.upper_limit);
        
        if (!isNaN(valNum)) {
          const isAnom = (!isNaN(low) && valNum < low) || (!isNaN(high) && valNum > high);
          updated.is_anomalous = isAnom;
          if (!isNaN(high) && valNum > high) updated.result_option = 'High';
          else if (!isNaN(low) && valNum < low) updated.result_option = 'Low';
          else updated.result_option = 'Normal';
        }
        return updated;
      }
      return c;
    }));
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "-";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const filteredComponents = activeComponents.filter(c => 
    c.component_name.toLowerCase().includes(componentSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* Top Header Bar */}
      <div className="bg-white rounded-sm h-11 px-4 flex items-center justify-between shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <i onClick={onBack} className="fa-solid fa-times text-gray-400 cursor-pointer hover:text-gray-600 text-sm font-black"></i>
          <h1 className="text-gray-700 font-semibold text-[14px]">Demo Hospital</h1>
        </div>
        <div className="flex items-center gap-12 text-[13px] text-gray-500">
          <div>Branch: <span className="text-[#43939e] font-bold">Main branch</span></div>
          <div>Room: <span onClick={onOpenRoomModal} className="text-[#43939e] cursor-pointer hover:underline font-bold text-blue-600">{currentRoom}</span></div>
          <button onClick={fetchQueue} className="bg-[#17a2b8] text-white px-4 py-1 rounded shadow-sm text-[11px] font-bold uppercase tracking-tight">Queue</button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-[#f8f9fa] border border-gray-200 rounded-sm px-4 py-1.5 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2 text-gray-500">
          <i className="fa-solid fa-home text-blue-500"></i>
          <span className="opacity-50">/</span>
          <span className="text-blue-500 cursor-pointer hover:underline font-bold">Laboratory</span>
          <span className="opacity-50">/</span>
          <span className="text-gray-400 font-medium">Laboratory</span>
        </div>
        <div className="flex items-center gap-1 text-[#337ab7] cursor-pointer hover:underline font-bold">
          <i className="fa-solid fa-question-circle"></i>
          <span>Guide</span>
        </div>
      </div>

      {/* PATIENTS DETAILS SECTION */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
        <div 
          className="px-4 py-2 border-b flex items-center bg-[#f8f9fa] cursor-pointer"
          onClick={() => setIsPatientDetailsVisible(!isPatientDetailsVisible)}
        >
          <h2 className="text-[15px] font-medium text-gray-600 uppercase tracking-tight">
            Patients Details <span className="text-[12px] font-normal text-gray-400 italic">(click here to {isPatientDetailsVisible ? 'hide' : 'show'})</span>
          </h2>
        </div>
        
        {isPatientDetailsVisible && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#eef5f6]">
            {/* Metadata Left */}
            <div className="lg:col-span-4 grid grid-cols-1 gap-y-1 text-[13px] text-gray-700">
              <DetailRow label="OPD No:" value={selectedPatient?.id_number} />
              <DetailRow label="Surname:" value={selectedPatient?.surname} />
              <DetailRow label="Othernames:" value={selectedPatient?.other_names} />
              <DetailRow label="Age:" value={selectedPatient ? calculateAge(selectedPatient.dob) : ''} />
              <DetailRow label="Sex:" value={selectedPatient?.sex} />
              <DetailRow label="Residence:" value={selectedPatient?.residence} />
              <DetailRow label="Occupation:" value={selectedPatient?.occupation} />
              <DetailRow label="Scheme:" value="Cash Payers" color="text-blue-600 font-black" />
              <DetailRow label="Rem. Credit:" value="0.00" color="text-red-600 font-black" />
              <DetailRow label="Note:" value={selectedPatient?.notes} color="text-orange-600 font-bold italic" />
            </div>

            {/* Queue Table Right */}
            <div className="lg:col-span-8 flex flex-col gap-2">
              <div className="flex justify-end gap-2 items-center">
                <span className="text-[12px] text-gray-500 font-bold uppercase tracking-widest">Search:</span>
                <input type="text" className="border border-gray-300 rounded px-2 py-0.5 text-[12px] outline-none w-[180px] bg-white shadow-xs" />
              </div>
              <div className="border border-gray-200 rounded-sm overflow-hidden bg-white shadow-inner max-h-[160px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-[#eef5f6] text-gray-600 border-b sticky top-0 font-black uppercase">
                    <tr>
                      <th className="px-3 py-2 border-r">Q. No</th>
                      <th className="px-3 py-2 border-r">OPD No</th>
                      <th className="px-3 py-2 border-r">Name</th>
                      <th className="px-3 py-2 border-r">From</th>
                      <th className="px-3 py-2">Mins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {queueList.length > 0 ? (
                      queueList.map((req, idx) => (
                        <tr 
                          key={req.id} 
                          onClick={() => handlePatientSelect(req)}
                          className={`hover:bg-cyan-50 transition-colors cursor-pointer ${selectedPatient?.visit_id === req.visit_id ? 'bg-cyan-100 font-bold border-l-4 border-cyan-500' : ''}`}
                        >
                          <td className="px-3 py-2 border-r">{(idx + 1).toString().padStart(3, '0')}</td>
                          <td className="px-3 py-2 border-r font-mono font-black">{req.patients_registry?.id_number}</td>
                          <td className="px-3 py-2 border-r">{req.patients_registry?.surname} {req.patients_registry?.other_names}</td>
                          <td className="px-3 py-2 border-r font-black text-blue-600">{req.requested_from || 'Consultation Room 1'}</td>
                          <td className="px-3 py-2 font-bold text-emerald-700">
                             {Math.floor((currentTime.getTime() - new Date(req.requested_at).getTime()) / 60000)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400 font-bold italic uppercase tracking-widest opacity-40">No data available in table</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REQUESTED TESTS AND RESULTS SECTION */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
        <div className="px-4 py-2 border-b flex items-center justify-between bg-[#f8f9fa]">
          <h2 className="text-[15px] font-medium text-gray-600 uppercase tracking-tight">Requested Tests and Results</h2>
          <div className="relative" ref={actionsRef}>
            <button 
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              className="bg-[#5bc0de] text-white px-3 py-1 rounded shadow-sm text-[11px] font-bold flex items-center gap-2 hover:bg-[#31b0d5]"
            >
              Actions <i className="fa-solid fa-caret-down text-[9px]"></i>
            </button>
            {isActionsOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 shadow-xl z-50 rounded-sm py-1 animate-in fade-in zoom-in-95 duration-100">
                <button 
                  onClick={() => { setIsActionsOpen(false); if (selectedPatient) setIsQueueModalOpen(true); }}
                  className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-green-700 font-bold flex items-center gap-2"
                >
                   <i className="fa-solid fa-user-clock opacity-50"></i> Move to Next Point
                </button>
                <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 text-gray-700 flex items-center gap-2 border-t">
                   <i className="fa-solid fa-print opacity-50"></i> Preview Lab Report
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-[#eef5f6]">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                 <label className="text-[12px] font-bold text-gray-600 uppercase tracking-tighter">Patient Scheme</label>
                 <select className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 font-black text-green-700 shadow-sm">
                    <option>Cash Payers</option>
                 </select>
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-[12px] font-bold text-gray-600 uppercase tracking-tighter">Lab Test</label>
                 <div className="flex gap-2">
                    <select 
                      value={manualTestId}
                      onChange={(e) => setManualTestId(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 font-medium shadow-sm"
                    >
                      <option value="">--Select Lab Test--</option>
                      {configTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button 
                      onClick={handleAddManualTest}
                      disabled={saving || !selectedPatient}
                      className="bg-[#17a2b8] text-white w-9 h-9 rounded flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-30"
                    >
                       <i className="fa-solid fa-plus text-sm"></i>
                    </button>
                 </div>
              </div>
            </div>

            {/* Requested Test Summary Sidebar List */}
            <div className="flex flex-col border border-gray-200 rounded overflow-hidden shadow-xs bg-white min-h-[220px]">
               <div className="bg-[#f8f9fa] border-b border-gray-200 px-4 py-2 text-[12px] font-black text-gray-500 uppercase tracking-widest">
                  Requested Test Summary
               </div>
               <div className="flex flex-col divide-y divide-gray-50 overflow-y-auto max-h-[300px] custom-scrollbar">
                  {orderedTests.length > 0 ? (
                    orderedTests.map((t) => (
                      <div 
                        key={t.id}
                        onClick={() => { setActiveTest(t); loadComponents(t.test_id, t.test_name); }}
                        className={`px-4 py-3 cursor-pointer transition-all hover:bg-cyan-50 flex items-center justify-between ${activeTest?.id === t.id ? 'bg-[#337ab7] text-white font-black' : 'text-gray-700 font-bold'}`}
                      >
                         <span className="text-[12px] truncate tracking-tight">{t.test_name}</span>
                         <i className={`fa-solid fa-chevron-right text-[10px] ${activeTest?.id === t.id ? 'opacity-100' : 'opacity-20'}`}></i>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-gray-300 italic text-[11px] font-bold uppercase opacity-50 tracking-widest px-4">No data available in table</div>
                  )}
               </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-9 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 pb-3">
              <div className="flex gap-12">
                 <div className="text-[13px] font-bold text-gray-600 uppercase">Test: <span className="text-blue-800 ml-2 font-black tracking-tight">{activeTest?.test_name || '-'}</span></div>
                 <div className="text-[13px] font-bold text-gray-600 uppercase">Specimen: <span className="text-blue-800 ml-2 font-black tracking-tight"></span></div>
              </div>
              <div className="flex gap-3">
                 <button className="bg-[#008080] text-white px-5 py-1.5 rounded-sm text-[11px] font-black shadow-lg uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Sample Collection</button>
                 <button className="bg-[#008080] text-white px-5 py-1.5 rounded-sm text-[11px] font-black shadow-lg uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Test Conclusion</button>
              </div>
            </div>

            <div className="flex justify-end mb-1">
               <div className="flex items-center gap-3">
                  <span className="text-[12px] text-gray-500 font-black uppercase tracking-tighter">Search:</span>
                  <input 
                    type="text" 
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none w-[200px] bg-white shadow-xs focus:ring-1 focus:ring-cyan-500 font-medium" 
                  />
               </div>
            </div>

            <div className="border border-gray-200 rounded-sm overflow-x-auto min-h-[400px] bg-white shadow-inner custom-scrollbar">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f8f9fa] text-gray-600 border-b font-black sticky top-0 z-10 uppercase text-[11px] tracking-widest shadow-sm">
                  <tr>
                    <th className="px-4 py-3 border-r">Component</th>
                    <th className="px-4 py-3 border-r w-[90px] text-center">Lower</th>
                    <th className="px-4 py-3 border-r w-[90px] text-center">Upper</th>
                    <th className="px-4 py-3 border-r w-[100px] text-center">Units</th>
                    <th className="px-4 py-3 border-r w-[180px] text-center">Value</th>
                    <th className="px-4 py-3 border-r w-[140px] text-center">Result</th>
                    <th className="px-4 py-3 border-r w-[60px] text-center">Anom</th>
                    <th className="px-4 py-3 w-[60px] text-center">Clear</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeComponents.length > 0 ? (
                    filteredComponents.map((comp) => (
                      <tr key={comp.id} className="hover:bg-cyan-50/30 transition-colors">
                        <td className="px-4 py-3 border-r font-black text-gray-800 tracking-tight">{comp.component_name}</td>
                        <td className="px-4 py-3 border-r text-gray-600 text-center font-mono font-bold bg-gray-50/40">{comp.lower_limit || '-'}</td>
                        <td className="px-4 py-3 border-r text-gray-600 text-center font-mono font-bold bg-gray-50/40">{comp.upper_limit || '-'}</td>
                        <td className="px-4 py-3 border-r text-gray-600 font-black text-center text-[11px] tracking-widest">{comp.units || '-'}</td>
                        <td className="px-4 py-3 border-r">
                           <input 
                              type="text" 
                              value={comp.value}
                              onChange={(e) => handleUpdateValue(comp.id, e.target.value)}
                              placeholder="..."
                              className={`w-full border border-gray-300 rounded px-2 py-1.5 text-[14px] outline-none font-black text-center shadow-inner transition-all ${comp.is_anomalous ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-200' : 'bg-[#fcfdfe] focus:ring-1 focus:ring-cyan-500'}`}
                           />
                        </td>
                        <td className={`px-4 py-3 border-r text-center font-black ${comp.is_anomalous ? 'text-rose-600' : 'text-blue-900'}`}>
                           {comp.result_option}
                        </td>
                        <td className="px-4 py-3 border-r text-center">
                           <input 
                             type="checkbox" 
                             checked={comp.is_anomalous} 
                             readOnly 
                             className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-help" 
                           />
                        </td>
                        <td className="px-4 py-3 text-center">
                           <button className="text-gray-300 hover:text-rose-600 transition-colors">
                              <i className="fa-solid fa-eraser text-xs"></i>
                           </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-40 text-center text-gray-400 italic font-black uppercase tracking-[0.3em] opacity-30 select-none">No data available in table</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isQueueModalOpen && selectedPatient && (
        <QueueModal 
          patient={selectedPatient}
          visitId={selectedPatient.visit_id}
          onClose={() => setIsQueueModalOpen(false)}
          setParentNotification={() => {}}
          mode="update"
          initialFrom="Laboratory"
          onSuccess={() => { setSelectedPatient(null); setOrderedTests([]); setActiveComponents([]); fetchQueue(); }}
        />
      )}
    </div>
  );
};
