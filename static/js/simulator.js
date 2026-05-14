// ═══════════════════════════════════════════════
// ROLE (read from sessionStorage, set by login page)
// ═══════════════════════════════════════════════
const userRole = sessionStorage.getItem('userRole') || 'student';
const userName = sessionStorage.getItem('userName') || 'Student';

// Apply role on load
(function applyRole(){
  const badge = document.getElementById('modeBadge');
  const scenarioBtn = document.getElementById('btnScenario');
  if(userRole === 'teacher' || userRole === 'instructor'){
    if(badge) {
      badge.className = 'mode-badge mode-instructor';
      badge.textContent = 'Instructor';
    }
    if(scenarioBtn) scenarioBtn.style.display = 'flex';
  } else {
    if(badge) {
      badge.className = 'mode-badge mode-student';
      badge.textContent = 'Student';
    }
    if(scenarioBtn) scenarioBtn.style.display = 'none';
  }
})();

// ═══════════════════════════════════════════════
// DATA — COMPONENTS FROM POSTGRESQL
// This starts empty. It will be filled by fetchComponentsFromAPI().
// Keep CABLES static because they are simulator interaction items, not PC parts.
// ═══════════════════════════════════════════════
let COMPONENTS = [];
const API_BASE_URL = ''; // Same Flask app. Keep empty when opening http://127.0.0.1:5000/simulator

// ═══════════════════════════════════════════════
// DATA — CABLES
// ═══════════════════════════════════════════════
const CABLES = [
  {id:'c_24pin',name:'24-Pin ATX Power',desc:'Main motherboard power',color:'#ef4444',connects:'mb_power',svg:'power'},
  {id:'c_8pin_cpu',name:'8-Pin CPU Power',desc:'Processor power connector',color:'#f59e0b',connects:'cpu_power',svg:'cpu_pwr'},
  {id:'c_pcie_16',name:'PCIe 16x Power (8-Pin)',desc:'GPU primary power',color:'#8b5cf6',connects:'gpu_power',svg:'pcie'},
  {id:'c_pcie_8',name:'PCIe 8x Power',desc:'GPU secondary power',color:'#7c3aed',connects:'gpu_power2',svg:'pcie2'},
  {id:'c_sata',name:'SATA Power Cable',desc:'SATA drive power',color:'#059669',connects:'storage_power',svg:'sata_pwr'},
  {id:'c_sata_data',name:'SATA Data Cable',desc:'SATA data connection',color:'#0891b2',connects:'storage_data',svg:'sata_data'},
  {id:'c_nvme',name:'M.2 NVMe (No Cable)',desc:'Direct board connection',color:'#334155',connects:'nvme_slot',svg:'nvme'},
  {id:'c_case_fan',name:'Case Fan Header',desc:'Case fans power',color:'#0e7490',connects:'fan_header',svg:'fan'},
  {id:'c_usb',name:'USB 3.0 Header',desc:'Front panel USB',color:'#2563eb',connects:'usb_header',svg:'usb'},
  {id:'c_audio',name:'HD Audio Header',desc:'Front panel audio',color:'#db2777',connects:'audio_header',svg:'audio'},
  {id:'c_front_panel',name:'Front Panel Connectors',desc:'Power/Reset/LED',color:'#d97706',connects:'front_panel',svg:'fp'},
  {id:'c_dp',name:'DisplayPort Cable',desc:'Monitor connection',color:'#1e40af',connects:'display_out',svg:'dp'},
];

// Cable zones (back panel connection points)
const CABLE_ZONES = [
  {id:'mb_power',name:'24-Pin MB Power',required:true,needs:'c_24pin',zoneFor:'mb'},
  {id:'cpu_power',name:'8-Pin CPU Power',required:true,needs:'c_8pin_cpu',zoneFor:'cpu'},
  {id:'gpu_power',name:'GPU PCIe Power',required:false,needs:'c_pcie_16',zoneFor:'gpu'},
  {id:'gpu_power2',name:'GPU 2nd Power',required:false,needs:'c_pcie_8',zoneFor:'gpu'},
  {id:'storage_power',name:'Storage Power',required:false,needs:'c_sata',zoneFor:'storage'},
  {id:'storage_data',name:'Storage Data',required:false,needs:'c_sata_data',zoneFor:'storage'},
  {id:'nvme_slot',name:'M.2 Slot',required:false,needs:'c_nvme',zoneFor:'storage'},
  {id:'fan_header',name:'Fan Headers',required:false,needs:'c_case_fan',zoneFor:'cooler'},
  {id:'usb_header',name:'USB Header',required:false,needs:'c_usb',zoneFor:'mb'},
  {id:'audio_header',name:'Audio Header',required:false,needs:'c_audio',zoneFor:'mb'},
  {id:'front_panel',name:'Front Panel',required:true,needs:'c_front_panel',zoneFor:'mb'},
  {id:'display_out',name:'Display Output',required:false,needs:'c_dp',zoneFor:'gpu'},
];

// ═══════════════════════════════════════════════
// DATA — INTERACTIVE INSTALLATION STEPS
// Each step has: title, hint, task (interactive widget type), taskData
// ═══════════════════════════════════════════════
const INSTALL_STEPS = {
  cpu:[
    {title:'Lift the Socket Lever',hint:'Click and drag the lever UP to unlock the CPU socket.',task:'lever',taskData:{label:'ZIF Socket Lever',axis:'vertical',direction:'up',color:'#f59e0b',successMsg:'Lever up — socket unlocked!'}},
    {title:'Open the Retention Bracket',hint:'Click the retention bracket to lift it open.',task:'click_action',taskData:{label:'Lift Retention Bracket',icon:'📤',confirmText:'Click to lift bracket open',successMsg:'Bracket open — socket exposed!'}},
    {title:'Remove the Plastic Socket Cover',hint:'Click the plastic cover to pop it off. Keep it safe!',task:'click_action',taskData:{label:'Pop off plastic cover',icon:'🔲',confirmText:'Click to remove protective cover',successMsg:'Cover removed — do not throw away!'}},
    {title:'Align the CPU (Match Triangles)',hint:'Drag the CPU over the socket and align the gold triangle marker with the socket triangle. The CPU must be perfectly aligned before lowering.',task:'align_cpu',taskData:{label:'Align CPU triangle markers',successMsg:'CPU aligned — triangles match ✅'}},
    {title:'Gently Lower the CPU',hint:'Click "Lower CPU" — use ZERO force. If it doesn\'t drop in freely, re-check alignment.',task:'click_action',taskData:{label:'Lower CPU into socket',icon:'⬇️',confirmText:'Gently lower (zero force)',successMsg:'CPU seated with zero force ✅'}},
    {title:'Close Retention Bracket',hint:'Click the bracket to lower it back over the CPU.',task:'click_action',taskData:{label:'Lower retention bracket',icon:'📥',confirmText:'Click to close bracket',successMsg:'Bracket closed!'}},
    {title:'Lock the Socket Lever',hint:'Drag the lever back DOWN and hook it under the tab to lock.',task:'lever',taskData:{label:'Lock Socket Lever',axis:'vertical',direction:'down',color:'#3ecf5e',successMsg:'Lever locked — CPU secured! ✅'}},
  ],
  cooler:[
    {title:'Apply Thermal Paste',hint:'Click the center of the CPU to apply a pea-sized dot of thermal paste. Don\'t spread it!',task:'apply_paste',taskData:{label:'Apply thermal paste to CPU center',successMsg:'Thermal paste applied — pea-sized dot ✅'}},
    {title:'Attach Backplate',hint:'Drag the backplate to the underside of the motherboard and click each hole to attach it.',task:'click_action',taskData:{label:'Attach backplate through MB holes',icon:'🔩',confirmText:'Press backplate onto motherboard underside',successMsg:'Backplate secured!'}},
    {title:'Lower the Cooler onto CPU',hint:'Drag the cooler down onto the CPU. Make sure the cold plate is centered over the CPU.',task:'drag_component',taskData:{label:'Lower cooler onto CPU',color:'#0e7490',icon:'cooler'}},
    {title:'Tighten Cooler Screws (Diagonal Pattern)',hint:'Click each screw in the DIAGONAL order shown. Go gradually — a little at a time.',task:'screws_ordered',taskData:{count:4,label:'Cooler Mounting Screw',color:'#0e7490',order:[1,3,2,4],successMsg:'Screws tightened — even pressure ✅',pattern:'diagonal'}},
    {title:'Plug CPU Fan Header',hint:'Drag the fan cable to the CPU_FAN header on the motherboard.',task:'plug_connector',taskData:{label:'CPU Fan Header',port:'CPU_FAN',cableColor:'#0e7490',successMsg:'Fan header connected ✅'}},
  ],
  ram:[
    {title:'Open the DIMM Slot Latches',hint:'Click both latches on DIMM slots A2 and B2 to push them open (outward).',task:'click_multi',taskData:{items:['Left Latch A2','Right Latch A2','Left Latch B2','Right Latch B2'],label:'DIMM Latch',color:'#db2777',successMsg:'All latches open ✅'}},
    {title:'Align RAM Stick (Match Notch)',hint:'Drag the RAM stick and align its notch with the slot key. RAM only fits one way!',task:'align_ram',taskData:{label:'Align RAM notch with slot key',successMsg:'RAM aligned — notch matches ✅'}},
    {title:'Press RAM into Slot A2',hint:'Click and hold the RAM stick and press straight down evenly until both latches click shut.',task:'press_ram',taskData:{slot:'A2',label:'Press RAM into A2',successMsg:'Click! — A2 latch snapped shut ✅'}},
    {title:'Press RAM into Slot B2',hint:'Same process — press the second stick straight down into B2 until both latches click.',task:'press_ram',taskData:{slot:'B2',label:'Press RAM into B2',successMsg:'Click! — B2 latch snapped shut ✅'}},
  ],
  gpu:[
    {title:'Remove PCIe Bracket Covers',hint:'Click each bracket cover screw to unscrew it, then click the covers to pull them out.',task:'click_multi',taskData:{items:['Bracket Cover Screw 1','Bracket Cover Screw 2','Remove Cover 1','Remove Cover 2'],label:'Bracket',color:'#7c3aed',successMsg:'Bracket slots open ✅'}},
    {title:'Press the PCIe Latch Open',hint:'Click the small plastic latch at the end of the PCIe x16 slot to unlock it.',task:'click_action',taskData:{label:'Press PCIe x16 Latch',icon:'🔓',confirmText:'Click latch to unlock slot',successMsg:'PCIe slot unlocked!'}},
    {title:'Lower GPU into PCIe Slot',hint:'Drag the GPU and align its gold connector edge with the PCIe x16 slot. Press down firmly until you hear the latch click.',task:'drag_component',taskData:{label:'Insert GPU into PCIe x16 slot',color:'#8b5cf6',icon:'gpu'}},
    {title:'Verify Latch Clicked Shut',hint:'Check that the PCIe latch clicked back into the notch on the GPU. Click the latch to confirm.',task:'click_action',taskData:{label:'Confirm PCIe latch clicked',icon:'🔒',confirmText:'Click to verify latch is locked',successMsg:'GPU fully seated — latch confirmed ✅'}},
    {title:'Screw GPU Bracket to Case',hint:'Click each screw hole on the GPU bracket to drive the screws in and secure it.',task:'screws',taskData:{count:2,label:'GPU Bracket Screw',color:'#8b5cf6',successMsg:'GPU bracket secured ✅'}},
  ],
  storage:[
    {title:'Remove M.2 Retaining Screw',hint:'Click the tiny retaining screw at the end of the M.2 slot to unscrew it.',task:'screws',taskData:{count:1,label:'M.2 Retaining Screw',color:'#059669',successMsg:'Screw removed — slot ready!'}},
    {title:'Insert M.2 Drive at 30° Angle',hint:'Drag the NVMe drive and insert it into the M.2 slot at a 30-degree angle. The gold fingers go in first.',task:'insert_m2',taskData:{label:'Slide NVMe drive into M.2 slot at 30°',successMsg:'Drive inserted at correct angle ✅'}},
    {title:'Press Drive Flat and Hold',hint:'Press the free end of the drive down flat against the board and hold it.',task:'click_action',taskData:{label:'Press drive flat against board',icon:'⬇️',confirmText:'Press and hold drive flat',successMsg:'Drive lying flat ✅'}},
    {title:'Drive the Retaining Screw',hint:'Click the screw hole to drive the retaining screw through the drive notch, securing it.',task:'screws',taskData:{count:1,label:'M.2 Retaining Screw',color:'#3ecf5e',successMsg:'Drive secured! ✅'}},
  ],
  psu:[
    {title:'Orient the PSU (Fan Down)',hint:'Click the correct orientation — fan should face DOWN toward the bottom vent.',task:'choose_orientation',taskData:{options:['Fan Facing Down ✅','Fan Facing Up'],correct:0,label:'Select PSU orientation',successMsg:'Correct! Fan faces down for airflow ✅'}},
    {title:'Slide PSU into Bay',hint:'Drag the PSU into the PSU bay from the back of the case.',task:'drag_component',taskData:{label:'Slide PSU into case bay',color:'#dc2626',icon:'psu'}},
    {title:'Align and Drive 4 Mounting Screws',hint:'Click each of the 4 screw holes on the back panel to secure the PSU.',task:'screws',taskData:{count:4,label:'PSU Mounting Screw',color:'#ef4444',successMsg:'PSU secured with 4 screws ✅'}},
  ],
};

// ═══════════════════════════════════════════════
// DATA — 30 HARDWARE/SOFTWARE PROBLEMS
// ═══════════════════════════════════════════════
const PROBLEMS = [
  {id:'p1',title:'CPU Not Seated Properly',type:'hw',severity:'critical',desc:'CPU is not fully seated in the socket. Missing pins or improper lock.',bios:true,fix:'Reseat CPU carefully'},
  {id:'p2',title:'No RAM Detected',type:'hw',severity:'critical',desc:'RAM sticks not clicked in properly or in wrong slots.',bios:true,fix:'Reseat RAM in correct slots'},
  {id:'p3',title:'CPU Fan Not Connected',type:'hw',severity:'high',desc:'CPU_FAN header is disconnected. Thermal protection may trigger.',bios:true,fix:'Connect CPU fan header'},
  {id:'p4',title:'GPU Not Seated in PCIe Slot',type:'hw',severity:'high',desc:'GPU not fully pushed into PCIe x16 slot. Latch not clicked.',bios:false,fix:'Reseat GPU until latch clicks'},
  {id:'p5',title:'24-Pin Power Not Connected',type:'hw',severity:'critical',desc:'Motherboard has no power. PC won\'t POST.',bios:true,fix:'Connect 24-pin ATX cable'},
  {id:'p6',title:'CPU Power (8-Pin) Missing',type:'hw',severity:'critical',desc:'CPU has no power — system won\'t boot or will be unstable.',bios:true,fix:'Connect 8-pin EPS cable'},
  {id:'p7',title:'GPU Power Not Connected',type:'hw',severity:'high',desc:'Discrete GPU has no PCIe power cables attached.',bios:false,fix:'Connect PCIe power cables to GPU'},
  {id:'p8',title:'Incompatible CPU & Motherboard',type:'hw',severity:'critical',desc:'CPU socket doesn\'t match motherboard (e.g. LGA1700 vs AM5).',bios:true,fix:'Replace with compatible CPU or MB'},
  {id:'p9',title:'RAM Not in Dual Channel Slots',type:'hw',severity:'medium',desc:'RAM installed in wrong slots. Running in single channel mode.',bios:true,fix:'Move RAM to A2/B2 slots'},
  {id:'p10',title:'Thermal Paste Missing',type:'hw',severity:'high',desc:'No thermal paste between CPU and cooler. CPU will overheat.',bios:false,fix:'Apply thermal paste'},
  {id:'p11',title:'CMOS Battery Dead',type:'hw',severity:'medium',desc:'BIOS settings reset on every boot. Clock shows wrong time.',bios:true,fix:'Replace CMOS battery (CR2032)'},
  {id:'p12',title:'SATA Data Cable Loose',type:'hw',severity:'medium',desc:'Storage drive not detected by OS.',bios:true,fix:'Reseat SATA data cable'},
  {id:'p13',title:'Front Panel Connectors Wrong',type:'hw',severity:'low',desc:'Power button or reset button not working. Check polarity.',bios:false,fix:'Re-read manual and reconnect front panel'},
  {id:'p14',title:'Static Discharge Damage',type:'hw',severity:'critical',desc:'Component damaged by ESD. Check if wristband was used.',bios:true,fix:'Replace damaged component'},
  {id:'p15',title:'Insufficient PSU Wattage',type:'hw',severity:'high',desc:'PSU cannot supply enough power. System crashes under load.',bios:false,fix:'Upgrade to higher wattage PSU'},
  {id:'p16',title:'DDR4 RAM on DDR5 Board',type:'hw',severity:'critical',desc:'Wrong generation RAM. Physical incompatibility — won\'t fit.',bios:true,fix:'Replace with correct DDR generation'},
  {id:'p17',title:'BIOS Not Updated for CPU',type:'sw',severity:'high',desc:'Older BIOS version doesn\'t support new CPU. Boot failure.',bios:true,fix:'Update BIOS to latest version'},
  {id:'p18',title:'Boot Order Incorrect',type:'bios',severity:'medium',desc:'BIOS boot order set to wrong drive. OS not found.',bios:true,fix:'Set correct boot drive in BIOS'},
  {id:'p19',title:'Secure Boot Blocking OS',type:'bios',severity:'medium',desc:'Secure Boot enabled, blocking non-signed bootloaders.',bios:true,fix:'Disable Secure Boot or enroll OS key'},
  {id:'p20',title:'XMP/EXPO Profile Not Enabled',type:'bios',severity:'low',desc:'RAM running at default 2133MHz instead of rated speed.',bios:true,fix:'Enable XMP/EXPO in BIOS'},
  {id:'p21',title:'OS Corrupted Bootloader',type:'sw',severity:'high',desc:'Windows/Linux boot files corrupted. Blue screen or no boot.',bios:false,fix:'Run bootrec /fixmbr or reinstall OS'},
  {id:'p22',title:'Missing Device Driver',type:'sw',severity:'medium',desc:'Hardware detected but driver not installed. Device shows error.',bios:false,fix:'Install correct drivers from manufacturer'},
  {id:'p23',title:'Overheating CPU',type:'hw',severity:'high',desc:'CPU temperature over 95°C. Throttling performance or shutting down.',bios:false,fix:'Check cooler mount and thermal paste'},
  {id:'p24',title:'GPU Driver Crash',type:'sw',severity:'medium',desc:'Display driver crashes causing black screen or BSOD.',bios:false,fix:'Clean install latest GPU driver'},
  {id:'p25',title:'Windows Activation Failed',type:'sw',severity:'low',desc:'Windows not activated. Watermark shown on desktop.',bios:false,fix:'Enter valid product key or digital license'},
  {id:'p26',title:'NVMe Drive Not Detected',type:'bios',severity:'medium',desc:'M.2 NVMe drive not showing in BIOS or OS.',bios:true,fix:'Enable M.2 slot in BIOS, check NVMe vs SATA M.2'},
  {id:'p27',title:'Beep Codes — POST Failure',type:'hw',severity:'critical',desc:'System emits beep codes indicating RAM or GPU failure during POST.',bios:true,fix:'Decode beep pattern and diagnose component'},
  {id:'p28',title:'BIOS in Legacy Mode',type:'bios',severity:'medium',desc:'BIOS set to Legacy/CSM mode instead of UEFI. Limits GPT booting.',bios:true,fix:'Switch to UEFI mode in BIOS'},
  {id:'p29',title:'Wrong SATA Mode',type:'bios',severity:'medium',desc:'SATA set to IDE mode instead of AHCI. OS may not boot.',bios:true,fix:'Change SATA mode to AHCI in BIOS'},
  {id:'p30',title:'Virtual Memory Low',type:'sw',severity:'low',desc:'System runs out of virtual memory under heavy load.',bios:false,fix:'Increase pagefile size in Windows'},
];

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
const SLOT_TYPES = ['mb','cpu','cooler','ram','gpu','storage','psu'];
const SLOT_LABELS = {mb:'Motherboard',cpu:'CPU',cooler:'Cooler',ram:'RAM',gpu:'GPU',storage:'Storage',psu:'PSU'};
const CAT_COLORS = {cpu:'cat-cpu',mb:'cat-mb',ram:'cat-ram',gpu:'cat-gpu',storage:'cat-storage',psu:'cat-psu',case:'cat-case',cooler:'cat-cooler'};
const CAT_ICONS = {
  cpu:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
  mb:'<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 7h.01M12 7h.01M17 7h.01M7 12h10M7 17h10"/>',
  ram:'<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V6M10 8V6M14 8V6M18 8V6"/>',
  gpu:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>',
  storage:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>',
  psu:'<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  case:'<rect x="3" y="1" width="13" height="22" rx="2"/><path d="M7 5h6M7 9h6M7 13h3"/>',
  cooler:'<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/>',
};

