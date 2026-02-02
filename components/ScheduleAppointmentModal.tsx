
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ScheduleAppointmentModalProps {
  patient: any;
  visitId: string;
  onClose: () => void;
  setParentNotification: (val: any) => void;
}

export const ScheduleAppointmentModal: React.FC<ScheduleAppointmentModalProps> = ({ 
  patient, 
  visitId, 
  onClose, 
  setParentNotification 
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_datetime: '',
    purpose: ''
  });

  const isMounted = useRef(true);

  // FETCH: Clinicians from the consultants table to sync the dropdown
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('*')
        .order('surname', { ascending: true });

      if (error) throw error;
      if (isMounted.current) setDoctors(data || []);
    } catch (err: any) {
      console.error("Error fetching doctors:", err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchDoctors();
    return () => { isMounted.current = false; };
  }, []);

  const handleSave = async () => {
    if (!formData.doctor_id || !formData.appointment_datetime || !formData.purpose) {
      alert("Please ensure all fields are filled: Clinician, DateTime, and Purpose.");
      return;
    }

    const doctor = doctors.find(d => d.id.toString() === formData.doctor_id);
    const doctorName = doctor ? `${doctor.surname} ${doctor.other || doctor.other_names || ''}` : 'Unknown Doctor';
    const timestamp = new Date(formData.appointment_datetime).toISOString();

    setSaving(true);
    try {
      // DATA MAPPING: Sync to clinician_appointments with specific column mappings
      const payload = {
        patient_id: patient.id,
        visit_id: visitId,
        doctor_id: parseInt(formData.doctor_id),
        doctor_name: doctorName.trim(), // Map to doctor_name column
        appointment_at: timestamp,    // Map to appointment_at column
        appointment_date_time: timestamp,
        purpose: formData.purpose,
        status: 'Scheduled',
        created_at: new Date().toISOString(),
        created_by: 'Doctor'
      };

      const { error } = await supabase
        .from('clinical_appointments')
        .insert([payload]);

      if (error) throw error;

      // SUCCESS NOTIFICATION: Trigger the green follow-up message
      setParentNotification({
        visible: true,
        title: 'SUCCESS',
        message: 'Follow-up Appointment Scheduled Successfully',
        type: 'success'
      });

      // MODAL CLOSURE & RESET: Clear and close immediately
      setFormData({ doctor_id: '', appointment_datetime: '', purpose: '' });
      onClose();
    } catch (err: any) {
      alert("Save Failed: " + err.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Visual Integrity: 0% blur and 0% overlay (transparent) background */}
      <div className="absolute inset-0 bg-transparent" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-[650px] rounded shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 relative z-10">
        
        {/* Modal Header */}
        <div className="bg-[#ececf6] px-5 py-3 flex items-center justify-between border-b shadow-sm">
          <h3 className="text-[19px] text-[#4a4a7d] font-normal tracking-tight uppercase italic">Schedule Appointment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-[20px]"></i>
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6 bg-[#fcfdfe]">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
              
              {/* Auto-populated Patient Fields */}
              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Surname</label>
                 <input 
                    type="text" 
                    readOnly 
                    value={patient?.surname || ''}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[14px] bg-gray-50 text-gray-700 font-bold outline-none cursor-default shadow-inner" 
                 />
              </div>

              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Other Names</label>
                 <input 
                    type="text" 
                    readOnly 
                    value={patient?.other_names || ''}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[14px] bg-gray-50 text-gray-700 font-bold outline-none cursor-default shadow-inner" 
                 />
              </div>

              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Outpatient No.</label>
                 <input 
                    type="text" 
                    readOnly 
                    value={patient?.id_number || ''}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[14px] bg-gray-50 text-green-700 font-bold outline-none cursor-default shadow-inner" 
                 />
              </div>

              {/* Manual Fields */}
              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Doctor</label>
                 <div className="relative">
                    <select 
                       value={formData.doctor_id}
                       onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                       className={`w-full border ${!formData.doctor_id ? 'border-red-400 ring-1 ring-red-50' : 'border-gray-300'} rounded px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-rose-500 font-bold appearance-none shadow-sm transition-all`}
                    >
                       <option value="">--Select Clinician--</option>
                       {doctors.map(d => (
                         <option key={d.id} value={d.id}>{d.surname} {d.other || d.other_names || ''}</option>
                       ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-rose-500">
                       <i className="fa-solid fa-chevron-down text-xs"></i>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Email</label>
                 <input 
                    type="text" 
                    readOnly 
                    value={patient?.email || ''}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[14px] bg-gray-50 text-blue-800 font-bold outline-none cursor-default shadow-inner" 
                 />
              </div>

              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Appointment DateTime</label>
                 <div className="relative">
                    <input 
                       type="datetime-local" 
                       value={formData.appointment_datetime}
                       onChange={(e) => setFormData({...formData, appointment_datetime: e.target.value})}
                       className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white shadow-sm font-medium" 
                    />
                 </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
                 <label className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Purpose</label>
                 <textarea 
                    rows={4}
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    placeholder="Describe the reason for follow-up..."
                    className="w-full border border-gray-300 rounded px-3 py-3 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white shadow-inner resize-none font-medium" 
                 />
              </div>
           </div>

           <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-[#17a2b8] hover:bg-[#138496] text-white px-12 py-3 rounded font-black text-[14px] uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:bg-gray-300 flex items-center gap-3"
              >
                {saving ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                ) : (
                  <i className="fa-solid fa-calendar-check"></i>
                )}
                Schedule Appointment
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
