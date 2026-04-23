/* global React */
// Minimal Lucide-style inline SVG icons. 1.75 stroke, rounded, 20px default.
const Icon = ({ d, size = 18, stroke = 1.75, fill = 'none', children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  Home:   (p) => <Icon {...p}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></Icon>,
  Users:  (p) => <Icon {...p}><circle cx="9" cy="8" r="4"/><path d="M2 21c.6-3.5 3.5-6 7-6s6.4 2.5 7 6"/><circle cx="17" cy="7" r="3"/><path d="M22 19c-.5-2.3-2.3-4-4.5-4"/></Icon>,
  Building:(p)=> <Icon {...p}><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h3a2 2 0 0 1 2 2v10"/><path d="M8 7h2M8 11h2M8 15h2"/><path d="M4 21h16"/></Icon>,
  Receipt:(p) => <Icon {...p}><path d="M4 3h16v18l-2.5-1.5L15 21l-2.5-1.5L10 21l-2.5-1.5L4 21z"/><path d="M8 8h8M8 12h8M8 16h4"/></Icon>,
  Card:   (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></Icon>,
  Wrench: (p) => <Icon {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2.1-2.1z"/></Icon>,
  Calendar:(p)=> <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></Icon>,
  Shield: (p) => <Icon {...p}><path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z"/></Icon>,
  Dashboard:(p)=> <Icon {...p}><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>,
  Bell:   (p) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>,
  Plus:   (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Minus:  (p) => <Icon {...p}><path d="M5 12h14"/></Icon>,
  X:      (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>,
  Check:  (p) => <Icon {...p}><path d="M4 12l5 5L20 6"/></Icon>,
  ChevronRight:(p)=><Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>,
  ChevronLeft:(p)=><Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>,
  ChevronDown:(p)=><Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  ChevronUp:(p) => <Icon {...p}><path d="m6 15 6-6 6 6"/></Icon>,
  MoreH:  (p) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></Icon>,
  MoreV:  (p) => <Icon {...p}><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></Icon>,
  Edit:   (p) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></Icon>,
  Trash:  (p) => <Icon {...p}><path d="M4 7h16"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/><path d="M9 7V4h6v3"/><path d="M10 11v6M14 11v6"/></Icon>,
  Filter: (p) => <Icon {...p}><path d="M3 5h18l-7 9v5l-4-2v-3z"/></Icon>,
  Download:(p)=>  <Icon {...p}><path d="M12 4v12"/><path d="m6 10 6 6 6-6"/><path d="M5 20h14"/></Icon>,
  Upload: (p) => <Icon {...p}><path d="M12 20V8"/><path d="m6 14 6-6 6 6"/><path d="M5 4h14"/></Icon>,
  Eye:    (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>,
  EyeOff: (p) => <Icon {...p}><path d="M3 3l18 18"/><path d="M10.5 6.3A10 10 0 0 1 22 12a11 11 0 0 1-3 3.7M6.3 6.3C3.4 8.3 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3.6-.7"/><path d="M14 14a3 3 0 0 1-4-4"/></Icon>,
  Mail:   (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Icon>,
  Lock:   (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Icon>,
  Phone:  (p) => <Icon {...p}><path d="M5 4h3l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></Icon>,
  MapPin: (p) => <Icon {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></Icon>,
  Clock:  (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  Sun:    (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></Icon>,
  Moon:   (p) => <Icon {...p}><path d="M20 15A9 9 0 1 1 9 4a7 7 0 0 0 11 11z"/></Icon>,
  LogOut: (p) => <Icon {...p}><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m15 16 5-4-5-4"/><path d="M20 12H9"/></Icon>,
  Settings:(p)=> <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M20 12a8 8 0 0 0-.2-2l2.1-1.5-2-3.4-2.4 1a8 8 0 0 0-3.4-2L13.5 2h-4l-.7 2.3a8 8 0 0 0-3.4 2l-2.4-1-2 3.4L3.2 10a8 8 0 0 0 0 4l-2.1 1.5 2 3.4 2.4-1a8 8 0 0 0 3.4 2l.7 2.3h4l.7-2.3a8 8 0 0 0 3.4-2l2.4 1 2-3.4-2.1-1.5c.1-.7.2-1.3.2-2z"/></Icon>,
  User:   (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></Icon>,
  Grid:   (p) => <Icon {...p}><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></Icon>,
  List:   (p) => <Icon {...p}><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></Icon>,
  Kanban: (p) => <Icon {...p}><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="5" height="13" rx="1.5"/></Icon>,
  TrendUp:(p) => <Icon {...p}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></Icon>,
  TrendDown:(p)=><Icon {...p}><path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/></Icon>,
  ArrowUp:(p) => <Icon {...p}><path d="M12 20V5M5 12l7-7 7 7"/></Icon>,
  ArrowDown:(p)=><Icon {...p}><path d="M12 5v15M5 13l7 7 7-7"/></Icon>,
  ArrowRight:(p)=><Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>,
  DollarSign:(p)=><Icon {...p}><path d="M12 2v20"/><path d="M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"/></Icon>,
  FileText:(p)=>  <Icon {...p}><path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></Icon>,
  Image:  (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m3 18 5-5 5 5 3-3 5 5"/></Icon>,
  Camera: (p) => <Icon {...p}><path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="3.5"/></Icon>,
  AlertTri:(p)=> <Icon {...p}><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></Icon>,
  Info:   (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M11 12h1v5"/></Icon>,
  CheckCircle:(p)=><Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></Icon>,
  XCircle:(p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></Icon>,
  Send:   (p) => <Icon {...p}><path d="M3 11 21 3l-8 18-2-8z"/><path d="m11 13 10-10"/></Icon>,
  Key:    (p) => <Icon {...p}><circle cx="8" cy="15" r="4"/><path d="M10.5 12.5 20 3"/><path d="m17 6 3 3M15 8l3 3"/></Icon>,
  Home2:  (p) => <Icon {...p}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></Icon>,
  Store:  (p) => <Icon {...p}><path d="M3 9 5 4h14l2 5v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 11v9h14v-9"/><path d="M9 20v-5h6v5"/></Icon>,
  Cabin:  (p) => <Icon {...p}><path d="M4 22V9l8-6 8 6v13"/><path d="M8 22v-7h8v7"/></Icon>,
  PanelLeft:(p)=><Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></Icon>,
  Menu:   (p) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16"/></Icon>,
  Sparkle:(p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></Icon>,
  Drag:   (p) => <Icon {...p}><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/></Icon>,
  Copy:   (p) => <Icon {...p}><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></Icon>,
  Refresh:(p) => <Icon {...p}><path d="M20 11a8 8 0 0 0-14-5l-2 2"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14 5l2-2"/><path d="M20 20v-4h-4"/></Icon>,
};

window.I = I;