let build = {mb:null,cpu:null,cooler:null,ram:null,gpu:null,storage:null,psu:null};
let connectedCables = {}; // zoneId -> cableId
let installQueue = null; // {type, comp, steps, stepIndex}
let scenario = null;
let objectives = [];
let pendingObjs = [];
let draggingComp = null;
let draggingCable = null;
let currentView = 'front';

const DEFAULT_OBJECTIVES = [
  {section:'Requisite Learning', text:'Choose a CPU and motherboard with matching sockets', detail:'Socket mismatch blocks a proper boot.', check:()=>!!(build.cpu && build.mb && build.cpu.socket === build.mb.socket)},
  {section:'Requisite Learning', text:'Use RAM that matches the motherboard memory type', detail:'DDR4 and DDR5 are not interchangeable.', check:()=>!!(build.ram && build.mb && (!build.ram.type || !build.mb.ram_type || build.ram.type === build.mb.ram_type))},
  {section:'Requisite Learning', text:'Select a PSU with enough wattage for the CPU and GPU', detail:'Leave power headroom before powering on.', check:()=>!!(build.psu && build.psu.wattage >= estimateRequiredWattage())},
  {section:'Build Tasks', text:'Install the motherboard in the case area', detail:'Start with the board as the base for all other parts.', check:()=>!!build.mb},
  {section:'Build Tasks', text:'Install the CPU into the matching socket', detail:'Align the CPU before locking the socket.', check:()=>!!build.cpu && !!build.mb && build.cpu.socket === build.mb.socket},
  {section:'Build Tasks', text:'Mount the CPU cooler after installing the CPU', detail:'The cooler prevents overheating.', check:()=>!!build.cpu && !!build.cooler},
  {section:'Build Tasks', text:'Install compatible RAM', detail:'Memory must match the board type.', check:()=>!!build.ram && !!build.mb && (!build.ram.type || !build.mb.ram_type || build.ram.type === build.mb.ram_type)},
  {section:'Build Tasks', text:'Install the graphics card', detail:'Place the GPU in the GPU slot.', check:()=>!!build.gpu},
  {section:'Build Tasks', text:'Install a storage drive', detail:'Use SSD or HDD storage for the system.', check:()=>!!build.storage},
  {section:'Build Tasks', text:'Install the power supply', detail:'The PSU powers the full build.', check:()=>!!build.psu},
  {section:'Build Tasks', text:'Connect all required power/front-panel cables', detail:'Required cables must be connected before power on.', check:()=>requiredCablesConnected()},
  {section:'Build Tasks', text:'Power on and pass the boot compatibility check', detail:'The system should start without socket, memory, or power errors.', check:()=>!!isPowered && checkCompatForBoot().ok},
];

function estimateRequiredWattage() {
  const gpuWatt = Number(build.gpu?.tdp || build.gpu?.tdp_watts || 0);
  const cpuWatt = Number(build.cpu?.tdp || build.cpu?.tdp_watts || 0);
  return gpuWatt + cpuWatt + 100;
}

function requiredCablesConnected() {
  const required = CABLE_ZONES.filter(z => z.required);
  return required.length > 0 && required.every(z => (!z.zoneFor || build[z.zoneFor]) && connectedCables[z.id]);
}

// ═══════════════════════════════════════════════
// FLASK API INTEGRATION - POSTGRESQL COMPONENT LOADER
// ═══════════════════════════════════════════════

function normalizeDbCategory(value) {
  const c = String(value || '').toLowerCase().trim();

  if (c === 'cpu' || c === 'cpus') return 'cpu';
  if (c === 'motherboard' || c === 'motherboards' || c === 'mb' || c === 'mobo') return 'mb';
  if (c === 'ram' || c === 'rams' || c === 'memory') return 'ram';
  if (c === 'gpu' || c === 'gpus') return 'gpu';
  if (c === 'storage' || c === 'ssd' || c === 'hdd') return 'storage';
  if (c === 'psu' || c === 'psus') return 'psu';
  if (c === 'case' || c === 'cases' || c === 'pc_case' || c === 'pc_cases') return 'case';
  if (c === 'cooler' || c === 'coolers' || c === 'fan' || c === 'fans' || c === 'cooling') return 'cooler';

  return c;
}

function getDbId(item) {
  return (
    item.dbId ??
    item.db_id ??
    item.id ??
    item.cpu_id ??
    item.motherboard_id ??
    item.ram_id ??
    item.gpu_id ??
    item.psu_id ??
    item.storage_id ??
    item.case_id ??
    null
  );
}
function getItemName(item) {
  return (
    item.name ||
    item.model ||
    item.cpu_name ||
    item.motherboard_name ||
    item.ram_name ||
    item.gpu_name ||
    item.psu_name ||
    item.storage_name ||
    item.case_name ||
    'Unnamed Component'
  );
}

function getItemBrand(item) {
  return item.brand || item.brand_name || 'Unknown Brand';
}

function buildSubText(item, cat) {
  if (item.sub) return item.sub;
  if (item.description) return item.description;

  if (cat === 'cpu') {
    return `${item.cores ?? 'N/A'}C/${item.threads ?? 'N/A'}T · ${item.socket ?? 'N/A'}`;
  }

  if (cat === 'mb') {
    return `${item.chipset ?? 'N/A'} · ${item.socket ?? 'N/A'} · ${item.ram_type ?? 'N/A'}`;
  }

  if (cat === 'ram') {
    return `${item.capacity_gb ?? 'N/A'}GB · ${item.ram_type ?? 'N/A'} · ${item.speed_mhz ?? 'N/A'}MHz`;
  }

  if (cat === 'gpu') {
    return `${item.vram_gb ?? 'N/A'}GB VRAM · ${item.interface ?? 'N/A'}`;
  }

  if (cat === 'storage') {
    return `${item.capacity_gb ?? 'N/A'}GB · ${item.interface ?? 'N/A'}`;
  }

  if (cat === 'psu') {
    return `${item.wattage ?? 'N/A'}W · ${item.efficiency_rating ?? 'N/A'}`;
  }

  if (cat === 'case') {
    return `Supports ${item.form_factor_support ?? 'N/A'}`;
  }

  if (cat === 'cooler') {
    return 'No cooler table in database yet';
  }

  return 'Component';
}

function transformDbComponent(item, fallbackCategory) {
  const cat = normalizeDbCategory(item.cat || item.category || fallbackCategory);
  const dbId = getDbId(item);

  if (!cat || dbId === null || dbId === undefined) {
    console.warn('Skipped invalid PostgreSQL component row:', item);
    return null;
  }

  const component = {
    ...item,

    // Unique frontend ID for drag-and-drop.
    // Example: cpu_1, mb_2, ram_3. This prevents ID collisions between tables.
    id: `${cat}_${dbId}`,

    // Real PostgreSQL primary key.
    dbId: Number(dbId),

    cat,
    category: cat,
    name: getItemName(item),
    brand: getItemBrand(item),
    price: Number(item.price || 0),
    sub: buildSubText(item, cat),

    // Exact schema fields used by compatibility checks.
    socket: item.socket || '',
    tdp: Number(item.tdp || item.tdp_watts || 0),
    tdp_watts: Number(item.tdp_watts || item.tdp || 0),

    cores: Number(item.cores || 0),
    threads: Number(item.threads || 0),
    base_clock: Number(item.base_clock || 0),
    boost_clock: Number(item.boost_clock || 0),
    integrated_graphics: Boolean(item.integrated_graphics),

    chipset: item.chipset || '',
    ram_type: item.ram_type || '',
    type: item.ram_type || '',
    max_ram_gb: Number(item.max_ram_gb || 0),
    form_factor: item.form_factor || '',
    formFactor: item.form_factor || '',
    pcie_x16_slots: Number(item.pcie_x16_slots || 0),
    m2_slots: Number(item.m2_slots || 0),

    capacity_gb: Number(item.capacity_gb || 0),
    capacity: Number(item.capacity_gb || 0),
    speed_mhz: Number(item.speed_mhz || 0),
    speed: Number(item.speed_mhz || 0),
    sticks: Number(item.sticks || 0),

    vram_gb: Number(item.vram_gb || 0),
    gMemory: Number(item.vram_gb || 0),
    interface: item.interface || '',
    recommended_psu_watts: Number(item.recommended_psu_watts || 0),
    length_mm: Number(item.length_mm || 0),

    wattage: Number(item.wattage || 0),
    efficiency_rating: item.efficiency_rating || '',
    efficiency: item.efficiency_rating || '',
    modular: Boolean(item.modular),

    storage_type: item.storage_type || '',
    storageType: item.storage_type || '',
    form_factor_support: item.form_factor_support || '',
    max_gpu_length_mm: Number(item.max_gpu_length_mm || 0)
  };

  return component;
}

