import {
  createIcons,
  LayoutDashboard,
  ScanLine,
  History,
  Boxes,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  UploadCloud,
  Camera,
  Cpu,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  Edit3,
  Undo2,
  Filter,
  Layers,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Check,
  Percent,
  Sliders,
  Database,
  Smartphone
} from 'lucide';

// Pre-registered icons for official Lucide rendering
export const iconsMap = {
  LayoutDashboard,
  ScanLine,
  History,
  Boxes,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  UploadCloud,
  Camera,
  Cpu,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  Edit3,
  Undo2,
  Filter,
  Layers,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Check,
  Percent,
  Sliders,
  Database,
  Smartphone
};

/**
 * Replaces all <i data-lucide="..."> in the DOM with official Lucide SVGs
 */
export function renderIcons(rootElement = document) {
  try {
    createIcons({
      icons: iconsMap,
      nameAttr: 'data-lucide',
      attrs: {
        'stroke-width': 2,
        class: 'lucide-icon'
      }
    });
  } catch (err) {
    console.warn('Lucide icon rendering notice:', err);
  }
}

/**
 * Helper to generate a Lucide icon element string
 */
export function iconHtml(name, size = 18, extraClass = '') {
  return `<i data-lucide="${name}" class="lucide-icon ${extraClass}" style="width:${size}px;height:${size}px;display:inline-flex;"></i>`;
}

