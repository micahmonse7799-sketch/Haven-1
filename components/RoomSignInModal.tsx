
import React, { useState } from 'react';

interface RoomSignInModalProps {
  currentRoom: string;
  currentStatus: string;
  onClose: () => void;
  onUpdate: (room: string, status: string) => void;
}

export const RoomSignInModal: React.FC<RoomSignInModalProps> = ({ 
  currentRoom, 
  currentStatus, 
  onClose, 
  onUpdate 
}) => {
  const [selectedRoom, setSelectedRoom] = useState(currentRoom);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const rooms = [
    "Administration",
    "Cash Office",
    "Consultation Room 1",
    "Consultation Room 2",
    "Consultation Room 3",
    "Dental Room",
    "Diabetes Room",
    "Dialysis",
    "Dialysis Unit",
    "Emergency Clinic",
    "ENT Room 10",
    "FanuTest",
    "HTN ROOM",
    "Laboratory",
    "MCH",
    "Nutrition",
    "Oncology",
    "Optical",
    "Orthopaedic",
    "Pharmacy",
    "Physiotherapy Room",
    "Radiology",
    "Reception",
    "Theatre",
    "Triage",
    "TRIAGE / TB SCREENING"
  ];

  const statuses = [
    { label: "Available", color: "text-green-600" },
    { label: "Busy", color: "text-amber-600" },
    { label: "Stepped Out", color: "text-red-600" }
  ];

  return (
    <div className="fixed inset-0 bg-black/10 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[450px] rounded shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden relative z-10 border border-gray-100">
        {/* Header */}
        <div className="bg-[#e9eaf2] px-4 py-3 flex items-center justify-between border-b">
          <h3 className="text-[17px] text-[#4a4a7d] font-normal uppercase tracking-tight">Sign In To A Room</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fa-solid fa-times text-[18px]"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Select Room:</label>
            <div className="relative">
              <select 
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] appearance-none bg-white outline-none focus:ring-1 focus:ring-blue-400 text-green-700 font-bold"
              >
                {rooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Status:</label>
            <div className="relative">
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] appearance-none bg-white outline-none focus:ring-1 focus:ring-blue-400 font-bold ${
                  statuses.find(s => s.label === selectedStatus)?.color
                }`}
              >
                {statuses.map(status => (
                  <option key={status.label} value={status.label}>{status.label}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button 
              onClick={() => onUpdate(selectedRoom, selectedStatus)}
              className="bg-[#17a2b8] hover:bg-[#138496] text-white px-8 py-2 rounded font-black text-[13px] uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              Update Point
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