async function fetchComponentsFromAPI() {
  const list = document.getElementById('sidebarList');
  if (list) {
    list.innerHTML = `
      <div style="font-size:10px;color:var(--muted);text-align:center;padding:20px;">
        Loading components from PostgreSQL...
      </div>
    `;
  }

  try {
    // One source only: Flask /api/components -> database.py -> PostgreSQL.
    // No static array. No sample fallback. No populate_*.py.
    const response = await fetch(`${API_BASE_URL}/api/components?cache=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || `API error: ${response.status}`);
    }

    if (data.error) {
      throw new Error(data.details || data.error);
    }

    const categoryMap = {
      cpu: data.cpu || [],
      mb: data.mb || [],
      ram: data.ram || [],
      gpu: data.gpu || [],
      storage: data.storage || [],
      psu: data.psu || [],
      case: data.case || [],
      cooler: data.cooler || []
    };

    const components = [];
    Object.entries(categoryMap).forEach(([cat, items]) => {
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        const transformed = transformDbComponent(item, cat);
        if (transformed) components.push(transformed);
      });
    });

    console.log('PostgreSQL-only /api/components result:', data);
    console.log('Loaded PostgreSQL components:', components);
    return components;

  } catch (error) {
    console.error('Failed to fetch components from PostgreSQL API:', error);
    if (list) {
      list.innerHTML = `
        <div style="font-size:10px;color:var(--red);text-align:center;padding:20px;line-height:1.5;">
          Failed to load PostgreSQL components.<br/>
          Open <strong>/api/components</strong> to see the backend error.<br/>
          ${String(error.message || error)}
        </div>
      `;
    }
    showToast('Failed to load PostgreSQL components.', 'err');
    return [];
  }
}

// Save build to PostgreSQL via Flask API
async function saveBuildToDatabase(buildData) {
  try {
    const response = await fetch('/api/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildData)
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const result = await response.json();
    return result.id;

  } catch (error) {
    console.error('Failed to save build to database:', error);
    return null;
  }
}

// Load all builds from PostgreSQL via Flask API
async function loadBuildsFromDatabase() {
  try {
    const response = await fetch('/api/builds');

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    return await response.json();

  } catch (error) {
    console.error('Failed to load builds from database:', error);
    return [];
  }
}

// Get build statistics from API
async function getBuildStats(buildData) {
  try {
    const response = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildData)
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    return await response.json();

  } catch (error) {
    console.error('Failed to get build stats:', error);
    return null;
  }
}

// Refresh builds list from database
async function refreshBuildsList() {
  const buildsList = document.getElementById('buildsList');
  buildsList.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:20px;">Loading builds...</div>';
  
  const builds = await loadBuildsFromDatabase();
  
  if (!builds || builds.length === 0) {
    buildsList.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:20px;">No saved builds yet.</div>';
    return;
  }
  
  buildsList.innerHTML = builds.map(b => `
    <div style="padding:12px;border:1px solid var(--border);border-radius:6px;background:var(--card);cursor:pointer;transition:all 0.2s;" onclick="loadBuildFromDatabase('${b.id}')">
      <div style="font-weight:600;font-size:13px;color:var(--text);">${b.name}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px;">${b.description || 'No description'}</div>
      <div style="font-size:9px;color:var(--faint);margin-top:6px;">💰 ₱${b.budget || b.totalPrice || 0} · ⚡ ${b.total_power || 0}W</div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn-sm btn-green" style="flex:1;padding:6px;" onclick="event.stopPropagation(); loadBuildFromDatabase('${b.id}')">Load</button>
        <button class="btn-sm btn-ghost" style="padding:6px 10px;" onclick="event.stopPropagation(); deleteBuildFromDatabase('${b.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Load a specific build from database
async function loadBuildFromDatabase(buildId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/builds/${buildId}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const buildData = await response.json();
    
    // Load components into the build
    if (buildData.components) {
      build = buildData.components;
      // Re-render all slots with loaded components
      SLOT_TYPES.forEach(type => renderSlot(type));
      renderSidebar();
      renderCompat();
      renderInstallGuide();
      showToast(`✓ Build loaded: ${buildData.name}`, 'ok');
      console.log('✓ Build loaded from database:', buildData);
    }
  } catch (error) {
    console.error('Failed to load build from database:', error);
    showToast('Failed to load build', 'error');
  }
}

// Delete a build from database
async function deleteBuildFromDatabase(buildId) {
  if (!confirm('Are you sure you want to delete this build?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/builds/${buildId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    showToast('Build deleted', 'ok');
    refreshBuildsList();
  } catch (error) {
    console.error('Failed to delete build from database:', error);
    showToast('Failed to delete build', 'error');
  }
}
let currentCat = 'all';
let currentSTab = 'comp';
let activeRTab = 'build';
let compSearchQuery = '';
let timerInterval = null;
let timerRunning = false;
let timerSeconds = 0;
let timerTotal = 0;
let isPowered = false;
let pcState = 'off'; // off, bios, booting, desktop, osinstall, error
let detectedProblems = [];
let fixedProblems = [];
let selectedBiosItem = 0;
let osInstallStep = 0;

// ═══════════════════════════════════════════════
// SIDEBAR TABS
// ═══════════════════════════════════════════════
function switchSTab(tab, el) {
  currentSTab = tab;
  document.querySelectorAll('.stab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  const compPanel = document.getElementById('spanel-comp');
  const cablePanel = document.getElementById('spanel-cable');
  const buildsPanel = document.getElementById('spanel-builds');
  
  if(tab === 'comp') {
    compPanel.style.display = 'flex';
    compPanel.style.flexDirection = 'column';
    compPanel.style.flex = '1';
    compPanel.style.overflow = 'hidden';
    cablePanel.style.display = 'none';
    buildsPanel.style.display = 'none';
    // Reset search when switching to components tab
    compSearchQuery = '';
    const searchInput = document.getElementById('compSearch');
    if (searchInput) searchInput.value = '';
    updateClearSearchButton();
    if(currentView !== 'front') switchView('front');
  } else if(tab === 'cable') {
    compPanel.style.display = 'none';
    cablePanel.style.display = 'flex';
    cablePanel.style.flexDirection = 'column';
    cablePanel.style.flex = '1';
    cablePanel.style.overflow = 'hidden';
    buildsPanel.style.display = 'none';
    renderCableList();
    if(currentView !== 'cable') switchView('cable');
  } else if(tab === 'builds') {
    compPanel.style.display = 'none';
    cablePanel.style.display = 'none';
    buildsPanel.style.display = 'flex';
    buildsPanel.style.flexDirection = 'column';
    buildsPanel.style.flex = '1';
    buildsPanel.style.overflow = 'hidden';
    refreshBuildsList();
  }
}

// ═══════════════════════════════════════════════
// COMPONENT SIDEBAR
// ═══════════════════════════════════════════════
function filterCat(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.cat-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderSidebar();
}

function onCompSearchChange(query) {
  compSearchQuery = query.toLowerCase().trim();
  updateClearSearchButton();
  renderSidebar();
}

function clearComponentSearch() {
  document.getElementById('compSearch').value = '';
  compSearchQuery = '';
  updateClearSearchButton();
  renderSidebar();
}

function updateClearSearchButton() {
  const clearBtn = document.getElementById('clearCompSearch');
  if (clearBtn) {
    clearBtn.style.display = compSearchQuery.length > 0 ? 'inline-flex' : 'none';
  }
}

function renderSidebar() {
  const list = document.getElementById('sidebarList');

  if (!list) {
    console.error('sidebarList not found');
    return;
  }

  let filtered = currentCat === 'all'
    ? COMPONENTS
    : COMPONENTS.filter(c => c.cat === currentCat);

  // Apply search filter
  if (compSearchQuery) {
    filtered = filtered.filter(c => {
      const searchableFields = [
        c.name || '',
        c.brand || '',
        c.sub || '',
        c.cat || ''
      ];
      return searchableFields.some(field => 
        String(field).toLowerCase().includes(compSearchQuery)
      );
    });
  }

  if (!filtered || filtered.length === 0) {
    list.innerHTML = `
      <div style="font-size:10px;color:var(--muted);text-align:center;padding:20px;">
        No components found${compSearchQuery ? ' matching your search' : ' for this category'}.
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(c => {
    const inUse = Object.values(build).some(b => {
      return b && String(b.id) === String(c.id);
    });

    return `
      <div class="comp-item${inUse ? ' used' : ''}" 
           data-id="${c.id}" 
           ${inUse ? '' : 'draggable="true"'}
           ondragstart="startDrag(event,'${c.id}')" 
           ondragend="endDrag(event)">

        <div class="comp-icon ${CAT_COLORS[c.cat] || ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            ${CAT_ICONS[c.cat] || ''}
          </svg>
        </div>

        <div class="comp-info">
          <div class="comp-name">${c.name}</div>
          <div class="comp-sub">${c.brand} · ${c.sub || 'Component'}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCableList() {
  const list = document.getElementById('cableList');
  list.innerHTML = CABLES.map(cable => {
    const isConnected = Object.values(connectedCables).includes(cable.id);
    return `<div class="cable-item${isConnected?' connected':''}" data-cid="${cable.id}" ${isConnected?'':'draggable="true"'}
      ondragstart="startCableDrag(event,'${cable.id}')" ondragend="endCableDrag(event)">
      <div class="cable-icon-wrap" style="background:${cable.color}22;border:1.5px solid ${cable.color}44;">
        ${getCableSVG(cable)}
      </div>
      <div class="comp-info">
        <div class="comp-name">${cable.name}</div>
        <div class="comp-sub">${cable.desc}</div>
      </div>
      ${isConnected?'<span style="font-size:9px;color:#059669;font-weight:700;">✓ Done</span>':''}
    </div>`;
  }).join('');
}

function getCableSVG(cable) {
  const svgMap = {
    power:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
    cpu_pwr:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/></svg>`,
    pcie:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/></svg>`,
    pcie2:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="16" cy="12" r="2"/></svg>`,
    sata_pwr:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>`,
    sata_data:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><path d="M4 4h16v4H4zM4 4v16"/><path d="M20 8v12H4"/></svg>`,
    nvme:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8V6M12 8V6M17 8V6"/></svg>`,
    fan:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>`,
    usb:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><path d="M12 2v10M8 6l4-4 4 4M12 12v4M8 16h8M10 20h4"/></svg>`,
    audio:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    fp:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8V6M12 8V6M17 8V6M7 16v2M17 16v2"/></svg>`,
    dp:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  };
  return svgMap[cable.svg] || `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${cable.color}" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>`;
}

// ═══════════════════════════════════════════════
// DRAG & DROP (components)
// ═══════════════════════════════════════════════
function startDrag(e, id) {
  draggingComp = COMPONENTS.find(c => String(c.id) === String(id));

  if (!draggingComp) {
    console.error('Component not found for drag:', id);
    return;
  }

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);

  setTimeout(() => {
    if (e.currentTarget) {
      e.currentTarget.classList.add('dragging');
    }
  }, 0);
}
function endDrag(e) { e.currentTarget.classList.remove('dragging'); draggingComp=null; }
function allowDrop(e, slotEl) {
  e.preventDefault(); e.stopPropagation();
  if(slotEl) slotEl.classList.add('drag-target');
  else document.getElementById('pcCase').classList.add('drag-over');
}
function leaveDrop(e, slotEl) {
  if(slotEl) slotEl.classList.remove('drag-target');
  else document.getElementById('pcCase').classList.remove('drag-over');
}
function dropOnCase(e) {
  e.preventDefault();
  document.getElementById('pcCase').classList.remove('drag-over');
  if(!draggingComp) return;
  const type = SLOT_TYPES.includes(draggingComp.cat) ? draggingComp.cat : null;
  if(type) beginInstall(type, draggingComp);
  else showToast('This component has no slot.','warn');
  draggingComp=null;
}
function dropOnSlot(e, slotType) {
  e.preventDefault(); e.stopPropagation();
  const slotEl = document.getElementById('slot-'+slotType);
  if(slotEl) slotEl.classList.remove('drag-target');
  if(!draggingComp) return;
  if(draggingComp.cat !== slotType) { showToast(`Cannot place ${draggingComp.cat.toUpperCase()} in ${slotType.toUpperCase()} slot.`,'err'); draggingComp=null; return; }
  beginInstall(slotType, draggingComp);
  draggingComp=null;
}

// ═══════════════════════════════════════════════
// CABLE DRAG & DROP
// ═══════════════════════════════════════════════
function startCableDrag(e, cid) {
  draggingCable = CABLES.find(c=>c.id===cid);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', cid);
  setTimeout(()=>e.currentTarget.classList.add('dragging'),0);
}
function endCableDrag(e) { e.currentTarget.classList.remove('dragging'); draggingCable=null; }
function allowCableDrop(e, zoneId) {
  e.preventDefault(); e.stopPropagation();
  document.getElementById('czone-'+zoneId).classList.add('can-drop');
}
function leaveCableDrop(e, zoneId) {
  document.getElementById('czone-'+zoneId).classList.remove('can-drop');
}
function dropOnCableZone(e, zoneId) {
  e.preventDefault(); e.stopPropagation();
  const el = document.getElementById('czone-'+zoneId);
  el.classList.remove('can-drop');
  if(!draggingCable) return;
  const zone = CABLE_ZONES.find(z=>z.id===zoneId);
  if(draggingCable.connects !== zoneId) {
    showToast(`${draggingCable.name} doesn't connect here!`,'err');
    draggingCable=null; return;
  }
  // Check if required component is installed
  if(zone.zoneFor && !build[zone.zoneFor]) {
    showToast(`Install the ${SLOT_LABELS[zone.zoneFor]||zone.zoneFor} first!`,'warn');
    draggingCable=null; return;
  }
  openCableModal(zone, draggingCable);
  draggingCable=null;
}

function openCableModal(zone, cable) {
  const el = document.getElementById('cableModalContent');
  el.innerHTML = `
    <div class="modal-title">🔌 Connect ${cable.name}</div>
    <div class="modal-sub">${cable.desc}</div>
    <div style="background:linear-gradient(135deg,#0d1b2e,#1a2f4a);border-radius:12px;padding:20px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:20px;">
      <div style="text-align:center;">
        <div style="font-size:11px;color:#64748b;margin-bottom:6px;">CABLE</div>
        <div style="width:50px;height:50px;background:${cable.color}22;border:2px solid ${cable.color};border-radius:10px;display:flex;align-items:center;justify-content:center;">${getCableSVG(cable)}</div>
      </div>
      <svg width="30" height="20" viewBox="0 0 30 20" fill="none"><path d="M0 10h30M22 4l8 6-8 6" stroke="#3ecf5e" stroke-width="2" stroke-linecap="round"/></svg>
      <div style="text-align:center;">
        <div style="font-size:11px;color:#64748b;margin-bottom:6px;">PORT</div>
        <div style="width:50px;height:50px;background:#1e293b;border:2px solid #334155;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#64748b;text-align:center;">${zone.name}</div>
      </div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px;">Push the connector firmly until it clicks. Make sure the locking tab aligns with the port.</p>
    <div style="display:flex;gap:8px;">
      <button class="btn-sm btn-green" style="flex:1;justify-content:center;padding:10px;" onclick="confirmCableConnect('${zone.id}','${cable.id}')">✓ Connect Cable</button>
      <button class="btn-sm btn-ghost" style="padding:10px 14px;" onclick="closeCableModal()">Cancel</button>
    </div>
  `;
  document.getElementById('cableOverlay').classList.add('open');
}
function confirmCableConnect(zoneId, cableId) {
  connectedCables[zoneId] = cableId;
  closeCableModal();
  renderCableZones();
  renderCableList();
  updateRightPanel();
  renderInstallGuide();
  checkObjectives();
  showToast('✅ Cable connected successfully!','ok');
}
function closeCableModal() { document.getElementById('cableOverlay').classList.remove('open'); }

// ═══════════════════════════════════════════════
// INSTALLATION STEPS
// ═══════════════════════════════════════════════
function placeComponentDirectly(type, comp) {
  build[type] = comp;
  renderSlot(type);
  updateRightPanel();
  renderCompat();
  checkObjectives();
  renderSidebar();
  renderInstallGuide();
  showToast(`✅ ${comp.name} placed in ${SLOT_LABELS[type] || type} slot!`, 'ok');
}

function beginInstall(type, comp) {
  // Motherboard is now pure drag-and-drop: no installation modal/steps.
  if(type === 'mb') {
    placeComponentDirectly(type, comp);
    return;
  }

  // Check prerequisite
  if(type==='cpu' && !build.mb){ showToast('Install Motherboard first!','warn'); return; }
  if(type==='cooler' && !build.cpu){ showToast('Install CPU first!','warn'); return; }
  if(type==='ram' && !build.mb){ showToast('Install Motherboard first!','warn'); return; }
  if(type==='gpu' && !build.mb){ showToast('Install Motherboard first!','warn'); return; }
  if(type==='storage' && !build.mb){ showToast('Install Motherboard first!','warn'); return; }

  const steps = INSTALL_STEPS[type] || [{title:'Install Component',hint:'Place the component in its slot.',task:'click_action',taskData:{label:'Install Component',icon:'🔧',confirmText:'Confirm install',successMsg:'Component installed ✓'}}];
  installQueue = {type, comp, steps, stepIndex:0};
  showInstallStep();
}

function showInstallStep() {
  if(!installQueue) return;
  const {comp, steps, stepIndex} = installQueue;
  const step = steps[stepIndex];
  const total = steps.length;
  const overlay = document.getElementById('installOverlay');
  const content = document.getElementById('installContent');
  const dots = steps.map((_,i)=>`<div class="step-dot ${i<stepIndex?'done':i===stepIndex?'active':''}"></div>`).join('');

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <span class="step-number">${stepIndex+1}</span>
      <div style="flex:1;">
        <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Installing ${SLOT_LABELS[installQueue.type]||installQueue.type} — Step ${stepIndex+1}/${total}</div>
        <div class="step-title">${step.title}</div>
      </div>
    </div>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#0369a1;display:flex;gap:7px;align-items:flex-start;">
      <span style="flex-shrink:0;">💡</span><span>${step.hint}</span>
    </div>
    <div id="taskArea" style="margin-bottom:12px;">${buildTaskWidget(step, stepIndex)}</div>
    <div class="step-progress">${dots}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
      <button class="btn-sm btn-ghost" onclick="cancelInstall()" style="font-size:11px;">✕ Cancel</button>
      <span style="font-size:10px;color:var(--faint);">Step ${stepIndex+1} of ${total}</span>
    </div>
  `;
  overlay.classList.add('open');
}

// ── task widget builder ───────────────────────────────────────────────────────
function buildTaskWidget(step, stepIdx) {
  const d = step.taskData;
  switch(step.task) {

    case 'screws':
    case 'screws_ordered': {
      const ids = Array.from({length:d.count},(_,i)=>`screw_${stepIdx}_${i}`);
      return `
        <div style="text-align:center;padding:10px 0 6px;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);margin-bottom:14px;">Click each screw to tighten it${d.pattern?' ('+d.pattern+' pattern)':''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;" id="screw_group_${stepIdx}">
            ${ids.map((id,i)=>`
              <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
                ${d.order?`<div style="font-size:9px;color:var(--faint);">#${d.order[i]||i+1}</div>`:''}
                <div id="${id}" onclick="turnScrew('${id}','${stepIdx}',${d.count},'${d.successMsg||''}','${step.task}')"
                  style="width:42px;height:42px;border-radius:50%;background:#e2e8f0;border:3px solid #94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s;position:relative;user-select:none;"
                  data-turns="0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                </div>
                <div style="font-size:9px;color:var(--faint);width:48px;text-align:center;">${d.label}</div>
              </div>
            `).join('')}
          </div>
          <div id="screw_status_${stepIdx}" style="margin-top:12px;font-size:11px;color:var(--muted);">0 / ${d.count} tightened</div>
        </div>`;
    }

    case 'lever': {
      const isUp = d.direction === 'up';
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:10px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Drag the lever ${isUp?'UP ↑':'DOWN ↓'} to ${isUp?'unlock':'lock'} the socket</div>
          <div style="position:relative;width:180px;height:160px;background:#1e293b;border-radius:10px;border:2px solid #334155;display:flex;align-items:center;justify-content:center;">
            <div style="width:80px;height:80px;background:#0d1b2e;border:2px solid #f59e0b;border-radius:6px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:11px;color:#f59e0b;font-weight:700;">CPU SOCKET</span>
            </div>
            <!-- Lever -->
            <div id="leverEl_${stepIdx}" draggable="true"
              ondragstart="leverDragStart(event,${stepIdx})"
              style="position:absolute;right:10px;top:${isUp?'100':'20'}px;width:14px;height:50px;background:${d.color};border-radius:4px;cursor:grab;transition:top .3s;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.2);"
              title="Drag ${isUp?'up':'down'}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="${isUp?'M12 19V5M5 12l7-7 7 7':'M12 5v14M19 12l-7 7-7-7'}"/></svg>
            </div>
            <!-- Drop zone top -->
            <div id="leverTop_${stepIdx}" ondragover="event.preventDefault()" ondrop="leverDrop(event,${stepIdx},'${d.direction}','${d.successMsg||''}')"
              style="position:absolute;right:5px;top:5px;width:24px;height:40px;border:2px dashed ${isUp?d.color:'#334155'};border-radius:4px;opacity:${isUp?1:0.3};">
            </div>
            <!-- Drop zone bottom -->
            <div id="leverBot_${stepIdx}" ondragover="event.preventDefault()" ondrop="leverDrop(event,${stepIdx},'${d.direction}','${d.successMsg||''}')"
              style="position:absolute;right:5px;bottom:5px;width:24px;height:40px;border:2px dashed ${isUp?'#334155':d.color};border-radius:4px;opacity:${isUp?0.3:1};">
            </div>
          </div>
          <div id="lever_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Drag the lever ${isUp?'up':'down'}</div>
        </div>`;
    }

    case 'click_action': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px 0;">
          <div style="width:80px;height:80px;border-radius:16px;background:linear-gradient(135deg,#1e293b,#0d1b2e);border:2px solid #334155;display:flex;align-items:center;justify-content:center;font-size:36px;">${d.icon||'🔧'}</div>
          <div style="font-size:12px;font-weight:600;color:var(--slate);text-align:center;">${d.confirmText}</div>
          <button onclick="completeClickAction('${stepIdx}','${d.successMsg||'Done!'}')"
            style="padding:12px 28px;background:var(--green);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;"
            onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
            ${d.label} →
          </button>
        </div>`;
    }

    case 'click_multi': {
      return `
        <div style="display:flex;flex-direction:column;gap:8px;padding:6px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);margin-bottom:4px;">Click each item in order:</div>
          ${d.items.map((item,i)=>`
            <button id="multi_${stepIdx}_${i}" onclick="clickMultiItem(${stepIdx},${i},${d.items.length},'${d.successMsg||''}')"
              style="padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:600;color:var(--slate);cursor:pointer;text-align:left;transition:all .2s;display:flex;align-items:center;gap:10px;"
              data-done="false">
              <div id="multi_check_${stepIdx}_${i}" style="width:20px;height:20px;border-radius:50%;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;"></div>
              <span>${item}</span>
            </button>`).join('')}
          <div id="multi_status_${stepIdx}" style="font-size:11px;color:var(--muted);margin-top:4px;">0 / ${d.items.length} done</div>
        </div>`;
    }

    case 'drag_component': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:10px 0;">
          <div style="display:flex;align-items:center;gap:20px;width:100%;">
            <!-- Draggable component -->
            <div id="dragComp_${stepIdx}" draggable="true"
              ondragstart="compDragStart(event,${stepIdx})"
              style="flex:1;min-height:70px;background:${d.color}22;border:2px solid ${d.color};border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:grab;padding:10px;transition:all .2s;">
              <svg viewBox="0 0 24 24" fill="none" stroke="${d.color}" stroke-width="1.8" stroke-linecap="round" width="28" height="28">${CAT_ICONS[d.icon]||CAT_ICONS.mb}</svg>
              <span style="font-size:11px;font-weight:700;color:${d.color};">${installQueue.comp.name.substring(0,22)}</span>
              <span style="font-size:9px;color:var(--faint);">✋ Drag to install →</span>
            </div>
            <svg width="30" height="20" viewBox="0 0 30 20" fill="none"><path d="M0 10h30M22 4l8 6-8 6" stroke="${d.color}" stroke-width="2.5" stroke-linecap="round"/></svg>
            <!-- Drop target -->
            <div id="dropTarget_${stepIdx}" ondragover="event.preventDefault();this.style.borderColor='${d.color}';this.style.background='${d.color}18';"
              ondragleave="this.style.borderColor='#d1dce8';this.style.background='#f8fafc';"
              ondrop="compDropped(event,${stepIdx},'${d.successMsg||'Installed!'}')"
              style="flex:1;min-height:70px;background:#f8fafc;border:2px dashed #d1dce8;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:all .2s;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#d1dce8" stroke-width="1.5" stroke-linecap="round" width="28" height="28">${CAT_ICONS[d.icon]||CAT_ICONS.mb}</svg>
              <span style="font-size:10px;color:var(--faint);">Drop here</span>
            </div>
          </div>
          <div id="dragComp_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Drag and drop the component into the slot</div>
        </div>`;
    }

    case 'align_cpu': {
      let rotated = false;
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Rotate the CPU until the triangles align, then click Seat CPU</div>
          <div style="display:flex;align-items:center;gap:16px;">
            <!-- Socket (fixed) -->
            <div style="text-align:center;">
              <div style="font-size:9px;color:var(--faint);margin-bottom:5px;">SOCKET</div>
              <div style="width:90px;height:90px;background:#1e293b;border:2px solid #334155;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center;">
                <div style="width:60px;height:60px;background:#0d1b2e;border:1px solid #475569;border-radius:3px;"></div>
                <div style="position:absolute;bottom:5px;right:5px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:12px solid #f59e0b;"></div>
                <div style="position:absolute;bottom:3px;right:3px;font-size:7px;color:#f59e0b;font-weight:700;">▲</div>
              </div>
            </div>
            <!-- Rotatable CPU -->
            <div style="text-align:center;">
              <div style="font-size:9px;color:var(--faint);margin-bottom:5px;">CPU</div>
              <div id="cpuRotate_${stepIdx}" style="width:90px;height:90px;background:#a16207;border:2px solid #f59e0b;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center;transition:transform .4s;cursor:pointer;" onclick="rotateCPU(${stepIdx})" title="Click to rotate">
                <div style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:2px;width:65px;height:65px;">
                  ${Array.from({length:25}).map(()=>'<div style="background:#92400e;border-radius:1px;"></div>').join('')}
                </div>
                <div id="cpuTriangle_${stepIdx}" style="position:absolute;bottom:4px;right:4px;font-size:10px;color:#f59e0b;font-weight:700;transition:all .4s;">▲</div>
              </div>
              <div style="font-size:9px;color:var(--faint);margin-top:4px;">Click to rotate</div>
            </div>
          </div>
          <div id="align_feedback_${stepIdx}" style="font-size:11px;color:var(--amber);">❌ Triangles not aligned — rotate the CPU</div>
          <button id="seatCpuBtn_${stepIdx}" onclick="confirmCpuAlign(${stepIdx},'${d.successMsg||''}')"
            style="padding:10px 24px;background:#94a3b8;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:not-allowed;transition:all .3s;" disabled>
            Seat CPU (align first)
          </button>
        </div>`;
    }

    case 'apply_paste': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Click the center of the CPU to apply the thermal paste</div>
          <div style="position:relative;width:160px;height:160px;">
            <!-- CPU IHS -->
            <div style="width:100%;height:100%;background:#a16207;border:3px solid #f59e0b;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <div style="width:90px;height:90px;background:#92400e;border-radius:6px;position:relative;cursor:crosshair;"
                onclick="applyPaste(${stepIdx},'${d.successMsg||''}')" id="cpuIHS_${stepIdx}">
                <div id="pasteBlob_${stepIdx}" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;background:rgba(200,200,200,0.9);border-radius:50%;border:2px solid #ccc;"></div>
              </div>
            </div>
            <!-- Paste tube -->
            <div style="position:absolute;top:-10px;right:-10px;width:30px;height:60px;background:#e2e8f0;border-radius:4px 4px 2px 2px;border:2px solid #94a3b8;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;font-size:9px;color:#64748b;">TIM</div>
          </div>
          <div id="paste_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Click the copper CPU center to apply paste</div>
        </div>`;
    }

    case 'align_ram': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Drag the RAM and align the notch with the slot key</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <!-- RAM stick -->
            <div id="ramStick_${stepIdx}" draggable="true" ondragstart="ramDragStart(event,${stepIdx})"
              style="width:200px;height:36px;background:#db2777;border:2px solid #ec4899;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:grab;position:relative;">
              <div style="position:absolute;bottom:0;left:65px;width:8px;height:8px;background:#fff;border-radius:2px 2px 0 0;"></div>
              <span style="font-size:9px;color:#fff;font-weight:700;">DDR RAM STICK</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            <!-- Slot -->
            <div id="ramSlot_${stepIdx}" ondragover="event.preventDefault();" ondrop="ramDropped(event,${stepIdx},'${d.successMsg||''}')"
              style="width:200px;height:20px;background:#1e293b;border:2px dashed #475569;border-radius:2px;position:relative;display:flex;align-items:center;cursor:pointer;">
              <div style="position:absolute;top:0;left:65px;width:10px;height:100%;background:#334155;"></div>
              <span style="font-size:8px;color:#475569;margin:auto;">DIMM Slot — drop here</span>
            </div>
          </div>
          <div id="ram_align_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Drag RAM to slot and align notch</div>
        </div>`;
    }

    case 'press_ram': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:10px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Press the RAM into slot ${d.slot} — click and hold to apply pressure</div>
          <div style="position:relative;width:220px;">
            <div style="width:200px;height:32px;background:#db2777;border:2px solid #ec4899;border-radius:4px;margin:0 auto;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:9px;color:#fff;font-weight:700;">RAM — SLOT ${d.slot}</span>
            </div>
            <div style="width:200px;height:12px;background:#1e293b;border:2px solid #334155;margin:0 auto;border-radius:0 0 3px 3px;"></div>
            <!-- Latches -->
            <div id="latchL_${stepIdx}" style="position:absolute;left:0;top:0;width:10px;height:32px;background:#f59e0b;border-radius:3px;transition:all .4s;cursor:pointer;" onclick="pressLatch('${stepIdx}','L','${d.slot}','${d.successMsg||''}')"></div>
            <div id="latchR_${stepIdx}" style="position:absolute;right:0;top:0;width:10px;height:32px;background:#f59e0b;border-radius:3px;transition:all .4s;cursor:pointer;" onclick="pressLatch('${stepIdx}','R','${d.slot}','${d.successMsg||''}')"></div>
          </div>
          <button onclick="pressRAMDown(${stepIdx},'${d.slot}','${d.successMsg||''}')"
            style="padding:12px 28px;background:#db2777;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:transform .1s;"
            onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform=''">
            ⬇ Press Down into ${d.slot}
          </button>
          <div id="press_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Press firmly until both latches click</div>
        </div>`;
    }

    case 'insert_m2': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Drag the NVMe drive and insert it at a 30° angle</div>
          <div style="display:flex;align-items:flex-end;gap:16px;">
            <div id="nvmeDrive_${stepIdx}" draggable="true" ondragstart="nvmeDragStart(event,${stepIdx})"
              style="width:120px;height:28px;background:#059669;border:2px solid #34d399;border-radius:4px;cursor:grab;display:flex;align-items:center;justify-content:center;transform:rotate(-30deg);transition:transform .4s;"
              title="Drag to slot">
              <span style="font-size:9px;color:#fff;font-weight:700;">NVMe SSD</span>
            </div>
            <div id="m2Slot_${stepIdx}" ondragover="event.preventDefault();this.style.background='#d1fae5';" ondragleave="this.style.background='#f8fafc';" ondrop="nvmeDropped(event,${stepIdx},'${d.successMsg||''}')"
              style="width:140px;height:14px;background:#f8fafc;border:2px dashed #059669;border-radius:2px;transition:all .2s;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:8px;color:#059669;">M.2 slot — drop here</span>
            </div>
          </div>
          <div id="m2_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Drag drive to the M.2 slot</div>
        </div>`;
    }

    case 'choose_orientation': {
      return `
        <div style="display:flex;flex-direction:column;gap:10px;padding:8px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">${d.label}</div>
          ${d.options.map((opt,i)=>`
            <button onclick="chooseOrientation(${stepIdx},${i},${d.correct},'${d.successMsg||''}')"
              style="padding:12px 16px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-size:12px;font-weight:600;color:var(--slate);cursor:pointer;text-align:left;transition:all .2s;"
              onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#e2e8f0'" id="orient_${stepIdx}_${i}">
              ${opt}
            </button>`).join('')}
          <div id="orient_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Select the correct orientation</div>
        </div>`;
    }

    case 'plug_connector': {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:10px 0;">
          <div style="font-size:11px;font-weight:600;color:var(--slate);">Drag the fan cable to the ${d.port} header</div>
          <div style="display:flex;align-items:center;gap:20px;">
            <div id="fanCable_${stepIdx}" draggable="true" ondragstart="cableDragStart(event,${stepIdx})"
              style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:grab;">
              <div style="width:18px;height:40px;background:${d.cableColor};border-radius:3px;"></div>
              <div style="width:30px;height:12px;background:${d.cableColor}aa;border:1px solid ${d.cableColor};border-radius:2px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:7px;color:#fff;font-weight:700;">FAN</span>
              </div>
            </div>
            <svg width="30" height="16" viewBox="0 0 30 16" fill="none"><path d="M0 8h30M22 2l8 6-8 6" stroke="${d.cableColor}" stroke-width="2" stroke-linecap="round"/></svg>
            <div id="fanPort_${stepIdx}" ondragover="event.preventDefault();this.style.background='${d.cableColor}33';" ondragleave="this.style.background='#1e293b';" ondrop="fanPlugDropped(event,${stepIdx},'${d.successMsg||''}')"
              style="width:50px;height:40px;background:#1e293b;border:2px dashed #475569;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:background .2s;">
              <div style="display:flex;gap:2px;">${Array.from({length:4}).map(()=>'<div style="width:3px;height:16px;background:#334155;border-radius:1px;"></div>').join('')}</div>
              <span style="font-size:7px;color:#475569;">${d.port}</span>
            </div>
          </div>
          <div id="plug_status_${stepIdx}" style="font-size:11px;color:var(--muted);">Drag cable to the ${d.port} header</div>
        </div>`;
    }

    default:
      return `<div style="padding:16px;text-align:center;color:var(--muted);">Interactive task for: ${step.title}</div>`;
  }
}

// ── Interactive task handlers ─────────────────────────────────────────────────
let screwCounts = {};
let multiDone = {};
let leverDone = {};
let cpuRotation = 0;
let cpuAligned = false;

function turnScrew(id, stepIdx, total, successMsg, taskType) {
  const el = document.getElementById(id);
  if(!el || el.dataset.done==='true') return;
  const turns = parseInt(el.dataset.turns||0) + 1;
  el.dataset.turns = turns;
  const pct = Math.min(turns/3, 1);
  el.style.transform = `rotate(${turns*90}deg)`;
  el.style.background = `hsl(${120*pct}, ${60}%, ${40+(pct*20)}%)`;
  el.style.borderColor = pct===1?'#3ecf5e':'#94a3b8';
  el.style.cursor = pct===1?'default':'pointer';
  if(pct===1) {
    el.dataset.done='true';
    el.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5L19 7"/></svg>';
  }
  const key = `screw_group_${stepIdx}`;
  const group = document.getElementById(key);
  if(!group) return;
  const allScrews = group.querySelectorAll('[data-turns]');
  const done = [...allScrews].filter(s=>s.dataset.done==='true').length;
  const statusEl = document.getElementById(`screw_status_${stepIdx}`);
  if(statusEl) statusEl.textContent = `${done} / ${total} tightened`;
  if(done >= total) {
    if(statusEl) { statusEl.textContent = successMsg || 'All done ✅'; statusEl.style.color='var(--green-dk)'; }
    setTimeout(()=>nextInstallStep(), 600);
  }
}

function leverDragStart(e, stepIdx) { e.dataTransfer.setData('text/plain', stepIdx); }
function leverDrop(e, stepIdx, direction, successMsg) {
  e.preventDefault();
  const el = document.getElementById(`leverEl_${stepIdx}`);
  const status = document.getElementById(`lever_status_${stepIdx}`);
  if(el) { el.style.top = direction==='up'?'20px':'100px'; el.style.background='#3ecf5e'; }
  if(status) { status.textContent = successMsg||'Lever moved ✅'; status.style.color='var(--green-dk)'; }
  setTimeout(()=>nextInstallStep(), 500);
}

function completeClickAction(stepIdx, successMsg) {
  const taskArea = document.getElementById('taskArea');
  if(taskArea) {
    taskArea.innerHTML = `<div style="padding:20px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">✅</div>
      <div style="font-size:13px;font-weight:700;color:var(--green-dk);">${successMsg}</div>
    </div>`;
  }
  setTimeout(()=>nextInstallStep(), 700);
}

function clickMultiItem(stepIdx, idx, total, successMsg) {
  const btn = document.getElementById(`multi_${stepIdx}_${idx}`);
  const check = document.getElementById(`multi_check_${stepIdx}_${idx}`);
  if(!btn || btn.dataset.done==='true') return;
  btn.dataset.done='true';
  btn.style.borderColor='var(--green)';
  btn.style.background='#f0fdf4';
  if(check) { check.style.background='var(--green)'; check.style.borderColor='var(--green)'; check.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5L19 7"/></svg>'; }
  const doneCount = document.querySelectorAll(`[id^="multi_${stepIdx}_"][data-done="true"]`).length;
  const status = document.getElementById(`multi_status_${stepIdx}`);
  if(status) status.textContent = `${doneCount} / ${total} done`;
  if(doneCount >= total) {
    if(status) { status.textContent = successMsg||'All done ✅'; status.style.color='var(--green-dk)'; }
    setTimeout(()=>nextInstallStep(), 600);
  }
}

function compDragStart(e, stepIdx) { e.dataTransfer.setData('text/plain', stepIdx); }
function compDropped(e, stepIdx, successMsg) {
  e.preventDefault();
  const from = document.getElementById(`dragComp_${stepIdx}`);
  const to = document.getElementById(`dropTarget_${stepIdx}`);
  const status = document.getElementById(`dragComp_status_${stepIdx}`);
  if(from) from.style.opacity='0.3';
  if(to) { to.style.borderStyle='solid'; to.style.borderColor='var(--green)'; to.style.background='#f0fdf4'; to.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px;"><span style="font-size:24px;">✅</span><span style="font-size:10px;color:var(--green-dk);font-weight:700;">'+successMsg+'</span></div>'; }
  if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
  setTimeout(()=>nextInstallStep(), 700);
}

// CPU align
function rotateCPU(stepIdx) {
  cpuRotation = (cpuRotation + 90) % 360;
  const el = document.getElementById(`cpuRotate_${stepIdx}`);
  if(el) el.style.transform = `rotate(${cpuRotation}deg)`;
  cpuAligned = cpuRotation === 270; // 270° = correct alignment
  const feedback = document.getElementById(`align_feedback_${stepIdx}`);
  const btn = document.getElementById(`seatCpuBtn_${stepIdx}`);
  if(feedback) { feedback.textContent = cpuAligned ? '✅ Aligned! Triangles match — ready to seat.' : '❌ Not aligned — keep rotating'; feedback.style.color = cpuAligned ? 'var(--green-dk)' : 'var(--amber)'; }
  if(btn) { btn.disabled = !cpuAligned; btn.style.background = cpuAligned ? 'var(--green)' : '#94a3b8'; btn.style.cursor = cpuAligned ? 'pointer' : 'not-allowed'; btn.textContent = cpuAligned ? 'Seat CPU ↓' : 'Seat CPU (align first)'; }
}
function confirmCpuAlign(stepIdx, successMsg) {
  if(!cpuAligned) { showToast('Rotate the CPU until triangles align first!','warn'); return; }
  completeClickAction(stepIdx, successMsg);
  cpuAligned = false; cpuRotation = 0;
}

// Apply paste
function applyPaste(stepIdx, successMsg) {
  const blob = document.getElementById(`pasteBlob_${stepIdx}`);
  const status = document.getElementById(`paste_status_${stepIdx}`);
  const ihs = document.getElementById(`cpuIHS_${stepIdx}`);
  if(blob) blob.style.display='block';
  if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
  if(ihs) ihs.style.cursor='default';
  setTimeout(()=>nextInstallStep(), 800);
}

// RAM align
function ramDragStart(e,stepIdx){ e.dataTransfer.setData('text/plain',stepIdx); }
function ramDropped(e,stepIdx,successMsg){
  e.preventDefault();
  const stick = document.getElementById(`ramStick_${stepIdx}`);
  const slot = document.getElementById(`ramSlot_${stepIdx}`);
  const status = document.getElementById(`ram_align_status_${stepIdx}`);
  if(stick) stick.style.opacity='0.3';
  if(slot) { slot.style.borderStyle='solid'; slot.style.borderColor='var(--green)'; slot.style.background='#d1fae5'; slot.innerHTML='<span style="font-size:9px;color:var(--green-dk);font-weight:700;">✅ '+successMsg+'</span>'; }
  if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
  setTimeout(()=>nextInstallStep(), 700);
}

// RAM press
let latchesClicked = {};
function pressLatch(stepIdx, side, slot, successMsg) {
  const key = `${stepIdx}_${side}`;
  if(latchesClicked[key]) return;
  latchesClicked[key] = true;
  const el = document.getElementById(`latch${side}_${stepIdx}`);
  if(el) { el.style.background='#3ecf5e'; el.style.transform='scaleX(0.7)'; }
}
function pressRAMDown(stepIdx, slot, successMsg) {
  const status = document.getElementById(`press_status_${stepIdx}`);
  if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
  const lL = document.getElementById(`latchL_${stepIdx}`);
  const lR = document.getElementById(`latchR_${stepIdx}`);
  if(lL) { lL.style.background='#3ecf5e'; lL.style.transform='scaleX(0.7)'; }
  if(lR) { lR.style.background='#3ecf5e'; lR.style.transform='scaleX(0.7)'; }
  setTimeout(()=>nextInstallStep(), 700);
}

// NVMe
function nvmeDragStart(e,stepIdx){ e.dataTransfer.setData('text/plain',stepIdx); }
function nvmeDropped(e,stepIdx,successMsg){
  e.preventDefault();
  const drive = document.getElementById(`nvmeDrive_${stepIdx}`);
  const slot = document.getElementById(`m2Slot_${stepIdx}`);
  const status = document.getElementById(`m2_status_${stepIdx}`);
  if(drive) { drive.style.transform='rotate(0deg)'; drive.style.opacity='0.3'; }
  if(slot) { slot.style.borderStyle='solid'; slot.style.borderColor='#059669'; slot.style.background='#d1fae5'; slot.innerHTML='<span style="font-size:9px;color:#059669;font-weight:700;">✅ Inserted at 30°</span>'; }
  if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
  setTimeout(()=>nextInstallStep(), 700);
}

// Orientation choice
function chooseOrientation(stepIdx, chosen, correct, successMsg) {
  const status = document.getElementById(`orient_status_${stepIdx}`);
  const correctBtn = document.getElementById(`orient_${stepIdx}_${correct}`);
  const chosenBtn = document.getElementById(`orient_${stepIdx}_${chosen}`);
  if(chosen === correct) {
    if(chosenBtn) { chosenBtn.style.borderColor='var(--green)'; chosenBtn.style.background='#f0fdf4'; }
    if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
    setTimeout(()=>nextInstallStep(), 700);
  } else {
    if(chosenBtn) { chosenBtn.style.borderColor='var(--red)'; chosenBtn.style.background='#fef2f2'; }
    if(status) { status.textContent='❌ Wrong! Try again.'; status.style.color='var(--red)'; }
    showToast('Incorrect orientation — try again!','err');
    setTimeout(()=>{ if(chosenBtn){chosenBtn.style.borderColor='#e2e8f0';chosenBtn.style.background='#f8fafc';} if(status){status.textContent='Select the correct orientation';status.style.color='var(--muted)';} },900);
  }
}

// Fan cable plug
function cableDragStart(e,stepIdx){ e.dataTransfer.setData('text/plain',stepIdx); }
function fanPlugDropped(e,stepIdx,successMsg){
  e.preventDefault();
  const cable = document.getElementById(`fanCable_${stepIdx}`);
  const port = document.getElementById(`fanPort_${stepIdx}`);
  const status = document.getElementById(`plug_status_${stepIdx}`);
  if(cable) cable.style.opacity='0.3';
  if(port) { port.style.borderStyle='solid'; port.style.borderColor='var(--green)'; port.style.background='rgba(62,207,94,.1)'; port.innerHTML='<span style="font-size:9px;color:var(--green-dk);font-weight:700;">✅ Connected</span>'; }
  if(status) { status.textContent=successMsg; status.style.color='var(--green-dk)'; }
  setTimeout(()=>nextInstallStep(), 700);
}


function nextInstallStep() {
  installQueue.stepIndex++;
  if(installQueue.stepIndex >= installQueue.steps.length) {
    // Done!
    finishInstall();
  } else {
    showInstallStep();
  }
}

function finishInstall() {
  const {type, comp} = installQueue;
  build[type] = comp;
  installQueue = null;
  document.getElementById('installOverlay').classList.remove('open');
  renderSlot(type);
  updateRightPanel();
  renderCompat();
  checkObjectives();
  renderSidebar();
  renderInstallGuide();
  showToast(`✅ ${comp.name} successfully installed!`,'ok');
}

function cancelInstall() {
  installQueue = null;
  document.getElementById('installOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════════════
function switchView(view) {
  currentView = view;
  document.getElementById('pcCase').classList.toggle('hide', view!=='front');
  document.getElementById('cableCanvas').classList.toggle('hide', view!=='cable');
  document.getElementById('monitorWrap').classList.toggle('hide', view!=='monitor');

  ['btnFront','btnCable','btnMonitor'].forEach(id=>document.getElementById(id).classList.remove('active'));
  const map = {front:'btnFront',cable:'btnCable',monitor:'btnMonitor'};
  document.getElementById(map[view]).classList.add('active');

  const labels = {front:'PC Build Assembly — Components',cable:'Back Panel & Cable Management',monitor:'2D Monitor — PC Output'};
  const hints = {front:'Drag components from the left panel onto the matching slots',cable:'Switch to 🔌 Cables tab on the left, then drag cables to ports',monitor:'Power on the PC to see the monitor output'};
  document.getElementById('canvasLabel').textContent = labels[view];
  document.getElementById('hintText').textContent = hints[view];

  if(view==='cable') {
    renderCableZones();
    // Also sync sidebar to cable tab
    const stCable = document.getElementById('stab-cable');
    const stComp = document.getElementById('stab-comp');
    stCable.classList.add('active');
    stComp.classList.remove('active');
    const compPanel = document.getElementById('spanel-comp');
    const cablePanel = document.getElementById('spanel-cable');
    const buildsPanel = document.getElementById('spanel-builds');
    compPanel.style.display = 'none';
    cablePanel.style.display = 'flex';
    cablePanel.style.flexDirection = 'column';
    cablePanel.style.flex = '1';
    cablePanel.style.overflow = 'hidden';
    if(buildsPanel) buildsPanel.style.display = 'none';
    renderCableList();
  } else if(view === 'front') {
    // Sync sidebar to components tab
    const stCable = document.getElementById('stab-cable');
    const stComp = document.getElementById('stab-comp');
    stComp.classList.add('active');
    stCable.classList.remove('active');
    const compPanel = document.getElementById('spanel-comp');
    const cablePanel = document.getElementById('spanel-cable');
    const buildsPanel = document.getElementById('spanel-builds');
    cablePanel.style.display = 'none';
    compPanel.style.display = 'flex';
    compPanel.style.flexDirection = 'column';
    compPanel.style.flex = '1';
    compPanel.style.overflow = 'hidden';
    if(buildsPanel) buildsPanel.style.display = 'none';
  }
  if(view==='monitor') updateMonitorDisplay();
}

// ═══════════════════════════════════════════════
// CABLE ZONES
// ═══════════════════════════════════════════════
function renderCableZones() {
  const grid = document.getElementById('cableZoneGrid');
  grid.innerHTML = CABLE_ZONES.map(zone => {
    const connected = connectedCables[zone.id];
    const cable = connected ? CABLES.find(c=>c.id===connected) : null;
    const required = zone.required;
    const hasComp = zone.zoneFor ? !!build[zone.zoneFor] : true;

    let status, statusClass;
    if(connected) { status='✓ Connected'; statusClass='czs-ok'; }
    else if(!hasComp) { status='Locked'; statusClass='czs-locked'; }
    else if(required) { status='⚠ Required'; statusClass='czs-needed'; }
    else { status='Optional'; statusClass='czs-missing'; }

    return `<div class="cable-zone${connected?' connected':hasComp&&!connected?' can-drop':''}" id="czone-${zone.id}"
      ondragover="${hasComp?`allowCableDrop(event,'${zone.id}')`:''}"
      ondragleave="${hasComp?`leaveCableDrop(event,'${zone.id}')`:''}"
      ondrop="${hasComp?`dropOnCableZone(event,'${zone.id}')`:''}"
      onclick="${connected?`disconnectCable('${zone.id}')`:''}" title="${connected?'Click to disconnect':''}">
      <div class="cable-zone-icon">
        ${cable ? getCableSVG(cable) : `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${connected?'#3ecf5e':'#334155'}" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>`}
      </div>
      <div class="cable-zone-name">${zone.name}</div>
      <div class="cable-zone-status ${statusClass}">${status}</div>
      ${connected?'<div style="font-size:9px;color:#059669;margin-top:2px;">Tap to remove</div>':''}
    </div>`;
  }).join('');
}

function disconnectCable(zoneId) {
  delete connectedCables[zoneId];
  renderCableZones();
  renderCableList();
  updateRightPanel();
  checkObjectives();
  showToast('Cable disconnected','warn');
}

// ═══════════════════════════════════════════════
// SLOT RENDERING
// ═══════════════════════════════════════════════
function renderSlot(type) {
  const slot = document.getElementById('slot-'+type);
  if(!slot) return;
  const comp = build[type];
  const cableNeeded = type === 'mb' || type === 'cpu' || type === 'gpu';
  if(!comp) {
    slot.classList.remove('filled');
    slot.innerHTML = `<div class="slot-label">${SLOT_LABELS[type]}</div>
      <svg class="slot-icon" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round">${CAT_ICONS[type]||''}</svg>
      <span class="slot-empty-text">Drop ${SLOT_LABELS[type]}</span>`;
    slot.ondragover = (e)=>allowDrop(e,slot);
    slot.ondragleave = (e)=>leaveDrop(e,slot);
    slot.ondrop = (e)=>dropOnSlot(e,type);
  } else {
    slot.classList.add('filled');
    const cableZones = CABLE_ZONES.filter(z=>z.zoneFor===type);
    const allConnected = cableZones.every(z=>connectedCables[z.id]);
    slot.innerHTML = `<div class="slot-label">${SLOT_LABELS[type]}</div>
      <div class="slot-chip">
        <div class="slot-chip-icon ${CAT_COLORS[comp.cat]||''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="16" height="16">${CAT_ICONS[comp.cat]||''}</svg>
        </div>
        <div class="slot-chip-info">
          <div class="slot-chip-name">${comp.name}</div>
          <div class="slot-chip-sub">$${comp.price} · ${comp.brand}</div>
        </div>
        <button class="slot-chip-remove" onclick="removeComponent('${type}')">✕</button>
      </div>
      ${cableZones.length>0?`<div class="cable-badge ${allConnected?'cb-ok':'cb-needed'}">${allConnected?'Cabled':'Cable needed'}</div>`:''}`;
  }
}

function removeComponent(type) {
  build[type]=null;
  renderSlot(type);
  updateRightPanel();
  renderCompat();
  checkObjectives();
  renderSidebar();
  showToast(`${SLOT_LABELS[type]} removed`,'warn');
}

function clearBuild() {
  SLOT_TYPES.forEach(t=>{build[t]=null;renderSlot(t);});
  connectedCables={};
  if(currentView==='cable') renderCableZones();
  renderCableList();
  updateRightPanel();
  renderCompat();
  checkObjectives();
  renderSidebar();
  isPowered=false; pcState='off';
  updatePowerUI();
  showToast('Build cleared','warn');
}

// ═══════════════════════════════════════════════
// COMPATIBILITY (always visible)
// ═══════════════════════════════════════════════
function renderCompat() {
  const el = document.getElementById('compatResults');
  const issues = [], ok = [];

  if(build.cpu && build.mb) {
    if(build.cpu.socket===build.mb.socket) ok.push('CPU socket matches MB ('+build.cpu.socket+')');
    else issues.push({type:'err',msg:`CPU socket (${build.cpu.socket}) ≠ MB socket (${build.mb.socket})`});
  }
  if(build.ram && build.mb) {
    const ramType = build.ram.ram_type || build.ram.type || '';
    const boardType = build.mb.ram_type || '';
    if(ramType && boardType && ramType !== boardType) issues.push({type:'err',msg:`RAM type (${ramType}) is not compatible with motherboard (${boardType})`});
    else if(ramType) ok.push(`RAM type (${ramType}) compatible`);
    if(build.ram.capacity_gb && build.mb.max_ram_gb && build.ram.capacity_gb > build.mb.max_ram_gb) {
      issues.push({type:'err',msg:`RAM capacity (${build.ram.capacity_gb}GB) exceeds motherboard max (${build.mb.max_ram_gb}GB)`});
    }
  }
  const totalTdp = estimateRequiredWattage();
  if(build.psu && totalTdp>0) {
    const gpuRecommended = Number(build.gpu?.recommended_psu_watts || 0);
    const requiredWattage = Math.max(totalTdp, gpuRecommended);
    if(build.psu.wattage >= requiredWattage) ok.push(`PSU (${build.psu.wattage}W) sufficient for ~${requiredWattage}W load`);
    else issues.push({type:'warn',msg:`PSU (${build.psu.wattage}W) may be insufficient for ${requiredWattage}W`});
  }
  if(build.gpu && build.mb) {
    if(Number(build.mb.pcie_x16_slots || 0) < 1) issues.push({type:'err',msg:'Motherboard has no PCIe x16 slot for the GPU'});
    else ok.push('Motherboard has a PCIe x16 GPU slot');
  }
  if(build.storage && build.mb) {
    const storageInterface = String(build.storage.interface || '').toLowerCase();
    if(storageInterface.includes('nvme') && Number(build.mb.m2_slots || 0) < 1) issues.push({type:'err',msg:'NVMe storage requires a motherboard M.2 slot'});
    else if(build.storage.interface) ok.push(`Storage interface (${build.storage.interface}) compatible`);
  }
  if(build.cpu && build.cooler) ok.push('CPU cooler is installed');
  if(build.mb && !build.cpu) issues.push({type:'warn',msg:'Motherboard installed but no CPU'});

  const all = [...issues,...ok.map(m=>({type:'ok',msg:m}))];
  if(all.length===0) { el.innerHTML='<div style="font-size:10px;color:var(--faint);text-align:center;padding:8px;">No components selected yet</div>'; return; }
  el.innerHTML = all.map(i=>`<div class="compat-box compat-${i.type}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      ${i.type==='ok'?'<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>':
        i.type==='err'?'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>':
        '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'}
    </svg>
    <span>${i.msg}</span>
  </div>`).join('');
}

// ═══════════════════════════════════════════════
// RIGHT PANEL
// ═══════════════════════════════════════════════
function switchRTab(tab, el) {
  activeRTab = tab;
  ['build','tasks','trouble','scenario'].forEach(t=>{
    document.getElementById('rtab-'+t).style.display = t===tab?'':'none';
  });
  document.querySelectorAll('.rpanel-tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  if(tab==='tasks') renderObjectives();
  if(tab==='trouble') renderTroubleList();
}

function updateRightPanel() {
  renderBuildRows();
  renderCableStatus();
  renderInstallGuide();
  if(activeRTab==='tasks') renderObjectives();
}

function renderInstallGuide() {
  const el = document.getElementById('installGuide');
  if(!el) return;
  const order = [
    {key:'mb', label:'1. Motherboard', icon:'🟦'},
    {key:'cpu', label:'2. CPU', icon:'🟧', req:'mb'},
    {key:'cooler', label:'3. CPU Cooler', icon:'🟩', req:'cpu'},
    {key:'ram', label:'4. RAM', icon:'🟪', req:'mb'},
    {key:'gpu', label:'5. GPU', icon:'🟥', req:'mb'},
    {key:'storage', label:'6. Storage', icon:'🟫', req:'mb'},
    {key:'psu', label:'7. PSU', icon:'⬛', req:null},
    {key:'_cables', label:'8. Connect Cables', icon:'🔌', req:'psu'},
    {key:'_power', label:'9. Power On & Test', icon:'⚡', req:'_cables'},
  ];
  el.innerHTML = order.map(step => {
    let done = false;
    if(step.key === '_cables') done = CABLE_ZONES.filter(z=>z.required).every(z=>connectedCables[z.id]);
    else if(step.key === '_power') done = isPowered;
    else done = !!build[step.key];
    const blocked = step.req && (step.req==='_cables'?!CABLE_ZONES.filter(z=>z.required).every(z=>connectedCables[z.id]):!build[step.req]);
    return `<div style="display:flex;align-items:center;gap:7px;padding:5px 7px;border-radius:6px;margin-bottom:3px;background:${done?'#f0fdf4':blocked?'#f8fafc':'#fffbeb'};border:1px solid ${done?'#bbf7d0':blocked?'#e2e8f0':'#fde68a'};">
      <span style="font-size:13px;">${done?'✅':blocked?'🔒':step.icon}</span>
      <span style="font-size:10px;font-weight:${done?'600':'500'};color:${done?'#059669':blocked?'#94a3b8':'#92400e'};">${step.label}</span>
    </div>`;
  }).join('');
}

function renderBuildRows() {
  const el = document.getElementById('buildRows');
  el.innerHTML = SLOT_TYPES.map(t=>{
    const c=build[t];
    return `<div class="build-row">
      <span class="build-row-label">${SLOT_LABELS[t]}:</span>
      <span class="build-row-val ${c?'ok':'empty'}">${c?c.name.substring(0,20)+(c.name.length>20?'…':''):'Not selected'}</span>
    </div>`;
  }).join('');
}


function renderCableStatus() {
  const el = document.getElementById('cableStatus');
  const req = CABLE_ZONES.filter(z=>z.required);
  const opt = CABLE_ZONES.filter(z=>!z.required);
  const reqDone = req.filter(z=>connectedCables[z.id]).length;
  const optDone = opt.filter(z=>connectedCables[z.id]).length;
  el.innerHTML = `
    <div class="build-row"><span class="build-row-label">Required Cables:</span><span class="build-row-val ${reqDone===req.length?'ok':''}">${reqDone}/${req.length}</span></div>
    <div class="build-row"><span class="build-row-label">Optional Cables:</span><span class="build-row-val">${optDone}/${opt.length}</span></div>
  `;
}

// ═══════════════════════════════════════════════
// POWER ON/OFF
// ═══════════════════════════════════════════════
function togglePower() {
  const allSlots = SLOT_TYPES.filter(t=>t!=='cooler'&&t!=='case');
  const allInstalled = allSlots.every(t=>build[t]);
  const reqCables = CABLE_ZONES.filter(z=>z.required);
  const reqCablesOk = reqCables.every(z=>connectedCables[z.id]);

  if(!isPowered) {
    if(!allInstalled) {
      const missing = allSlots.filter(t=>!build[t]).map(t=>SLOT_LABELS[t]).join(', ');
      showToast(`Missing: ${missing}`, 'err');
      return;
    }
    if(!reqCablesOk) {
      const missing = reqCables.filter(z=>!connectedCables[z.id]).map(z=>z.name).join(', ');
      showToast(`Connect cables: ${missing}`, 'err');
      return;
    }
    isPowered = true;
    updatePowerUI();
    renderInstallGuide();
    checkObjectives();
    bootPC();
  } else {
    isPowered = false;
    pcState = 'off';
    updatePowerUI();
    renderInstallGuide();
    checkObjectives();
    if(currentView==='monitor') updateMonitorDisplay();
    showToast('PC powered off','warn');
  }
}

function updatePowerUI() {
  const btn = document.getElementById('powerBtn');
  const lbl = document.getElementById('powerLabel');
  if(isPowered) {
    btn.className='power-btn on';
    lbl.textContent='ON';
  } else {
    btn.className='power-btn off';
    lbl.textContent='OFF';
  }
}

function bootPC() {
  pcState='bios';
  if(currentView==='monitor') updateMonitorDisplay();
  switchView('monitor');
  showToast('PC powering on...','ok');
  setTimeout(()=>{
    if(!isPowered) return;
    const compatOk = checkCompatForBoot();
    if(!compatOk.ok) {
      pcState='error';
      updateMonitorDisplay();
      return;
    }
    pcState='booting';
    updateMonitorDisplay();
    setTimeout(()=>{
      if(!isPowered) return;
      pcState='desktop';
      updateMonitorDisplay();
    },3000);
  },2000);
}

function checkCompatForBoot() {
  if(build.cpu&&build.mb&&build.cpu.socket!==build.mb.socket) return {ok:false,msg:`CPU socket mismatch: ${build.cpu.socket} vs ${build.mb.socket}`};
  if(build.ram&&build.mb){
    const ramType = build.ram.ram_type || build.ram.type || '';
    const boardType = build.mb.ram_type || '';
    if(ramType && boardType && ramType !== boardType) return {ok:false,msg:`RAM type mismatch: ${ramType} vs ${boardType}`};
    if(build.ram.capacity_gb && build.mb.max_ram_gb && build.ram.capacity_gb > build.mb.max_ram_gb) return {ok:false,msg:`RAM capacity ${build.ram.capacity_gb}GB exceeds motherboard max ${build.mb.max_ram_gb}GB`};
  }
  if(build.gpu&&build.mb&&Number(build.mb.pcie_x16_slots || 0) < 1) return {ok:false,msg:'Motherboard has no PCIe x16 slot for the GPU'};
  if(build.gpu&&build.psu&&Number(build.psu.wattage || 0) < Number(build.gpu.recommended_psu_watts || 0)) return {ok:false,msg:`PSU wattage too low: ${build.psu.wattage}W vs ${build.gpu.recommended_psu_watts}W recommended`};
  if(build.storage&&build.mb&&String(build.storage.interface || '').toLowerCase().includes('nvme')&&Number(build.mb.m2_slots || 0) < 1) return {ok:false,msg:'NVMe storage requires a motherboard M.2 slot'};
  return {ok:true};
}

function updateMonitorDisplay() {
  const screen = document.getElementById('screenContent');
  const actions = document.getElementById('monitorActions');
  actions.innerHTML='';

  if(pcState==='off') {
    screen.innerHTML=`<div style="background:#000;height:100%;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:#222;font-family:'DM Mono',monospace;"><div style="font-size:32px;margin-bottom:8px;">⏻</div><div style="font-size:11px;">PC is powered off</div><div style="font-size:9px;color:#111;margin-top:4px;">Press power button to start</div></div></div>`;
  } else if(pcState==='bios') {
    renderBIOSScreen(screen);
    actions.innerHTML=`
      <button class="btn-sm btn-blue" onclick="enterBIOSMenu()">⚙️ BIOS Settings</button>
      <button class="btn-sm btn-green" onclick="continueBootFromBIOS()">▶ Continue Boot</button>
      <button class="btn-sm btn-ghost" onclick="launchOSInstall()">💿 Install OS from USB</button>
    `;
  } else if(pcState==='booting') {
    screen.innerHTML=`<div class="os-boot"><div class="os-logo">🪟</div><div style="font-size:16px;font-weight:700;">Starting Windows</div><div class="os-spinner"></div><div class="os-status">Loading system files...</div></div>`;
  } else if(pcState==='desktop') {
    renderDesktop(screen);
    actions.innerHTML=`
      <button class="btn-sm btn-blue" onclick="launchOSInstall()">💿 Install OS</button>
      <button class="btn-sm" style="background:#334155;color:#94a3b8;border:none;" onclick="openDeviceManager()">🖥️ Device Mgr</button>
      <button class="btn-sm" style="background:#334155;color:#94a3b8;border:none;" onclick="openSystemInfo()">ℹ️ System Info</button>
      <button class="btn-sm btn-amber" onclick="openBSOD()">⚠️ Simulate BSOD</button>
      <button class="btn-sm btn-ghost" onclick="powerOffFromDesktop()">⏻ Shut Down</button>
    `;
  } else if(pcState==='osinstall') {
    // OS install renders its own buttons inside the screen
    actions.innerHTML='';
    renderOSInstall(screen);
  } else if(pcState==='error') {
    renderErrorScreen(screen);
    actions.innerHTML=`<button class="btn-sm btn-ghost" onclick="openBIOSFromError()">⚙️ Enter BIOS</button><button class="btn-sm btn-red" onclick="powerOffFromDesktop()">⏻ Power Off</button>`;
  } else if(pcState==='bsod') {
    const prob = detectedProblems.length>0 ? detectedProblems[Math.floor(Math.random()*detectedProblems.length)] : null;
    renderBSOD(screen, prob);
    actions.innerHTML=`<button class="btn-sm btn-ghost" onclick="restartToDesktop()">🔄 Restart</button>`;
  } else if(pcState==='devmgr') {
    renderDeviceManager(screen);
    actions.innerHTML=`<button class="btn-sm btn-ghost" onclick="backToDesktop()">← Close</button>`;
  }
}

function renderBIOSScreen(screen) {
  const cpu = build.cpu ? build.cpu.name : 'Not Detected';
  const ram = build.ram ? build.ram.name : 'Not Detected';
  const storage = build.storage ? build.storage.name : 'Not Detected';
  const mb = build.mb ? build.mb.name : 'Unknown';
  screen.innerHTML=`<div class="bios-screen">
    <div class="bios-top">UEFI BIOS Setup Utility — ${mb}</div>
    <div class="bios-section">
      <span class="bios-key">CPU:</span> <span class="bios-val">${cpu}</span><br/>
      <span class="bios-key">Memory:</span> <span class="bios-val">${ram}</span><br/>
      <span class="bios-key">Storage:</span> <span class="bios-val">${storage}</span><br/>
      <span class="bios-key">BIOS Ver:</span> <span class="bios-val">1.2.0 (2024)</span>
    </div>
    <div class="bios-section">
      <div class="bios-key">System Health</div>
      <span class="bios-key">CPU Temp:</span> <span class="bios-val">32°C</span> &nbsp;
      <span class="bios-key">Fan:</span> <span class="bios-val">1200 RPM</span>
    </div>
    <div class="bios-menu">
      <div class="bios-menu-item sel">▶ Main</div>
      <div class="bios-menu-item">  Advanced</div>
      <div class="bios-menu-item">  Boot</div>
      <div class="bios-menu-item">  Security</div>
      <div class="bios-menu-item">  Exit</div>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#555;">F1=Help  F10=Save&Exit  ESC=Exit</div>
  </div>`;
}

function renderDesktop(screen) {
  screen.innerHTML=`<div class="desktop-screen">
    <div class="desktop-area">
      <div class="desk-app" onclick="launchOSInstall()"><div class="desk-app-icon">💿</div><div class="desk-app-label">Install OS</div></div>
      <div class="desk-app" onclick="openDeviceManager()"><div class="desk-app-icon">🖥️</div><div class="desk-app-label">Device Mgr</div></div>
      <div class="desk-app" onclick="openSystemInfo()"><div class="desk-app-icon">ℹ️</div><div class="desk-app-label">System Info</div></div>
      <div class="desk-app" onclick="openBSOD()"><div class="desk-app-icon">⚠️</div><div class="desk-app-label">Stress Test</div></div>
    </div>
    <div class="desktop-taskbar">
      <div class="desktop-icon" title="Start">🪟</div>
      <div class="desktop-icon" title="Explorer">📁</div>
      <div class="desktop-icon" title="Terminal">💻</div>
      <div style="flex:1;"></div>
      <div style="font-size:9px;color:#94a3b8;font-family:'DM Mono',monospace;">${new Date().toLocaleTimeString()}</div>
    </div>
  </div>`;
}

// ─── OS INSTALL STEP DATA ────────────────────────────────────────────────────
const OS_STEPS = [
  {
    id:0, phase:'Pre-Installation',
    title:'Step 1 — Backup Your Data',
    icon:'💾',
    bg:'#1e3a5f',
    accent:'#60a5fa',
    desc:'Before installing, save all important files to an external drive or cloud storage. A clean install will wipe the target drive.',
    tip:'⚠️ Skipping backup risks permanent data loss!',
    action:'I have backed up all important data',
    widget:'backup',
  },
  {
    id:1, phase:'Pre-Installation',
    title:'Step 2 — Create Installation Media',
    icon:'🔧',
    bg:'#1e3a5f',
    accent:'#60a5fa',
    desc:'Download the Windows 11 ISO file from Microsoft\'s website. Use Rufus (free tool) to write the ISO onto a USB flash drive (minimum 8GB). This makes the USB bootable.',
    tip:'💡 Use USB 3.0 for faster file transfer during install.',
    action:'USB bootable media is ready',
    widget:'usb',
  },
  {
    id:2, phase:'BIOS Setup',
    title:'Step 3 — Insert Media & Enter Boot Menu',
    icon:'⌨️',
    bg:'#000080',
    accent:'#aaaaaa',
    desc:'Plug the USB into the PC. Power on and immediately press the boot menu key to select the USB as the boot device.',
    tip:'🔑 Common keys: F9 (HP), F12 (Dell/Lenovo), F2/F10/Del (others)',
    action:'Selected USB drive in boot menu',
    widget:'boot_menu',
    isBios:true,
  },
  {
    id:3, phase:'Setup Wizard',
    title:'Step 4 — Language & Region',
    icon:'🌐',
    bg:'#0078d4',
    accent:'#ffffff',
    desc:'The PC boots from USB and loads the Windows Setup. Choose your Language to install, Time and currency format, and Keyboard or input method.',
    tip:'💡 English (United States) is the standard default.',
    action:'Language & region selected → Next',
    widget:'language',
  },
  {
    id:4, phase:'Setup Wizard',
    title:'Step 5 — Activate Windows',
    icon:'🔑',
    bg:'#0078d4',
    accent:'#ffffff',
    desc:'Click "Install Now". Enter your Windows product key, or click "I don\'t have a product key" to activate later. You can also use a digital license tied to your Microsoft account.',
    tip:'💡 You can skip activation and activate after install completes.',
    action:'Product key entered (or skipped)',
    widget:'product_key',
  },
  {
    id:5, phase:'Setup Wizard',
    title:'Step 6 — Choose Installation Type',
    icon:'⚙️',
    bg:'#0078d4',
    accent:'#ffffff',
    desc:'Select "Custom: Install Windows only (advanced)" for a fresh clean install on a new drive. Select "Upgrade" only if you want to keep existing files and apps from an older Windows.',
    tip:'✅ For a new PC build, always choose Custom / Clean Install.',
    action:'Custom (clean install) selected',
    widget:'install_type',
  },
  {
    id:6, phase:'Disk Setup',
    title:'Step 7 — Partition & Format the Disk',
    icon:'💽',
    bg:'#1a1a2e',
    accent:'#e94560',
    desc:'Select the drive/partition where Windows will be installed. For a new drive: click "New" to create a partition, then "Format" to prepare it. Windows will create system partitions automatically.',
    tip:'⚠️ Formatting deletes ALL data on that partition permanently.',
    action:'Drive partitioned & formatted',
    widget:'partition',
  },
  {
    id:7, phase:'Installing',
    title:'Step 8 — Installing Windows Files',
    icon:'📦',
    bg:'#0078d4',
    accent:'#ffffff',
    desc:'Windows copies files, installs features, and applies updates. The PC will restart multiple times automatically. Do not power off during this process.',
    tip:'⏱️ This takes 10–25 minutes depending on drive speed.',
    action:null, // auto-advance with animation
    widget:'progress_bar',
    autoAdvance:true,
    autoDelay:3000,
  },
  {
    id:8, phase:'Configuration',
    title:'Step 9 — Out-of-Box Experience (OOBE)',
    icon:'👤',
    bg:'#0078d4',
    accent:'#ffffff',
    desc:'Configure your PC: choose your region, set up Wi-Fi, sign in with a Microsoft account (or create a local account), set privacy preferences, and choose a PIN.',
    tip:'💡 You can skip most optional steps and configure later in Settings.',
    action:'User account & preferences configured',
    widget:'oobe',
  },
  {
    id:9, phase:'Finalization',
    title:'Step 10 — Finalize & Update',
    icon:'✅',
    bg:'#0d6b3b',
    accent:'#86efac',
    desc:'Remove the USB drive. Windows will boot to the desktop. Install hardware drivers (GPU, chipset, audio) from manufacturer websites. Run Windows Update to get the latest patches.',
    tip:'🎉 Your PC is ready! Install drivers and updates for best performance.',
    action:'Drivers installed & Windows updated',
    widget:'complete',
    isLast:true,
  },
];

let osAutoTimer = null;

function renderOSInstall(screen) {
  const step = OS_STEPS[Math.min(osInstallStep, OS_STEPS.length-1)];
  const total = OS_STEPS.length;
  const pct = Math.round((osInstallStep / (total-1)) * 100);

  // Handle auto-advance steps
  if(step.autoAdvance && osInstallStep === step.id) {
    clearTimeout(osAutoTimer);
    osAutoTimer = setTimeout(()=>{
      if(pcState==='osinstall') { osInstallStep++; updateMonitorDisplay(); }
    }, step.autoDelay || 3000);
  }

  screen.innerHTML = `
  <div style="background:${step.bg};height:100%;display:flex;flex-direction:column;font-family:'Inter',sans-serif;overflow:hidden;">

    <!-- Header bar -->
    <div style="background:rgba(0,0,0,.35);padding:8px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">🪟</span>
        <span style="font-size:11px;font-weight:700;color:${step.accent};">Windows 11 Setup</span>
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,.5);">Step ${step.id+1} of ${total} · ${step.phase}</div>
    </div>

    <!-- Progress bar -->
    <div style="height:3px;background:rgba(255,255,255,.15);flex-shrink:0;">
      <div style="height:100%;background:${step.accent};width:${pct}%;transition:width .6s ease;"></div>
    </div>

    <!-- Step dots -->
    <div style="display:flex;gap:3px;padding:6px 14px;flex-shrink:0;overflow-x:auto;">
      ${OS_STEPS.map((s,i)=>`<div title="${s.title}" style="flex:1;min-width:12px;height:4px;border-radius:2px;background:${i<osInstallStep?step.accent:i===osInstallStep?'rgba(255,255,255,.8)':'rgba(255,255,255,.2)'};transition:background .3s;cursor:pointer;" onclick="osJumpTo(${i})"></div>`).join('')}
    </div>

    <!-- Main content area -->
    <div style="flex:1;display:flex;flex-direction:column;padding:10px 14px;overflow-y:auto;gap:10px;">

      <!-- Title row -->
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${step.icon}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#fff;line-height:1.3;">${step.title}</div>
          <div style="font-size:10px;color:${step.accent};font-weight:600;margin-top:2px;">${step.phase}</div>
        </div>
      </div>

      <!-- Description -->
      <div style="font-size:11px;color:rgba(255,255,255,.85);line-height:1.65;padding:10px;background:rgba(0,0,0,.25);border-radius:8px;border-left:3px solid ${step.accent};">
        ${step.desc}
      </div>

      <!-- Widget area -->
      ${renderOSWidget(step)}

      <!-- Tip -->
      <div style="font-size:10px;color:rgba(255,255,255,.6);padding:6px 10px;background:rgba(255,255,255,.06);border-radius:6px;">
        ${step.tip}
      </div>

    </div>

    <!-- Action footer -->
    <div style="padding:10px 14px;background:rgba(0,0,0,.3);flex-shrink:0;display:flex;gap:8px;align-items:center;">
      ${osInstallStep>0?`<button onclick="osInstallStep=Math.max(0,osInstallStep-1);updateMonitorDisplay();" style="padding:6px 12px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.2);border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">← Back</button>`:''}
      ${step.autoAdvance
        ? `<div style="flex:1;font-size:11px;color:rgba(255,255,255,.6);text-align:center;">⏳ Installing... please wait</div>`
        : step.isLast
        ? `<button onclick="finishOSInstall()" style="flex:1;padding:8px;background:${step.accent};color:#065f46;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;">🎉 Finish & Boot to Desktop</button>`
        : `<button onclick="osNextStep('${step.action||''}',${step.id})" style="flex:1;padding:8px;background:${step.accent};color:${step.bg==='#0078d4'?'#0078d4':'#0f172a'};border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">${step.action||'Next →'} ✓</button>`
      }
      <button onclick="pcState='desktop';clearTimeout(osAutoTimer);updateMonitorDisplay();" style="padding:6px 10px;background:rgba(255,0,0,.15);color:rgba(255,120,120,.9);border:1px solid rgba(255,0,0,.2);border-radius:6px;cursor:pointer;font-size:11px;">✕ Cancel</button>
    </div>
  </div>`;
}

function renderOSWidget(step) {
  switch(step.widget) {
    case 'backup':
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div style="grid-column:1/-1;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:4px;">Click each folder to mark it backed up:</div>
        ${['📄 Documents','🖼️ Photos','🎬 Videos','📥 Downloads','🎵 Music','🖥️ Desktop'].map((f,i)=>`
          <div id="backup_item_${i}" onclick="markBackup(${i},6)"
            style="padding:8px 10px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.15);border-radius:6px;font-size:10px;color:rgba(255,255,255,.8);cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all .2s;">
            <span>${f}</span><span id="backup_check_${i}" style="color:rgba(255,255,255,.3);font-size:12px;">○</span>
          </div>`).join('')}
        <div id="backup_status" style="grid-column:1/-1;font-size:10px;color:rgba(255,255,255,.5);text-align:center;margin-top:4px;">0 / 6 backed up</div>
      </div>`;

    case 'usb':
      return `<div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:10px;color:rgba(255,255,255,.6);font-weight:700;">Complete each step:</div>
        ${[
          {label:'Download Windows 11 ISO from microsoft.com',icon:'⬇️'},
          {label:'Open Rufus and select the ISO file',icon:'🔧'},
          {label:'Set partition: GPT | Target: UEFI | FS: NTFS',icon:'⚙️'},
          {label:'Click START in Rufus to write to USB',icon:'▶️'},
          {label:'Wait for "READY" — USB is now bootable',icon:'✅'},
        ].map((s,i)=>`
          <div id="usb_step_${i}" onclick="completeUSBStep(${i},5)" data-done="false"
            style="padding:8px 12px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12);border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .2s;">
            <span style="font-size:16px;">${s.icon}</span>
            <span style="font-size:10px;color:rgba(255,255,255,.8);">${s.label}</span>
            <span id="usb_check_${i}" style="margin-left:auto;color:rgba(255,255,255,.2);">○</span>
          </div>`).join('')}
      </div>`;

    case 'boot_menu':
      return `<div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.7);">Perform each action:</div>
        <div id="bm_step0" onclick="completeBMStep(0,3)" data-done="false"
          style="padding:8px 12px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12);border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .2s;">
          <span style="font-size:16px;">🔌</span>
          <span style="font-size:10px;color:rgba(255,255,255,.8);">Plug the bootable USB into the PC</span>
          <span id="bm_check_0" style="margin-left:auto;color:rgba(255,255,255,.2);">○</span>
        </div>
        <div id="bm_step1" onclick="completeBMStep(1,3)" data-done="false"
          style="padding:8px 12px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12);border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .2s;">
          <span style="font-size:16px;">⏻</span>
          <span style="font-size:10px;color:rgba(255,255,255,.8);">Power on PC and press F12 (or F9/F2/Del) immediately</span>
          <span id="bm_check_1" style="margin-left:auto;color:rgba(255,255,255,.2);">○</span>
        </div>
        <div style="background:#000080;border-radius:6px;padding:8px;font-family:'DM Mono',monospace;font-size:10px;">
          <div style="background:#aaa;color:#000080;padding:1px 5px;font-weight:700;margin-bottom:5px;">Boot Device Selection</div>
          <div style="color:#555;">  Windows Boot Manager</div>
          <div id="usbBootOpt" onclick="selectUSBBoot()" style="color:#fff;cursor:pointer;padding:1px 4px;border:1px dashed #555;margin:2px 0;" title="Click to select USB">  USB Flash Drive (SanDisk) ← Click to select</div>
          <div style="color:#555;">  SATA HDD</div>
        </div>
        <div id="bm_check_2" style="display:none;"></div>
        <div id="bm_status" style="font-size:10px;color:rgba(255,255,255,.5);">0 / 3 steps done</div>
      </div>`;

    case 'language':
      return `<div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.7);">Select your preferences:</div>
        ${[
          {label:'Language to install',options:['English (United States)','Filipino','Spanish','French'],correct:0},
          {label:'Time & currency format',options:['English (United States)','Filipino (Philippines)','Spanish'],correct:0},
          {label:'Keyboard / input method',options:['US (QWERTY)','AZERTY','DVORAK'],correct:0},
        ].map((row,ri)=>`
          <div>
            <div style="font-size:9px;color:rgba(255,255,255,.5);margin-bottom:3px;">${row.label}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              ${row.options.map((opt,oi)=>`<button id="lang_${ri}_${oi}" onclick="selectLangOpt(${ri},${oi},${row.correct})"
                style="padding:5px 8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:5px;color:rgba(255,255,255,.8);cursor:pointer;font-size:10px;transition:all .2s;">${opt}</button>`).join('')}
            </div>
          </div>`).join('')}
        <div id="lang_status" style="font-size:10px;color:rgba(255,255,255,.5);">Select all 3 preferences then click Next</div>
      </div>`;

    case 'product_key':
      return `<div style="display:flex;flex-direction:column;gap:10px;">
        <div style="font-size:10px;color:rgba(255,255,255,.7);">Enter your Windows 11 product key:</div>
        <div style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;">
          ${['XXXXX','XXXXX','XXXXX','XXXXX','XXXXX'].map((s,i)=>`
            <input id="pkey_${i}" maxlength="5" placeholder="${s}"
              oninput="this.value=this.value.toUpperCase();checkProductKey()"
              style="width:62px;padding:6px 4px;text-align:center;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.25);border-radius:5px;color:#fff;outline:none;transition:border-color .2s;"
              onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='rgba(255,255,255,.25)'"/>
            ${i<4?'<span style="color:rgba(255,255,255,.4);font-size:14px;">-</span>':''}`).join('')}
        </div>
        <button onclick="skipProductKey()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:7px;color:rgba(255,255,255,.6);cursor:pointer;font-size:10px;text-decoration:underline;">
          I don't have a product key (activate later)
        </button>
        <div id="pkey_status" style="font-size:10px;color:rgba(255,255,255,.5);text-align:center;">Enter all 5 groups or skip</div>
      </div>`;

    case 'install_type':
      return `<div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.7);">Choose installation type:</div>
        <div id="itype_0" onclick="selectInstallType(0)" style="padding:12px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.15);border-radius:8px;cursor:pointer;transition:all .2s;">
          <div style="font-size:11px;font-weight:700;color:#fff;">⬆️ Upgrade</div>
          <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:3px;">Keep files, settings, and apps. Best for existing Windows installations.</div>
        </div>
        <div id="itype_1" onclick="selectInstallType(1)" style="padding:12px;background:rgba(96,165,250,.15);border:2px solid #60a5fa;border-radius:8px;cursor:pointer;transition:all .2s;">
          <div style="font-size:11px;font-weight:700;color:#fff;">🔧 Custom: Install Windows only (advanced) ← Recommended</div>
          <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:3px;">Clean install — best for new builds. Will format the target drive.</div>
        </div>
        <div id="itype_status" style="font-size:10px;color:rgba(255,255,255,.5);">Select an installation type to continue</div>
      </div>`;

    case 'partition':
      return `<div style="background:#0a0a1a;border-radius:8px;padding:10px;font-family:'DM Mono',monospace;font-size:10px;">
        <div style="color:#475569;margin-bottom:6px;">Drive 0 · ${build.storage?build.storage.name:'Unallocated Drive'} · 500 GB</div>
        <div id="part_0" onclick="selectPartition(0)" style="padding:6px 8px;border:1px solid #1e293b;border-radius:3px;margin-bottom:3px;cursor:pointer;transition:all .2s;display:flex;justify-content:space-between;">
          <span style="color:#64748b;">Partition 1: System (EFI)</span><span style="color:#475569;">100 MB</span>
        </div>
        <div id="part_1" onclick="selectPartition(1)" style="padding:6px 8px;border:2px solid #e94560;background:rgba(233,69,96,.1);border-radius:3px;margin-bottom:3px;cursor:pointer;display:flex;justify-content:space-between;">
          <span style="color:#e94560;">▶ Drive 0 Partition 2 (C:) — Selected</span><span style="color:#e94560;">499.9 GB</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button id="btn_format" onclick="formatDrive()" style="padding:4px 10px;background:#7f1d1d;color:#fca5a5;border:1px solid #991b1b;border-radius:4px;cursor:pointer;font-size:9px;">Format Partition</button>
          <button id="btn_new" onclick="newPartition()" style="padding:4px 10px;background:#1e3a8a;color:#93c5fd;border:1px solid #1d4ed8;border-radius:4px;cursor:pointer;font-size:9px;">New</button>
          <button id="btn_next_part" onclick="osPartitionDone()" style="padding:4px 10px;background:#059669;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:9px;display:none;">Next →</button>
        </div>
        <div id="part_status" style="margin-top:6px;font-size:9px;color:#475569;">Select a partition then click Format</div>
      </div>`;

    case 'progress_bar':
      return `<div style="padding:8px 0;">
        ${['Copying Windows files','Preparing files for installation','Installing features','Installing updates','Finalizing'].map((task,i)=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div id="pbtask_icon_${i}" style="width:16px;height:16px;border-radius:50%;background:${i===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.06)'};display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;transition:all .5s;"></div>
            <div style="flex:1;">
              <div style="font-size:10px;color:${i===0?'#fff':'rgba(255,255,255,.35)'};" id="pbtask_label_${i}">${task}</div>
              ${i===0?`<div style="height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin-top:4px;overflow:hidden;"><div id="pbfill" style="height:100%;width:0%;background:#fff;border-radius:2px;transition:width .3s;"></div></div>`:''}
            </div>
            <div style="font-size:9px;color:rgba(255,255,255,.4);" id="pbtask_pct_${i}"></div>
          </div>`).join('')}
      </div>`;

    case 'oobe':
      return `<div style="display:flex;flex-direction:column;gap:6px;">
        ${[
          {label:'🌏 Country/Region',type:'select',opts:['Philippines','United States','United Kingdom'],correct:'Philippines'},
          {label:'⌨️ Keyboard Layout',type:'select',opts:['US','Filipino','UK'],correct:'US'},
          {label:'📶 Connect to Wi-Fi',type:'button',btnLabel:'Connect to "HomeNetwork"'},
          {label:'👤 Your Name',type:'input',placeholder:'Enter your name'},
          {label:'🔑 Create a PIN',type:'pin',placeholder:'6-digit PIN'},
        ].map((row,ri)=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:rgba(255,255,255,.08);border-radius:6px;border:1px solid rgba(255,255,255,.12);">
            <span style="font-size:10px;color:rgba(255,255,255,.8);">${row.label}</span>
            ${row.type==='select'?`<select id="oobe_sel_${ri}" onchange="checkOOBE()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:4px;padding:3px 6px;color:#fff;font-size:10px;outline:none;">${row.opts.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`:''}
            ${row.type==='input'?`<input id="oobe_inp_${ri}" placeholder="${row.placeholder}" oninput="checkOOBE()" style="width:120px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:4px;padding:4px 7px;color:#fff;font-size:10px;outline:none;"/>`:''}
            ${row.type==='pin'?`<input id="oobe_inp_${ri}" type="password" maxlength="6" placeholder="● ● ● ● ● ●" oninput="checkOOBE()" style="width:100px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:4px;padding:4px 7px;color:#fff;font-size:14px;outline:none;letter-spacing:4px;"/>`:''}
            ${row.type==='button'?`<button id="oobe_btn_${ri}" onclick="this.textContent='✅ Connected';this.style.background='rgba(62,207,94,.2)';this.style.borderColor='#3ecf5e';checkOOBE();" style="padding:4px 10px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:5px;color:rgba(255,255,255,.8);cursor:pointer;font-size:10px;">${row.btnLabel}</button>`:''}
          </div>`).join('')}
        <div id="oobe_status" style="font-size:10px;color:rgba(255,255,255,.4);text-align:center;margin-top:4px;">Fill in all fields to continue</div>
      </div>`;

    case 'complete':
      return `<div style="text-align:center;padding:10px;">
        <div style="font-size:36px;margin-bottom:8px;">🎉</div>
        <div style="font-size:12px;font-weight:700;color:#86efac;margin-bottom:8px;">Windows 11 Installed Successfully!</div>
        <div style="display:flex;flex-direction:column;gap:4px;text-align:left;">
          ${[
            {label:'Remove USB drive now',action:'Remove USB',id:'fin_0'},
            {label:'Install GPU drivers (NVIDIA/AMD)',action:'Install GPU Driver',id:'fin_1'},
            {label:'Install chipset drivers from MB website',action:'Install Chipset Driver',id:'fin_2'},
            {label:'Run Windows Update',action:'Check for Updates',id:'fin_3'},
            {label:'Restore backed-up files',action:'Restore Files',id:'fin_4'},
          ].map(t=>`
            <div id="${t.id}" onclick="completeFinStep('${t.id}')" data-done="false"
              style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(134,239,172,.08);border:1px solid rgba(134,239,172,.2);border-radius:5px;cursor:pointer;transition:all .2s;">
              <span style="font-size:10px;color:rgba(255,255,255,.8);">${t.label}</span>
              <button style="padding:3px 8px;background:rgba(134,239,172,.2);border:1px solid rgba(134,239,172,.3);border-radius:4px;color:#86efac;font-size:9px;pointer-events:none;">${t.action}</button>
            </div>`).join('')}
        </div>
        <div id="fin_status" style="font-size:10px;color:rgba(255,255,255,.4);margin-top:8px;">Complete all tasks to finish</div>
      </div>`;
    default:
      return '';
  }
}

// ── OS Install interactive handlers ──────────────────────────────────────────
let backupCount=0, usbStepCount=0, bmStepCount=0, langDone=[false,false,false], itypeDone=false, partFormatted=false, oobeFields={}, finCount=0;

function markBackup(i, total) {
  const el=document.getElementById(`backup_item_${i}`);
  const ch=document.getElementById(`backup_check_${i}`);
  if(!el||el.dataset.done==='true') return;
  el.dataset.done='true'; el.style.borderColor='#60a5fa'; el.style.background='rgba(96,165,250,.15)';
  if(ch) ch.textContent='✅';
  backupCount++;
  const st=document.getElementById('backup_status');
  if(st) st.textContent=`${backupCount} / ${total} backed up`;
  if(backupCount>=total) { if(st){st.textContent='✅ All data backed up!';st.style.color='#86efac';} setTimeout(()=>osNextStep('All data backed up',0),600); }
}

function completeUSBStep(i, total) {
  const el=document.getElementById(`usb_step_${i}`);
  const ch=document.getElementById(`usb_check_${i}`);
  if(!el||el.dataset.done==='true') return;
  el.dataset.done='true'; el.style.borderColor='#60a5fa'; el.style.background='rgba(96,165,250,.12)';
  if(ch) ch.textContent='✅';
  usbStepCount++;
  if(usbStepCount>=total) setTimeout(()=>osNextStep('Bootable USB created',1),600);
}

function completeBMStep(idx, total) {
  const el=document.getElementById(`bm_step${idx}`);
  const ch=document.getElementById(`bm_check_${idx}`);
  if(!el||el.dataset.done==='true') return;
  el.dataset.done='true'; el.style.borderColor='#60a5fa'; el.style.background='rgba(96,165,250,.12)';
  if(ch) ch.textContent='✅'; bmStepCount++;
  const st=document.getElementById('bm_status'); if(st) st.textContent=`${bmStepCount} / ${total} steps done`;
  if(bmStepCount>=total) setTimeout(()=>osNextStep('USB selected as boot device',2),600);
}

function selectUSBBoot() {
  const el=document.getElementById('usbBootOpt');
  if(el) { el.style.background='#ffff54'; el.style.color='#000080'; el.innerHTML='▶ USB Flash Drive (SanDisk) — SELECTED'; }
  completeBMStep(2, 3);
}

let langSelections={};
function selectLangOpt(rowIdx, optIdx, correct) {
  // clear row
  [0,1,2,3].forEach(i=>{ const b=document.getElementById(`lang_${rowIdx}_${i}`); if(b){b.style.background='rgba(255,255,255,.1)';b.style.borderColor='rgba(255,255,255,.2)';} });
  const chosen=document.getElementById(`lang_${rowIdx}_${optIdx}`);
  if(chosen) { chosen.style.background=optIdx===correct?'rgba(62,207,94,.2)':'rgba(239,68,68,.2)'; chosen.style.borderColor=optIdx===correct?'#3ecf5e':'#ef4444'; }
  langSelections[rowIdx]=optIdx===correct;
  const allDone=langSelections[0]&&langSelections[1]&&langSelections[2];
  const st=document.getElementById('lang_status');
  if(st) st.textContent=allDone?'✅ All set! Click Next':'Select correct option for each row';
  if(st) st.style.color=allDone?'#86efac':'rgba(255,255,255,.5)';
  if(allDone) setTimeout(()=>osNextStep('Language & region configured',3),600);
}

function checkProductKey() {
  const vals=[0,1,2,3,4].map(i=>document.getElementById(`pkey_${i}`)?.value||'');
  const complete=vals.every(v=>v.length===5);
  const st=document.getElementById('pkey_status');
  if(complete) { if(st){st.textContent='✅ Product key entered!';st.style.color='#86efac';} setTimeout(()=>osNextStep('Product key entered',4),500); }
  vals.forEach((v,i)=>{ const el=document.getElementById(`pkey_${i}`); if(el) el.style.borderColor=v.length===5?'#3ecf5e':'rgba(255,255,255,.25)'; });
}
function skipProductKey() { osNextStep('Skipped product key',4); }

let installTypeChosen=false;
function selectInstallType(idx) {
  [0,1].forEach(i=>{ const b=document.getElementById(`itype_${i}`); if(b){b.style.borderColor='rgba(255,255,255,.15)';b.style.background='rgba(255,255,255,.08)';} });
  const el=document.getElementById(`itype_${idx}`);
  if(el){el.style.borderColor='#60a5fa';el.style.background='rgba(96,165,250,.18)';}
  const st=document.getElementById('itype_status');
  const label=idx===1?'Custom (Clean Install)':'Upgrade';
  if(st){st.textContent=`✅ Selected: ${label}`;st.style.color='#86efac';}
  setTimeout(()=>osNextStep(`${label} selected`,5),600);
}

let partSelected=1,partFormattedDone=false;
function selectPartition(idx) { partSelected=idx; const st=document.getElementById('part_status'); if(st) st.textContent=`Partition ${idx+1} selected — now click Format`; }
function formatDrive() {
  const btn=document.getElementById('btn_format'); const st=document.getElementById('part_status'); const nxt=document.getElementById('btn_next_part');
  if(btn){btn.textContent='✅ Formatted';btn.style.background='#065f46';btn.style.color='#86efac';}
  if(st){st.textContent='✅ Drive formatted! Click Next to continue.';st.style.color='#86efac';}
  if(nxt) nxt.style.display='inline-block';
  partFormattedDone=true;
}
function newPartition() { const st=document.getElementById('part_status'); if(st) st.textContent='New partition created — now Format it'; }
function osPartitionDone() { if(partFormattedDone) osNextStep('Drive partitioned and formatted',6); else showToast('Format the drive first!','warn'); }

// Progress bar auto-advance (step 7)
let _pbInterval=null;
function startProgressBar() {
  let tasks=['Copying Windows files','Preparing files for installation','Installing features','Installing updates','Finalizing'];
  let taskIdx=0; let pct=0;
  clearInterval(_pbInterval);
  _pbInterval=setInterval(()=>{
    pct+=3;
    const fill=document.getElementById('pbfill'); if(fill) fill.style.width=pct+'%';
    const pctEl=document.getElementById(`pbtask_pct_${taskIdx}`); if(pctEl) pctEl.textContent=pct+'%';
    if(pct>=100){
      clearInterval(_pbInterval);
      const icon=document.getElementById(`pbtask_icon_${taskIdx}`); if(icon){icon.textContent='✓';icon.style.background='#86efac';}
      const label=document.getElementById(`pbtask_label_${taskIdx}`); if(label) label.style.color='#fff';
      taskIdx++;
      if(taskIdx<tasks.length){
        pct=0;
        const nextLabel=document.getElementById(`pbtask_label_${taskIdx}`); if(nextLabel) nextLabel.style.color='#fff';
        const nextIcon=document.getElementById(`pbtask_icon_${taskIdx}`); if(nextIcon) nextIcon.style.background='rgba(255,255,255,.3)';
        // restart for next task... simplified: just auto-advance after all
      }
    }
  }, 80);
}

let oobeDone={};
function checkOOBE() {
  // check selects (indices 0,1) and name input (3) and pin (4)
  const s0=document.getElementById('oobe_sel_0')?.value;
  const s1=document.getElementById('oobe_sel_1')?.value;
  const name=document.getElementById('oobe_inp_3')?.value?.trim();
  const pin=document.getElementById('oobe_inp_4')?.value;
  const wifi=document.getElementById('oobe_btn_2')?.textContent?.includes('Connected');
  const allDone=s0&&s1&&name&&pin&&pin.length>=4&&wifi;
  const st=document.getElementById('oobe_status');
  if(st) { st.textContent=allDone?'✅ All set! Click Next':'Fill in all fields to continue'; st.style.color=allDone?'#86efac':'rgba(255,255,255,.4)'; }
  if(allDone) setTimeout(()=>osNextStep('Account configured',8),600);
}

let finStepCount=0;
function completeFinStep(id) {
  const el=document.getElementById(id);
  if(!el||el.dataset.done==='true') return;
  el.dataset.done='true'; el.style.borderColor='rgba(134,239,172,.5)'; el.style.background='rgba(134,239,172,.15)';
  finStepCount++;
  const st=document.getElementById('fin_status');
  if(st) st.textContent=`${finStepCount} / 5 tasks done`;
  if(finStepCount>=5) { if(st){st.textContent='🎉 All done — Windows is ready!';st.style.color='#86efac';} setTimeout(()=>finishOSInstall(),700); }
}

function osJumpTo(step) {
  // Allow going back but not skipping forward more than 1
  if(step <= osInstallStep + 1) {
    osInstallStep = step;
    updateMonitorDisplay();
  }
}

function osNextStep(action, currentId) {
  if(osInstallStep === currentId) {
    osInstallStep++;
    updateMonitorDisplay();
    if(action) showToast(`✅ ${action}`,'ok');
  }
}

function renderErrorScreen(screen) {
  screen.innerHTML=`<div class="bsod" style="background:#000080;">
    <div class="bsod-emoji" style="font-size:28px;">⚠️</div>
    <div class="bsod-title" style="font-size:13px;">POST ERROR — System Cannot Boot</div>
    <div class="bios-screen" style="background:transparent;color:#aaa;font-size:10px;">
      <div class="bios-err">HARDWARE INCOMPATIBILITY DETECTED</div>
      <br/>
      ${build.cpu&&build.mb&&build.cpu.socket!==build.mb.socket?
        `CPU socket ${build.cpu.socket} incompatible with ${build.mb.socket} motherboard!<br/>`:
        `DDR4 RAM detected on DDR5 motherboard!<br/>`}
      <br/>System halted. Please check component compatibility.
    </div>
  </div>`;
}

function renderBSOD(screen, prob) {
  screen.innerHTML=`<div class="bsod">
    <div class="bsod-emoji">:(</div>
    <div class="bsod-title">Your PC ran into a problem</div>
    <div class="bsod-msg">Error: ${prob?prob.title:'SYSTEM_FAILURE'}<br/>${prob?prob.desc:'An unexpected error occurred.'}</div>
    <div class="bsod-code">Stop code: ${prob?prob.id.toUpperCase():'0x000000FF'}</div>
    <div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:8px;">Collecting error info... 100% complete</div>
  </div>`;
}

function renderDeviceManager(screen) {
  const issues = detectedProblems.filter(p=>!fixedProblems.includes(p.id)&&!p.bios);
  screen.innerHTML=`<div style="background:#f1f5f9;height:100%;display:flex;flex-direction:column;font-family:sans-serif;">
    <div style="background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;font-weight:700;">Device Manager</div>
    <div style="padding:10px;overflow-y:auto;flex:1;">
      ${issues.length===0?'<div style="font-size:11px;color:#059669;padding:8px;">✓ All devices working properly</div>':''}
      ${issues.map(p=>`<div style="padding:6px 8px;margin-bottom:4px;background:#fff;border:1px solid #e2e8f0;border-radius:5px;display:flex;align-items:center;gap:8px;">
        <span style="color:#ef4444;font-size:14px;">⚠</span>
        <div>
          <div style="font-size:10px;font-weight:700;color:#0f172a;">${p.title}</div>
          <div style="font-size:9px;color:#64748b;">${p.desc}</div>
        </div>
        <button onclick="fixProblem('${p.id}')" style="margin-left:auto;padding:3px 8px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:9px;">Fix</button>
      </div>`).join('')}
    </div>
  </div>`;
}

function openSystemInfo() {
  const screen = document.getElementById('screenContent');
  const spent = SLOT_TYPES.reduce((s,t)=>s+(build[t]?build[t].price:0),0);
  screen.innerHTML=`<div style="background:#f1f5f9;height:100%;display:flex;flex-direction:column;font-family:sans-serif;font-size:10px;">
    <div style="background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;font-weight:700;">System Information</div>
    <div style="padding:10px;overflow-y:auto;">
      ${SLOT_TYPES.filter(t=>build[t]).map(t=>`<div style="padding:5px 8px;margin-bottom:3px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;display:flex;justify-content:space-between;">
        <span style="color:#64748b;">${SLOT_LABELS[t]}</span>
        <span style="font-weight:700;color:#0f172a;">${build[t].name}</span>
      </div>`).join('')}
      <div style="padding:5px 8px;margin-top:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;display:flex;justify-content:space-between;">
        <span style="color:#059669;font-weight:700;">Total Cost</span>
        <span style="font-weight:700;color:#059669;">$${spent}</span>
      </div>
    </div>
    <button onclick="backToDesktop()" style="margin:8px;padding:6px;background:#1e293b;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:11px;">← Back</button>
  </div>`;
}

function enterBIOSMenu() { pcState='bios'; updateMonitorDisplay(); }
function continueBootFromBIOS() { pcState='booting'; updateMonitorDisplay(); setTimeout(()=>{if(isPowered){pcState='desktop';updateMonitorDisplay();}},2500); }
function openBIOSFromError() { pcState='bios'; updateMonitorDisplay(); }
function launchOSInstall() { osInstallStep=0; clearTimeout(osAutoTimer); pcState='osinstall'; updateMonitorDisplay(); }
function finishOSInstall() {
  clearTimeout(osAutoTimer);
  pcState='booting';
  updateMonitorDisplay();
  showToast('🎉 Windows installed! Rebooting...','ok');
  setTimeout(()=>{
    pcState='desktop';
    updateMonitorDisplay();
    showToast('✅ Windows 11 is ready! Install your drivers.','ok');
  },2500);
}
function openBSOD() { pcState='bsod'; updateMonitorDisplay(); }
function openDeviceManager() { pcState='devmgr'; updateMonitorDisplay(); }
function restartToDesktop() { pcState='booting'; updateMonitorDisplay(); setTimeout(()=>{pcState='desktop';updateMonitorDisplay();},2000); }
function backToDesktop() { pcState='desktop'; updateMonitorDisplay(); }
function powerOffFromDesktop() { isPowered=false; pcState='off'; updatePowerUI(); updateMonitorDisplay(); }

// ═══════════════════════════════════════════════
// TROUBLESHOOTING
// ═══════════════════════════════════════════════
function runDiagnostics() {
  if(!isPowered) { showToast('Power on the PC first!','warn'); return; }
  // Pick 4-7 random problems
  const shuffled = [...PROBLEMS].sort(()=>Math.random()-.5);
  detectedProblems = shuffled.slice(0, 4+Math.floor(Math.random()*4));
  fixedProblems = [];
  renderTroubleList();
  switchRTab('trouble', document.querySelectorAll('.rpanel-tab')[2]);
  showToast(`Diagnostics complete — ${detectedProblems.length} issue(s) found`,'warn');
}

function renderTroubleList() {
  const el = document.getElementById('troubleList');
  if(detectedProblems.length===0) { el.innerHTML='<div style="font-size:11px;color:var(--faint);">No diagnostics run yet.</div>'; return; }
  el.innerHTML = detectedProblems.map(p=>{
    const fixed = fixedProblems.includes(p.id);
    const typeMap = {hw:'tb-hw',sw:'tb-sw',bios:'tb-bios'};
    return `<div class="trouble-item ${fixed?'fixed':'found'}" onclick="${fixed?'':''}"
      title="${p.fix}">
      <div class="trouble-title">${fixed?'✓ ':''} ${p.title}</div>
      <div class="trouble-sub">${p.desc}</div>
      <span class="trouble-badge ${typeMap[p.type]||'tb-hw'}">${p.type.toUpperCase()}</span>
      ${!fixed?`<button onclick="fixProblem('${p.id}');event.stopPropagation();" style="margin-top:6px;padding:4px 10px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;width:100%;">Apply Fix: ${p.fix}</button>`:'<div style="font-size:10px;color:#059669;margin-top:4px;font-weight:700;">Fixed ✓</div>'}
    </div>`;
  }).join('');
}

function fixProblem(id) {
  if(!fixedProblems.includes(id)) fixedProblems.push(id);
  renderTroubleList();
  if(pcState==='devmgr') renderDeviceManager(document.getElementById('screenContent'));
  const p = PROBLEMS.find(x=>x.id===id);
  showToast(`Fixed: ${p?p.title:'Issue resolved'}`,'ok');
  checkObjectives();
}

// ═══════════════════════════════════════════════
// OBJECTIVES
// ═══════════════════════════════════════════════
function checkObjectives() {
  objectives.forEach(o=>{ o.done = evaluateObjective(o); });
  if(activeRTab==='tasks') renderObjectives();
}

function evaluateObjective(o) {
  if(typeof o.check === 'function') return !!o.check();
  if(o.trigger==='all_cables') return requiredCablesConnected();
  if(o.trigger) return !!build[o.trigger];
  return !!o.done;
}

function getRenderedObjectives() {
  return objectives.length ? objectives : DEFAULT_OBJECTIVES;
}

function renderObjectives() {
  const el = document.getElementById('objectivesList');
  const list = getRenderedObjectives().map(o=>({...o, done:evaluateObjective(o)}));
  let lastSection = '';
  el.innerHTML = list.map(o=>{
    const section = o.section && o.section !== lastSection ? `<div class="obj-section-title">${o.section}</div>` : '';
    if(o.section) lastSection = o.section;
    return `${section}<div class="obj-item ${o.done?'done':'todo'}">
      <div class="obj-check ${o.done?'done':''}">
        <span class="obj-x">!</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5L19 7"/></svg>
      </div>
      <div>
        <div class="obj-text">${o.text}</div>
        ${o.detail?`<div class="obj-sub">${o.detail}</div>`:''}
      </div>
    </div>`;
  }).join('');

  const done=list.filter(o=>o.done).length;
  const total=list.length;
  const pct=total>0?Math.round((done/total)*100):0;
  document.getElementById('gradePreview').innerHTML=`<div class="grade-box">
    <div class="grade-pct" style="color:${pct>=90?'#3ecf5e':pct>=75?'#f59e0b':'#ef4444'}">${pct}%</div>
    <div class="grade-label">${done}/${total} objectives complete</div>
  </div>`;
}

// ═══════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════
function toggleTimer() {
  timerRunning=!timerRunning;
  const icon=document.getElementById('timerIcon');
  if(timerRunning) {
    icon.innerHTML='<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';
    timerInterval=setInterval(tickTimer,1000);
  } else {
    icon.innerHTML='<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>';
    clearInterval(timerInterval);
  }
}
function tickTimer() {
  timerSeconds++;
  updateTimerDisplay();
  if(timerTotal>0 && timerSeconds>=timerTotal) { clearInterval(timerInterval); timerRunning=false; showToast('Time is up!','warn'); }
}
function resetTimer() { clearInterval(timerInterval); timerRunning=false; timerSeconds=0; updateTimerDisplay(); document.getElementById('timerIcon').innerHTML='<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>'; }
function updateTimerDisplay() {
  const el=document.getElementById('timerDisplay');
  if(!el) return;
  const m=Math.floor(timerSeconds/60),s=timerSeconds%60;
  el.textContent=(timerTotal>0?`${String(Math.floor((timerTotal-timerSeconds)/60)).padStart(2,'0')}:${String((timerTotal-timerSeconds)%60).padStart(2,'0')}`:
    `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  if(timerTotal>0) {
    const rem=timerTotal-timerSeconds;
    el.className='timer-display'+(rem<=60?' danger':rem<=180?' warning':'');
  }
}

// ═══════════════════════════════════════════════
// SCENARIO MODAL
// ═══════════════════════════════════════════════
function openScenarioModal() { document.getElementById('scenarioOverlay').classList.add('open'); }
function closeScenarioModal() { document.getElementById('scenarioOverlay').classList.remove('open'); }

function addObj() {
  const input=document.getElementById('sc-obj-input');
  const val=input.value.trim(); if(!val) return;
  pendingObjs.push({text:val,done:false,trigger:guessObjTrigger(val)});
  input.value=''; renderPendingObjs();
}
function guessObjTrigger(t) {
  t=t.toLowerCase();
  if(t.includes('cpu')) return 'cpu';
  if(t.includes('motherboard')||t.includes('mb')) return 'mb';
  if(t.includes('ram')||t.includes('memory')) return 'ram';
  if(t.includes('gpu')||t.includes('graphic')) return 'gpu';
  if(t.includes('storage')||t.includes('ssd')||t.includes('hdd')) return 'storage';
  if(t.includes('psu')||t.includes('power')) return 'psu';
  if(t.includes('cooler')) return 'cooler';
  if(t.includes('cable')) return 'all_cables';
  return null;
}
function removeObj(i) { pendingObjs.splice(i,1); renderPendingObjs(); }
function renderPendingObjs() { document.getElementById('sc-obj-list').innerHTML=pendingObjs.map((o,i)=>`<div class="obj-tag">${o.text}<button onclick="removeObj(${i})">×</button></div>`).join(''); }

function applyScenario() {
  const name=document.getElementById('sc-name').value.trim();
  if(!name) { showToast('Enter a scenario name','err'); return; }
  const timeMin=parseInt(document.getElementById('sc-time').value)||0;
  scenario={name,tier:document.getElementById('sc-tier').value,type:document.getElementById('sc-type').value,desc:document.getElementById('sc-desc').value.trim()};
  objectives=[...pendingObjs];
  if(objectives.length===0) {
    objectives=[...DEFAULT_OBJECTIVES];
  }
  if(timeMin>0) { timerTotal=timeMin*60; timerSeconds=0; updateTimerDisplay(); }
  document.getElementById('scenarioLabel').textContent=name;
  document.getElementById('scenarioSummary').innerHTML=`<strong>${name}</strong><br/>Type: ${scenario.type} · Tier: ${scenario.tier||'Any'}<br/>Time: ${timeMin?timeMin+'min':'Unlimited'}<br/><em style="color:var(--faint);">${scenario.desc||'No description'}</em>`;
  closeScenarioModal();
  checkObjectives();
  renderObjectives();
  updateRightPanel();
  showToast('Scenario applied!','ok');
}

// ═══════════════════════════════════════════════
// SUBMIT
// ═══════════════════════════════════════════════
function openSubmitModal() {
  const filled=SLOT_TYPES.filter(t=>build[t]).length;
  const renderedObjectives = getRenderedObjectives().map(o=>({...o, done:evaluateObjective(o)}));
  const total=renderedObjectives.length;
  const done=renderedObjectives.filter(o=>o.done).length;
  const grade=total>0?Math.round(75+(25*(done/total))):Math.round(75+(25*(filled/SLOT_TYPES.length)));
  const gradeColor=grade>=90?'#3ecf5e':grade>=80?'#f59e0b':'#ef4444';

  document.getElementById('submitContent').innerHTML=`
    <div class="modal-title">Build Submitted!</div>
    <div class="modal-sub">Automatic assessment results</div>
    <div class="grade-box">
      <div class="grade-pct" style="color:${gradeColor}">${grade}%</div>
      <div class="grade-label">${grade===100?'Perfect Build 🏆':grade>=90?'Excellent Work 🎉':grade>=80?'Great Job 👍':grade>=75?'Completed ✓':'Incomplete'}</div>
      <div class="grade-breakdown">${total>0?`${done}/${total} objectives`:`${filled}/${SLOT_TYPES.length} components`}</div>
    </div>
    <div style="max-height:200px;overflow-y:auto;">
      ${renderedObjectives.map(o=>`
        <div class="result-task-row ${o.done?'done-r':'skip-r'}"><span>${o.done?'✓':'✗'} ${o.text}</span></div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn-sm btn-green" style="flex:1;justify-content:center;padding:10px;" onclick="saveToGallery(${grade})">Save to Gallery</button>
      <button class="btn-sm btn-ghost" style="padding:10px 14px;" onclick="closeSubmitModal()">Close</button>
    </div>`;
  document.getElementById('submitOverlay').classList.add('open');
}
function closeSubmitModal() { document.getElementById('submitOverlay').classList.remove('open'); }

async function saveToGallery(grade) {
  // One save source only: Flask /api/builds -> database.py -> PostgreSQL.
  // No localStorage fallback and no gallery HTML file fallback.
  const buildData = {
    buildName: `Build Grade ${grade}%`,
    name: `Build Grade ${grade}%`,
    grade,
    components: build,
    connectedCables,
    user: userName,
    role: userRole
  };

  const dbBuildId = await saveBuildToDatabase(buildData);

  if (!dbBuildId) {
    showToast('Failed to save build to PostgreSQL.', 'err');
    return;
  }

  console.log(`✓ Build saved to PostgreSQL with ID: ${dbBuildId}`);
  showToast(`✅ Build saved to PostgreSQL! Grade: ${grade}%`, 'ok');
  closeSubmitModal();

  setTimeout(() => {
    const buildsTab = document.getElementById('stab-builds');
    if (buildsTab) switchSTab('builds', buildsTab);
  }, 400);
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
let toastTimeout;
function showToast(msg,type='ok') {
  clearTimeout(toastTimeout);
  const t=document.getElementById('toast');
  document.getElementById('toastIcon').className=`toast-icon toast-${type}`;
  document.getElementById('toastIcon').innerHTML=type==='ok'?'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3ecf5e" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5L19 7"/></svg>':
    type==='err'?'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>':
    '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
  document.getElementById('toastMsg').textContent=msg;
  t.classList.add('show');
  toastTimeout=setTimeout(()=>t.classList.remove('show'),3000);
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

async function initSimulator() {
  const fetchedComponents = await fetchComponentsFromAPI();

  COMPONENTS.length = 0;
  if (fetchedComponents && fetchedComponents.length > 0) {
    COMPONENTS.push(...fetchedComponents);
    console.log(`✓ Loaded ${COMPONENTS.length} components from PostgreSQL`);
  } else {
    console.warn('No components returned from PostgreSQL. Check /api/components and your table names.');
  }

  currentCat = 'all';
  compSearchQuery = '';

  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  const allTab = document.querySelector('.cat-tab');
  if (allTab) {
    allTab.classList.add('active');
  }

  // Clear search input on init
  const compSearchInput = document.getElementById('compSearch');
  if (compSearchInput) {
    compSearchInput.value = '';
  }
  updateClearSearchButton();

  renderSidebar();
  renderCableList();
  renderBuildRows();
  renderCompat();
  renderCableStatus();
  renderObjectives();
  updateTimerDisplay();
  renderTroubleList();

  const _compPanel = document.getElementById('spanel-comp');
  const _cablePanel = document.getElementById('spanel-cable');

  if (_compPanel) {
    _compPanel.style.display = 'flex';
    _compPanel.style.flexDirection = 'column';
    _compPanel.style.flex = '1';
    _compPanel.style.overflow = 'hidden';
  }

  if (_cablePanel) {
    _cablePanel.style.display = 'none';
  }

  renderInstallGuide();

  const tabScenario = document.getElementById('tabScenario');
  if (tabScenario && userRole !== 'teacher' && userRole !== 'instructor') {
    tabScenario.style.display = 'none';
  }
}

initSimulator();

