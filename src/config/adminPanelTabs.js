import {
  Activity,
  BarChart2,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  Inbox,
  Layers,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react';

/** Single source of truth for admin panel sections (sidebar + AdminPage tabs). */
export const ADMIN_PANEL_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'enterprises', label: 'Enterprise', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'plans', label: 'Plan management', icon: Layers },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'groups', label: 'Groups', icon: UsersRound },
  { id: 'contacts', label: 'Contact queries', icon: Inbox },
  { id: 'logs', label: 'Activity logs', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'resources', label: 'Resources', icon: FileText },
  { id: 'help', label: 'Help content', icon: HelpCircle },
];
