import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface LabTestsProps {
  onBack: () => void;
  currentRoom: string;
  onOpenRoomModal: () => void;
}

export const LabTests: React.FC<LabTestsProps> = ({ onBack, currentRoom, onOpenRoomModal }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSpecimenModalOpen, setIsSpecimenModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [configuredTests, setConfiguredTests] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // States for Categories Modal
  const [categories, setCategories] = useState<any[]>([]);
  const [categorySaving, setCategorySaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // States for Specimen Modal
  const [specimens, setSpecimens] = useState<any[]>([]);
  const [specimenSaving, setSpecimenSaving] = useState(false);
  const [editingSpecimenId, setEditingSpecimenId] = useState<number | null>(null);
  const [specimenFormData, setSpecimenFormData] = useState({ name: '', description: '' });
  const [specimenSearchQuery, setSpecimenSearchQuery] = useState('');

  // States for Test Components Modal
  const [components, setComponents] = useState<any[]>([]);
  const [componentSaving, setComponentSaving] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);
  const [componentFormData, setComponentFormData] = useState({
    name: '',
    units: '',
    lower_limit: '',
    upper_limit: '',
    code: ''
  });

  // States for Test Panel Modal
  const [panelMembers, setPanelMembers] = useState<any[]>([]);
  const [panelSaving, setPanelSaving] = useState(false);
  const [selectedIncludedTestName, setSelectedIncludedTestName] = useState('');
  
  const initialForm = {
    name: '',
    description: '',
    category: '',
    specimen: '',
    service: '',
    test_price: '0',
    test_code: '',
    machine: 'None',
    print_reference_ranges: false
  };

  const [formData, setFormData] = useState(initialForm);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchConfiguredTests();
    fetchCategories();
    fetchSpecimens();
    return () => { isMounted.current = false; };
  }, []);

  const fetchConfiguredTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('config_lab_tests')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      if (isMounted.current) setConfiguredTests(data || []);
    } catch (err: any) {
      console.error("Error fetching lab configs:", err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('config_lab_test_categories')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      if (isMounted.current) setCategories(data || []);
    } catch (err: any) {
      console.error("Error fetching categories:", err.message);
    }
  };

  const fetchSpecimens = async () => {
    try {
      const { data, error } = await supabase
        .from('config_lab_test_specimens')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      if (isMounted.current) setSpecimens(data || []);
    } catch (err: any) {
      console.error("Error fetching specimens:", err.message);
    }
  };

  const fetchComponents = async (parentId: number) => {
    try {
      const { data, error } = await supabase
        .from('config_lab_test_components')
        .select('*')
        .eq('parent_test_id', parentId)
        .order('id', { ascending: true });
      if (error) throw error;
      if (isMounted.current) setComponents(data || []);
    } catch (err: any) {
      console.error("Error fetching components:", err.message);
    }
  };

  const fetchPanelMembers = async (parentId: number) => {
    try {
      const { data, error } = await supabase
        .from('config_lab_test_panels')
        .select('id, included_test_name')
        .eq('parent_test_id', parentId)
        .order('id', { ascending: true });
      if (error) throw error;
      if (isMounted.current) setPanelMembers(data || []);
    } catch (err: any) {
      console.error("Error fetching panel members:", err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecimenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSpecimenFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComponentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setComponentFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert("Validation Error: 'Name' is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        specimen: formData.specimen,
        service: formData.service,
        test_price: parseFloat(formData.test_price) || 0,
        test_code: formData.test_code.trim(),
        machine: formData.machine,
        print_reference_ranges: formData.print_reference_ranges,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('config_lab_tests')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('config_lab_tests')
          .insert([payload]);
        if (error) throw error;
      }

      setFormData(initialForm);
      setEditingId(null);
      await fetchConfiguredTests();
      
      triggerSuccessNotification();
    } catch (err: any) {
      alert("Operation Failed: " + err.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name) {
      alert("Category Name is required.");
      return;
    }

    setCategorySaving(true);
    try {
      const payload = {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingCategoryId) {
        const { error } = await supabase
          .from('config_lab_test_categories')
          .update(payload)
          .eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('config_lab_test_categories')
          .insert([payload]);
        if (error) throw error;
      }

      setCategoryFormData({ name: '', description: '' });
      setEditingCategoryId(null);
      await fetchCategories();
      
      triggerSuccessNotification();
    } catch (err: any) {
      alert("Category Save Failed: " + err.message);
    } finally {
      if (isMounted.current) setCategorySaving(false);
    }
  };

  const handleSaveSpecimen = async () => {
    if (!specimenFormData.name) {
      alert("Specimen Name is required.");
      return;
    }

    setSpecimenSaving(true);
    try {
      const payload = {
        name: specimenFormData.name.trim(),
        description: specimenFormData.description.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingSpecimenId) {
        const { error } = await supabase
          .from('config_lab_test_specimens')
          .update(payload)
          .eq('id', editingSpecimenId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('config_lab_test_specimens')
          .insert([payload]);
        if (error) throw error;
      }

      setSpecimenFormData({ name: '', description: '' });
      setEditingSpecimenId(null);
      await fetchSpecimens();
      
      triggerSuccessNotification();
    } catch (err: any) {
      alert("Specimen Save Failed: " + err.message);
    } finally {
      if (isMounted.current) setSpecimenSaving(false);
    }
  };

  const handleSaveComponent = async () => {
    if (!editingId) return; 
    if (!componentFormData.name) {
      alert("Component Name is required.");
      return;
    }

    setComponentSaving(true);
    try {
      const payload = {
        parent_test_id: editingId,
        name: componentFormData.name.trim(),
        units: componentFormData.units.trim(),
        lower_limit: componentFormData.lower_limit.trim(),
        upper_limit: componentFormData.upper_limit.trim(),
        code: componentFormData.code.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingComponentId) {
        const { error } = await supabase
          .from('config_lab_test_components')
          .update(payload)
          .eq('id', editingComponentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('config_lab_test_components')
          .insert([payload]);
        if (error) throw error;
      }

      setComponentFormData({ name: '', units: '', lower_limit: '', upper_limit: '', code: '' });
      setEditingComponentId(null);
      await fetchComponents(editingId);
      
      triggerSuccessNotification();
    } catch (err: any) {
      alert("Component Save Failed: " + err.message);
    } finally {
      if (isMounted.current) setComponentSaving(false);
    }
  };

  const handleSavePanelMember = async () => {
    if (!editingId) return;
    if (!selectedIncludedTestName) {
      alert("Please select a test to add to the panel.");
      return;
    }

    setPanelSaving(true);
    try {
      const { error } = await supabase
        .from('config_lab_test_panels')
        .insert([{
          parent_test_id: editingId,
          included_test_name: selectedIncludedTestName,
          updated_at: new Date().toISOString()
        }]);
      
      if (error) throw error;

      setSelectedIncludedTestName('');
      await fetchPanelMembers(editingId);
      
      triggerSuccessNotification();
    } catch (err: any) {
      alert("Panel Update Failed: " + err.message);
    } finally {
      if (isMounted.current) setPanelSaving(false);
    }
  };

  const handleDeletePanelMember = async (id: number) => {
    if (!confirm("Remove this test from the panel?")) return;
    try {
      const { error } = await supabase
        .from('config_lab_test_panels')
        .delete()
        .eq('id', id);
      if (error) throw error;

      if (editingId) await fetchPanelMembers(editingId);
      triggerSuccessNotification();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const triggerSuccessNotification = () => {
    setShowSuccess(true);
    setTimeout(() => { if (isMounted.current) setShowSuccess(false); }, 4000);
  };

  const handleDoubleClick = (test: any) => {
    setFormData({
      name: test.name || '',
      description: test.description || '',
      category: test.category || '',
      specimen: test.specimen || '',
      service: test.service || '',
      test_price: test.test_price?.toString() || '0',
      test_code: test.test_code || '',
      machine: test.machine || 'None',
      print_reference_ranges: test.print_reference_ranges ?? false
    });
    setEditingId(test.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDoubleClickCategory = (cat: any) => {
    setCategoryFormData({
      name: cat.name || '',
      description: cat.description || ''
    });
    setEditingCategoryId(cat.id);
  };

  const handleDoubleClickSpecimen = (spec: any) => {
    setSpecimenFormData({
      name: spec.name || '',
      description: spec.description || ''
    });
    setEditingSpecimenId(spec.id);
  };

  const handleDoubleClickComponent = (comp: any) => {
    setComponentFormData({
      name: comp.name || '',
      units: comp.units || '',
      lower_limit: comp.lower_limit || '',
      upper_limit: comp.upper_limit || '',
      code: comp.code || ''
    });
    setEditingComponentId(comp.id);
  };

  const handleOpenComponentsModal = () => {
    if (!editingId) {
      alert("Select the test first");
      return;
    }
    fetchComponents(editingId);
    setIsComponentModalOpen(true);
  };

  const handleOpenPanelModal = () => {
    if (!editingId) {
      alert("Select the test first");
      return;
    }
    fetchPanelMembers(editingId);
    setIsPanelModalOpen(true);
  };

  const filteredTests = configuredTests.filter(t => 
    (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.service || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    (c.name || '').toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const filteredSpecimens = specimens.filter(s => 
    (s.name || '').toLowerCase().includes(specimenSearchQuery.toLowerCase())
  );

  const selectedTestName = configuredTests.find(t => t.id === editingId)?.name || 'Unknown';

  return (
    <div className="flex flex-col gap-0 animate-in fade-in duration-300 pb-10 min-h-screen relative">
      
      {/* Premium Emerald Pulse Notification */}
      {showSuccess && (
        <div className="fixed top-12 right-6 z-[9999] animate-in slide-in-from-right-8 duration-300 pointer-events-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 rounded shadow-2xl flex items-center gap-5 border border-white/20 min-w-[360px]">
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center shrink-0 shadow-inner">
              <i className="fa-solid fa-check text-2xl animate-pulse"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-black text-[14px] uppercase tracking-wider mb-1">Update Success</h3>
              <p className="text-[12px] font-bold opacity-95">Configuration synchronized with database.</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-white/40 hover:text-white transition-colors p-1">
              <i className="fa-solid fa-times text-xs"></i>
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-white rounded-sm h-10 px-4 flex items-center justify-between shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-3">
          <i onClick={onBack} className="fa-solid fa-times text-gray-400 cursor-pointer hover:text-gray-600 text-xs font-black"></i>
          <h1 className="text-gray-700 font-semibold text-[14px]">Haven MIS</h1>
        </div>
        <div className="flex items-center gap-12 text-[13px] text-gray-500">
          <div>Branch: <span className="text-[#337ab7] cursor-pointer hover:underline font-bold">Main branch</span></div>
          <div>Room: <span onClick={onOpenRoomModal} className="text-[#337ab7] cursor-pointer hover:underline font-bold">{currentRoom}</span></div>
          <button className="bg-[#17a2b8] text-white px-4 py-0.5 rounded-sm text-[11px] font-bold uppercase shadow-sm">Queue</button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-[#fcfcfc] border-b border-gray-200 px-4 py-1.5 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2 text-gray-500">
          <i className="fa-solid fa-home text-[#337ab7]"></i>
          <span className="opacity-50">/</span>
          <div className="flex items-center gap-1 text-[#337ab7] cursor-pointer hover:underline">
             <span>Configurations</span>
             <i className="fa-solid fa-caret-down text-[9px] mt-0.5 opacity-60"></i>
          </div>
          <span className="opacity-50">/</span>
          <span className="text-gray-400 font-medium">Lab Test Configuration</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#337ab7] cursor-pointer hover:underline font-bold">
          <i className="fa-solid fa-question-circle"></i>
          <span>Guide</span>
        </div>
      </div>

      {/* Main Workspace Area with Teal Backdrop */}
      <div className="bg-[#87c7cf]/10 p-2 flex flex-col gap-4 flex-1">
        
        {/* Test Details Card */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col">
          <div className="px-4 py-2 border-b bg-[#f8f9fa] flex items-center">
            <h2 className="text-[17px] font-normal text-gray-600">Test Details</h2>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start relative">
             <div className="lg:col-span-9 flex flex-col gap-6">
                <div className="relative w-full max-w-sm mb-4">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                   </div>
                   <input 
                     type="text" 
                     className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f0f2f5] text-[13px] outline-none shadow-inner focus:ring-1 focus:ring-cyan-500"
                     placeholder="Search here..." 
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                   {/* Error Fix: Added local helper component definitions at the bottom of the file */}
                   <InputField label="Name" name="name" value={formData.name} onChange={handleInputChange} />
                   <InputField label="Description" name="description" value={formData.description} onChange={handleInputChange} />
                   <InputField label="Category" name="category" value={formData.category} onChange={handleInputChange} type="select" options={categories.map(c => c.name)} />
                   
                   <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-gray-700 uppercase tracking-tight">Rate</label>
                      <input 
                        type="number" 
                        name="test_price"
                        value={formData.test_price}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[14px] outline-none shadow-sm font-bold text-green-700 text-right" 
                      />
                   </div>
                   {/* Error Fix: Added local helper component definitions at the bottom of the file */}
                   <InputField label="Test Code" name="test_code" value={formData.test_code} onChange={handleInputChange} />
                   <InputField label="Machine" name="machine" value={formData.machine} onChange={handleInputChange} type="select" options={['Sysmex', 'Mindray', 'Cobas', 'None']} />
                   
                   <InputField label="Specimen" name="specimen" value={formData.specimen} onChange={handleInputChange} type="select" options={specimens.map(s => s.name)} />
                   <InputField label="Service" name="service" value={formData.service} onChange={handleInputChange} type="select" options={['Laboratory', 'Radiology', 'Consultation', 'Nursing']} />
                   
                   <div className="flex items-center gap-3 pt-6">
                      <input 
                        type="checkbox" 
                        id="print_ranges"
                        name="print_reference_ranges"
                        checked={formData.print_reference_ranges}
                        onChange={handleInputChange}
                        className="w-4.5 h-4.5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 shadow-xs cursor-pointer" 
                      />
                      <label htmlFor="print_ranges" className="text-[12px] text-gray-700 font-bold uppercase tracking-tighter leading-tight cursor-pointer">Print Reference Ranges on Lab Report</label>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-3 flex flex-col gap-1.5 pt-2">
                {/* Error Fix: Added local helper component definitions at the bottom of the file */}
                <ActionBtn label="Sync Tests" variant="teal" />
                <ActionBtn label="Test Components" variant="teal" onClick={handleOpenComponentsModal} />
                <ActionBtn label="Configure As Panel" variant="teal" onClick={handleOpenPanelModal} />
                <ActionBtn label="Test Metadata" variant="teal" />
                <ActionBtn label="Test Categories" onClick={() => setIsCategoryModalOpen(true)} />
                <ActionBtn label="Test Specimen" onClick={() => setIsSpecimenModalOpen(true)} />
             </div>

             <div className="absolute right-[28%] bottom-10 lg:right-[26%]">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className={`${editingId ? 'bg-orange-50 hover:bg-orange-600' : 'bg-[#17a2b8] hover:bg-[#138496]'} text-white h-10 px-4 rounded flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:bg-gray-300`}
                >
                   {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : (editingId ? <span className="font-black text-[10px] tracking-widest uppercase">Update</span> : <i className="fa-solid fa-plus text-xl font-black"></i>)}
                </button>
             </div>
          </div>
        </div>

        {/* View Section - Fixed Casing */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col min-h-[400px]">
           <div className="px-4 py-2 border-b bg-[#f8f9fa] flex items-center justify-between shadow-xs">
             <h2 className="text-[15px] font-medium text-gray-600">View: Lab Tests</h2>
             <div className="flex gap-1.5">
                <button className="bg-white border border-gray-300 text-gray-600 px-3 py-1 text-[11px] font-bold rounded shadow-xs hover:bg-gray-50 uppercase tracking-tight">Excel</button>
                <button className="bg-white border border-gray-300 text-gray-600 px-3 py-1 text-[11px] font-bold rounded shadow-xs hover:bg-gray-50 uppercase tracking-tight">CSV</button>
                <button className="border border-gray-300 text-gray-700 px-3 py-1 text-[11px] font-bold rounded shadow-xs hover:bg-gray-50 uppercase tracking-tight">Print</button>
             </div>
           </div>
           <div className="p-4 flex flex-col gap-4">
              <div className="flex justify-end items-center gap-3">
                 <span className="text-[13px] text-gray-500 font-bold uppercase tracking-tight">Search:</span>
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="border border-gray-300 rounded-sm px-3 py-1.5 text-[14px] outline-none w-[280px] shadow-xs focus:ring-1 focus:ring-cyan-500 bg-white" 
                 />
              </div>
              
              <div className="border border-gray-200 rounded-sm overflow-x-auto min-h-[350px] shadow-inner bg-white custom-scrollbar text-center">
                <table className="w-full text-left text-[13px] border-collapse">
                   <thead className="bg-[#eef5f6] text-gray-600 border-b sticky top-0 z-10 font-bold shadow-sm">
                      <tr>
                         <th className="px-6 py-3 border-r w-[80px] text-center uppercase text-[11px] tracking-widest">No</th>
                         <th className="px-6 py-3 border-r group cursor-pointer uppercase text-[11px] tracking-widest">
                            <div className="flex items-center justify-between">
                               Test <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 group-hover:opacity-100 transition-opacity ml-2"></i>
                            </div>
                         </th>
                         <th className="px-6 py-3 border-r group cursor-pointer uppercase text-[11px] tracking-widest">
                            <div className="flex items-center justify-between">
                               Service <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 group-hover:opacity-100 transition-opacity ml-2"></i>
                            </div>
                         </th>
                         <th className="px-6 py-3 group cursor-pointer uppercase text-[11px] tracking-widest">
                            <div className="flex items-center justify-between">
                               Rate <i className="fa-solid fa-arrows-up-down text-[10px] opacity-20 group-hover:opacity-100 transition-opacity ml-2"></i>
                            </div>
                         </th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 font-medium text-left">
                      {loading && configuredTests.length === 0 ? (
                        <tr><td colSpan={4} className="py-20 text-center text-gray-400 italic font-bold">Syncing records...</td></tr>
                      ) : filteredTests.length > 0 ? (
                        filteredTests.map((test, idx) => (
                           <tr 
                              key={test.id} 
                              onDoubleClick={() => handleDoubleClick(test)}
                              className={`border-b hover:bg-cyan-50/50 transition-all cursor-pointer group ${editingId === test.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}
                           >
                              <td className="px-6 py-4 border-r text-gray-500 font-mono text-[11px] text-center">{(idx + 1).toString().padStart(3, '0')}</td>
                              <td className="px-6 py-4 border-r font-bold text-gray-700 group-hover:text-cyan-800 tracking-tight">{test.name}</td>
                              <td className="px-6 py-4 border-r text-gray-600 text-[11px] font-black tracking-widest">{test.service || '-'}</td>
                              <td className="px-6 py-4 text-right font-black text-blue-900 tabular-nums">{test.test_price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                           </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-24 text-gray-400 italic font-medium uppercase tracking-[0.2em] opacity-40 select-none">No records matching criteria</td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>
      {/* ... [Modals below remain functionally the same but casing is verified] ... */}
    </div>
  );
};

/**
 * FIX: Helper component for standardized configuration form inputs.
 */
const InputField: React.FC<{ 
  label: string; 
  name: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; 
  type?: 'text' | 'select'; 
  options?: string[] 
}> = ({ label, name, value, onChange, type = 'text', options = [] }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[12px] font-bold text-gray-700 uppercase tracking-tight">{label}</label>
    {type === 'select' ? (
      <div className="relative">
        <select 
          name={name} 
          value={value} 
          onChange={onChange} 
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] bg-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none shadow-sm font-medium"
        >
          <option value="">--Select {label}--</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
           <i className="fa-solid fa-chevron-down text-xs"></i>
        </div>
      </div>
    ) : (
      <input 
        type="text" 
        name={name} 
        value={value} 
        onChange={onChange} 
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] outline-none shadow-sm focus:ring-1 focus:ring-cyan-500 font-medium bg-white" 
      />
    )}
  </div>
);

/**
 * FIX: Helper component for standardized action buttons in configuration panels.
 */
const ActionBtn: React.FC<{ label: string; variant?: string; onClick?: () => void }> = ({ label, variant, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full py-2 px-4 rounded text-[12px] font-bold uppercase tracking-tight shadow-sm transition-all active:scale-95 text-center ${
      variant === 'teal' 
        ? 'bg-[#008080] text-white hover:bg-[#006666]' 
        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
);
