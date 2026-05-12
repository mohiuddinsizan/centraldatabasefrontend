'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileQuestion,
  Upload,
  Tag,
  Archive,
  BookOpen,
  BarChart3,
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'All Questions', href: '/questions', icon: FileQuestion },
  { name: 'Upload Question', href: '/upload', icon: Upload },
  { name: 'Manage Tags', href: '/tags', icon: Tag },
  { name: 'Manage Archives', href: '/archives', icon: Archive },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-900 min-h-screen fixed left-0 top-0 text-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Question Bank</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
? 'bg-blue-600 text-white': 'text-gray-300 hover: bg-gray-800 hover: text-white' }`} > <Icon className="w-5 h-5" /> <span className="font-medium">{item.name}</span> </Link> ); })} </nav> </div> ); }