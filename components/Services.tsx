
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceInputModal } from './ServiceInputModal';
import { ItemClassModal } from './ItemClassModal';
import { ItemCategoryModal } from './ItemCategoryModal';

interface ServicesProps {
  onBack: () => void;
  currentRoom: string;
  onOpenRoomModal: () => void;
}

export const Services: React.FC<ServicesProps> = ({ onBack, currentRoom, onOpenRoomModal }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formSearch, setFormSearch] = useState('');
  const [services, setServices] = useState<any[]>([]); 
  const [editingId, setEditingId] = useState<number | null>(null); 
  const [filterType, setFilterType] = useState('All Services');
  const [showNotification, setShowNotification] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  // Modal states
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Dropdown options states
  const [itemClasses, setItemClasses] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);

  const initialForm = {
    name: '',
    item_category: '',
    item_code: '',
    rate: '0',
    income_subaccount: '',
    item_class: '',
    expense_subaccount: '',
    vat_type: '',
    other_tax: '',
    is_procedure: false,
    is_examination: false,
    is_theatre_operation: false,
    is_active: true
  };

  const [formData, setFormData] = useState(initialForm);
  const isMounted = useRef(true);

  const fetchDropdownData = async () => {
    try {
      const [classesRes, catsRes] = await Promise.all([
        supabase.from('config_item_classes').select('*').order('name'),
        supabase.from('config_item_categories').select('*').order('name')
      ]);
      if (isMounted.current) {
        setItemClasses(classesRes.data || []);
        setItemCategories(catsRes.data || []);
      }
    } catch (err) {
      console.error("Dropdown fetch error:", err);
    }
  };

  const fetchFilteredServices = async () => {
    setLoading(true);
    try {
      let query = supabase.from('config_services').select('*').order('id', { ascending: true });

      if (filterType === 'Active Only') query = query.eq('is_active', true);
      if (filterType === 'Inactive Only') query = query.eq('is_active', false);
      if (filterType === 'Lab Test Only') query = query.ilike('item_category', '%lab%');
      if (filterType === 'Procedures Only') query = query.eq('is_procedure', true);
      if (filterType === 'Radiology Examinations Only') query = query.eq('is_examination', true);
      if (filterType === 'Theatre Operations Only') query = query.eq('is_theatre_operation', true);

      const { data, error } = await query;
      if (error) throw error;
      if (isMounted.current) setServices(data || []);
    } catch (err: any) {
      console.error("Filter Error:", err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchDropdownData();
    fetchFilteredServices();
    return () => { isMounted.current = false; };
  }, [filterType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSave = async () => {
    if (!formData.name) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        rate: parseFloat(formData.rate) || 0
      };

      if (editingId) {
        const { error } = await supabase.from('config_services').update(payload).eq('id', editingId);
        if (error) throw error;
        setShowNotification({ visible: true, title: 'SUCCESS', message: 'Service updated successfully!', type: 'success' });
      } else {
        const { error } = await supabase.from('config_services').insert([payload]);
        if (error) throw error;
        setShowNotification({ visible: true, title: 'SUCCESS', message: 'Service saved successfully!', type: 'success' });
      }

      handleClearForm();
      await fetchFilteredServices();
      setTimeout(() => { if (isMounted.current) setShowNotification(null); }, 4000);
    } catch (err: any) {
      setShowNotification({ visible: true, title: 'ERROR', message: err.message, type: 'error' });
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleClearForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleDoubleClick = (service: any) => {
    setFormData({
      name: service.name || '',
      item_category: service.item_category || '',
      item_code: service.item_code || '',
      rate: service.rate?.toString() || '0',
      income_subaccount: service.income_subaccount || '',
      item_class: service.item_class || '',
      expense_subaccount: service.expense_subaccount || '',
      vat_type: service.vat_type || '',
      other_tax: service.other_tax || '',
      is_procedure: service.is_procedure || false,
      is_examination: service.is_examination || false,
      is_theatre_operation: service.is_theatre_operation || false,
      is_active: service.is_active ?? true
    });
    setEditingId(service.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredServicesList = services.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.item_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-300 pb-20 relative">
      
      {showNotification?.visible && (
        <div className="fixed top-24 right-10 z-[6000] animate-in slide-in-from-right duration-500">
          <div className={`${showNotification.type === 'success' ? 'bg-[#5da54f]' : 'bg-[#e51c44]'} text-white px-6 py-4 rounded shadow-2xl flex items-center gap-5 min-w-[380px] border-l-[10px] border-black/10`}>
             <i className={`fa-solid ${showNotification.type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'} text-2xl`}></i>
             <div className="flex-1">
                <div className="font-black text-[15px] uppercase tracking-wider">{showNotification.title}</div>
                <div className="text-[13px] font-medium opacity-90">{showNotification.message}</div>
             </div>
             <button onClick={() => setShowNotification(null)} className="text-white/40 hover:text-white transition-colors">
               <i className="fa-solid fa-times text-lg"></i>
             </button>
          </div>
        </div>
      )}

      {/* Main MIS Top Bar */}
      <div className="bg-white rounded-sm h-10 px-4 flex items-center justify-between shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <i onClick={onBack} className="fa-solid fa-times text-gray-400 cursor-pointer hover:text-gray-600 text-xs"></i>
          <h1 className="text-gray-700 font-semibold text-[14px]">Demo Hospital</h1>
        </div>
        <div className="flex items-center gap-12 text-[13px] text-gray-500">
          <div>Branch: <span className="text-[#43939e] font-bold">Main branch</span></div>
          <div>Room: <span onClick={onOpenRoomModal} className="text-[#43939e] cursor-pointer hover:underline font-bold">{currentRoom}</span></div>
          <button onClick={fetchFilteredServices} className="bg-[#17a2b8] text-white px-4 py-1 rounded-sm text-[11px] font-bold uppercase shadow-sm">Queue</button>
        </div>
      </div>

      {/* Breadcrumb row */}
      <div className="bg-[#f8f9fa] border border-gray-200 rounded-sm px-4 py-1.5 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2 text-gray-500">
          <i className="fa-solid fa-home text-blue-500"></i>
          <span className="opacity-50">/</span>
          <div className="flex items-center gap-1 text-blue-500 cursor-pointer hover:underline">
             <span>Configurations</span>
             <i className="fa-solid fa-caret-down text-[9px] mt-0.5 opacity-60"></i>
          </div>
          <span className="opacity-50">/</span>
          <span className="text-gray-400 font-medium">Services</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-500 cursor-pointer hover:underline font-bold">
          <i className="fa-solid fa-question-circle"></i>
          <span>Guide</span>
        </div>
      </div>

      {/* Service Details Main Container */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b bg-[#f8f9fa]">
          <h2 className="text-[17px] font-normal text-gray-600">Service Details</h2>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
           {/* Left Form Section (9 cols) */}
           <div className="lg:col-span-9 flex flex-col gap-5">
              
              {/* Top Search Bar Row */}
              <div className="flex items-center gap-2 max-w-sm mb-2">
                 <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input 
                      type="text" 
                      value={formSearch}
                      onChange={(e) => setFormSearch(e.target.value)}
                      placeholder="Search here..." 
                      className="w-full bg-[#f0f2f5] border border-gray-200 rounded px-8 py-1.5 text-[13px] outline-none" 
                    />
                 </div>
                 <button className="bg-white border border-gray-300 px-4 py-1.5 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-50">Search</button>
              </div>

              {/* Form Grid Area */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4">
                 {/* Row 1: Name, Item Category, Item Code, Rate */}
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">Name</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white" 
                    />
                 </div>
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">Item Category</label>
                    <div className="relative">
                       <select 
                          name="item_category"
                          value={formData.item_category}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none text-green-800 font-bold"
                       >
                          <option value="">--Select Category--</option>
                          {itemCategories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                          <i className="fa-solid fa-chevron-down"></i>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">Item Code</label>
                    <input 
                       type="text" 
                       name="item_code"
                       value={formData.item_code}
                       onChange={handleInputChange}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white" 
                    />
                 </div>
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">Rate</label>
                    <input 
                       type="text" 
                       name="rate"
                       value={formData.rate}
                       onChange={handleInputChange}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-cyan-500 bg-white text-right text-green-800 font-bold" 
                    />
                 </div>

                 {/* Row 2: Income SubAccount, Item Class, Checkboxes */}
                 <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[13px] font-bold text-gray-700">Income SubAccount</label>
                    <div className="relative">
                       <select 
                          name="income_subaccount"
                          value={formData.income_subaccount}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                       >
                          <option value="">Sales - Services</option>
                          <option value="Consultation Fees">Consultation Fees</option>
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                          <i className="fa-solid fa-chevron-down"></i>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">Item Class</label>
                    <div className="relative">
                       <select 
                          name="item_class"
                          value={formData.item_class}
                          onChange={handleInputChange}
                          className="w-full border border-green-400 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-green-500 appearance-none text-green-700 font-bold"
                       >
                          <option value="">Service</option>
                          {itemClasses.map((cl, i) => <option key={i} value={cl.name}>{cl.name}</option>)}
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                          <i className="fa-solid fa-chevron-down"></i>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-2 pt-2 md:col-span-1">
                    <div className="flex items-center gap-2">
                       <input type="checkbox" id="proc" name="is_procedure" checked={formData.is_procedure} onChange={handleInputChange} className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                       <label htmlFor="proc" className="text-[13px] text-gray-700 font-medium">Is a procedure</label>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="checkbox" id="exam" name="is_examination" checked={formData.is_examination} onChange={handleInputChange} className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                       <label htmlFor="exam" className="text-[13px] text-gray-700 font-medium">Is an Examination</label>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="checkbox" id="theatre" name="is_theatre_operation" checked={formData.is_theatre_operation} onChange={handleInputChange} className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                       <label htmlFor="theatre" className="text-[13px] text-gray-700 font-medium">Is Theatre Operation</label>
                    </div>
                 </div>

                 {/* Row 3: Expense SubAccount, VAT Type, Other Tax, Save/Add button */}
                 <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[13px] font-bold text-gray-700">Expense SubAccount</label>
                    <div className="relative">
                       <select 
                          name="expense_subaccount"
                          value={formData.expense_subaccount}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                       >
                          <option value="">Cost Of Goods Sold - Services</option>
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                          <i className="fa-solid fa-chevron-down"></i>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">VAT Type</label>
                    <div className="relative">
                       <select 
                          name="vat_type"
                          value={formData.vat_type}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                       >
                          <option value="">VAT Exempt</option>
                          <option value="VAT Standard 16%">VAT Standard 16%</option>
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                          <i className="fa-solid fa-chevron-down"></i>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[13px] font-bold text-gray-700">Other Tax</label>
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                          <select 
                             name="other_tax"
                             value={formData.other_tax}
                             onChange={handleInputChange}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                          >
                             <option value=""></option>
                             <option value="None">None</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                             <i className="fa-solid fa-chevron-down"></i>
                          </div>
                       </div>
                       <button 
                         onClick={handleSave}
                         className="bg-[#17a2b8] text-white w-10 h-8 rounded-sm flex items-center justify-center shadow-md hover:bg-[#138496] transition-all active:scale-95 shrink-0"
                       >
                          <i className="fa-solid fa-plus text-lg"></i>
                       </button>
                    </div>
                 </div>
              </div>

              {/* Update/New Row */}
              <div className="flex justify-end gap-2 mt-4">
                 <button 
                   onClick={handleSave}
                   className="bg-[#17a2b8] text-white px-5 py-1.5 rounded-sm text-[13px] font-bold shadow-sm hover:bg-[#138496] transition-colors"
                 >
                   Update
                 </button>
                 <button 
                   onClick={handleClearForm}
                   className="bg-[#17a2b8] text-white px-5 py-1.5 rounded-sm text-[13px] font-bold shadow-sm hover:bg-[#138496] transition-colors"
                 >
                   New
                 </button>
              </div>
           </div>

           {/* Right Configuration Buttons (3 cols) */}
           <div className="lg:col-span-3 flex flex-col gap-2 pt-2">
              <button className="bg-[#008b8b] text-white py-2 text-[12px] font-medium rounded shadow-xs hover:bg-[#007a7a] transition-colors">Sync Services</button>
              <button className="bg-[#008b8b] text-white py-2 text-[12px] font-medium rounded shadow-xs hover:bg-[#007a7a] transition-colors">Import Services</button>
              <button className="bg-[#008b8b] text-white py-2 text-[12px] font-medium rounded shadow-xs hover:bg-[#007a7a] transition-colors">Export Services</button>
              
              <button 
                onClick={() => { if(editingId) setIsInputModalOpen(true); else alert('Select a service first'); }}
                className="bg-white border border-gray-300 text-gray-700 py-2 text-[12px] font-medium rounded shadow-xs hover:bg-gray-50 transition-colors"
              >
                Input Items
              </button>
              <button 
                onClick={() => setIsClassModalOpen(true)}
                className="bg-white border border-gray-300 text-gray-700 py-2 text-[12px] font-medium rounded shadow-xs hover:bg-gray-50 transition-colors"
              >
                Item Classes
              </button>
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-white border border-gray-300 text-gray-700 py-2 text-[12px] font-medium rounded shadow-xs hover:bg-gray-50 transition-colors"
              >
                Item Categories
              </button>
           </div>
        </div>

        {/* View Section (Table) */}
        <div className="border-t border-gray-200 mt-4">
           <div className="px-4 py-2 bg-[#f8f9fa] border-b flex items-center justify-between">
             <h2 className="text-[15px] font-medium text-gray-600 uppercase tracking-tight">View: Services</h2>
           </div>
           
           <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex gap-1">
                    <button className="border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 rounded shadow-xs hover:bg-gray-50">Excel</button>
                    <button className="border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 rounded shadow-xs hover:bg-gray-50">CSV</button>
                    <button className="border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 rounded shadow-xs hover:bg-gray-50">Print</button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500 font-bold">Search:</span>
                    <input 
                       type="text" 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="border border-gray-300 rounded px-2.5 py-1 text-[13px] outline-none w-[280px] focus:ring-1 focus:ring-cyan-500 shadow-sm" 
                    />
                 </div>
              </div>

              <div className="border border-gray-200 rounded-sm overflow-x-auto min-h-[300px] shadow-inner bg-white custom-scrollbar">
                <table className="w-full text-left text-[14px] whitespace-nowrap">
                   <thead className="bg-[#f8f9fa] text-gray-600 border-b">
                      <tr>
                         <th className="px-4 py-2 font-bold border-r w-[60px]">No</th>
                         <th className="px-4 py-2 font-bold border-r">
                            <div className="flex items-center justify-between">
                               Name <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 ml-2"></i>
                            </div>
                         </th>
                         <th className="px-4 py-2 font-bold border-r">
                            <div className="flex items-center justify-between">
                               Category <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 ml-2"></i>
                            </div>
                         </th>
                         <th className="px-4 py-2 font-bold border-r">
                            <div className="flex items-center justify-between">
                               Code <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 ml-2"></i>
                            </div>
                         </th>
                         <th className="px-4 py-2 font-bold">
                            <div className="flex items-center justify-between">
                               Rate <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 ml-2"></i>
                            </div>
                         </th>
                      </tr>
                   </thead>
                   <tbody className="bg-white">
                      {loading && services.length === 0 ? (
                         <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">Syncing Records...</td></tr>
                      ) : filteredServicesList.length > 0 ? (
                         filteredServicesList.map((service, idx) => (
                           <tr 
                              key={service.id} 
                              onDoubleClick={() => handleDoubleClick(service)}
                              className={`border-b hover:bg-cyan-50 transition-colors cursor-pointer group ${editingId === service.id ? 'bg-orange-50' : ''}`}
                           >
                              <td className="px-4 py-2 border-r text-gray-500 font-mono text-[12px] group-hover:text-cyan-700">{(idx + 1).toString()}</td>
                              <td className="px-4 py-2 border-r font-medium text-gray-800 group-hover:text-cyan-800 uppercase">{service.name}</td>
                              <td className="px-4 py-2 border-r text-green-800 font-bold text-[12px] uppercase">{service.item_category || '-'}</td>
                              <td className="px-4 py-2 border-r font-mono text-gray-400">{service.item_code || '-'}</td>
                              <td className="px-4 py-2 text-green-800 font-bold text-right tabular-nums">{service.rate?.toLocaleString()}</td>
                           </tr>
                         ))
                      ) : (
                         <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">No data available in table</td></tr>
                      )}
                   </tbody>
                </table>
              </div>
           </div>
        </div>

        {/* Bottom Filter Bar */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-4 bg-[#f8f9fa]">
           <div className="flex items-center gap-2">
              <span className="text-[13px] text-gray-700 font-bold">Filter:</span>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-[13px] bg-white outline-none text-gray-700 min-w-[200px]"
              >
                 <option>All Services</option>
                 <option>Active Only</option>
                 <option>Inactive Only</option>
                 <option>Lab Test Only</option>
                 <option>Procedures Only</option>
                 <option>Radiology Examinations Only</option>
                 <option>Theatre Operations Only</option>
              </select>
           </div>
           <button onClick={fetchFilteredServices} className="bg-[#5bc0de] text-white px-5 py-1 rounded text-[13px] font-bold shadow-xs hover:bg-[#31b0d5]">View</button>
        </div>
      </div>

      {/* Modals */}
      {isInputModalOpen && editingId && (
        <ServiceInputModal serviceId={editingId} serviceName={formData.name} onClose={() => setIsInputModalOpen(false)} />
      )}
      {isClassModalOpen && (
        <ItemClassModal onClose={() => { setIsClassModalOpen(false); fetchDropdownData(); }} />
      )}
      {isCategoryModalOpen && (
        <ItemCategoryModal onClose={() => { setIsCategoryModalOpen(false); fetchDropdownData(); }} />
      )}
    </div>
  );
};
